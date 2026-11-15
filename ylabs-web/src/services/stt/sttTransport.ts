/**
 * TEST interview network resilience, module 2 of 3: network delivery to the Yuvro voice service.
 *
 * - One WebSocket (protocol 2: every audio chunk carries its segment id and sequence number).
 * - Heartbeat: a ping every HEARTBEAT_MS (1.5 s). If nothing at all arrives for LOST_AFTER_MS the connection
 *   is treated as lost even without a close event (frozen Wi-Fi / mobile connections), closed and
 *   reopened.
 * - Slow vs lost: slow = still answering but late (round trip, acknowledgement delay or unsent data
 *   building up); lost = no answer / closed. Only "lost" triggers a reconnect.
 * - Reconnection never gives up while listening: exponential backoff with jitter (0.5 s .. 10 s),
 *   immediate retry when the browser reports it is back online. The login token is renewed when
 *   the server rejects it.
 * The caller (realtimeSttResilient.ts) replays unfinished audio in onReady of every new session.
 */

export type ConnState = "idle" | "connecting" | "connected" | "slow" | "lost" | "reconnecting";

export type TransportHooks = {
  url: () => string;
  sessionId: () => Promise<string>;
  token: (force?: boolean) => Promise<string>;
  onReady: (msg: any, isReconnect: boolean) => void;
  onMessage: (msg: any) => void;
  onState: (state: ConnState) => void;
  onError: (message: string) => void;
  log: (...a: unknown[]) => void;
  warn: (...a: unknown[]) => void;
};

const HEARTBEAT_MS = 1500;
const LOST_AFTER_MS = 4500;
const SLOW_RTT_MS = 1500;
const SLOW_SILENCE_MS = 2500;
const SLOW_BUFFERED_BYTES = 256 * 1024; // ~8 s of 16 kHz audio waiting in the browser's send buffer
const CONNECT_TIMEOUT_MS = 10000;
const BACKOFF_BASE_MS = 500;
const BACKOFF_MAX_MS = 10000;
/** The backoff starts again from the shortest delay only after a connection stayed up this long. */
const STABLE_MS = 4000;

export class SttTransport {
  state: ConnState = "idle";
  ws: WebSocket | null = null;
  rttMs = 0;
  ackDelayMs = 0;
  reconnects = 0;
  disconnectedAt = 0;
  lastHeard = 0;
  private wanted = false;
  private attempt = 0;
  private opening: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private sentAt = new Map<number, number>();
  private everConnected = false;
  private readyAt = 0;
  private readonly onOnline = () => {
    if (!this.wanted || this.isUp()) return;
    this.hooks.log("browser is back online: reconnecting now");
    this.attempt = 0;
    this.retryNow("back online");
  };
  private readonly onOffline = () => {
    if (!this.wanted) return;
    this.hooks.warn("browser reports offline");
    this.drop("browser offline");
  };

  constructor(private hooks: TransportHooks) {}

  isUp(): boolean {
    return (this.state === "connected" || this.state === "slow") && !!this.ws && this.ws.readyState === 1;
  }

  /** Start keeping the connection alive. Resolves after the first successful connect or after waitMs. */
  start(waitMs: number): Promise<void> {
    if (!this.wanted) {
      this.wanted = true;
      if (typeof window !== "undefined" && (window as any).addEventListener) {
        window.addEventListener("online", this.onOnline);
        window.addEventListener("offline", this.onOffline);
      }
      this.heartbeat = setInterval(() => this.tick(), HEARTBEAT_MS);
    }
    if (this.isUp()) return Promise.resolve();
    const first = this.opening || this.connectOnce().catch((e) => {
      this.hooks.warn("connect failed:", e?.message || e);
      this.scheduleRetry(e?.message || String(e));
    });
    return Promise.race([first, new Promise<void>((r) => setTimeout(r, waitMs))]);
  }

