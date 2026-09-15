import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Shield, Camera, Mic, Monitor, CheckCircle2, XCircle, AlertCircle, Loader2, Maximize, User, CheckSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';
import { toast } from 'sonner';

export interface ProctoringData {
    cameraStream: MediaStream;
    screenStream: MediaStream;
    photoBlob: Blob | null;
    screenshotBlob: Blob | null;
}

interface CheckState {
    status: 'idle' | 'checking' | 'passed' | 'failed';
    message?: string;
}

interface ProctoringGateProps {
    onReady: (data: ProctoringData) => void;
    onCancel: () => void;
}

const ProctoringGate: React.FC<ProctoringGateProps> = ({ onReady, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

    const [micCheck, setMicCheck] = useState<CheckState>({ status: 'idle' });
    const [cameraCheck, setCameraCheck] = useState<CheckState>({ status: 'idle' });
    const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
    const [faceEnrollCheck, setFaceEnrollCheck] = useState<CheckState>({ status: 'idle' });
    const [tabsClosed, setTabsClosed] = useState(false);
    const [screenCheck, setScreenCheck] = useState<CheckState>({ status: 'idle' });
    const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
    const [fullscreenCheck, setFullscreenCheck] = useState<CheckState>({ status: 'idle' });
    const [showTabWarning, setShowTabWarning] = useState(false);
    const [showScreenWarning, setShowScreenWarning] = useState(false);

    // Step unlock logic
    // 1 -> Mic, 2 -> Camera, 3 -> Photo, 4 -> Tab check, 5 -> Screen share + screenshot, 6 -> Fullscreen
    const currentStep = 
        micCheck.status !== 'passed' ? 1 :
        cameraCheck.status !== 'passed' ? 2 :
        faceEnrollCheck.status !== 'passed' ? 3 :
        !tabsClosed ? 4 :
        (screenCheck.status !== 'passed' || !screenshotBlob) ? 5 :
        fullscreenCheck.status !== 'passed' ? 6 : 7;

    // --- Step 1: Mic Check ---
    const requestMic = async () => {
        setMicCheck({ status: 'checking' });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicCheck({ status: 'passed', message: 'Microphone access granted' });
        } catch (err: any) {
            setMicCheck({
                status: 'failed',
                message: 'Microphone permission denied.',
            });
        }
    };

    // --- Step 2: Camera Check ---
    const requestCamera = async () => {
        setCameraCheck({ status: 'checking' });
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
            setCameraCheck({ status: 'passed', message: 'Camera access granted' });
        } catch (err: any) {
            setCameraCheck({
                status: 'failed',
                message: 'Camera permission denied.',
            });
        }
    };

    // --- Step 3: Identity Photo ---
    const capturePhoto = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !cameraStream) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Indian passport ratio is 2x2 inches (square).
        // Let's crop the center of the video to a square.
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;

        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        const imageB64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

        setFaceEnrollCheck({ status: 'checking', message: 'Enrolling face...' });
        
        canvas.toBlob(async (blob) => {
            if (!blob) {
                setFaceEnrollCheck({ status: 'failed', message: 'Failed to capture image.' });
                return;
            }
            try {
                const response = await restApiAuthUtil.post<any>('/skill_evaluation/evaluations/face_enroll/', {
                    image: imageB64,
                });
                
                if (response?.enrolled || response?.status === 'stub') {
                    setPhotoBlob(blob);
                    setFaceEnrollCheck({ status: 'passed', message: 'Face enrolled successfully.' });
                    toast.success('Face enrolled successfully.');
                } else {
                    setFaceEnrollCheck({ 
                        status: 'failed', 
                        message: response?.message || 'Face detection failed. Make sure your face is clearly visible.' 
                    });
                    toast.error(response?.message || 'Face detection failed. Please try again.');
                }
            } catch (err: any) {
                console.error('Face enrollment error:', err);
                setFaceEnrollCheck({ 
                    status: 'failed', 
                    message: 'Connection error during face enrollment.' 
                });
                toast.error('Connection error during face enrollment.');
            }
        }, 'image/jpeg', 0.9);
    }, [cameraStream]);

    // --- Step 4: Tab Closure ---
    const handleTabsClosedClick = () => {
        setShowTabWarning(true);
    };

    const confirmTabsClosed = () => {
        setShowTabWarning(false);
        setTabsClosed(true);
    };

    // --- Step 5: Screen Share Check & Screenshot ---
    const requestScreenShare = async () => {
        setScreenCheck({ status: 'checking' });
        if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());
            setScreenStream(null);
        }
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { displaySurface: 'monitor' },
                surfaceSwitching: "exclude",
                preferCurrentTab: false
            } as any);

            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings() as any;
            
            if (settings.displaySurface !== 'monitor') {
                stream.getTracks().forEach(t => t.stop());
                setScreenCheck({
                    status: 'failed',
                    message: 'You must share your ENTIRE SCREEN, not a window or tab.',
                });
                if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
                window.focus();
                setTimeout(() => window.focus(), 100);
                setShowScreenWarning(true);
                return;
            }

            setScreenStream(stream);
            if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = stream;
                screenVideoRef.current.play().catch(() => {});
            }
            setScreenCheck({ status: 'passed', message: 'Screen share active' });

            // Automatically take screenshot
            setTimeout(() => {
                if (!screenVideoRef.current || !canvasRef.current || !stream) return;
                const video = screenVideoRef.current;
                const canvas = canvasRef.current;
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) setScreenshotBlob(blob);
                    }, 'image/jpeg', 0.9);
                }
            }, 600); 

            videoTrack.onended = () => {
                setScreenStream(null);
                setScreenCheck({ status: 'idle' });
                setScreenshotBlob(null);
            };
        } catch (err: any) {
            setScreenCheck({
                status: 'failed',
                message: 'Screen share denied or cancelled.',
            });
        }
    };

    // --- Step 6: Fullscreen ---
    useEffect(() => {
        const handleFsChange = () => {
            if (document.fullscreenElement) {
                setFullscreenCheck({ status: 'passed', message: 'Fullscreen active' });
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
            setFullscreenCheck({ status: 'failed', message: 'Fullscreen not allowed.' });
        }
    };

    // --- Start Exam ---
    const handleStart = () => {
        if (currentStep === 7 && cameraStream && screenStream) {
            onReady({
                cameraStream,
                screenStream,
                photoBlob,
                screenshotBlob
            });
        }
    };

    // ── Render helpers ────────────────────────────────────────────────────────
    const StatusIcon: React.FC<{ status: CheckState['status'] }> = ({ status }) => {
        if (status === 'checking') return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
        if (status === 'passed') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
        return <AlertCircle className="h-4 w-4 text-slate-500" />;
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur overflow-hidden flex items-center justify-center p-4">
            <div className="w-full max-w-5xl p-4 md:p-6 relative max-h-full flex flex-col">
                
                {/* Passport Photo floating top right */}
                {photoBlob && (
                    <div className="fixed top-6 right-6 z-50 w-24 h-24 sm:w-28 sm:h-28 border-2 border-emerald-500/50 rounded-lg overflow-hidden shadow-2xl bg-slate-950">
                        <img src={URL.createObjectURL(photoBlob)} alt="Passport" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-emerald-500/90 text-white text-[9px] font-bold py-0.5 text-center uppercase tracking-wider backdrop-blur-sm">Passport</div>
                    </div>
                )}

                <div className="text-center mb-4 flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 mb-2">
                        <Shield className="h-6 w-6 text-violet-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-1">Proctoring Setup</h1>
                    <p className="text-slate-400 text-sm">Complete all 6 steps before starting your exam. Your progress is saved.</p>
                </div>

                {/* Cinematic Sliding Container */}
                <div className="w-full min-h-0 flex-1 overflow-hidden relative">
                    <div 
                        className="h-full flex w-[150%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{ transform: currentStep === 7 ? 'translateX(-33.333333%)' : 'translateX(0)' }}
                    >
                        
                        {/* COLUMN 1: The Steps (1/3 of sliding container = 1/2 of screen) */}
                        <div className="w-1/3 flex-shrink-0 pr-3 pl-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-3 relative pb-2">
                        {/* Line connecting steps */}
                        <div className="absolute left-[15px] top-6 bottom-6 w-[2px] bg-slate-800 z-0" />

                        {/* Step 1: Mic */}
                        <div className={`flex gap-4 items-start ${currentStep < 1 ? 'opacity-40' : ''} relative py-1`}>
                            <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-slate-900 relative z-10 transition-colors ${micCheck.status === 'passed' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : currentStep === 1 ? 'border-violet-500 text-violet-400 bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'border-slate-800 text-slate-500'}`}>
                                <Mic className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex flex-col pt-1 pb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-slate-200 font-medium text-[15px]">1. Microphone</h3>
                                    <StatusIcon status={micCheck.status} />
                                </div>
                                {micCheck.status !== 'passed' ? (
                                    <Button onClick={requestMic} disabled={currentStep !== 1} className="w-fit bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 h-7 text-[12px] rounded-full px-4 border border-violet-500/30 mt-1 shadow-sm transition-all" size="sm">
                                        Allow Microphone
                                    </Button>
                                ) : <p className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</p>}
                            </div>
                        </div>

                        {/* Step 2: Camera */}
                        <div className={`flex gap-4 items-start ${currentStep < 2 ? 'opacity-40' : ''} relative py-1`}>
                            <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-slate-900 relative z-10 transition-colors ${cameraCheck.status === 'passed' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : currentStep === 2 ? 'border-violet-500 text-violet-400 bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'border-slate-800 text-slate-500'}`}>
                                <Camera className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex flex-col pt-1 pb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-slate-200 font-medium text-[15px]">2. Camera</h3>
                                    <StatusIcon status={cameraCheck.status} />
                                </div>
                                {cameraCheck.status !== 'passed' ? (
                                    <Button onClick={requestCamera} disabled={currentStep !== 2} className="w-fit bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 h-7 text-[12px] rounded-full px-4 border border-violet-500/30 mt-1 shadow-sm transition-all" size="sm">
                                        Allow Camera
                                    </Button>
                                ) : <p className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</p>}
                            </div>
                        </div>

                        {/* Step 3: Photo */}
                        <div className={`flex gap-4 items-start ${currentStep < 3 ? 'opacity-40' : ''} relative py-1`}>
                            <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-slate-900 relative z-10 transition-colors ${faceEnrollCheck.status === 'passed' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : currentStep === 3 ? 'border-violet-500 text-violet-400 bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'border-slate-800 text-slate-500'}`}>
                                <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex flex-col pt-1 pb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-slate-200 font-medium text-[15px]">3. Identity Photo</h3>
                                    <StatusIcon status={faceEnrollCheck.status} />
                                </div>
                                {faceEnrollCheck.status === 'idle' || faceEnrollCheck.status === 'failed' ? (
                                    <>
                                        <Button onClick={capturePhoto} disabled={currentStep !== 3} className="w-fit bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 h-7 text-[12px] rounded-full px-4 border border-violet-500/30 mt-1 shadow-sm transition-all" size="sm">
                                            Capture Photo
                                        </Button>
                                        {faceEnrollCheck.status === 'failed' && (
                                            <p className="text-red-400 text-[11px] mt-1.5 font-medium flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {faceEnrollCheck.message || 'Verification failed. Try again.'}
                                            </p>
                                        )}
                                    </>
                                ) : faceEnrollCheck.status === 'checking' ? (
                                    <Button disabled className="w-fit bg-slate-800 text-slate-400 h-7 text-[12px] rounded-full px-4 border border-slate-700 mt-1 shadow-sm" size="sm">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Enrolling face...
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-4 mt-0.5">
                                        <p className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Enrolled & Verified</p>
                                        <Button variant="link" className="text-violet-400/80 hover:text-violet-300 h-auto p-0 text-[11px]" onClick={() => { setPhotoBlob(null); setFaceEnrollCheck({ status: 'idle' }); }}>Retake</Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step 4: Tab Closure */}
                        <div className={`flex gap-4 items-start ${currentStep < 4 ? 'opacity-40' : ''} relative py-1`}>
                            <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-slate-900 relative z-10 transition-colors ${tabsClosed ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : currentStep === 4 ? 'border-violet-500 text-violet-400 bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'border-slate-800 text-slate-500'}`}>
                                <CheckSquare className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex flex-col pt-1 pb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-slate-200 font-medium text-[15px]">4. Close Other Tabs</h3>
                                    <StatusIcon status={tabsClosed ? 'passed' : 'idle'} />
                                </div>
                                {!tabsClosed ? (
                                    <Button onClick={handleTabsClosedClick} disabled={currentStep !== 4} className="w-fit bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 h-7 text-[12px] rounded-full px-4 border border-violet-500/30 mt-1 shadow-sm transition-all" size="sm">
                                        Confirm tabs are closed
                                    </Button>
                                ) : <p className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</p>}
                            </div>
                        </div>

                        {/* Step 5: Screen Share */}
                        <div className={`flex gap-4 items-start ${currentStep < 5 ? 'opacity-40' : ''} relative py-1`}>
                            <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-slate-900 relative z-10 transition-colors ${(screenCheck.status === 'passed' && screenshotBlob) ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : currentStep === 5 ? 'border-violet-500 text-violet-400 bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'border-slate-800 text-slate-500'}`}>
                                <Monitor className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex flex-col pt-1 pb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-slate-200 font-medium text-[15px]">5. Share Screen</h3>
                                    <StatusIcon status={(screenCheck.status === 'passed' && screenshotBlob) ? 'passed' : screenCheck.status} />
                                </div>
                                <p className="text-[11px] text-amber-400/80 mb-2 font-medium leading-tight">Select "Entire Screen".</p>
                                {screenCheck.status !== 'passed' || !screenshotBlob ? (
                                    <Button onClick={requestScreenShare} disabled={currentStep !== 5} className="w-fit bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 h-7 text-[12px] rounded-full px-4 border border-violet-500/30 mt-0.5 shadow-sm transition-all" size="sm">
                                        Share Screen
                                    </Button>
                                ) : <p className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Shared & Verified</p>}
                            </div>
                        </div>

                        {/* Step 6: Fullscreen */}
                        <div className={`flex gap-4 items-start ${currentStep < 6 ? 'opacity-40' : ''} relative py-1`}>
                            <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-slate-900 relative z-10 transition-colors ${fullscreenCheck.status === 'passed' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : currentStep === 6 ? 'border-violet-500 text-violet-400 bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'border-slate-800 text-slate-500'}`}>
                                <Maximize className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex flex-col pt-1 pb-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-slate-200 font-medium text-[15px]">6. Fullscreen</h3>
                                    <StatusIcon status={fullscreenCheck.status} />
                                </div>
                                {fullscreenCheck.status !== 'passed' ? (
                                    <Button onClick={requestFullscreen} disabled={currentStep !== 6} className="w-fit bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 h-7 text-[12px] rounded-full px-4 border border-violet-500/30 mt-1 shadow-sm transition-all" size="sm">
                                        Enter Fullscreen
                                    </Button>
                                ) : <p className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Active</p>}
                            </div>
                        </div>
                        </div>
                        </div>

                        {/* COLUMN 2: Previews (1/3 of sliding container = 1/2 of screen) */}
                        <div className="w-1/3 flex-shrink-0 px-3 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4 pt-2">
                                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden aspect-video relative flex items-center justify-center shadow-inner">
                            <video ref={videoRef} muted className={`w-full h-full object-cover ${!cameraStream ? 'opacity-0' : 'opacity-100'}`} />
                            {!cameraStream && <Camera className="absolute h-6 w-6 text-slate-700" />}
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden aspect-video relative flex items-center justify-center shadow-inner">
                            <video ref={screenVideoRef} muted className={`w-full h-full object-cover ${!screenStream ? 'opacity-0' : 'opacity-100'}`} />
                            {!screenStream && <Monitor className="absolute h-6 w-6 text-slate-700" />}
                            
                            {/* Overlay the screenshot inside the monitor preview */}
                            {screenshotBlob && (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
                                    <img src={URL.createObjectURL(screenshotBlob)} alt="Screenshot" className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">Screen Verified</div>
                                </div>
                            )}
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 3: Instructions (1/3 of sliding container = 1/2 of screen) */}
                        <div className={`w-1/3 flex-shrink-0 pl-3 pr-1 overflow-y-auto custom-scrollbar transition-opacity duration-700 ${currentStep === 7 ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="space-y-4 pt-2">
                                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-inner">
                                    <h2 className="text-rose-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> 1. Auto Submitting Rules</h2>
                                    <ul className="space-y-2.5 text-[13px] text-slate-300 leading-relaxed font-medium">
                                        <li className="flex gap-2.5 items-start"><span className="text-rose-500 font-bold mt-0.5">•</span> Camera permissions stopped</li>
                                        <li className="flex gap-2.5 items-start"><span className="text-rose-500 font-bold mt-0.5">•</span> Mic permissions stopped</li>
                                        <li className="flex gap-2.5 items-start"><span className="text-rose-500 font-bold mt-0.5">•</span> Screen Share permissions stopped</li>
                                    </ul>
                                    <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                        <p className="text-rose-400/90 text-[12px] font-semibold leading-relaxed">
                                            If any of this is done the first time, a warning is given. If it is done a second time, the test will be auto submitted.
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-inner">
                                    <h2 className="text-amber-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2"><Monitor className="w-4 h-4" /> 2. Prohibited Actions</h2>
                                    <ul className="space-y-2.5 text-[13px] text-slate-300 leading-relaxed font-medium">
                                        <li className="flex gap-2.5 items-start"><span className="text-amber-500 font-bold mt-0.5">•</span> Copy (Ctrl/Cmd + C)</li>
                                        <li className="flex gap-2.5 items-start"><span className="text-amber-500 font-bold mt-0.5">•</span> Paste (Ctrl/Cmd + V)</li>
                                        <li className="flex gap-2.5 items-start"><span className="text-amber-500 font-bold mt-0.5">•</span> Cut (Ctrl/Cmd + X)</li>
                                        <li className="flex gap-2.5 items-start"><span className="text-amber-500 font-bold mt-0.5">•</span> Select All (Ctrl/Cmd + A)</li>
                                        <li className="flex gap-2.5 items-start"><span className="text-amber-500 font-bold mt-0.5">•</span> Switching Tabs</li>
                                        <li className="flex gap-2.5 items-start"><span className="text-amber-500 font-bold mt-0.5">•</span> Switching Windows</li>
                                        <li className="flex gap-2.5 items-start"><span className="text-amber-500 font-bold mt-0.5">•</span> Right-clicking and Developer Tools</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 mt-4 flex-shrink-0 max-w-2xl mx-auto w-full">
                    <Button variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white h-10 px-6">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleStart}
                        disabled={currentStep !== 7}
                        className={`flex-1 font-bold text-sm h-10 transition-all ${
                            currentStep === 7
                                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {currentStep === 7 ? (
                            <span className="flex items-center justify-center">Start Exam <ArrowRight className="ml-2 h-4 w-4" /></span>
                        ) : (
                            `Complete Step ${currentStep} to Start`
                        )}
                    </Button>
                </div>

            </div>
            
            {/* Hidden canvas for capturing images */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Tab Warning Modal */}
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
                            <Button variant="ghost" onClick={() => setShowTabWarning(false)} className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800">
                                Cancel
                            </Button>
                            <Button onClick={confirmTabsClosed} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold">
                                I Understand
                            </Button>
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
                            <Button onClick={() => setShowScreenWarning(false)} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors">
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProctoringGate;
