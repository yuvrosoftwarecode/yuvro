/**
 * Mock interview speech-to-text: background-noise guard (decides when "speech started").
 *
 * Before: any sound above the room's quiet level for 60 ms started a speech segment, so clicks, door
 * slams, barking or a TV in another room were sent for transcription.
 * Now:
 *  1. Sustained sound: speech starts only after START_NEED_MS (140 ms) of sound within a 320 ms window
 *     (short clicks / knocks / single claps are ignored).
 *  2. Learner's own level: the loudness of the learner's real answers (3+ words) is learned during the
 *     interview. Sound much quieter than that (below GATE_RATIO of it, i.e. far away) does not start
 *     speech unless it continues for about a second (so a learner who moved back or speaks softly is
 *     still heard, with nothing cut off: that second of audio is kept and sent).
 *  3. End of speech in a noisy room: while the learner is speaking, only sound near their own level
 *     counts as voice. Background sound quieter than that (music, chatter, barking further away) no
 *     longer keeps the microphone "hearing" after the learner stopped, so the answer is sent.
 *  4. It reports when the room is noisy, so the screen can tell the learner.
 * The segment pause (0.7 s), the answer wait (3 s) and sending are unchanged.
 * Limits: a loud sound next to the mic, or a song with singing, still looks like speech.
 * Settings: VITE_STT_NOISE_GUARD=false turns it off (previous behaviour), VITE_STT_START_NEED_MS,
 * VITE_STT_GATE_RATIO.
 */
const env = import.meta.env as Record<string, string | undefined>;
const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);

export const NOISE_GUARD_ON = String(env.VITE_STT_NOISE_GUARD ?? "true").toLowerCase() !== "false";
const START_WINDOW_MS = 320;
const START_NEED_MS = num(env.VITE_STT_START_NEED_MS, 140);
const GATE_RATIO = num(env.VITE_STT_GATE_RATIO, 0.35); // about -9 dB below the learner's own voice
const WEAK_WINDOW_MS = 1500;
const WEAK_NEED_MS = 1000;
const PREROLL_NORMAL_MS = 520;
const PREROLL_WEAK_MS = 1700;
const BURST_END_MS = 400;
const NOISY_WINDOW_MS = 20000;

export type StartDecision = "none" | "start" | "weak-start";
type Frame = { ms: number; loud: boolean; strong: boolean };

export class NoiseGuard {
  /** Typical loudness (RMS) of the learner's accepted answers; 0 until learned. */
  voiceLevel = 0;
  private frames: Frame[] = [];
  private framesMs = 0;
  private burstActive = false;
  private burstLoudMs = 0;
  private burstQuietMs = 0;
  private rejectedAt: number[] = [];
  private emptyFinalAt: number[] = [];
  private levels: number[] = [];
  private segSum = 0;
  private segMs = 0;
  private segWeak = false;
  private peak = 0;
  private pending = new Map<number, { level: number; weak: boolean }>();

  /** How much audio before "speech started" to keep buffered. */
  prerollKeepMs(): number {
    return this.voiceLevel > 0 ? PREROLL_WEAK_MS : PREROLL_NORMAL_MS;
  }

  /** How much of that buffered audio belongs to the speech that just started. */
  startPrerollMs(decision: StartDecision): number {
    return decision === "weak-start" ? PREROLL_WEAK_MS : PREROLL_NORMAL_MS;
  }

  /**
   * Whether this frame may raise the learned room-noise level. The first 200 ms of a new sound must
   * not: otherwise soft speech would raise the threshold against itself before the 140 ms are reached.
   */
  learnFloor(loud: boolean): boolean {
    return !(loud && this.burstLoudMs < 200);
  }

  /** One 20 ms frame while not speaking. */
  frame(rms: number, ms: number, startThreshold: number, now: number): StartDecision {
    const gate = this.voiceLevel * GATE_RATIO;
    const loud = rms > startThreshold;
    const strong = loud && rms > gate;
    this.frames.push({ ms, loud, strong });
    this.framesMs += ms;
    while (this.framesMs > WEAK_WINDOW_MS && this.frames.length > 1) this.framesMs -= this.frames.shift()!.ms;

    let strongMs = 0;
    let loudLongMs = 0;
    let seen = 0;
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const fr = this.frames[i];
      if (seen < START_WINDOW_MS && fr.strong) strongMs += fr.ms;
      if (fr.loud) loudLongMs += fr.ms;
      seen += fr.ms;
    }
    if (strongMs >= START_NEED_MS) return this.started(false);
    if (gate > 0 && loudLongMs >= WEAK_NEED_MS) return this.started(true);

