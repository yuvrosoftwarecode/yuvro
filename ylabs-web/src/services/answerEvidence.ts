/**
 * Mock interview: a small note about HOW each answer was captured, sent with the answer and stored as
 * evidence for the post-interview evaluation (so a poor transcript is not judged as poor knowledge).
 * It only reads values the page already has; it does not change listening, sending or timing.
 */
import { getSttNetworkHealth } from "@/services/testStt";

export type InputQuality = {
  mode: "voice" | "typed";
  reconnects: number;
  noisy: boolean;
  stt_failure: boolean;
  connection_lost: boolean;
};

let sttFailureSinceLastAnswer = false;
let reconnectsAtLastAnswer = 0;

/** Part of the current answer could not be transcribed (the learner was asked to repeat it). */
export function noteSttFailure() {
  sttFailureSinceLastAnswer = true;
}

/** Called once when an answer is sent. */
export function collectInputQuality(spoken: boolean): InputQuality {
  let reconnects = 0;
  let noisy = false;
  let connectionLost = false;
  try {
    const h = getSttNetworkHealth() as any;
    const total = Number(h?.reconnects) || 0;
    reconnects = Math.max(0, total - reconnectsAtLastAnswer);
    reconnectsAtLastAnswer = total;
    noisy = !!(h?.noise?.backgroundNoise || (h?.noise?.ignoredSounds20s ?? 0) >= 3);
    connectionLost = h?.conn === "lost" || h?.conn === "reconnecting" || h?.conn === "offline-queue-full";
  } catch {
    /* evidence only: never affects the answer */
  }
  const quality: InputQuality = {
    mode: spoken ? "voice" : "typed",
    reconnects,
    noisy,
    stt_failure: sttFailureSinceLastAnswer,
    connection_lost: connectionLost,
  };
  sttFailureSinceLastAnswer = false;
  return quality;
}
