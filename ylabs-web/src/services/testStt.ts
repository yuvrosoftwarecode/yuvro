/**
 * Mock interview and test mock interview: chooses the speech-to-text implementation.
 *   default                         -> realtimeSttResilient.ts (Network Resilience Layer)
 *   VITE_TEST_STT_RESILIENT=false   -> realtimeStt.ts (the previous behaviour, without the layer)
 * Since 2026-11-14 both interview pages use this switch.
 */
import * as legacy from "@/services/realtimeStt";
import * as resilient from "@/services/realtimeSttResilient";

const env = import.meta.env as Record<string, string | undefined>;
export const RESILIENT_STT = String(env.VITE_TEST_STT_RESILIENT ?? "true").toLowerCase() !== "false";
const impl: typeof resilient = RESILIENT_STT ? resilient : (legacy as unknown as typeof resilient);

export type { SttStatus, SttContext, ConnectionView } from "@/services/realtimeSttResilient";
export const ANSWER_SILENCE_MS = legacy.ANSWER_SILENCE_MS;
export const RealtimeSttRecognition = impl.RealtimeSttRecognition;
export const useRealtimeSttStatus = impl.useRealtimeSttStatus;
export const closeRealtimeStt = () => impl.closeRealtimeStt();
export const getRealtimeSttState = () => impl.getRealtimeSttState();
export const resetRealtimeSttAnswer = () => impl.resetRealtimeSttAnswer();
export const setRealtimeSttContext = (c: resilient.SttContext) => impl.setRealtimeSttContext(c);
export const setRealtimeSttMuted = (m: boolean) => impl.setRealtimeSttMuted(m);

const healthy = { conn: "connected" as const, disconnectedMs: 0 };
/** Connection health (previous implementation: always "connected", nothing paused). */
export function getSttNetworkHealth(): { conn: string; disconnectedMs: number } {
  return RESILIENT_STT ? resilient.getSttNetworkHealth() : healthy;
}
/** True while the connection is down: hold silence check-ins and idle prompts. */
export function sttNetworkDown(): boolean {
  const h = getSttNetworkHealth();
  return h.conn === "lost" || h.conn === "reconnecting" || h.conn === "offline-queue-full";
}
/** True after 5 s without a connection: the interview timer pauses. */
export function sttNetworkPaused(): boolean {
  const h = getSttNetworkHealth();
  return sttNetworkDown() && h.disconnectedMs > 5000;
}

if (RESILIENT_STT && (() => { try { return localStorage.getItem("vitarkaDebug") === "1"; } catch { return false; } })()) console.info("[Vitarka STT] network resilience layer ON (VITE_TEST_STT_RESILIENT=false to turn off)");
