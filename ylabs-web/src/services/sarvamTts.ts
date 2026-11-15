/**
 * Alex's voice for the TEST mock interview: Sarvam AI text-to-speech (bulbul:v4-flash, rohan_en_recovery)
 * through the Yuvro backend (POST /api/test-mock-interview/tts/, streamed MP3).
 *
 * Audio plays while it is still downloading (MediaSource), so Alex starts speaking as soon as Sarvam
 * produces the first audio. If anything fails, or no audio arrives within FIRST_AUDIO_TIMEOUT_MS,
 * the promise rejects and the caller falls back to the browser's built-in voice.
 *
 * The real mock interview does not import this file.
 */

const env = import.meta.env as Record<string, string | undefined>;
const vitarkaDebug = () => {
  try {
    return localStorage.getItem("vitarkaDebug") === "1";
  } catch {
    return false;
  }
};

const FIRST_AUDIO_TIMEOUT_MS = Number(env.VITE_TTS_FIRST_AUDIO_TIMEOUT_MS) || 4000;

function ttsUrl(): string {
  const api = (env.VITE_YHUB_BACKEND_API_BASE_URL || env.VITE_BACKEND_API_BASE_URL || "http://localhost:8003/api").replace(
    /\/$/,
    ""
  );
  return `${api}/test-mock-interview/tts/`;
}

export type SarvamSpeech = {
  /** Resolves when Alex finished speaking; rejects if Sarvam failed before any audio played. */
  done: Promise<void>;
  /** Stop playback immediately (new line, leaving the screen). */
  stop: () => void;
  /** True once audio is audible. */
  hasStarted: () => boolean;
};

export function speakWithSarvam(text: string, onStart?: () => void): SarvamSpeech {
  const controller = new AbortController();
  const audio = new Audio();
  audio.preload = "auto";
  let objectUrl = "";
  let mediaSource: MediaSource | null = null;
  let stopped = false;
  let started = false;

  const cleanup = () => {
    try {
      audio.pause();
    } catch {}
    audio.removeAttribute("src");
    try {
      audio.load();
    } catch {}
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = "";
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    controller.abort();
    cleanup();
  };

  const done = new Promise<void>((resolve, reject) => {
    const t0 = performance.now();
    const firstAudioTimer = setTimeout(() => {
      if (!started) {
        if (vitarkaDebug()) console.warn("[Vitarka TTS] no audio from Sarvam within", FIRST_AUDIO_TIMEOUT_MS, "ms; using browser voice");
        stop();
        reject(new Error("timeout"));
      }
    }, FIRST_AUDIO_TIMEOUT_MS);

    const fail = (err: unknown) => {
      clearTimeout(firstAudioTimer);
      if (started && !stopped) {
        // Audio was already playing: finish what we have rather than repeating the line in another voice.
        if (vitarkaDebug()) console.warn("[Vitarka TTS] stream interrupted after playback started:", err);
        try {
          if (mediaSource && mediaSource.readyState === "open") mediaSource.endOfStream(); // play what we have, then end
        } catch {}
        return;
      }
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    audio.onplaying = () => {
      if (started) return;
      started = true;
      clearTimeout(firstAudioTimer);
      if (vitarkaDebug()) console.info(`[Vitarka TTS] Sarvam voice started after ${Math.round(performance.now() - t0)} ms`);
      onStart?.();
    };
    audio.onended = () => {
      clearTimeout(firstAudioTimer);
      cleanup();
      resolve();
    };
    audio.onerror = () => fail(new Error("audio playback error"));

    (async () => {
      const token = localStorage.getItem("access") || "";
      const res = await fetch(ttsUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        let detail = "";
        try {
          detail = (await res.json())?.error || "";
        } catch {}
        throw new Error(`TTS ${res.status} ${detail}`.trim());
      }

      const canStream =
        typeof MediaSource !== "undefined" && MediaSource.isTypeSupported && MediaSource.isTypeSupported("audio/mpeg");

      if (!canStream) {
        // Fallback (e.g. some Safari versions): download the whole line, then play.
        const blob = await res.blob();
        if (stopped) return;
        objectUrl = URL.createObjectURL(blob);
        audio.src = objectUrl;
        await audio.play();
        return;
      }

      const ms = new MediaSource();
      mediaSource = ms;
      objectUrl = URL.createObjectURL(ms);
      audio.src = objectUrl;
      await new Promise<void>((r) => ms.addEventListener("sourceopen", () => r(), { once: true }));
      const buffer = ms.addSourceBuffer("audio/mpeg");
      const reader = res.body.getReader();
      const append = (chunk: Uint8Array) =>
        new Promise<void>((r, j) => {
          buffer.addEventListener("updateend", () => r(), { once: true });
          buffer.addEventListener("error", () => j(new Error("buffer error")), { once: true });
          buffer.appendBuffer(chunk);
        });
      let playRequested = false;
      for (;;) {
        const { done: finished, value } = await reader.read();
        if (stopped) return;
        if (finished) break;
        if (value && value.length) {
          await append(value);
          if (!playRequested) {
            playRequested = true;
            audio.play().catch((e) => fail(e));
          }
        }
      }
      if (ms.readyState === "open") ms.endOfStream();
      if (!playRequested) throw new Error("Sarvam returned no audio");
    })().catch((e) => {
      if (!stopped) fail(e);
    });
  });

  return { done, stop, hasStarted: () => started };
}
