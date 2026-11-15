"""Pending-evaluation queue (no background threads, no task broker).

  enqueue(submission)   one row per finished interview and engine version (database-unique, so a
                        second report request or a retry can never create a duplicate).
  claim(limit)          used by the scheduled management command: takes due rows with row locks
                        (skip locked), marks them "processing" and counts the attempt. A row left
                        "processing" by a crashed run is taken again after STALE_AFTER.
  finish / fail         store the result, or schedule a retry with a growing delay; after
                        MAX_ATTEMPTS the row stays "failed" for a person to look at.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from mockinterviews.evaluation_v2 import ENGINE_VERSION

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 4
STALE_AFTER = timedelta(minutes=15)
RETRY_DELAYS = (timedelta(minutes=2), timedelta(minutes=10), timedelta(hours=1))


def enqueue(submission):
    """Returns the pending/existing row, or None if queuing failed (never raises)."""
    from mockinterviews.models import InterviewEvaluation

    try:
        with transaction.atomic():  # a failure here can never poison the caller's transaction
            row, created = InterviewEvaluation.objects.get_or_create(
                submission=submission,
                engine_version=ENGINE_VERSION,
                defaults={"status": InterviewEvaluation.STATUS_PENDING},
            )
        if created:
            logger.info("[evaluation_v2] queued submission %s", submission.pk)
        return row
    except Exception as exc:  # noqa: BLE001 - the learner's report must not be affected
        logger.warning("[evaluation_v2] could not queue submission %s: %s", getattr(submission, "pk", "?"), exc)
        return None


def claim(limit: int = 5):
    """Rows that are due, locked for this worker and marked as processing."""
    from mockinterviews.models import InterviewEvaluation

    now = timezone.now()
    due = (
        Q(status=InterviewEvaluation.STATUS_PENDING)
        | Q(status=InterviewEvaluation.STATUS_RETRY, next_attempt_at__lte=now)
        | Q(status=InterviewEvaluation.STATUS_PROCESSING, locked_at__lt=now - STALE_AFTER)
    )
    with transaction.atomic():
        rows = list(
            InterviewEvaluation.objects.select_for_update(skip_locked=True)
            .filter(due, attempts__lt=MAX_ATTEMPTS)
            .order_by("created_at")[:limit]
        )
        for row in rows:
            row.status = InterviewEvaluation.STATUS_PROCESSING
            row.attempts += 1
            row.locked_at = now
            row.started_at = now
            row.save(update_fields=["status", "attempts", "locked_at", "started_at", "updated_at"])
    return rows


def finish(row, *, result: dict, status: str, rubric_version: str, evaluator_model: str, metadata: dict):
    row.result = result
    row.status = status
    row.rubric_version = rubric_version
    row.evaluator_model = evaluator_model
    row.metadata = metadata
    row.error = ""
    row.locked_at = None
    row.finished_at = timezone.now()
    row.save()


def fail(row, error: str):
    from mockinterviews.models import InterviewEvaluation

    row.error = str(error)[:2000]
    row.locked_at = None
    if row.attempts >= MAX_ATTEMPTS:
        row.status = InterviewEvaluation.STATUS_FAILED
        row.finished_at = timezone.now()
    else:
        row.status = InterviewEvaluation.STATUS_RETRY
        row.next_attempt_at = timezone.now() + RETRY_DELAYS[min(row.attempts - 1, len(RETRY_DELAYS) - 1)]
    row.save()
