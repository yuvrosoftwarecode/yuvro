"""TEST mock interview: each answer is processed exactly once, so the browser can retry safely.

The test page sends a one-time `answer_id` with every answer. The answer endpoint then:
  - first time:          marks it "processing", runs the normal turn, stores the reply as "done";
  - retry while running: answers 202 {"status": "processing"} immediately (no worker waits);
  - retry after done:    returns the stored reply (no second scoring, no second Alex call, nothing saved twice);
  - if the turn failed:  the mark is removed so a retry runs it normally.
Requests without answer_id (the real mock interview) never come here.
"""
from __future__ import annotations

import logging
import re
import time

from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger("mockinterviews.test_stt")

STATE_KEY = "answer_turns"
KEEP = 6                       # last few answers per interview
PROCESSING_STALE_SECONDS = 120  # a "processing" mark older than this is treated as abandoned
_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")


def _interview_session_pk(request):
    from ai_assistant.models import InterviewSession
    from mockinterviews.models import MockInterviewSubmission

    sid = request.data.get("interview_session_id")
    if not sid:
        return None
    try:
        session = InterviewSession.objects.filter(id=sid).first()
    except Exception:  # noqa: BLE001 - not a valid id for this table
        session = None
    if session is None:
        try:
            sub = MockInterviewSubmission.objects.filter(id=sid).first()
        except Exception:  # noqa: BLE001
            sub = None
        if sub and sub.chat_session and hasattr(sub.chat_session, "interview_session"):
            session = sub.chat_session.interview_session
    return session.pk if session else None


def _update_turns(pk, change):
    from ai_assistant.models import InterviewSession

    with transaction.atomic():
        session = InterviewSession.objects.select_for_update().get(pk=pk)
        state = session.state_data or {}
        turns = dict(state.get(STATE_KEY) or {})
        result = change(turns)
        newest = sorted(turns.items(), key=lambda kv: kv[1].get("at", 0))[-KEEP:]
        state[STATE_KEY] = dict(newest)
        session.state_data = state
        session.save(update_fields=["state_data"])
        return result


def run_once(request, answer_id, run):
    if not _ID_RE.match(str(answer_id)):
        return run()
    pk = _interview_session_pk(request)
    if pk is None:
        return run()
    user = getattr(request.user, "pk", "?")

    def claim(turns):
        rec = turns.get(answer_id)
        now = time.time()
        if rec and rec.get("status") == "done":
            return "done", rec.get("response") or {}
        if rec and rec.get("status") == "processing" and now - rec.get("at", 0) < PROCESSING_STALE_SECONDS:
            return "processing", None
        turns[answer_id] = {"status": "processing", "at": now}
        return "claimed", None

    outcome, stored = _update_turns(pk, claim)
    if outcome == "done":
        logger.info("[test-answer user=%s session=%s] answer %s already processed: returning the stored reply",
                    user, pk, answer_id)
        return Response({**stored, "replayed": True})
    if outcome == "processing":
        logger.info("[test-answer user=%s session=%s] answer %s still processing: told the browser to ask again",
                    user, pk, answer_id)
        return Response({"status": "processing", "answer_id": answer_id}, status=status.HTTP_202_ACCEPTED)

    request._answer_turn_claimed = True  # nested calls inside the turn run normally
    response = None
    ok = False
    try:
        response = run()
        ok = 200 <= response.status_code < 300 and isinstance(getattr(response, "data", None), dict)
        return response
    finally:
        def finish(turns):
            if ok:
                turns[answer_id] = {"status": "done", "at": time.time(), "response": response.data}
            else:
                turns.pop(answer_id, None)

        try:
            _update_turns(pk, finish)
        except Exception as exc:  # noqa: BLE001 - never break the reply itself
            logger.warning("[test-answer user=%s session=%s] could not store answer %s: %s", user, pk, answer_id, exc)
        logger.info("[test-answer user=%s session=%s] answer %s processed (%s)", user, pk, answer_id,
                    "stored" if ok else f"not stored, status {getattr(response, 'status_code', 'error')}")