  stop() {
    this.wanted = false;
    if (typeof window !== "undefined" && (window as any).removeEventListener) {
      window.removeEventListener("online", this.onOnline);
      window.removeEventListener("offline", this.onOffline);
    }
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close();
    } catch {}
    this.sentAt.clear();
    this.setState("idle");
  }

  /** Reopen with a different interview session (keeps buffered audio). */
  restart(reason: string) {
    this.hooks.log(`reconnecting: ${reason}`);
    this.drop(reason, true);
  }

  sendChunk(segment: number, seq: number, pcm: Int16Array): boolean {
    if (!this.isUp()) return false;
    const out = new ArrayBuffer(8 + pcm.byteLength);
    const view = new DataView(out);
    view.setUint32(0, segment, true);
    view.setUint32(4, seq, true);
    new Int16Array(out, 8).set(pcm);
    this.ws!.send(out);
    this.sentAt.set(seq, Date.now());
    if (this.sentAt.size > 3000) this.sentAt.delete(this.sentAt.keys().next().value as number);
    return true;
  }

  sendJson(payload: object): boolean {
    if (!this.isUp()) return false;
    this.ws!.send(JSON.stringify(payload));
    return true;
  }

  bufferedBytes(): number {
    return this.ws?.bufferedAmount || 0;
  }

  private setState(s: ConnState) {
    if (s === this.state) return;
    this.state = s;
    this.hooks.onState(s);
  }

  private retryNow(reason: string) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.opening) return;
    this.connectOnce().catch((e) => {
      this.hooks.warn("reconnect failed:", e?.message || e);
      this.scheduleRetry(e?.message || reason);
    });
  }

  private scheduleRetry(reason: string) {
    if (!this.wanted || this.retryTimer || this.opening) return;
    if (!this.disconnectedAt) this.disconnectedAt = Date.now();
    const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** this.attempt);
    const delay = Math.round(base / 2 + Math.random() * (base / 2)); // jitter: spread reconnects of many learners
    this.attempt++;
    this.setState("reconnecting");
    this.hooks.log(`reconnect attempt ${this.attempt} in ${delay} ms (${reason})`);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.wanted) this.retryNow(reason);
    }, delay);
  }

  /** Connection gone (closed, frozen or offline): forget the socket and reconnect. */
  private drop(reason: string, immediate = false) {
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = null;
      ws.onmessage = null;
      try {
        ws.close();
      } catch {}
    }
    this.sentAt.clear();
    if (!this.wanted) return;
    if (!this.disconnectedAt) this.disconnectedAt = Date.now();
    this.setState("lost");
    if (immediate) {
      this.attempt = 0;
      this.retryNow(reason);
    } else {
      this.scheduleRetry(reason);
    }
  }

  private tick() {
    if (!this.wanted || !this.ws || this.ws.readyState !== 1) return;
    const now = Date.now();
    if (this.attempt && now - this.readyAt >= STABLE_MS && (this.state === "connected" || this.state === "slow")) this.attempt = 0;
    if (this.state === "connected" || this.state === "slow") {
      if (now - this.lastHeard > LOST_AFTER_MS) {
        this.hooks.warn(`no answer from the voice service for ${Math.round((now - this.lastHeard) / 1000)} s: connection treated as lost`);
        this.drop("heartbeat timeout");
        return;
      }
      const slow =
        this.rttMs > SLOW_RTT_MS ||
        this.ackDelayMs > SLOW_RTT_MS * 1.5 ||
        now - this.lastHeard > SLOW_SILENCE_MS ||
        this.bufferedBytes() > SLOW_BUFFERED_BYTES;
      this.setState(slow ? "slow" : "connected");
    }
    try {
      this.ws.send(JSON.stringify({ type: "ping", t: now }));
    } catch {}
  }

  private async connectOnce(): Promise<void> {
    if (this.opening) return this.opening;
    this.opening = (async () => {
      if (this.state !== "reconnecting") this.setState(this.everConnected ? "reconnecting" : "connecting");
      try {
        await this.openSocket(false);
      } catch (e: any) {
        if (!e?.authFailed) throw e;
        this.hooks.log("login token rejected; renewing and retrying");
        await this.openSocket(true);
      }
    })().finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  private async openSocket(renewToken: boolean): Promise<void> {
    const sessionId = await this.hooks.sessionId();
    if (!sessionId) throw new Error("Interview session not started yet (no session id from the interview screen)");
    const token = await this.hooks.token(renewToken);
    return new Promise((resolve, reject) => {
      const url = `${this.hooks.url()}?token=${encodeURIComponent(token)}&interview_session_id=${encodeURIComponent(sessionId)}&proto=2`;
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
        if (this.ws === ws) this.lastHeard = Date.now();
        if (msg.type === "ready") {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const isReconnect = this.everConnected;
          this.ws = ws;
          this.lastHeard = Date.now();
          this.readyAt = Date.now();
          if (!isReconnect) this.attempt = 0; // after a reconnect: reset once the connection proved stable (tick)
          this.rttMs = 0;
          this.ackDelayMs = 0;
          if (isReconnect) this.reconnects++;
          const downMs = this.disconnectedAt ? Date.now() - this.disconnectedAt : 0;
          this.disconnectedAt = 0;
          this.everConnected = true;
          this.setState("connected");
          if (isReconnect) this.hooks.log(`reconnected after ${(downMs / 1000).toFixed(1)} s (reconnect #${this.reconnects})`);
          this.hooks.onReady(msg, isReconnect);
          resolve();
          return;
        }
        if (msg.type === "error" && !settled) {
          settled = true;
          clearTimeout(timer);
          reject(Object.assign(new Error(msg.message || msg.code), { authFailed: msg.code === "not_authenticated" }));
          return;
        }
        if (this.ws !== ws) return;
        if (msg.type === "pong") {
          if (typeof msg.t === "number") this.rttMs = Date.now() - msg.t;
          return;
        }
        if (msg.type === "ack") {
          const sent = this.sentAt.get(msg.chunk);
          if (sent) this.ackDelayMs = Date.now() - sent;
          for (const k of this.sentAt.keys()) {
            if (k > msg.chunk) break;
            this.sentAt.delete(k);
          }
        }
        if (msg.type === "error") this.hooks.onError(msg.message || msg.code);
        this.hooks.onMessage(msg);
      };

      ws.onclose = (ev) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          const why =
            ev.code === 4401
              ? "Not logged in (token expired?)"
              : ev.code === 4403
              ? "This interview session isn't yours or doesn't exist"
              : `Speech-to-text connection closed (${ev.code})`;
          reject(Object.assign(new Error(why), { authFailed: ev.code === 4401 }));
          return;
        }
        if (this.ws !== ws) return;
        this.hooks.warn(`connection lost (${ev.code})`);
        this.drop(`closed ${ev.code}`);
      };
      ws.onerror = () => {};
    });
  }
}
