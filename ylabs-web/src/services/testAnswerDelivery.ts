/**
 * TEST mock interview only: sends an answer to Alex reliably.
 *
 * Every answer carries a one-time answer_id. The backend processes each answer_id once
 * (mockinterviews/test_stt/answer_turns.py), so retrying is always safe:
 *   - network error / timeout (30 s) / 5xx: retried after 1, 2, 4, 4, 4 s with the same answer_id;
 *   - 202 "processing" (a previous attempt is still running): asked again every 2 s (up to 2 min);
 *   - a reply that got lost on the way back is returned again by the server (no second scoring).
 * With `onSay`, the reply is streamed (same single request): Alex's spoken line arrives as soon as it
 * is written, so his voice can start while the rest of the reply is still being finished.
 * The real mock interview does not import this file.
 */
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import type { NextQuestionResponse } from "@/services/mockInterviewService";

const RETRY_DELAYS_MS = [1000, 2000, 4000, 4000, 4000];
const REQUEST_TIMEOUT_MS = 30000;
const PROCESSING_POLL_MS = 2000;
const PROCESSING_MAX_MS = 120000;

const vitarkaDebug = () => {
  try {
    return localStorage.getItem("vitarkaDebug") === "1";
  } catch {
    return false;
  }
};
const log = (...a: unknown[]) => {
  if (vitarkaDebug()) console.info("[Vitarka answer]", ...a);
};
const warn = (...a: unknown[]) => {
  if (vitarkaDebug()) console.warn("[Vitarka answer]", ...a);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function newAnswerId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `ans${rand}`.slice(0, 40);
}

export type DeliveryResult =
  | { ok: true; res: NextQuestionResponse & { replayed?: boolean } }
  | { ok: false; error: string };

type HttpError = Error & { status: number };
const httpError = (message: string, status: number): HttpError => Object.assign(new Error(message), { status });

function apiBase(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.VITE_YHUB_BACKEND_API_BASE_URL || env.VITE_BACKEND_API_BASE_URL || "http://localhost:8003/api").replace(/\/$/, "");
}

/** POST with a streamed reply (lines of JSON). Returns the final result's data. */
async function postStreamed(url: string, body: object, signal: AbortSignal, onSay: (text: string) => void, renewed = false): Promise<any> {
  const token = localStorage.getItem("access") || "";
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw httpError("Network error occurred", 0);
  }
  if (res.status === 401 && !renewed) {
    try {
      await yhubApiAuthUtil.get("/mock-interviews/quota/"); // renews the login token the app's usual way
    } catch {}
    return postStreamed(url, body, signal, onSay, true);
  }
  if (!res.ok || !res.body) throw httpError(`HTTP ${res.status}`, res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      throw httpError("Network error occurred", 0); // connection dropped mid-reply: retry (same answer id)
    }
    if (chunk.done) break;
    buffered += decoder.decode(chunk.value, { stream: true });
    let nl: number;
    while ((nl = buffered.indexOf("\n")) >= 0) {
      const line = buffered.slice(0, nl).trim();
      buffered = buffered.slice(nl + 1);
      if (!line) continue;
      let event: any;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (event.type === "say" && typeof event.text === "string") {
        try {
          onSay(event.text);
        } catch {}
      } else if (event.type === "result") {
        if (event.status >= 200 && event.status < 300) return event.data;
        throw httpError(event.data?.error || `HTTP ${event.status}`, event.status);
      }
    }
  }
  throw httpError("Reply ended early", 0);
}

export async function deliverAnswer(
  interviewId: string,
  payload: { interview_session_id: string; user_answer: string; status?: string; input_quality?: object },
  answerId: string,
  onRetrying?: (attempt: number, reason: string) => void,
  onSay?: (text: string) => void
): Promise<DeliveryResult> {
  let attempt = 0;
  let processingSince = 0;
  const started = Date.now();
  for (;;) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const url = `/mock-interviews/${interviewId}/get_next_question/`;
      const body = { source: "student", answer_id: answerId, ...payload };
      const res = onSay
        ? await postStreamed(url, { ...body, stream: true }, ctrl.signal, onSay)
        : await yhubApiAuthUtil.post<any>(url, body, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res && res.status === "processing" && res.answer_id === answerId && !res.question) {
        if (!processingSince) processingSince = Date.now();
        if (Date.now() - processingSince > PROCESSING_MAX_MS) return { ok: false, error: "The server is taking too long" };
        onRetrying?.(attempt, "processing");
        await sleep(PROCESSING_POLL_MS);
        continue;
      }
      if (attempt || processingSince) {
        log(`answer ${answerId} delivered after ${attempt} retr${attempt === 1 ? "y" : "ies"}${res?.replayed ? " (server had already processed it: stored reply returned)" : ""} in ${Date.now() - started} ms`);
      }
      return { ok: true, res };
    } catch (e: any) {
      clearTimeout(timer);
      const status = typeof e?.status === "number" ? e.status : 0;
      const retryable = status === 0 || status >= 500 || status === 408 || status === 429;
      const reason = status ? `HTTP ${status}` : ctrl.signal.aborted ? "timed out" : "network error";
      if (!retryable) {
        warn(`answer ${answerId} rejected (${reason}): ${e?.message || ""}`);
        return { ok: false, error: e?.message || reason };
      }
      if (attempt >= RETRY_DELAYS_MS.length) {
        warn(`answer ${answerId} could not be delivered after ${attempt} retries (${reason})`);
        return { ok: false, error: reason };
      }
      const delay = RETRY_DELAYS_MS[attempt];
      attempt++;
      warn(`answer ${answerId} not delivered (${reason}); retry ${attempt} in ${delay} ms with the same answer id`);
      onRetrying?.(attempt, reason);
      await sleep(delay);
    }
  }
}
