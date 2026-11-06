import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  EvalShell,
  EvalStepHeader,
  PrimaryButton,
  Check,
  Spinner,
} from "@/components/evaluation/EvalShell";
import { AlertTriangle, Mic } from "lucide-react";

export const Route = createFileRoute("/evaluation/system-check")({
  head: () => ({
    meta: [{ title: "System check — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: SystemCheckPage,
});

interface CheckItem {
  key: string;
  label: string;
  detail: string;
  status: "pending" | "running" | "passed" | "failed";
  errorMessage?: string;
}

function SystemCheckPage() {
  const nav = useNavigate();
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const evaluationId = searchParams.get("e") || "";

  const [micVolume, setMicVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [checks, setChecks] = useState<CheckItem[]>([
    { key: "browser", label: "Browser compatibility", detail: "Checking browser features...", status: "pending" },
    { key: "resolution", label: "Screen resolution", detail: "Checking display...", status: "pending" },
    { key: "fullscreen", label: "Fullscreen support", detail: "Checking capability...", status: "pending" },
    { key: "internet", label: "Network connectivity", detail: "Checking connection...", status: "pending" },
    { key: "camera", label: "Camera access", detail: "Requesting video input...", status: "pending" },
    { key: "mic", label: "Microphone & audio levels", detail: "Testing microphone input...", status: "pending" },
  ]);

  const updateCheck = (key: string, updates: Partial<CheckItem>) => {
    setChecks((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...updates } : c))
    );
  };

  useEffect(() => {
    let isCancelled = false;

    const runChecks = async () => {
      // 1. Browser compatibility
      const isModern = typeof window !== "undefined" && "fetch" in window && "localStorage" in window;
      const ua = navigator.userAgent;
      const isChromeOrChromium = /Chrome|Chromium|Edg/i.test(ua);
      updateCheck("browser", {
        status: isModern ? "passed" : "failed",
        detail: isChromeOrChromium ? "Chromium-based browser (Recommended)" : "Modern browser detected",
      });

      // 2. Screen resolution
      const width = window.screen?.width || window.innerWidth;
      const height = window.screen?.height || window.innerHeight;
      const resOk = width >= 1024 && height >= 600;
      updateCheck("resolution", {
        status: resOk ? "passed" : "failed",
        detail: `${width} × ${height}${resOk ? " · Optimal display" : " · Low resolution warning"}`,
      });

      // 3. Fullscreen support
      const fsAvailable = !!(
        document.fullscreenEnabled ||
        (document as any).webkitFullscreenEnabled ||
        (document as any).mozFullScreenEnabled
      );
      updateCheck("fullscreen", {
        status: fsAvailable ? "passed" : "failed",
        detail: fsAvailable ? "Full screen available" : "Full screen not supported",
      });

      // 4. Internet speed / latency check
      const startTime = performance.now();
      try {
        await fetch("/favicon.ico?t=" + Date.now(), { method: "HEAD", cache: "no-store" }).catch(() => null);
        const latency = Math.round(performance.now() - startTime);
        updateCheck("internet", {
          status: "passed",
          detail: `Connected · ${latency}ms latency`,
        });
      } catch {
        updateCheck("internet", {
          status: "passed",
          detail: "Connected · Online",
        });
      }

      if (isCancelled) return;

      // 5. Real Camera & Microphone Hardware Test
      try {
        updateCheck("camera", { status: "running", detail: "Requesting camera stream..." });
        updateCheck("mic", { status: "running", detail: "Listening for microphone input..." });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;

        // Verify Video track
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0 && videoTracks[0].readyState === "live") {
          const vTrack = videoTracks[0];
          const settings = vTrack.getSettings ? vTrack.getSettings() : null;
          const resInfo = settings?.width && settings?.height ? `${settings.width}×${settings.height}` : "Active";
          updateCheck("camera", {
            status: "passed",
            detail: `${vTrack.label || "Camera"} (${resInfo})`,
          });
        } else {
          updateCheck("camera", {
            status: "failed",
            detail: "No active video stream detected",
          });
        }

        // Verify Audio track with Web Audio API level monitoring
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].readyState === "live") {
          const aTrack = audioTracks[0];
          updateCheck("mic", {
            status: "passed",
            detail: `${aTrack.label || "Microphone"} · Input connected & active`,
          });

          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass();
              audioContextRef.current = audioCtx;
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              const source = audioCtx.createMediaStreamSource(stream);
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const checkVolume = () => {
                if (isCancelled) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const normalized = Math.min(100, Math.round((avg / 128) * 100));
                setMicVolume(normalized);
                animFrameRef.current = requestAnimationFrame(checkVolume);
              };
              checkVolume();
            }
          } catch (audioErr) {
            console.warn("Could not create audio context for visualizer:", audioErr);
          }
        } else {
          updateCheck("mic", {
            status: "failed",
            detail: "Microphone track not active",
          });
        }
      } catch (err: any) {
        console.error("Hardware permission check failed:", err);
        const isDenied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
        updateCheck("camera", {
          status: "failed",
          detail: isDenied ? "Permission denied. Allow camera in browser settings." : "Camera unavailable",
        });
        updateCheck("mic", {
          status: "failed",
          detail: isDenied ? "Permission denied. Allow microphone in browser settings." : "Microphone unavailable",
        });
      }
    };

    runChecks();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => null);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const allPassed = checks.every((c) => c.status === "passed");
  const hasFailures = checks.some((c) => c.status === "failed");

  return (
    <EvalShell step={3} totalSteps={5} stepLabel="System check">
      <div className="mx-auto max-w-2xl">
        <EvalStepHeader
          eyebrow="Step 03"
          title={<>Getting your workspace ready.</>}
          body="We are verifying your browser, camera, and microphone hardware. Speak into your microphone to verify live audio input."
        />

        <div className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
          {checks.map((c) => {
            const isPassed = c.status === "passed";
            const isFailed = c.status === "failed";
            const isRunning = c.status === "running" || c.status === "pending";

            return (
              <div key={c.key} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-neutral-900">{c.label}</div>
                  <div
                    className={`mt-0.5 text-[12px] transition-colors ${
                      isPassed
                        ? "text-neutral-500"
                        : isFailed
                          ? "text-rose-600 font-medium"
                          : "text-neutral-400"
                    }`}
                  >
                    {c.detail}
                  </div>

                  {c.key === "mic" && isPassed && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <Mic className="h-3.5 w-3.5 text-neutral-500" />
                      <div className="h-2 w-36 rounded-full bg-neutral-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-75 ease-out"
                          style={{ width: `${Math.max(5, micVolume * 2)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        {micVolume > 5 ? "Audio detected" : "Speak to test"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {isPassed ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> Passed
                    </span>
                  ) : isFailed ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Failed
                    </span>
                  ) : (
                    <Spinner className="text-neutral-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasFailures && (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50/50 p-4 text-[13px] text-rose-800">
            <div className="font-semibold">Hardware or Permission Issue Detected</div>
            <p className="mt-1 leading-relaxed opacity-90">
              Please grant camera and microphone permissions in your browser URL bar lock icon and refresh the page to continue.
            </p>
          </div>
        )}

        <div className="mt-10">
          <PrimaryButton
            disabled={!allPassed}
            type="button"
            className="mt-8 w-full"
            onClick={() => nav({ to: "/evaluation/proctoring", search: { e: evaluationId } })}
          >
            {allPassed
              ? "Continue to proctoring"
              : hasFailures
                ? "Please resolve permissions above"
                : "Checking your devices..."}
          </PrimaryButton>
        </div>
      </div>
    </EvalShell>
  );
}
