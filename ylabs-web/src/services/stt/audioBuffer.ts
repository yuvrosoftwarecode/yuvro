/**
 * TEST interview network resilience, module 1 of 3: local audio buffer.
 *
 * Every ~100 ms audio chunk gets a unique sequence number and a timestamp and belongs to a speech
 * segment. Chunks are kept until their segment has its FINAL transcript (not just until the server's
 * receipt acknowledgement): Sarvam cannot resume a session, so after a reconnect the whole unfinished
 * segment must be sent again from its start. Acknowledgements are still tracked (delivery monitoring).
 *
 * Bounded: at most MAX_PENDING_AUDIO_MS of unfinished audio. Beyond that new audio is refused and the
 * overflow is reported to the caller (never silently dropped), so the learner can be asked to repeat.
 */

export type Chunk = { seq: number; segment: number; at: number; pcm: Int16Array; ms: number };

export type BufferedSegment = {
  id: number;
  chunks: Chunk[];
  audioMs: number;
  startedAt: number;
  committed: boolean;
  committedAt: number;
  /** ms waited for the transcript while the connection was usable (slow != lost). */
  waitedMs: number;
  replays: number;
};

export class AudioBuffer {
  private nextChunkSeq = 1;
  private nextSegmentId = 0;
  private segments: BufferedSegment[] = []; // committed, unfinished, in speaking order
  private open: BufferedSegment | null = null;
  lastAckedChunk = 0;
  overflowed = false;

  constructor(private rate: number, readonly maxPendingMs: number) {}

  setRate(rate: number) {
    this.rate = rate;
  }

  /** Unfinished audio (committed + open), in ms. */
  pendingAudioMs(): number {
    return this.segments.reduce((a, s) => a + s.audioMs, 0) + (this.open?.audioMs || 0);
  }

  chunkCount(): number {
    return this.segments.reduce((a, s) => a + s.chunks.length, 0) + (this.open?.chunks.length || 0);
  }

  /** Chunks sent but not yet acknowledged (any segment). */
  unackedChunks(): number {
    let n = 0;
    for (const s of this.all()) for (const c of s.chunks) if (c.seq > this.lastAckedChunk) n++;
    return n;
  }

  /** Adds audio to the open segment. Returns null (and sets `overflowed`) if the bound is reached. */
  add(pcm: Int16Array, now: number): Chunk | null {
    const ms = (pcm.length / this.rate) * 1000;
    if (this.pendingAudioMs() + ms > this.maxPendingMs) {
      this.overflowed = true;
      return null;
    }
    if (!this.open) {
      this.open = { id: this.nextSegmentId++, chunks: [], audioMs: 0, startedAt: now, committed: false, committedAt: 0, waitedMs: 0, replays: 0 };
    }
    const chunk: Chunk = { seq: this.nextChunkSeq++, segment: this.open.id, at: now, pcm, ms };
    this.open.chunks.push(chunk);
    this.open.audioMs += ms;
    return chunk;
  }

  hasOpen(): boolean {
    return !!this.open && this.open.chunks.length > 0;
  }

  /** Segment boundary (learner paused): the open segment waits for its transcript. */
  commitOpen(now: number): BufferedSegment | null {
    const seg = this.open;
    this.open = null;
    if (!seg || !seg.chunks.length) return null;
    seg.committed = true;
    seg.committedAt = now;
    this.segments.push(seg);
    return seg;
  }

  /** Audio intentionally discarded (Alex started speaking / mic off), exactly like the current code. */
  clearOpen() {
    this.open = null;
  }

  get(segmentId: number): BufferedSegment | undefined {
    return this.segments.find((s) => s.id === segmentId) || (this.open?.id === segmentId ? this.open : undefined);
  }

  /** Final transcript (or definitive failure) received: release the audio. */
  release(segmentId: number): BufferedSegment | undefined {
    const i = this.segments.findIndex((s) => s.id === segmentId);
    if (i < 0) return undefined;
    const [seg] = this.segments.splice(i, 1);
    if (this.pendingAudioMs() < this.maxPendingMs * 0.8) this.overflowed = false;
    return seg;
  }

  ack(chunkSeq: number) {
    if (chunkSeq > this.lastAckedChunk) this.lastAckedChunk = chunkSeq;
  }

  /** Committed unfinished segments in order (for replay and timeouts). */
  committedSegments(): BufferedSegment[] {
    return [...this.segments];
  }

  openSegment(): BufferedSegment | null {
    return this.open && this.open.chunks.length ? this.open : null;
  }

  private all(): BufferedSegment[] {
    return this.open ? [...this.segments, this.open] : this.segments;
  }

  reset() {
    this.segments = [];
    this.open = null;
    this.overflowed = false;
  }
}
