/**
 * Speech-to-text for the mock interview: Sarvam AI saaras:v4 (or OpenAI) through the Yuvro backend.
 *
 *   mic -> AudioWorklet -> resample to the provider's rate (Sarvam 16 kHz) mono PCM16 -> client voice detection -> WebSocket
 *       -> yhub Transcript Manager -> OpenAI realtime transcription -> ordered transcripts -> screen
 *
 * Two different timers, never confused:
 *   - SEGMENT_SILENCE_MS (700 ms, configurable): a pause that ends an audio SEGMENT. The segment is
 *     committed for transcription; the learner can keep talking and the answer continues.
 *   - ANSWER_SILENCE_MS (3 s): a pause that may END THE ANSWER. The screen submits only after 3 s
 *     without speech AND once every committed segment has its final transcript (see
 *     getRealtimeSttState). A failed segment blocks auto-submit instead of sending half an answer.
 *
 * Audio: 400 ms of audio before speech starts is kept (first word not clipped); the 700 ms of
 * trailing audio is part of each segment. Audio is resampled properly (low-pass + interpolation)
 * when the browser cannot capture at the provider's rate itself; it is never just relabelled.
 *
 * RealtimeSttRecognition mimics the browser's SpeechRecognition object, so the screen's existing
 * answer handling (end commands, code mode) keeps working.
 */
import { useEffect, useState } from "react";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

const env = import.meta.env as Record<string, string | undefined>;
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

/** Default audio rate; the server announces the provider's rate in "ready" (Sarvam 16 kHz, OpenAI 24 kHz). */
export const TARGET_RATE = 16000;
export const SEGMENT_SILENCE_MS = num(env.VITE_STT_SEGMENT_SILENCE_MS, 700);
export const ANSWER_SILENCE_MS = num(env.VITE_STT_ANSWER_SILENCE_MS, 3000);
/** After unmuting (Alex's voice ended): audio is buffered but speech can't start for this long (speaker tail). */
export const RESUME_GUARD_MS = num(env.VITE_STT_RESUME_GUARD_MS, 250);
const PREROLL_MS = 400;
const FRAME_MS = 20;
const START_MS = 60;                 // this long above threshold = speech started
const MAX_SEGMENT_MS = 15000;        // force a segment boundary in very long speech
const PENDING_TIMEOUT_MS = 12000;    // a segment without a final transcript after this = failed
const RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 8000];
const RETRY_AFTER_FAILURE_MS = 3000;
const CONNECT_TIMEOUT_MS = 12000;
const RECEIVED_SHOW_MS = 1500;

const log = (...a: unknown[]) => console.info("[Vitarka STT]", ...a);
const warn = (...a: unknown[]) => console.warn("[Vitarka STT]", ...a);

export function getSttWsUrl(): string {
  if (env.VITE_YHUB_STT_WS_URL) return env.VITE_YHUB_STT_WS_URL;
  const api = env.VITE_YHUB_BACKEND_API_BASE_URL || env.VITE_BACKEND_API_BASE_URL || "http://localhost:8003/api";
  const u = new URL(api, window.location.href);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = u.pathname.replace(/\/api\/?$/, "").replace(/\/$/, "") + "/ws/mock-interview/stt/";
  u.search = "";
  u.hash = "";
  return u.toString();
}

// ── Login token: renewed the same way the app's API calls renew it ─────────
function tokenExpiresInMs(token: string): number {
  try {
    let part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (part.length % 4) part += "=";
    const exp = Number(JSON.parse(atob(part)).exp);
    return exp ? exp * 1000 - Date.now() : Infinity;
  } catch {
    return Infinity;
  }
}

/** The saved access token, renewed first if it expired (or expires within a minute) or `force`. */
async function freshAccessToken(force = false): Promise<string> {
  let token = localStorage.getItem("access") || "";
  if (force || !token || tokenExpiresInMs(token) < 60000) {
    try {
      // Any authenticated call through the app's API helper renews an expired token (refresh token).
      await yhubApiAuthUtil.get("/mock-interviews/quota/");
    } catch {}
    token = localStorage.getItem("access") || "";
    log("login token renewed before connecting");
  }
  return token;
}

