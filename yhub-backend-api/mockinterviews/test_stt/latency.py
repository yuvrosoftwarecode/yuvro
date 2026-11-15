"""TEST mock interview only: warm AI connection for the scorer and Alex.

Both AI calls of a turn run on one long-lived event loop with one cached client (same provider and
model as the normal path), so they reuse an open HTTPS connection instead of building a new client
and looking up the active AI agent in the database for every call. The request waits for the result
exactly as it did with async_to_sync: no extra requests, workers or AI calls, same prompts and order.
"""
from __future__ import annotations

import asyncio
import concurrent.futures
import threading
import time

from mockinterviews.ai_interview import llm_client as _llm

CLIENT_TTL_SECONDS = 300  # re-read the active AI agent at most every 5 minutes

_lock = threading.Lock()
_loop: asyncio.AbstractEventLoop | None = None
_client = None
_client_at = 0.0


def _get_loop() -> asyncio.AbstractEventLoop:
    global _loop
    with _lock:
        if _loop is None or not _loop.is_running():
            loop = asyncio.new_event_loop()
            threading.Thread(target=loop.run_forever, name="vitarka-test-llm", daemon=True).start()
            deadline = time.monotonic() + 2
            while not loop.is_running() and time.monotonic() < deadline:
                time.sleep(0.005)
            _loop = loop
        return _loop


def _client_for_turn():
    global _client, _client_at
    with _lock:
        if _client is None or time.monotonic() - _client_at > CLIENT_TTL_SECONDS:
            _client = _llm.get_llm_client()  # request thread: may read the active agent from the DB
            _client_at = time.monotonic()
        return _client


def run(make_coro, timeout: float = 60):
    """Run make_coro() on the warm loop with the cached client; blocks like async_to_sync."""
    client = _client_for_turn()

    async def _wrapped():
        token = _llm._CLIENT_OVERRIDE.set(client)
        try:
            return await make_coro()
        finally:
            _llm._CLIENT_OVERRIDE.reset(token)

    future = asyncio.run_coroutine_threadsafe(_wrapped(), _get_loop())
    try:
        return future.result(timeout=timeout)
    except concurrent.futures.TimeoutError:
        future.cancel()
        raise
