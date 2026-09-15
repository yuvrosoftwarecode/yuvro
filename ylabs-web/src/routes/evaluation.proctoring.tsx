import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { EvalShell, EvalStepHeader, PrimaryButton, Check } from "@/components/evaluation/EvalShell";
import { restApiAuthUtil } from "../utils/RestApiAuthUtil";
import { evaluationService } from "../services/evaluationService";
import { AlertCircle } from "lucide-react";
import { setGlobalProctoringData } from "../utils/proctoringStore";

export const Route = createFileRoute("/evaluation/proctoring")({
  head: () => ({
    meta: [{ title: "Proctoring check — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: ProctoringPage,
});

interface CheckState {
  status: "idle" | "checking" | "passed" | "failed";
  message?: string;
}

function ProctoringPage() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const evaluationId = searchParams.get("e") || "";

  const [config, setConfig] = useState<{ enableProctoring: boolean, screenShareRequired: boolean } | null>(null);

  useEffect(() => {
    if (evaluationId) {
      evaluationService.getWorkspaceData(evaluationId).then(res => {
        let enableProctoring = false;
        let screenShareRequired = false;
        (res.sections || []).forEach((sec: any) => {
          let pc: any = {};
          try { pc = typeof sec.proctoring_config === 'string' ? JSON.parse(sec.proctoring_config) : (sec.proctoring_config || {}); } catch {}
          if (pc.enableProctoring) enableProctoring = true;
          if (pc.screenShareRequired) screenShareRequired = true;
        });
        setConfig({ enableProctoring, screenShareRequired });
      }).catch(() => {
        setConfig({ enableProctoring: false, screenShareRequired: false });
      });
    } else {
      setConfig({ enableProctoring: false, screenShareRequired: false });
    }
  }, [evaluationId]);

  const [level, setLevel] = useState(0);
  const hasProceededRef = useRef(false);

  const [micCheck, setMicCheck] = useState<CheckState>({ status: "idle" });
  const [cameraCheck, setCameraCheck] = useState<CheckState>({ status: "idle" });
  const [faceEnrollCheck, setFaceEnrollCheck] = useState<CheckState>({ status: "idle" });
  const [tabsClosed, setTabsClosed] = useState(false);
  const [screenCheck, setScreenCheck] = useState<CheckState>({ status: "idle" });
  const [fullscreenCheck, setFullscreenCheck] = useState<CheckState>({ status: "idle" });
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showScreenWarning, setShowScreenWarning] = useState(false);

  const handleProceed = () => {
    if (cameraStream || screenStream) {
        setGlobalProctoringData({
            cameraStream,
            screenStream,
            photoBlob,
            screenshotBlob
        });
    }
    nav({ to: "/evaluation/instructions", search: { e: evaluationId } });
  };

  const needsMic = config?.enableProctoring;
  const needsCamera = config?.enableProctoring;
  const needsFace = config?.enableProctoring;
  const needsTabs = config?.enableProctoring;
  const needsScreen = config?.enableProctoring;
  const needsFullscreen = config?.enableProctoring; // Fullscreen usually goes with proctoring

  const currentStep =
    micCheck.status !== "passed"
      ? 1
      : cameraCheck.status !== "passed"
        ? 2
        : faceEnrollCheck.status !== "passed"
          ? 3
          : !tabsClosed
            ? 4
            : screenCheck.status !== "passed"
              ? 5
              : fullscreenCheck.status !== "passed"
                ? 6
                : 7;

  useEffect(() => {
    let raf = 0;
    if (cameraStream) {
      const audioTracks = cameraStream.getAudioTracks();
      if (audioTracks.length > 0) {
        try {
          const ctx = new AudioContext();
          const src = ctx.createMediaStreamSource(cameraStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          src.connect(analyser);
          const buf = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i];
            setLevel(Math.min(1, sum / buf.length / 100));
            raf = requestAnimationFrame(tick);
          };
          tick();
        } catch (e) {}
      }
    }
    return () => cancelAnimationFrame(raf);
  }, [cameraStream]);

  const requestMic = async () => {
    setMicCheck({ status: "checking" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicCheck({ status: "passed" });
    } catch {
      setMicCheck({ status: "failed", message: "Permission denied" });
    }
  };

  const requestCamera = async () => {
    setCameraCheck({ status: "checking" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraCheck({ status: "passed" });
    } catch {
      setCameraCheck({ status: "failed", message: "Permission denied" });
    }
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    const imageB64 = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];

    setFaceEnrollCheck({ status: "checking", message: "Enrolling..." });

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setFaceEnrollCheck({ status: "failed", message: "Failed to capture image" });
          return;
        }
        try {
          const response = await restApiAuthUtil.post<any>(
            "/skill_evaluation/evaluations/face_enroll/",
            { image: imageB64 },
          );
          if (response?.enrolled || response?.status === "stub") {
            setPhotoBlob(blob);
            setFaceEnrollCheck({ status: "passed" });
          } else {
            setFaceEnrollCheck({ status: "failed", message: "Detection failed" });
          }
        } catch {
          setFaceEnrollCheck({ status: "failed", message: "Connection error" });
        }
      },
      "image/jpeg",
      0.9,
    );
  }, [cameraStream]);

  const requestScreenShare = async () => {
    setScreenCheck({ status: "checking" });
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    }
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        surfaceSwitching: "exclude",
        preferCurrentTab: false
      } as any);
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings() as any;
      if (settings.displaySurface !== 'monitor') {
        stream.getTracks().forEach(t => t.stop());
        setScreenCheck({ status: 'failed', message: 'You must share your ENTIRE SCREEN, not a window or tab.' });
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        window.focus();
        setTimeout(() => window.focus(), 100);
        setShowScreenWarning(true);
        return;
      }
      setScreenStream(stream);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        screenVideoRef.current.onloadedmetadata = () => {
          screenVideoRef.current
            ?.play()
            .then(() => {
              setTimeout(() => {
                if (!screenVideoRef.current || !canvasRef.current) return;
                const video = screenVideoRef.current;
                const canvas = canvasRef.current;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                  (blob) => {
                    if (blob) setScreenshotBlob(blob);
                  },
                  "image/jpeg",
                  0.9,
                );
              }, 800);
            })
            .catch(() => {});
        };
      }
      setScreenCheck({ status: "passed" });
      videoTrack.onended = () => {
        setScreenStream(null);
        setScreenCheck({ status: "idle" });
      };
    } catch {
      setScreenCheck({ status: "failed", message: "Share denied" });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (document.fullscreenElement) {
        setFullscreenCheck({ status: "passed" });
      } else {
        setFullscreenCheck({ status: "idle" });
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const streamsRef = useRef({ camera: cameraStream, screen: screenStream });
  useEffect(() => {
    streamsRef.current = { camera: cameraStream, screen: screenStream };
  }, [cameraStream, screenStream]);

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenCheck({ status: "failed", message: "Not allowed" });
    }
  };

  const steps = [];
  if (needsMic) steps.push({
    label: "Microphone",
    stepIndex: 1,
    done: micCheck.status === 'passed',
    failed: micCheck.status === 'failed',
    msg: micCheck.message,
    action: <button onClick={requestMic} disabled={currentStep !== 1} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 1 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Allow Mic</button>,
    extra: <MicLevel level={level} />
  });
  if (needsCamera) steps.push({
    label: "Camera",
    stepIndex: 2,
    done: cameraCheck.status === 'passed',
    failed: cameraCheck.status === 'failed',
    msg: cameraCheck.message,
    action: <button onClick={requestCamera} disabled={currentStep !== 2} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 2 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Allow Camera</button>
  });
  if (needsFace) steps.push({
    label: "Identity Photo",
    stepIndex: 3,
    done: faceEnrollCheck.status === 'passed',
    failed: faceEnrollCheck.status === 'failed',
    msg: faceEnrollCheck.message,
    action: <button onClick={capturePhoto} disabled={currentStep !== 3 || faceEnrollCheck.status === 'checking'} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 3 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>{faceEnrollCheck.status === 'checking' ? 'Enrolling...' : 'Capture Photo'}</button>
  });
  if (needsTabs) steps.push({
    label: "Close Other Tabs",
    stepIndex: 4,
    done: tabsClosed,
    failed: false,
    msg: "",
    action: <button onClick={() => setShowTabWarning(true)} disabled={currentStep !== 4} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 4 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Confirm closed</button>
  });
  if (needsScreen) steps.push({
    label: "Share Screen",
    stepIndex: 5,
    done: screenCheck.status === 'passed',
    failed: screenCheck.status === 'failed',
    msg: screenCheck.message,
    action: <button onClick={requestScreenShare} disabled={currentStep !== 5} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 5 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Share Screen</button>
  });
  if (needsFullscreen) steps.push({
    label: "Fullscreen",
    stepIndex: 6,
    done: fullscreenCheck.status === 'passed',
    failed: fullscreenCheck.status === 'failed',
    msg: fullscreenCheck.message,
    action: <button onClick={requestFullscreen} disabled={currentStep !== 6} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 6 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Enter Fullscreen</button>
  });

  // When proctoring is disabled (steps.length === 0), navigate away after render — never call
  // handleProceed() synchronously during rendering because nav() triggers a setState inside
  // TanStack Router's Transitioner, causing the "setState during render" React warning.
  useEffect(() => {
    if (config && steps.length === 0 && !hasProceededRef.current) {
      hasProceededRef.current = true;
      handleProceed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, steps.length]);

  if (!config) return <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading proctoring config...</div>;
  if (config && steps.length === 0) return null;

  return (
    <EvalShell step={3} totalSteps={4} stepLabel="Proctoring">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <EvalStepHeader
            eyebrow="Step 03"
            title={<>Confirm your identity.</>}
            body="A quick look at your camera, microphone, screen sharing and fullscreen. This is only used to keep the evaluation fair. Complete all 6 steps to proceed."
          />
          <canvas ref={canvasRef} className="hidden" />
          <video ref={screenVideoRef} muted playsInline className="hidden" />
          <div className="mt-8 flex flex-wrap gap-4">
            {photoBlob && (
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                <img
                  src={URL.createObjectURL(photoBlob)}
                  alt="Identity Photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] font-bold py-1.5 text-center uppercase tracking-wider backdrop-blur-md">
                  Identity Photo
                </div>
              </div>
            )}
            {screenshotBlob && (
              <div className="relative w-40 h-28 sm:w-48 sm:h-32 border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                <img
                  src={URL.createObjectURL(screenshotBlob)}
                  alt="Screen Share"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] font-bold py-1.5 text-center uppercase tracking-wider backdrop-blur-md">
                  Screen Check
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
            {!cameraStream && (
              <div className="absolute inset-0 grid place-items-center text-[12px] text-neutral-400">
                Camera not active
              </div>
            )}
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between text-[11px] text-white/80">
              <span className="rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">
                Preview only · not recording
              </span>
              {cameraStream && (
                <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Live
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {steps.map(({ label, done, failed, msg, action, extra, stepIndex }, i) => (
              <div key={label} className={`flex items-center justify-between rounded-lg border ${currentStep === stepIndex ? 'border-neutral-900' : 'border-neutral-200'} bg-white px-4 py-3 text-[13px] transition-colors`}>
                <div className="flex-1">
                  <span className="text-neutral-900 block">{i + 1}. {label}</span>
                  {failed && <span className="text-red-500 text-[11px] block mt-0.5">{msg}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {extra}
                  {done ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> OK
                    </span>
                  ) : (
                    action
                  )}
                </div>
              </div>
            ))}
          </div>

          <PrimaryButton disabled={currentStep !== 7} type="button" className="mt-8 w-full" onClick={handleProceed}>
            {currentStep === 7 ? "Continue to instructions" : "Complete all steps"}
          </PrimaryButton>
        </div>
      </div>

      {showTabWarning && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-6 h-6 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Final Warning</h2>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    If any other tab or window is opened at this stage, your test will be <span className="text-rose-400 font-bold">automatically disqualified</span>.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setShowTabWarning(false)} className="flex-1 py-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => { setShowTabWarning(false); setTabsClosed(true); }} className="flex-1 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors">
                        I Understand
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {showScreenWarning && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Select "Entire Screen"</h2>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    You selected a window or a tab. Please click <strong>Share Screen</strong> again and select the <span className="text-amber-400 font-bold">Entire Screen</span> tab in the browser dialog.
                </p>
                <div className="flex justify-center">
                    <button onClick={() => setShowScreenWarning(false)} className="w-full py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors">
                        Try Again
                    </button>
                </div>
            </div>
        </div>
      )}
    </EvalShell>
  );
}

function MicLevel({ level }: { level: number }) {
  return (
    <div className="flex items-end gap-0.5">
      {[0.2, 0.4, 0.6, 0.8, 1].map((t, i) => (
        <div
          key={i}
          className="w-0.5 rounded-sm transition-colors"
          style={{
            height: 4 + i * 3,
            background: level > t ? "rgb(16 185 129)" : "rgb(229 229 229)",
          }}
        />
      ))}
    </div>
  );
}