// ── Resampler: proper sample-rate conversion (e.g. 48 kHz mic -> 16 kHz) ──
export class Resampler {
  private readonly step: number;
  private readonly taps: Float32Array;
  private hist: Float32Array;
  private prev = 0;
  private pos = 0;
  readonly passthrough: boolean;

  constructor(readonly inRate: number, readonly outRate = TARGET_RATE) {
    this.passthrough = Math.abs(inRate - outRate) < 1;
    this.step = inRate / outRate;
    // Windowed-sinc low-pass below the new Nyquist (prevents aliasing when downsampling).
    const n = 33;
    const m = (n - 1) / 2;
    const fc = (Math.min(inRate, outRate) / 2) * 0.9 / inRate; // cycles per input sample
    const taps = new Float32Array(n);
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const x = k - m;
      const sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
      const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * k) / (n - 1));
      taps[k] = sinc * w;
      sum += taps[k];
    }
    for (let k = 0; k < n; k++) taps[k] /= sum;
    this.taps = taps;
    this.hist = new Float32Array(n - 1);
  }

  process(input: Float32Array): Float32Array {
    if (this.passthrough) return input;
    const n = this.taps.length;
    const buf = new Float32Array(this.hist.length + input.length);
    buf.set(this.hist, 0);
    buf.set(input, this.hist.length);
    const filtered = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let acc = 0;
      for (let k = 0; k < n; k++) acc += this.taps[k] * buf[i + k];
      filtered[i] = acc;
    }
    this.hist = buf.slice(buf.length - (n - 1));
    // Linear interpolation on the filtered signal; src[0] is the last sample of the previous block.
    const out: number[] = [];
    let t = this.pos;
    const srcLen = filtered.length + 1;
    while (t < srcLen - 1) {
      const i = Math.floor(t);
      const a = i === 0 ? this.prev : filtered[i - 1];
      const b = filtered[i];
      out.push(a + (t - i) * (b - a));
      t += this.step;
    }
    this.pos = t - (srcLen - 1);
    this.prev = filtered[filtered.length - 1] ?? this.prev;
    return Float32Array.from(out);
  }
}

