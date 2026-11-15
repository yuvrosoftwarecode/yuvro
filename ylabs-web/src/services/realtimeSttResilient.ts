/**
 * TEST mock interview only: speech-to-text with the Network Resilience Layer.
 * The real mock interview keeps using realtimeStt.ts (unchanged).
 *
 * Listening is IDENTICAL to realtimeStt.ts: same mic capture, resampling, voice detection (60 ms start,
 * 400 ms pre-roll, 700 ms segment pause, 15 s max segment), same mute/guard, same 3 s answer rule on
 * the page (it waits until every committed segment has its final transcript).
 * What is different is only what happens to the audio after it is captured:
 *   stt/audioBuffer.ts        numbered chunks, kept until transcribed, bounded (no unlimited growth)
 *   stt/sttTransport.ts       WebSocket protocol 2, heartbeat, slow vs lost, endless backoff+jitter reconnect
 *   stt/transcriptTracker.ts  one final per segment, late/duplicate transcripts ignored, pending count
 * After a reconnect a NEW Sarvam session is used (Sarvam can't resume one): every unfinished segment
 * is sent again from its start, then the segment still being spoken.
 */
import { useEffect, useState } from "react";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { Resampler, getSttWsUrl, TARGET_RATE, SEGMENT_SILENCE_MS, RESUME_GUARD_MS } from "@/services/realtimeStt";
import { AudioBuffer } from "@/services/stt/audioBuffer";
import { SttTransport, type ConnState } from "@/services/stt/sttTransport";
import { TranscriptTracker } from "@/services/stt/transcriptTracker";
import { NoiseGuard, NOISE_GUARD_ON } from "@/services/stt/noiseGuard";

export { ANSWER_SILENCE_MS } from "@/services/realtimeStt";

const env = import.meta.env as Record<string, string | undefined>;
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

const PREROLL_MS = 400;
const AUTO_GAIN = String(env.VITE_STT_AUTO_GAIN ?? "true").toLowerCase() !== "false";
/**
 * Noisy room: sound that keeps the mic "hearing" but produces no new words for this long no longer
 * holds the answer back (the answer is sent with what was said). 0 turns this off.
 */
const NO_WORDS_MS = num(env.VITE_STT_NO_WORDS_MS, 4000);
const NO_WORDS_START_GRACE_MS = 1500;
const FRAME_MS = 20;
const START_MS = 60;
const MAX_SEGMENT_MS = 15000;
/** Unfinished audio kept while offline (memory: 90 s of 16 kHz PCM16 is about 2.9 MB). */
const MAX_PENDING_AUDIO_MS = num(env.VITE_STT_MAX_PENDING_AUDIO_MS, 90000);
/** A segment fails only after waiting this long WHILE CONNECTED (time offline never counts). */
const TRANSCRIPT_TIMEOUT_MS = 20000;
const TRANSCRIPT_TIMEOUT_SLOW_MS = 35000;
const RECEIVED_SHOW_MS = 1500;
const RECOVERED_SHOW_MS = 4000;
const FIRST_CONNECT_WAIT_MS = 4000;
const debugChunks = () => {
  try {
    return localStorage.getItem("vitarkaSttDebug") === "1" && vitarkaDebug();
  } catch {
    return false;
  }
};

export type SttContext = {
  sessionId?: string;
  interviewId?: string;
  role?: string;
  question?: string;
  keywords?: string[];
  turnId?: string;
};

let ids = "";
const vitarkaDebug = () => {
  try {
    return localStorage.getItem("vitarkaDebug") === "1";
  } catch {
    return false;
  }
};
// Quiet by default; localStorage.vitarkaDebug = "1" shows the detailed speech-to-text log.
const log = (...a: unknown[]) => {
  if (vitarkaDebug()) console.info(`[Vitarka STT${ids}]`, ...a);
};
const warn = (...a: unknown[]) => {
  if (vitarkaDebug()) console.warn(`[Vitarka STT${ids}]`, ...a);
};

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