    // Sound that did not become speech: count it (noise hint).
    if (loud) {
      this.burstActive = true;
      this.burstLoudMs += ms;
      this.burstQuietMs = 0;
    } else if (this.burstActive) {
      this.burstQuietMs += ms;
      if (this.burstQuietMs >= BURST_END_MS) {
        if (this.burstLoudMs >= 60) this.rejectedAt.push(now);
        this.burstActive = false;
        this.burstLoudMs = 0;
      }
    }
    return "none";
  }

  private started(weak: boolean): StartDecision {
    this.resetDetection();
    this.segSum = 0;
    this.segMs = 0;
    this.segWeak = weak;
    this.peak = 0;
    return weak ? "weak-start" : "start";
  }

  /**
   * One frame while speaking. Returns true if it counts as the learner's voice: above the room-noise
   * level AND near the learner's own level (35% of their learned level, or 15% of this speech's recent
   * peak before the level is learned). A quiet-but-sustained start keeps the plain room-noise rule,
   * so a learner who speaks more softly than usual is not cut off.
   */
  speechFrame(rms: number, ms: number, keepThreshold: number): boolean {
    this.peak = Math.max(this.peak * 0.99, rms);
    let threshold = keepThreshold;
    if (!this.segWeak) threshold = Math.max(threshold, this.voiceLevel * GATE_RATIO, this.peak * 0.15);
    const voiced = rms >= threshold;
    if (voiced) {
      this.segSum += rms * ms;
      this.segMs += ms;
    }
    return voiced;
  }

  /** The segment was sent for transcription. */
  committed(segmentId: number) {
    if (this.segMs >= 300) this.pending.set(segmentId, { level: this.segSum / this.segMs, weak: this.segWeak });
    this.segSum = 0;
    this.segMs = 0;
    if (this.pending.size > 40) this.pending.delete(this.pending.keys().next().value as number);
  }

  /** Its transcript arrived: real answers (3+ words) teach the learner's level. */
  final(segmentId: number, text: string, now: number) {
    const seg = this.pending.get(segmentId);
    this.pending.delete(segmentId);
    const words = (String(text || "").match(/[A-Za-z0-9']+/g) || []).length;
    if (!words) {
      this.emptyFinalAt.push(now);
      return;
    }
    if (!seg || words < 3) return;
    // A quieter-but-real answer counts twice, so the level follows a learner who moved back.
    this.levels.push(seg.level);
    if (seg.weak) this.levels.push(seg.level);
    while (this.levels.length > 6) this.levels.shift();
    const sorted = [...this.levels].sort((a, b) => a - b);
    this.voiceLevel = sorted[Math.floor(sorted.length / 2)];
  }

  /** Several sounds were ignored, or came back with no words, in the last 20 s. */
  noisy(now: number): boolean {
    this.rejectedAt = this.rejectedAt.filter((t) => now - t < NOISY_WINDOW_MS);
    this.emptyFinalAt = this.emptyFinalAt.filter((t) => now - t < NOISY_WINDOW_MS);
    return this.rejectedAt.length >= 3 || this.emptyFinalAt.length >= 2;
  }

  stats(now: number) {
    return {
      voiceLevel: Math.round(this.voiceLevel * 10000) / 10000,
      gate: Math.round(this.voiceLevel * GATE_RATIO * 10000) / 10000,
      ignoredSounds20s: this.rejectedAt.filter((t) => now - t < NOISY_WINDOW_MS).length,
      emptyTranscripts20s: this.emptyFinalAt.filter((t) => now - t < NOISY_WINDOW_MS).length,
    };
  }

  /** Mic muted / listening restarted: forget the half-detected sound, keep what was learned. */
  resetDetection() {
    this.frames = [];
    this.framesMs = 0;
    this.burstActive = false;
    this.burstLoudMs = 0;
    this.burstQuietMs = 0;
  }

  resetAll() {
    this.resetDetection();
    this.voiceLevel = 0;
    this.levels = [];
    this.pending.clear();
    this.rejectedAt = [];
    this.emptyFinalAt = [];
    this.segSum = 0;
    this.segMs = 0;
  }
}