function floatTo16(f: Float32Array): Int16Array {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

// ── Status shown on the test screen ───────────────────────────────────────
export type SttStatus = {
  state: "idle" | "connecting" | "connected" | "listening" | "hearing" | "transcribing" | "received" | "reconnecting" | "error";
  message?: string;
  model?: string;
  pending?: number;
};
let status: SttStatus = { state: "idle" };
const statusSubs = new Set<(s: SttStatus) => void>();
function publish(next: SttStatus) {
  if (JSON.stringify(next) === JSON.stringify(status)) return;
  status = next;
  statusSubs.forEach((fn) => fn(next));
}
export function useRealtimeSttStatus(): SttStatus {
  const [s, setS] = useState<SttStatus>(status);
  useEffect(() => {
    statusSubs.add(setS);
    setS(status);
    return () => {
      statusSubs.delete(setS);
    };
  }, []);
  return s;
}

const WORKLET_SOURCE = `
class YuvroSttCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.size = (options && options.processorOptions && options.processorOptions.frame) || 480;
    this.buf = new Float32Array(this.size); this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.size) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor("yuvro-stt-capture", YuvroSttCapture);
`;

type Listener = (msg: any) => void;
type Segment = { id: number; chunks: Int16Array[]; at: number };
export type SttContext = { sessionId?: string; role?: string; question?: string; keywords?: string[]; turnId?: string };

// ── One shared connection (mic + WebSocket) for the page ──────────────────
class SttLink {
  ws: WebSocket | null = null;
  ready = false;
  model = "";
  rate = TARGET_RATE;
  lastFailAt = 0;
  epoch = 0;
  private connectedSession = "";
  private connecting: Promise<void> | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private resampler: Resampler | null = null;
  private listener: Listener | null = null;
  private enabled = false;
  // Optional mute (used by the test interview while Alex speaks): the session stays open, no audio is sent.
  // Off by default, so pages that never call setRealtimeSttMuted behave exactly as before.
  muted = false;
  private guardUntil = 0;
  private context: SttContext = {};
  private closingOnPurpose = false;
  private reconnecting = false;
  private lastError = "";
  private lastErrorAt = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;

  // voice detection
  private floor = 0.004;
  speaking = false;
  lastSpeechAt = 0;
  lastFinalAt = 0;
  failedSegments = 0;
  private aboveMs = 0;
  private silentMs = 0;
  private segMs = 0;
  private preroll: Int16Array[] = [];
  private prerollMs = 0;
  private packet: Int16Array[] = [];
  private packetLen = 0;

  // segments: open (being spoken) -> awaiting ack (commit sent) -> awaiting final (server seq known)
  private segId = 0;
  private openChunks: Int16Array[] = [];
  private awaitingAck: Segment[] = [];
  private awaitingFinal = new Map<number, Segment>();

  get pending() {
    return this.awaitingAck.length + this.awaitingFinal.size;
  }

  ensure(): Promise<void> {
    if (this.ready && this.ws && this.ws.readyState === WebSocket.OPEN && this.ctx) return Promise.resolve();
    if (!this.connecting) {
      this.connecting = this.open().finally(() => {
        this.connecting = null;
      });
    }
    return this.connecting;
  }

  private async open() {
    publish({ state: "connecting" });
    try {
      await this.connectSocket(); // first: the server says which sample rate its provider needs
      if (this.ctx && this.resampler && this.resampler.outRate !== this.rate) {
        this.resampler = new Resampler(this.ctx.sampleRate, this.rate); // provider changed its rate
      }
      if (!this.ctx) await this.openMic();
      if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
      this.startTicker();
      this.refreshStatus();
    } catch (e: any) {
      this.lastFailAt = Date.now();
      this.fail(e?.message || String(e));
      throw e;
    }
  }

  private fail(message: string) {
    this.lastError = message;
    this.lastErrorAt = Date.now();
    warn(message);
    publish({ state: "error", message, pending: this.pending });
  }

  private async openMic() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const deviceRate = this.stream.getAudioTracks()[0]?.getSettings?.().sampleRate;
    let ctx: AudioContext;
    let source: MediaStreamAudioSourceNode;
    let mode: string;
    try {
      // Preferred: the browser's own resampler converts the mic to the provider's rate.
      ctx = new AudioContext({ sampleRate: this.rate });
      source = ctx.createMediaStreamSource(this.stream);
      mode = `browser resampling to ${this.rate} Hz`;
    } catch {
      // Some browsers (e.g. Firefox) can't mix rates: capture at the device rate, resample here.
      ctx = new AudioContext();
      source = ctx.createMediaStreamSource(this.stream);
      mode = `capture at ${ctx.sampleRate} Hz + low-pass resampling to ${this.rate} Hz`;
    }
    this.resampler = new Resampler(ctx.sampleRate, this.rate);
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "application/javascript" }));
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const node = new AudioWorkletNode(ctx, "yuvro-stt-capture", {
      processorOptions: { frame: Math.round((ctx.sampleRate * FRAME_MS) / 1000) },
    });
    node.port.onmessage = (e) => this.onFrame(e.data as Float32Array);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(ctx.destination);
    this.ctx = ctx;
    this.node = node;
    log(`mic open: device ${deviceRate || "?"} Hz, context ${ctx.sampleRate} Hz, ${mode}, sending PCM16 mono ${this.rate} Hz`);
  }

  /** The interview session id arrives from the screen right after the interview starts: wait for it. */
  private async waitForSession(timeoutMs = 10000): Promise<string> {
    const until = Date.now() + timeoutMs;
    while (!this.context.sessionId && Date.now() < until) await new Promise((r) => setTimeout(r, 200));
    return this.context.sessionId || "";
  }

  /** Connect; if the server says the login expired, renew the token once and try again. */
  private async connectSocket(): Promise<void> {
    try {
      await this.openSocket();
    } catch (e: any) {
      if (!e?.authFailed) throw e;
      log("login token rejected; renewing and retrying");
      await freshAccessToken(true);
      await this.openSocket();
    }
  }

  private async openSocket(): Promise<void> {
    const sessionId = await this.waitForSession();
    if (!sessionId) throw new Error("Interview session not started yet (no session id from the interview screen)");
    const token = await freshAccessToken();
    return new Promise((resolve, reject) => {
      const url = `${getSttWsUrl()}?token=${encodeURIComponent(token)}&interview_session_id=${encodeURIComponent(sessionId)}`;
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch {}
        reject(new Error("Speech-to-text server did not answer"));
      }, CONNECT_TIMEOUT_MS);

      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") return;
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "ready") {
          this.ws = ws;
          this.ready = true;
          this.epoch += 1;
          this.model = [msg.provider, msg.model].filter(Boolean).join(" ") || "";
          if (Number(msg.sample_rate) > 0) this.rate = Number(msg.sample_rate);
          this.connectedSession = sessionId;
          log(`connected: model ${this.model}, session ${sessionId}`);
          this.sendContext();
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
          return;
        }
        if (msg.type === "error") {
          if (!settled && msg.code === "not_authenticated") {
            settled = true;
            clearTimeout(timer);
            reject(Object.assign(new Error(msg.message || msg.code), { authFailed: true }));
            return;
          }
          this.fail(msg.message || msg.code);
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error(msg.message || msg.code));
            return;
          }
        }
        this.onServerMessage(msg);
      };

      ws.onclose = (ev) => {
        const wasCurrent = this.ws === ws;
        if (wasCurrent) {
          this.ws = null;
          this.ready = false;
        }
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          const why =
            ev.code === 4401
              ? "Not logged in (token expired?)"
              : ev.code === 4403
              ? "This interview session isn't yours or doesn't exist"
              : `Speech-to-text connection closed (${ev.code}). Is the WebSocket service running?`;
          reject(Object.assign(new Error(why), { authFailed: ev.code === 4401 }));
          return;
        }
        if (this.closingOnPurpose || !wasCurrent) return;
        warn(`connection lost (${ev.code}); ${this.pending} segment(s) pending`);
        void this.reconnect();
      };
      ws.onerror = () => {};
    });
  }

  // Reconnect and replay audio that hasn't been transcribed yet, so nothing is silently lost.
  private async reconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    publish({ state: "reconnecting", pending: this.pending, message: this.recentError() });
    for (const delay of RECONNECT_DELAYS_MS) {
      await new Promise((r) => setTimeout(r, delay));
      if (this.closingOnPurpose || !this.ctx) break;
      try {
        await this.connectSocket();
        this.replay();
        this.reconnecting = false;
        this.refreshStatus();
        return;
      } catch (e: any) {
        warn("reconnect failed:", e?.message || e);
      }
    }
    this.reconnecting = false;
    this.lastFailAt = Date.now();
    const lost = this.pending;
    this.failedSegments += lost;
    this.awaitingAck = [];
    this.awaitingFinal.clear();
    this.fail(`Speech-to-text connection lost${lost ? ` (${lost} segment(s) not transcribed)` : ""}`);
    this.listener?.({ type: "closed" });
  }

  private replay() {
    const segments = [...this.awaitingAck, ...this.awaitingFinal.values()].sort((a, b) => a.id - b.id);
    this.awaitingAck = [];
    this.awaitingFinal.clear();
    for (const seg of segments) {
      for (const c of seg.chunks) this.ws?.send(c.slice().buffer);
      this.sendJson({ type: "commit" });
      this.awaitingAck.push({ ...seg, at: Date.now() });
    }
    for (const c of this.openChunks) this.ws?.send(c.slice().buffer);
    log(`reconnected: replayed ${segments.length} segment(s) and ${this.openChunks.length} open chunk(s)`);
    this.listener?.({ type: "replayed" });
  }

  private onServerMessage(msg: any) {
    if (msg.type === "committed") {
      const seg = this.awaitingAck.shift();
      if (seg) this.awaitingFinal.set(msg.seq, seg);
      log(`segment ${seg?.id ?? "?"} committed as seq ${msg.seq} (pending ${this.pending})`);
    } else if (msg.type === "commit_skipped") {
      this.awaitingAck.shift();
    } else if (msg.type === "final") {
      this.awaitingFinal.delete(msg.seq);
      this.lastFinalAt = Date.now();
      if (msg.failed) {
        this.failedSegments += 1;
        warn(`seq ${msg.seq} could not be transcribed`);
      }
      log(`final seq ${msg.seq} item ${msg.item_id || "-"}: ${String(msg.text || "").length} chars (pending ${this.pending})`);
    }
    this.refreshStatus();
    this.listener?.({ ...msg, epoch: this.epoch });
  }

  private startTicker() {
    if (this.ticker) return;
    this.ticker = setInterval(() => {
      const now = Date.now();
      // A segment that never gets its transcript must not block (or silently shorten) the answer.
      for (const [seq, seg] of this.awaitingFinal) {
        if (now - seg.at > PENDING_TIMEOUT_MS) {
          this.awaitingFinal.delete(seq);
          this.failedSegments += 1;
          warn(`seq ${seq}: no transcript after ${PENDING_TIMEOUT_MS / 1000}s`);
        }
      }
      while (this.awaitingAck.length && now - this.awaitingAck[0].at > PENDING_TIMEOUT_MS) {
        this.awaitingAck.shift();
        this.failedSegments += 1;
        warn("a commit was never acknowledged");
      }
      this.refreshStatus();
    }, 500);
  }

  private refreshStatus() {
    if (this.reconnecting) return publish({ state: "reconnecting", pending: this.pending, message: this.recentError() });
    if (this.lastError && Date.now() - this.lastErrorAt < 8000 && !this.speaking)
      return publish({ state: "error", message: this.lastError, pending: this.pending });
    if (!this.ready) return publish({ state: this.ctx ? "connecting" : "idle" });
    const base = { model: this.model, pending: this.pending };
    if (!this.enabled || this.muted) return publish({ state: this.pending ? "transcribing" : "connected", ...base });
    if (this.speaking) return publish({ state: "hearing", ...base });
    if (this.pending) return publish({ state: "transcribing", ...base });
    if (Date.now() - this.lastFinalAt < RECEIVED_SHOW_MS) return publish({ state: "received", ...base });
    return publish({ state: "listening", ...base });
  }

  private recentError(): string | undefined {
    return this.lastError && Date.now() - this.lastErrorAt < 30000 ? this.lastError : undefined;
  }

  private sendJson(payload: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  private sendContext() {
    const c = this.context;
    if (this.ready && (c.role || c.question || c.keywords?.length))
      this.sendJson({ type: "context", role: c.role, question: c.question, keywords: c.keywords || [], turn_id: c.turnId });
  }

  setContext(c: SttContext) {
    // Ignore empty values: they must never wipe a known session id, role or question.
    const given = Object.fromEntries(
      Object.entries(c).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ) as SttContext;
    if (given.sessionId !== undefined) given.sessionId = String(given.sessionId);
    const sessionChanged = given.sessionId !== undefined && given.sessionId !== this.context.sessionId;
    this.context = { ...this.context, ...given };
    if (given.sessionId) log(`interview session ${given.sessionId}`);
    if (sessionChanged && this.ws && this.connectedSession && this.connectedSession !== this.context.sessionId) {
      log("interview session changed: reconnecting");
      this.closeSocket();
    }
    this.sendContext();
  }

  setMuted(muted: boolean) {
    if (muted === this.muted) return;
    this.muted = muted;
    if (muted) {
      if (this.openChunks.length || this.packetLen) this.sendJson({ type: "clear" });
      this.openChunks = [];
      this.resetVoiceDetection();
    } else {
      // Start buffering right away (so a quick first word is kept), but let speech start only after the guard.
      this.resetVoiceDetection();
      this.guardUntil = Date.now() + RESUME_GUARD_MS;
      log(`listening again (guard ${RESUME_GUARD_MS} ms)`);
    }
    this.refreshStatus();
  }

  enable(listener: Listener) {
    this.listener = listener;
    this.resetVoiceDetection();
    this.enabled = true;
    this.refreshStatus();
  }

  disable(listener: Listener) {
    if (this.listener !== listener) return;
    this.listener = null;
    this.enabled = false;
    if (this.openChunks.length || this.packetLen) this.sendJson({ type: "clear" });
    this.openChunks = [];
    this.resetVoiceDetection();
    this.refreshStatus();
  }

  private resetVoiceDetection() {
    this.speaking = false;
    this.aboveMs = 0;
    this.silentMs = 0;
    this.segMs = 0;
    this.preroll = [];
    this.prerollMs = 0;
    this.packet = [];
    this.packetLen = 0;
  }

  private onFrame(raw: Float32Array) {
    if (!this.enabled || this.muted || !this.resampler) return;
    const f = this.resampler.process(raw);
    if (!f.length) return;
    const ms = (f.length / this.rate) * 1000;
    let sum = 0;
    for (let i = 0; i < f.length; i++) sum += f[i] * f[i];
    const rms = Math.sqrt(sum / f.length);
    const pcm = floatTo16(f);
    const startThreshold = Math.max(0.012, this.floor * 3.5);
    const keepThreshold = Math.max(0.008, this.floor * 2.2);

    if (!this.speaking && Date.now() < this.guardUntil) {
      // Just after Alex's voice ended: keep the audio as pre-roll, but don't treat it as speech yet.
      this.preroll.push(pcm);
      this.prerollMs += ms;
      while (this.prerollMs > PREROLL_MS && this.preroll.length > 1) {
        this.prerollMs -= (this.preroll.shift()!.length / this.rate) * 1000;
      }
      return;
    }

    if (!this.speaking) {
      this.floor = Math.max(0.002, this.floor * 0.97 + Math.min(rms, 0.05) * 0.03); // learn room noise
      this.preroll.push(pcm);
      this.prerollMs += ms;
      while (this.prerollMs > PREROLL_MS && this.preroll.length > 1) {
        this.prerollMs -= (this.preroll.shift()!.length / this.rate) * 1000;
      }
      if (rms > startThreshold) {
        this.aboveMs += ms;
        if (this.aboveMs >= START_MS) {
          this.speaking = true;
          this.silentMs = 0;
          this.segMs = 0;
          this.lastSpeechAt = Date.now();
          for (const p of this.preroll) this.queue(p);
          this.preroll = [];
          this.prerollMs = 0;
          log(`speech started (segment ${this.segId})`);
          this.refreshStatus();
        }
      } else {
        this.aboveMs = 0;
      }
      return;
    }

    this.queue(pcm);
    this.segMs += ms;
    if (rms >= keepThreshold) {
      this.silentMs = 0;
      this.lastSpeechAt = Date.now();
    } else {
      this.silentMs += ms;
    }
    if (this.silentMs >= SEGMENT_SILENCE_MS) {
      // Segment boundary only: the trailing silence is included; the answer may well continue.
      this.commit("pause");
      this.speaking = false;
      this.aboveMs = 0;
      this.refreshStatus();
    } else if (this.segMs >= MAX_SEGMENT_MS) {
      this.commit("max length");
      this.segMs = 0;
    }
  }

  private queue(p: Int16Array) {
    this.packet.push(p);
    this.packetLen += p.length;
    if (this.packetLen >= Math.round(this.rate / 10)) this.flush(); // ~100 ms per message
  }

  private flush() {
    if (!this.packetLen) return;
    const out = new Int16Array(this.packetLen);
    let offset = 0;
    for (const p of this.packet) {
      out.set(p, offset);
      offset += p.length;
    }
    this.packet = [];
    this.packetLen = 0;
    this.openChunks.push(out); // kept until transcribed, so it can be replayed after a reconnect
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(out.buffer);
  }

  private commit(reason: string) {
    this.flush();
    if (!this.openChunks.length) return;
    const seg: Segment = { id: this.segId++, chunks: this.openChunks, at: Date.now() };
    this.openChunks = [];
    this.awaitingAck.push(seg);
    this.sendJson({ type: "commit" });
    const ms = Math.round((seg.chunks.reduce((a, c) => a + c.length, 0) / this.rate) * 1000);
    log(`segment ${seg.id} committed (${reason}, ${ms} ms audio)`);
  }

  private closeSocket() {
    this.closingOnPurpose = true;
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.ready = false;
    this.closingOnPurpose = false;
  }

  shutdown() {
    this.enabled = false;
    this.muted = false;
    this.listener = null;
    this.closingOnPurpose = true;
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.ready = false;
    try {
      this.node?.disconnect();
    } catch {}
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.node = null;
    this.stream = null;
    this.ctx = null;
    this.resampler = null;
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    this.openChunks = [];
    this.awaitingAck = [];
    this.awaitingFinal.clear();
    this.resetVoiceDetection();
    this.closingOnPurpose = false;
    publish({ state: "idle" });
  }
}