async function freshAccessToken(force = false): Promise<string> {
  let token = localStorage.getItem("access") || "";
  if (force || !token || tokenExpiresInMs(token) < 60000) {
    try {
      await yhubApiAuthUtil.get("/mock-interviews/quota/");
    } catch {}
    token = localStorage.getItem("access") || "";
    log("login token renewed before connecting");
  }
  return token;
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
export type ConnectionView = "connected" | "slow" | "lost" | "reconnecting" | "recovered" | "offline-queue-full";
export type SttStatus = {
  state: "idle" | "connecting" | "connected" | "listening" | "hearing" | "transcribing" | "received" | "reconnecting" | "error";
  message?: string;
  model?: string;
  pending?: number;
  /** Network resilience view for the connection banner. */
  conn?: ConnectionView;
  attempt?: number;
  pendingAudioSec?: number;
  /** Part of the answer was lost (connection): ask the learner to say it again. */
  needsRepeat?: boolean;
  /** Background sounds keep being picked up (noise guard): suggest a headset / quieter place. */
  noisy?: boolean;
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

class ResilientSttLink {
  model = "";
  rate = TARGET_RATE;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private resampler: Resampler | null = null;
  private listener: Listener | null = null;
  private enabled = false;
  muted = false;
  private guardUntil = 0;
  private context: SttContext = {};
  private connectedSession = "";
  private lastError = "";
  private lastErrorAt = 0;
  private recoveredAt = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private opening: Promise<void> | null = null;
  private overflowReported = false;
  private needsRepeatAt = 0;
  private answerHasText = false;
  transcribeLatencyMs = 0;

  // voice detection (identical to realtimeStt.ts)
  private floor = 0.004;
  speaking = false;
  lastSpeechAt = 0;
  lastFinalAt = 0;
  failedSegments = 0;
  private aboveMs = 0;
  private silentMs = 0;
  private segMs = 0;
  // Words evidence from the transcripts (used to tell background noise from the learner's speech).
  lastTextChangeAt = 0;
  lastSpeechStartAt = 0;
  private partialsSeen = false;
  private lastPartial = new Map<number, string>();
  /** Background-noise guard: decides when speech starts (see stt/noiseGuard.ts). */
  readonly guard = new NoiseGuard();
  private preroll: Int16Array[] = [];
  private prerollMs = 0;
  private packet: Int16Array[] = [];
  private packetLen = 0;

  readonly buffer = new AudioBuffer(TARGET_RATE, MAX_PENDING_AUDIO_MS);
  readonly tracker = new TranscriptTracker();
  readonly transport = new SttTransport({
    url: () => getSttWsUrl(),
    sessionId: () => this.waitForSession(),
    token: (force) => freshAccessToken(!!force),
    onReady: (msg, isReconnect) => this.onReady(msg, isReconnect),
    onMessage: (msg) => this.onServerMessage(msg),
    onState: (s) => this.onConnState(s),
    onError: (m) => this.setError(m),
    log,
    warn,
  });

  get pending() {
    return this.tracker.pending;
  }

  ensure(): Promise<void> {
    if (this.ctx && this.transport.state !== "idle") return Promise.resolve();
    if (!this.opening) {
      this.opening = this.open().finally(() => {
        this.opening = null;
      });
    }
    return this.opening;
  }

  private async open() {
    publish({ state: "connecting" });
    // Learn the provider's sample rate from the first session if it comes quickly; listening starts
    // either way (offline audio is buffered and sent when the connection comes up).
    await this.transport.start(FIRST_CONNECT_WAIT_MS);
    if (!this.ctx) await this.openMic();
    if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
    this.startTicker();
    this.refreshStatus();
  }

  private async openMic() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      // autoGainControl stays on by default (a quiet mic must still be heard); VITE_STT_AUTO_GAIN=false turns it off.
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: AUTO_GAIN },
    });
    const deviceRate = this.stream.getAudioTracks()[0]?.getSettings?.().sampleRate;
    let ctx: AudioContext;
    let source: MediaStreamAudioSourceNode;
    let mode: string;
    try {
      ctx = new AudioContext({ sampleRate: this.rate });
      source = ctx.createMediaStreamSource(this.stream);
      mode = `browser resampling to ${this.rate} Hz`;
    } catch {
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

  private async waitForSession(timeoutMs = 10000): Promise<string> {
    const until = Date.now() + timeoutMs;
    while (!this.context.sessionId && Date.now() < until) await new Promise((r) => setTimeout(r, 200));
    return this.context.sessionId || "";
  }

  // ── new server session: replay what has not been transcribed yet ──
  private onReady(msg: any, isReconnect: boolean) {
    this.model = [msg.provider, msg.model].filter(Boolean).join(" ") || "";
    const rate = Number(msg.sample_rate) > 0 ? Number(msg.sample_rate) : this.rate;
    if (rate !== this.rate) {
      this.rate = rate;
      this.buffer.setRate(rate);
      if (this.ctx) this.resampler = new Resampler(this.ctx.sampleRate, rate);
    }
    this.connectedSession = this.context.sessionId || "";
    if (isReconnect) this.recoveredAt = Date.now();
    log(`connected: model ${this.model}, session ${this.connectedSession}, protocol ${msg.proto || 1}`);
    this.sendContext();
    let segments = 0;
    let chunks = 0;
    for (const seg of this.buffer.committedSegments()) {
      if (!this.tracker.isOpen(seg.id)) continue;
      for (const c of seg.chunks) this.transport.sendChunk(c.segment, c.seq, c.pcm);
      this.transport.sendJson({ type: "commit", segment: seg.id });
      seg.replays++;
      seg.waitedMs = 0;
      segments++;
      chunks += seg.chunks.length;
    }
    const open = this.buffer.openSegment();
    if (open) {
      for (const c of open.chunks) this.transport.sendChunk(c.segment, c.seq, c.pcm);
      chunks += open.chunks.length;
    }
    if (segments || chunks) {
      this.transport.sendJson({ type: "replay", segments, chunks });
      log(`replayed ${segments} unfinished segment(s) and ${chunks} chunk(s) into the new session`);
      this.listener?.({ type: "replayed" });
    }
    this.refreshStatus();
  }

  private onConnState(s: ConnState) {
    if (s === "lost") warn(`connection lost; ${this.pending} segment(s) and ${(this.buffer.pendingAudioMs() / 1000).toFixed(1)} s of audio kept for replay`);
    this.refreshStatus();
  }

  private setError(message: string) {
    this.lastError = message;
    this.lastErrorAt = Date.now();
    warn(message);
    this.refreshStatus();
  }

  private onServerMessage(msg: any) {
    const segment = typeof msg.segment === "number" ? msg.segment : null;
    if (msg.type === "ack") {
      this.buffer.ack(msg.chunk);
      if (debugChunks()) log(`ack chunk ${msg.chunk} (delay ${this.transport.ackDelayMs} ms, unacked ${this.buffer.unackedChunks()})`);
      return;
    }
    if (msg.type === "committed") {
      if (segment !== null) {
        const seg = this.buffer.get(segment);
        log(`segment ${segment} committed as seq ${msg.seq}${msg.duplicate ? " (duplicate commit ignored by server)" : ""} (pending ${this.pending})`);
        if (seg && debugChunks()) log(`segment ${segment}: chunks ${seg.chunks[0]?.seq}-${seg.chunks[seg.chunks.length - 1]?.seq}, ${Math.round(seg.audioMs)} ms audio`);
      }
    } else if (msg.type === "commit_skipped") {
      if (segment !== null) {
        this.tracker.skipped(segment);
        this.buffer.release(segment);
      }
    } else if (msg.type === "partial") {
      if (segment === null || !this.tracker.acceptPartial(segment)) return;
      const partialText = String(msg.text || "").trim();
      if (partialText) {
        this.partialsSeen = true;
        if (partialText !== this.lastPartial.get(segment)) {
          this.lastPartial.set(segment, partialText);
          this.lastTextChangeAt = Date.now();
          if (this.lastPartial.size > 20) this.lastPartial.delete(this.lastPartial.keys().next().value as number);
        }
      }
    } else if (msg.type === "final") {
      if (segment === null) return;
      if (!this.tracker.acceptFinal(segment)) {
        warn(`segment ${segment}: ${this.tracker.isOpen(segment) ? "" : "duplicate or late "}transcript ignored`);
        return;
      }
      const seg = this.buffer.release(segment);
      this.lastFinalAt = Date.now();
      const finalText = String(msg.text || "").trim();
      if (finalText) {
        this.answerHasText = true;
        // Only NEW words restart the "no new words" clock (a final that repeats the live text doesn't).
        if (finalText !== this.lastPartial.get(segment)) this.lastTextChangeAt = Date.now();
      }
      this.lastPartial.delete(segment);
      if (NOISE_GUARD_ON && !msg.failed) this.guard.final(segment, String(msg.text || ""), Date.now());
      if (seg) this.transcribeLatencyMs = Date.now() - seg.committedAt;
      if (msg.failed) {
        this.failedSegments += 1;
        warn(`segment ${segment} could not be transcribed`);
      }
      log(
        `final segment ${segment}: ${String(msg.text || "").length} chars, ${this.transcribeLatencyMs} ms after commit${seg?.replays ? `, after ${seg.replays} replay(s)` : ""} (pending ${this.pending})`
      );
      this.tracker.prune(segment - 50);
    } else if (msg.type === "error") {
      // e.g. Sarvam closed its session: the server closes the socket next and we reconnect + replay.
    }
    this.refreshStatus();
    this.listener?.({ ...msg, key: segment !== null ? `s${segment}` : undefined });
  }

  private startTicker() {
    if (this.ticker) return;
    this.ticker = setInterval(() => {
      this.closeNoisyOpenSegment();
      const up = this.transport.isUp();
      const slow = this.transport.state === "slow";
      for (const seg of this.buffer.committedSegments()) {
        if (!this.tracker.isOpen(seg.id)) continue;
        if (!up) continue; // time offline never counts: the audio stays for replay
        seg.waitedMs += 500;
        if (seg.waitedMs > (slow ? TRANSCRIPT_TIMEOUT_SLOW_MS : TRANSCRIPT_TIMEOUT_MS)) {
          this.tracker.fail(seg.id);
          this.buffer.release(seg.id);
          this.partLost(`segment ${seg.id}: no transcript after ${Math.round(seg.waitedMs / 1000)} s connected`);
        }
      }
      if (this.buffer.overflowed && !this.overflowReported) {
        this.overflowReported = true;
        this.partLost(`offline audio limit reached (${MAX_PENDING_AUDIO_MS / 1000} s): new speech is not being captured until the connection is back`, true);
      }
      if (!this.buffer.overflowed) this.overflowReported = false;
      // Every lost part has failed and nothing of this answer was transcribed: there is no half answer
      // to protect, so the repeated answer may be submitted normally.
      if (this.failedSegments && !this.answerHasText && !this.tracker.pending && !this.buffer.pendingAudioMs() && !this.buffer.overflowed) {
        this.failedSegments = 0;
      }
      this.refreshStatus();
    }, 500);
  }

  /**
   * Part of the answer could not be captured/transcribed. The learner is always told to repeat it.
   * If any other part of this answer is (or will be) transcribed, auto-submit is blocked (never send
   * half an answer; the text stays on screen and Send submits it). If nothing else exists, the
   * repeated answer simply becomes the answer.
   */
  private partLost(why: string, force = false) {
    this.needsRepeatAt = Date.now();
    // Block auto-submit if any other part of this answer is (or will be) transcribed.
    const block = force || this.answerHasText || this.tracker.pending > 0 || this.buffer.pendingAudioMs() > 0;
    if (block) this.failedSegments += 1;
    warn(`${why}; learner asked to repeat${block ? " (auto-submit blocked)" : ""}`);
  }

  resetAnswer() {
    this.failedSegments = 0;
    this.answerHasText = false;
    this.needsRepeatAt = 0;
  }

  connectionView(): ConnectionView {
    if (this.buffer.overflowed) return "offline-queue-full";
    const s = this.transport.state;
    if (s === "lost") return "lost";
    if (s === "reconnecting" || s === "connecting") return this.transport.reconnects || this.transport.disconnectedAt ? "reconnecting" : "connected";
    if (s === "slow") return "slow";
    if (Date.now() - this.recoveredAt < RECOVERED_SHOW_MS) return "recovered";
    return "connected";
  }

  private refreshStatus() {
    const conn = this.connectionView();
    const extra = {
      conn,
      attempt: conn === "reconnecting" || conn === "lost" ? (this.transport as any).attempt || 0 : undefined,
      pendingAudioSec: Math.round(this.buffer.pendingAudioMs() / 100) / 10,
      needsRepeat: !!this.needsRepeatAt && Date.now() - this.needsRepeatAt < 20000 && !this.speaking ? true : undefined,
      noisy:
        NOISE_GUARD_ON && this.enabled && !this.muted && (this.guard.noisy(Date.now()) || this.answerState().backgroundNoise)
          ? true
          : undefined,
    };
    const up = this.transport.isUp();
    if (!up && this.transport.state !== "idle" && (this.transport.disconnectedAt || this.transport.reconnects)) {
      return publish({ state: "reconnecting", pending: this.pending, message: this.recentError(), ...extra });
    }
    if (this.lastError && Date.now() - this.lastErrorAt < 8000 && !this.speaking)
      return publish({ state: "error", message: this.lastError, pending: this.pending, ...extra });
    if (!up) return publish({ state: this.ctx ? "connecting" : "idle", ...extra });
    const base = { model: this.model, pending: this.pending, ...extra };
    if (!this.enabled || this.muted) return publish({ state: this.pending ? "transcribing" : "connected", ...base });
    if (this.speaking) return publish({ state: "hearing", ...base });
    if (this.pending) return publish({ state: "transcribing", ...base });
    if (Date.now() - this.lastFinalAt < RECEIVED_SHOW_MS) return publish({ state: "received", ...base });
    return publish({ state: "listening", ...base });
  }

  private recentError(): string | undefined {
    return this.lastError && Date.now() - this.lastErrorAt < 30000 ? this.lastError : undefined;
  }

  private sendContext() {
    const c = this.context;
    if (c.role || c.question || c.keywords?.length)
      this.transport.sendJson({ type: "context", role: c.role, question: c.question, keywords: c.keywords || [], turn_id: c.turnId });
  }

  setContext(c: SttContext) {
    const given = Object.fromEntries(
      Object.entries(c).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ) as SttContext;
    if (given.sessionId !== undefined) given.sessionId = String(given.sessionId);
    const sessionChanged = given.sessionId !== undefined && given.sessionId !== this.context.sessionId;
    this.context = { ...this.context, ...given };
    ids = ` interview=${this.context.interviewId || "?"} session=${this.context.sessionId || "?"} turn=${this.context.turnId || "?"}`;
    if (given.sessionId) log(`interview session ${given.sessionId}`);
    if (sessionChanged && this.connectedSession && this.connectedSession !== this.context.sessionId) {
      this.transport.restart("interview session changed");
    }
    this.sendContext();
  }

  setMuted(muted: boolean) {
    if (muted === this.muted) return;
    this.muted = muted;
    if (muted) {
      if (this.buffer.hasOpen() || this.packetLen) this.transport.sendJson({ type: "clear" });
      this.buffer.clearOpen();
      this.resetVoiceDetection();
    } else {
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
    if (this.buffer.hasOpen() || this.packetLen) this.transport.sendJson({ type: "clear" });
    this.buffer.clearOpen();
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
    this.guard.resetDetection();
  }

  private trimPreroll(limitMs: number) {
    while (this.prerollMs > limitMs && this.preroll.length > 1) {
      this.prerollMs -= (this.preroll.shift()!.length / this.rate) * 1000;
    }
  }

  private beginSpeech(note = "") {
    this.speaking = true;
    this.silentMs = 0;
    this.segMs = 0;
    this.lastSpeechAt = Date.now();
    this.lastSpeechStartAt = this.lastSpeechAt;
    for (const p of this.preroll) this.queue(p);
    this.preroll = [];
    this.prerollMs = 0;
    log(`speech started${note}`);
    this.needsRepeatAt = 0;
    this.refreshStatus();
  }

  // ── voice detection: same as realtimeStt.ts once speech has started; the START decision goes
  //    through the background-noise guard (stt/noiseGuard.ts) unless VITE_STT_NOISE_GUARD=false ──
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
      this.preroll.push(pcm);
      this.prerollMs += ms;
      while (this.prerollMs > PREROLL_MS && this.preroll.length > 1) {
        this.prerollMs -= (this.preroll.shift()!.length / this.rate) * 1000;
      }
      return;
    }

    if (!this.speaking) {
      if (!NOISE_GUARD_ON || this.guard.learnFloor(rms > startThreshold)) {
        this.floor = Math.max(0.002, this.floor * 0.97 + Math.min(rms, 0.05) * 0.03); // learn room noise
      }
      this.preroll.push(pcm);
      this.prerollMs += ms;
      if (NOISE_GUARD_ON) {
        this.trimPreroll(this.guard.prerollKeepMs());
        const decision = this.guard.frame(rms, ms, startThreshold, Date.now());
        if (decision !== "none") {
          this.trimPreroll(this.guard.startPrerollMs(decision));
          this.beginSpeech(decision === "weak-start" ? " (quiet but sustained)" : "");
        }
        return;
      }
      this.trimPreroll(PREROLL_MS);
      if (rms > startThreshold) {
        this.aboveMs += ms;
        if (this.aboveMs >= START_MS) this.beginSpeech();
      } else {
        this.aboveMs = 0;
      }
      return;
    }

    // In a noisy room only sound near the learner's own level counts as their voice (noise guard).
    const voiced = NOISE_GUARD_ON ? this.guard.speechFrame(rms, ms, keepThreshold) : rms >= keepThreshold;
    this.queue(pcm);
    this.segMs += ms;
    if (voiced) {
      this.silentMs = 0;
      this.lastSpeechAt = Date.now();
    } else {
      this.silentMs += ms;
    }
    if (this.silentMs >= SEGMENT_SILENCE_MS) {
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
    if (this.packetLen >= Math.round(this.rate / 10)) this.flush();
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
    const chunk = this.buffer.add(out, Date.now());
    if (!chunk) return; // offline limit reached: reported by the ticker (blocks auto-submit)
    const sent = this.transport.sendChunk(chunk.segment, chunk.seq, chunk.pcm);
    if (debugChunks()) log(`chunk ${chunk.seq} (segment ${chunk.segment}) ${sent ? "sent" : "buffered (offline)"} at ${chunk.at}`);
  }

  private commit(reason: string) {
    this.flush();
    const seg = this.buffer.commitOpen(Date.now());
    if (!seg) return;
    this.tracker.committed(seg.id);
    if (NOISE_GUARD_ON) this.guard.committed(seg.id);
    const sent = this.transport.sendJson({ type: "commit", segment: seg.id });
    log(`segment ${seg.id} committed (${reason}, ${Math.round(seg.audioMs)} ms audio, chunks ${seg.chunks[0].seq}-${seg.chunks[seg.chunks.length - 1].seq})${sent ? "" : " - offline, kept for replay"}`);
  }

  /**
   * Noisy room: the learner's last words are in a segment that background sound keeps open. Close that
   * segment so its words get their final transcript and the answer can be sent (listening continues
   * in a new segment; nothing is discarded). Called before the answer state is read, so the answer is
   * never sent without those words.
   */
  closeNoisyOpenSegment() {
    const openSeg = this.buffer.openSegment();
    if (this.speaking && openSeg && this.lastPartial.has(openSeg.id) && this.answerState().backgroundNoise) {
      this.commit("no new words: background noise");
      this.segMs = 0;
    }
  }

  /**
   * What the answer-completion logic and the silence check-ins see.
   * Normally: the microphone's own view (speaking / time of last voice).
   * Noisy room: if sound keeps coming but the transcripts have shown no new words for NO_WORDS_MS,
   * that sound is background noise: it no longer counts as the learner speaking, and "last speech"
   * is the time of the last new words. Only used when live transcripts work and the connection is fine.
   */
  answerState() {
    const now = Date.now();
    let speaking = this.speaking;
    let lastSpeechAt = this.lastSpeechAt;
    const noWords =
      NOISE_GUARD_ON &&
      NO_WORDS_MS > 0 &&
      this.partialsSeen &&
      this.transport.state === "connected" &&
      this.lastTextChangeAt > 0 &&
      now - this.lastTextChangeAt >= NO_WORDS_MS &&
      now - this.lastSpeechStartAt >= NO_WORDS_START_GRACE_MS &&
      (this.speaking || this.lastSpeechAt > this.lastTextChangeAt);
    if (noWords) {
      speaking = false;
      lastSpeechAt = Math.min(this.lastSpeechAt, this.lastTextChangeAt);
    }
    return { speaking, lastSpeechAt, backgroundNoise: noWords };
  }

  health() {
    const t = this.transport;
    return {
      conn: this.connectionView(),
      transport: t.state,
      disconnectedMs: t.disconnectedAt ? Date.now() - t.disconnectedAt : 0,
      rttMs: t.rttMs,
      ackDelayMs: t.ackDelayMs,
      pendingAudioMs: Math.round(this.buffer.pendingAudioMs()),
      queuedChunks: this.buffer.chunkCount(),
      unackedChunks: this.buffer.unackedChunks(),
      pendingSegments: this.pending,
      transcribeLatencyMs: this.transcribeLatencyMs,
      reconnects: t.reconnects,
      duplicatesIgnored: this.tracker.duplicates,
      lateIgnored: this.tracker.lateIgnored,
      overflowed: this.buffer.overflowed,
      noise: { ...this.guard.stats(Date.now()), liveTranscripts: this.partialsSeen, backgroundNoise: this.answerState().backgroundNoise },
    };
  }

  shutdown() {
    this.enabled = false;
    this.muted = false;
    this.listener = null;
    this.transport.stop();
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
    this.buffer.reset();
    this.tracker.reset();
    this.resetVoiceDetection();
    this.guard.resetAll();
    this.lastTextChangeAt = 0;
    this.lastSpeechStartAt = 0;
    this.partialsSeen = false;
    this.lastPartial.clear();
    publish({ state: "idle" });
  }
}

