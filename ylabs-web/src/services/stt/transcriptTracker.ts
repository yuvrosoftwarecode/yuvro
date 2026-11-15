/**
 * TEST interview network resilience, module 3 of 3: transcript tracking.
 *
 * Keyed by the client's own segment id, which stays the same across reconnects (the server's seq
 * restarts with every new session). Guarantees:
 *  - each segment produces at most one final transcript (duplicates after a replay are ignored);
 *  - a late transcript for a segment already declared failed is ignored (the learner was asked to repeat);
 *  - `pending` = committed segments still waiting for their transcript (the answer cannot be submitted).
 */

export type SegmentState = "waiting" | "final" | "failed";

export class TranscriptTracker {
  private states = new Map<number, SegmentState>();
  duplicates = 0;
  lateIgnored = 0;

  committed(segment: number) {
    if (!this.states.has(segment)) this.states.set(segment, "waiting");
  }

  /** True if this final should be used; false if it is a duplicate or arrived after a failure. */
  acceptFinal(segment: number): boolean {
    const st = this.states.get(segment);
    if (st === "final") {
      this.duplicates++;
      return false;
    }
    if (st === "failed") {
      this.lateIgnored++;
      return false;
    }
    this.states.set(segment, "final");
    return true;
  }

  /** Partial text is shown only while the segment is still waiting. */
  acceptPartial(segment: number): boolean {
    const st = this.states.get(segment);
    return st === undefined || st === "waiting";
  }

  fail(segment: number) {
    if (this.states.get(segment) === "waiting" || !this.states.has(segment)) this.states.set(segment, "failed");
  }

  skipped(segment: number) {
    this.states.set(segment, "final");
  }

  isOpen(segment: number): boolean {
    return this.states.get(segment) === "waiting";
  }

  get pending(): number {
    let n = 0;
    for (const s of this.states.values()) if (s === "waiting") n++;
    return n;
  }

  /** Forget finished segments older than the newest few (keeps memory flat in long interviews). */
  prune(keepFrom: number) {
    for (const [id, st] of this.states) if (id < keepFrom && st !== "waiting") this.states.delete(id);
  }

  reset() {
    this.states.clear();
  }
}