const link = new SttLink();

/** Interview session, role, Alex's current question, technical keywords and turn id. */
export function setRealtimeSttContext(c: SttContext) {
  link.setContext(c);
}

/** Mute/unmute while keeping the session open (test interview: muted while Alex speaks or thinks). */
export function setRealtimeSttMuted(muted: boolean) {
  link.setMuted(muted);
}

/** What the answer-completion logic needs before it may submit. */
export function getRealtimeSttState() {
  return {
    speaking: link.speaking,
    pending: link.pending,
    lastSpeechAt: link.lastSpeechAt,
    failedSegments: link.failedSegments,
    lastFinalAt: link.lastFinalAt,
  };
}

/** Call after an answer was submitted (or dropped): failures are counted per answer. */
export function resetRealtimeSttAnswer() {
  link.failedSegments = 0;
}

/** Release the mic and close the connection (mic turned off, or leaving the screen). */
export function closeRealtimeStt() {
  link.shutdown();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => link.shutdown());
}

// ── Drop-in replacement for the browser's SpeechRecognition ───────────────
export class RealtimeSttRecognition {
  continuous = true;
  interimResults = true;
  lang = "en-US";
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  onend: (() => void) | null = null;

  private results: any[] = [];
  private indexByKey = new Map<string, number>();
  private active = false;
  private ended = false;
  private readonly handler: Listener = (msg) => this.onMessage(msg);

