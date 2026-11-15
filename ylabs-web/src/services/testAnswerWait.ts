/**
 * TEST mock interview only: how long to wait after the learner stops speaking before the answer is sent.
 * CURRENT: a fixed 3 s for every answer (FIXED_WAIT_MS). Previously tried rules (not used now):
 *   sounds unfinished (ends in "and", "so", "because", "um", ...)  3.0 s
 *   short answer (up to 5 words)                                     2.0 s
 *   longer answer                                                    2.5 s
 * The answer is still never sent while any part of it is being transcribed.
 * Settings: VITE_ANSWER_WAIT_SHORT_MS, VITE_ANSWER_WAIT_LONG_MS, VITE_ANSWER_WAIT_UNFINISHED_MS,
 * VITE_ANSWER_SHORT_MAX_WORDS.
 */
const env = import.meta.env as Record<string, string | undefined>;
const n = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v) : d);

export const ANSWER_WAIT = {
  short: n(env.VITE_ANSWER_WAIT_SHORT_MS, 2000),
  long: n(env.VITE_ANSWER_WAIT_LONG_MS, 2500),
  unfinished: n(env.VITE_ANSWER_WAIT_UNFINISHED_MS, 3000),
  shortMaxWords: n(env.VITE_ANSWER_SHORT_MAX_WORDS, 5),
};

const UNFINISHED_END =
  /\b(and|so|because|but|or|which|that|then|if|when|where|while|also|the|a|an|to|of|with|for|in|on|is|are|was|my|our|like|um+|uh+|hmm+|er+|ah+|basically|actually)\s*[,.…-]*\s*$/i;

export type AnswerWait = { ms: number; rule: "short" | "long" | "unfinished" | "fixed" };

/** Wait after the learner stops speaking before the answer is sent (VITE_ANSWER_WAIT_MS, default 3 s). */
export const FIXED_WAIT_MS = n(env.VITE_ANSWER_WAIT_MS, 3000);

export function answerWait(_text: string): AnswerWait {
  // Fixed 3 s for every answer (user decision 2026-11-14). The short/long/unfinished rules above are
  // kept only for reference and are not used.
  return { ms: FIXED_WAIT_MS, rule: "fixed" };
}

/** The rule used for the last submitted spoken answer (shown in the timing line). */
export let lastAnswerWait: AnswerWait | null = null;
export function noteAnswerWait(w: AnswerWait | null) {
  lastAnswerWait = w;
}
