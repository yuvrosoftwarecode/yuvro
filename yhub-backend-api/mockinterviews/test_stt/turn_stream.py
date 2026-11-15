"""TEST mock interview only: the answer request answered as a stream of JSON lines.

    {"type": "say", "text": "..."}                      Alex's spoken line, as soon as it is written
    {"type": "result", "status": 200, "data": {...}}    the normal reply (always last)

Same single request and worker as before (nothing extra waits on the server): the turn runs in a
helper thread of this request and its two events are written to the response as they happen.
"""
from __future__ import annotations

import json
import logging
import queue
import threading
import time

from django.db import close_old_connections, connection
from django.http import StreamingHttpResponse

logger = logging.getLogger("mockinterviews.test_stt")


def stream_turn(request, run):
    events: queue.Queue = queue.Queue()
    started = time.monotonic()

    def say_sink(text: str) -> None:
        logger.info("[test-stream] Alex's line ready after %.0f ms", (time.monotonic() - started) * 1000)
        events.put({"type": "say", "text": text})

    request._say_sink = say_sink

    def work():
        close_old_connections()
        try:
            response = run()
            data = getattr(response, "data", None)
            events.put({"type": "result", "status": getattr(response, "status_code", 500),
                        "data": data if isinstance(data, (dict, list)) else {}})
        except Exception as exc:  # noqa: BLE001
            logger.exception("[test-stream] turn failed")
            events.put({"type": "result", "status": 500, "data": {"error": str(exc)[:300]}})
        finally:
            connection.close()

    threading.Thread(target=work, name="vitarka-turn", daemon=True).start()

    def lines():
        while True:
            event = events.get()
            yield (json.dumps(event, default=str) + "\n").encode("utf-8")
            if event["type"] == "result":
                return

    response = StreamingHttpResponse(lines(), content_type="application/x-ndjson")
    response["Cache-Control"] = "no-store"
    response["X-Accel-Buffering"] = "no"  # nginx: pass each line through immediately
    return response