  start() {
    if (this.active || this.ended) return;
    this.active = true;
    const sinceFailure = Date.now() - link.lastFailAt;
    const wait = sinceFailure < RETRY_AFTER_FAILURE_MS ? RETRY_AFTER_FAILURE_MS - sinceFailure : 0;
    setTimeout(() => {
      if (!this.active) return;
      link
        .ensure()
        .then(() => {
          if (!this.active) return;
          link.enable(this.handler);
          this.onstart?.();
        })
        .catch((e) => {
          if (!this.active) return;
          this.onerror?.({ error: "network", message: String(e?.message || e) });
          this.finish();
        });
    }, wait);
  }

  stop() {
    this.abort();
  }

  abort() {
    if (!this.active) return;
    this.active = false;
    link.disable(this.handler);
    setTimeout(() => this.fireEnd(), 0);
  }

  private finish() {
    this.active = false;
    link.disable(this.handler);
    this.fireEnd();
  }

  private fireEnd() {
    if (this.ended) return;
    this.ended = true;
    this.onend?.();
  }

  private onMessage(msg: any) {
    if (!this.active) return;
    if (msg.type === "partial" || msg.type === "final") {
      const text = String(msg.text || "").trim();
      const key = `${msg.epoch}:${msg.seq}`;
      let idx = this.indexByKey.get(key);
      if (idx === undefined) {
        if (!text) return;
        idx = this.results.length;
        this.indexByKey.set(key, idx);
      }
      this.results[idx] = { 0: { transcript: text, confidence: 1 }, length: 1, isFinal: msg.type === "final" };
      this.onresult?.({ resultIndex: idx, results: this.results });
      return;
    }
    if (msg.type === "replayed") {
      // Segments are re-sent after a reconnect and come back under new ids: retire old partial text.
      for (let i = 0; i < this.results.length; i++) {
        if (this.results[i] && !this.results[i].isFinal) {
          this.results[i] = { 0: { transcript: "", confidence: 1 }, length: 1, isFinal: true };
        }
      }
      return;
    }
    if (msg.type === "closed") {
      this.onerror?.({ error: "network" });
      this.finish();
      return;
    }
    if (msg.type === "error") {
      this.onerror?.({ error: msg.code === "no_api_key" ? "service-not-allowed" : "network", message: msg.message });
    }
  }
}
