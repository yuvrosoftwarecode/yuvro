import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { EvalShell, EvalStepHeader, PrimaryButton, Check } from "@/components/evaluation/EvalShell";
import { restApiAuthUtil } from "../utils/RestApiAuthUtil";

export const Route = createFileRoute("/evaluation/proctoring")({
  head: () => ({ meta: [{ title: "Proctoring check — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: ProctoringPage,
});

interface CheckState {
  status: 'idle' | 'checking' | 'passed' | 'failed';
  message?: string;
}

function ProctoringPage() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);

  const [micCheck, setMicCheck] = useState<CheckState>({ status: 'idle' });
  const [cameraCheck, setCameraCheck] = useState<CheckState>({ status: 'idle' });
  const [faceEnrollCheck, setFaceEnrollCheck] = useState<CheckState>({ status: 'idle' });
  const [tabsClosed, setTabsClosed] = useState(false);
  const [screenCheck, setScreenCheck] = useState<CheckState>({ status: 'idle' });
  const [fullscreenCheck, setFullscreenCheck] = useState<CheckState>({ status: 'idle' });
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);

  const currentStep =
    micCheck.status !== 'passed' ? 1 :
    cameraCheck.status !== 'passed' ? 2 :
    faceEnrollCheck.status !== 'passed' ? 3 :
    !tabsClosed ? 4 :
    screenCheck.status !== 'passed' ? 5 :
    fullscreenCheck.status !== 'passed' ? 6 : 7;

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
            let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i];
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
    setMicCheck({ status: 'checking' });
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicCheck({ status: 'passed' });
    } catch {
      setMicCheck({ status: 'failed', message: 'Permission denied' });
    }
  };

  const requestCamera = async () => {
    setCameraCheck({ status: 'checking' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraCheck({ status: 'passed' });
    } catch {
      setCameraCheck({ status: 'failed', message: 'Permission denied' });
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    const imageB64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

    setFaceEnrollCheck({ status: 'checking', message: 'Enrolling...' });
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setFaceEnrollCheck({ status: 'failed', message: 'Failed to capture image' });
        return;
      }
      try {
        const response = await restApiAuthUtil.post<any>('/skill_evaluation/evaluations/face_enroll/', { image: imageB64 });
        if (response?.enrolled || response?.status === 'stub') {
          setPhotoBlob(blob);
          setFaceEnrollCheck({ status: 'passed' });
        } else {
          setFaceEnrollCheck({ status: 'failed', message: 'Detection failed' });
        }
      } catch {
        setFaceEnrollCheck({ status: 'failed', message: 'Connection error' });
      }
    }, 'image/jpeg', 0.9);
  }, [cameraStream]);

  const requestScreenShare = async () => {
    setScreenCheck({ status: 'checking' });
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' } });
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings() as any;
      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        stream.getTracks().forEach(t => t.stop());
        setScreenCheck({ status: 'failed', message: 'Share entire screen' });
        return;
      }
      setScreenStream(stream);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        screenVideoRef.current.onloadedmetadata = () => {
          screenVideoRef.current?.play().then(() => {
            setTimeout(() => {
              if (!screenVideoRef.current || !canvasRef.current) return;
              const video = screenVideoRef.current;
              const canvas = canvasRef.current;
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                if (blob) setScreenshotBlob(blob);
              }, 'image/jpeg', 0.9);
            }, 800);
          }).catch(() => {});
        };
      }
      setScreenCheck({ status: 'passed' });
      videoTrack.onended = () => {
        setScreenStream(null);
        setScreenCheck({ status: 'idle' });
      };
    } catch {
      setScreenCheck({ status: 'failed', message: 'Share denied' });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (document.fullscreenElement) {
        setFullscreenCheck({ status: 'passed' });
      } else {
        setFullscreenCheck({ status: 'idle' });
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenCheck({ status: 'failed', message: 'Not allowed' });
    }
  };

  const steps = [
    {
      label: "1. Microphone",
      done: micCheck.status === 'passed',
      failed: micCheck.status === 'failed',
      msg: micCheck.message,
      action: <button onClick={requestMic} disabled={currentStep !== 1} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 1 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Allow Mic</button>,
      extra: <MicLevel level={level} />
    },
    {
      label: "2. Camera",
      done: cameraCheck.status === 'passed',
      failed: cameraCheck.status === 'failed',
      msg: cameraCheck.message,
      action: <button onClick={requestCamera} disabled={currentStep !== 2} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 2 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Allow Camera</button>
    },
    {
      label: "3. Identity Photo",
      done: faceEnrollCheck.status === 'passed',
      failed: faceEnrollCheck.status === 'failed',
      msg: faceEnrollCheck.message,
      action: <button onClick={capturePhoto} disabled={currentStep !== 3 || faceEnrollCheck.status === 'checking'} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 3 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>{faceEnrollCheck.status === 'checking' ? 'Enrolling...' : 'Capture Photo'}</button>
    },
    {
      label: "4. Close Other Tabs",
      done: tabsClosed,
      failed: false,
      msg: "",
      action: <button onClick={() => setTabsClosed(true)} disabled={currentStep !== 4} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 4 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Confirm closed</button>
    },
    {
      label: "5. Share Screen",
      done: screenCheck.status === 'passed',
      failed: screenCheck.status === 'failed',
      msg: screenCheck.message,
      action: <button onClick={requestScreenShare} disabled={currentStep !== 5} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 5 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Share Screen</button>
    },
    {
      label: "6. Fullscreen",
      done: fullscreenCheck.status === 'passed',
      failed: fullscreenCheck.status === 'failed',
      msg: fullscreenCheck.message,
      action: <button onClick={requestFullscreen} disabled={currentStep !== 6} className={`text-[12px] font-medium underline underline-offset-4 ${currentStep === 6 ? 'text-neutral-900 hover:text-black' : 'text-neutral-300'}`}>Enter Fullscreen</button>
    }
  ];

  return (
    <EvalShell step={3} totalSteps={4} stepLabel="Proctoring">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <EvalStepHeader eyebrow="Step 03" title={<>Confirm your identity.</>} body="A quick look at your camera, microphone, screen sharing and fullscreen. This is only used to keep the evaluation fair. Complete all 6 steps to proceed." />
          <canvas ref={canvasRef} className="hidden" />
          <video ref={screenVideoRef} muted playsInline className="hidden" />
          <div className="mt-8 flex flex-wrap gap-4">
            {photoBlob && (
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                <img src={URL.createObjectURL(photoBlob)} alt="Identity Photo" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] font-bold py-1.5 text-center uppercase tracking-wider backdrop-blur-md">Identity Photo</div>
              </div>
            )}
            {screenshotBlob && (
              <div className="relative w-40 h-28 sm:w-48 sm:h-32 border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                <img src={URL.createObjectURL(screenshotBlob)} alt="Screen Share" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] font-bold py-1.5 text-center uppercase tracking-wider backdrop-blur-md">Screen Check</div>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950">
            <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
            {!cameraStream && <div className="absolute inset-0 grid place-items-center text-[12px] text-neutral-400">Camera not active</div>}
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between text-[11px] text-white/80">
              <span className="rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">Preview only · not recording</span>
              {cameraStream && (
                <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Live
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {steps.map(({ label, done, failed, msg, action, extra }, i) => (
              <div key={label} className={`flex items-center justify-between rounded-lg border ${currentStep === i + 1 ? 'border-neutral-900' : 'border-neutral-200'} bg-white px-4 py-3 text-[13px] transition-colors`}>
                <div className="flex-1">
                  <span className="text-neutral-900 block">{label}</span>
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

          <PrimaryButton disabled={currentStep !== 7} type="button" className="mt-8 w-full" onClick={() => nav({ to: "/evaluation/instructions" })}>
            {currentStep === 7 ? "Continue to instructions" : "Complete all steps"}
          </PrimaryButton>
        </div>
      </div>
    </EvalShell>
  );
}

function MicLevel({ level }: { level: number }) {
  return (
    <div className="flex items-end gap-0.5">
      {[0.2, 0.4, 0.6, 0.8, 1].map((t, i) => (
        <div key={i} className="w-0.5 rounded-sm transition-colors" style={{ height: 4 + i * 3, background: level > t ? "rgb(16 185 129)" : "rgb(229 229 229)" }} />
      ))}
    </div>
  );
}