const link = new ResilientSttLink();

export function setRealtimeSttContext(c: SttContext) {
  link.setContext(c);
}

export function setRealtimeSttMuted(muted: boolean) {
  link.setMuted(muted);
}

export function getRealtimeSttState() {
  link.closeNoisyOpenSegment();
  const a = link.answerState();
  return {
    speaking: a.speaking,
    pending: link.pending,
    lastSpeechAt: a.lastSpeechAt,
    failedSegments: link.failedSegments,
    lastFinalAt: link.lastFinalAt,
  };
}

/** Network health for the page (timer pause, watchdog hold) and diagnostics. */
export function getSttNetworkHealth() {
  return link.health();
}

export function resetRealtimeSttAnswer() {
  link.resetAnswer();
}

export function closeRealtimeStt() {
  link.shutdown();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => link.shutdown());
  (window as any).vitarkaStt = { health: () => link.health() };
}

// ── Drop-in replacement for the browser's SpeechRecognition (same as realtimeStt.ts) ──
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
    if ((msg.type === "partial" || msg.type === "final") && msg.key) {
      // Keyed by the client's segment id, which survives reconnects: a replayed segment's new
      // transcript replaces its old partial text instead of being added twice.
      const text = String(msg.text || "").trim();
      let idx = this.indexByKey.get(msg.key);
      if (idx === undefined) {
        if (!text && msg.type === "partial") return;
        idx = this.results.length;
        this.indexByKey.set(msg.key, idx);
      }
      this.results[idx] = { 0: { transcript: text, confidence: 1 }, length: 1, isFinal: msg.type === "final" };
      this.onresult?.({ resultIndex: idx, results: this.results });
      return;
    }
    if (msg.type === "error") {
      this.onerror?.({ error: msg.code === "no_api_key" ? "service-not-allowed" : "network", message: msg.message });
    }
  }
}
