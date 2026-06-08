import React, { useEffect, useRef, useState } from 'react';
import { Shield, Camera, Mic, Monitor, CheckCircle2, XCircle, AlertCircle, Loader2, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckState {
    status: 'idle' | 'checking' | 'passed' | 'failed';
    message?: string;
}

interface ProctoringGateProps {
    onReady: (stream: MediaStream) => void;
    onCancel: () => void;
}

const ProctoringGate: React.FC<ProctoringGateProps> = ({ onReady, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraCheck, setCameraCheck] = useState<CheckState>({ status: 'idle' });
    const [fullscreenCheck, setFullscreenCheck] = useState<CheckState>({ status: 'idle' });
    const [acknowledged, setAcknowledged] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // ── Camera + Mic check ────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            setCameraCheck({ status: 'checking' });
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
                setCameraCheck({ status: 'passed', message: 'Camera & microphone ready' });
            } catch (err: any) {
                setCameraCheck({
                    status: 'failed',
                    message: err.name === 'NotAllowedError'
                        ? 'Permission denied. Please allow camera & microphone access in your browser settings.'
                        : 'Camera or microphone not found.',
                });
            }
        };
        init();

        return () => {
            // Don't stop stream here — it will be passed to the exam
        };
    }, []);

    // ── Fullscreen check ──────────────────────────────────────────────────────
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
            setFullscreenCheck({ status: 'failed', message: 'Fullscreen not allowed by your browser.' });
        }
    };

    // ── Gate ready check ──────────────────────────────────────────────────────
    useEffect(() => {
        const allPassed =
            cameraCheck.status === 'passed' &&
            fullscreenCheck.status === 'passed' &&
            acknowledged;
        setIsReady(allPassed);
    }, [cameraCheck.status, fullscreenCheck.status, acknowledged]);

    // ── Start exam ────────────────────────────────────────────────────────────
    const handleStart = () => {
        if (!isReady || !streamRef.current) return;
        onReady(streamRef.current);
    };

    // ── Render helpers ────────────────────────────────────────────────────────
    const StatusIcon: React.FC<{ status: CheckState['status'] }> = ({ status }) => {
        if (status === 'checking') return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
        if (status === 'passed') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
        if (status === 'failed') return <XCircle className="h-5 w-5 text-red-500" />;
        return <AlertCircle className="h-5 w-5 text-slate-400" />;
    };

    const StatusBadge: React.FC<{ status: CheckState['status']; label: string }> = ({ status, label }) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            status === 'passed' ? 'bg-emerald-100 text-emerald-700' :
            status === 'failed' ? 'bg-red-100 text-red-700' :
            status === 'checking' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-500'
        }`}>{label}</span>
    );

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 mb-4">
                        <Shield className="h-8 w-8 text-violet-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Proctoring Setup</h1>
                    <p className="text-slate-400 text-sm">Complete all checks before starting your exam</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Left: Camera preview */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="relative aspect-video bg-slate-950 flex items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className={`w-full h-full object-cover ${cameraCheck.status !== 'passed' ? 'opacity-0' : 'opacity-100'}`}
                            />
                            {cameraCheck.status !== 'passed' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                                    <Camera className="h-10 w-10" />
                                    <span className="text-xs">
                                        {cameraCheck.status === 'checking' ? 'Requesting access…' :
                                         cameraCheck.status === 'failed' ? 'Camera unavailable' : 'Waiting'}
                                    </span>
                                </div>
                            )}
                            {cameraCheck.status === 'passed' && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    LIVE
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <p className="text-slate-400 text-xs text-center">
                                Ensure your face is clearly visible and well-lit
                            </p>
                        </div>
                    </div>

                    {/* Right: Checklist */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                        {/* Camera & Mic */}
                        <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            cameraCheck.status === 'passed' ? 'border-emerald-500/30 bg-emerald-500/5' :
                            cameraCheck.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                            'border-slate-700 bg-slate-800/50'
                        }`}>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Camera className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <Mic className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-white text-sm font-medium">Camera & Microphone</span>
                                    <StatusIcon status={cameraCheck.status} />
                                </div>
                                {cameraCheck.message && (
                                    <p className={`text-xs mt-1 ${cameraCheck.status === 'failed' ? 'text-red-400' : 'text-slate-400'}`}>
                                        {cameraCheck.message}
                                    </p>
                                )}
                                {cameraCheck.status === 'failed' && (
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-xs text-violet-400 hover:text-violet-300 mt-1 underline"
                                    >
                                        Retry after granting permissions
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Fullscreen */}
                        <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            fullscreenCheck.status === 'passed' ? 'border-emerald-500/30 bg-emerald-500/5' :
                            fullscreenCheck.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                            'border-slate-700 bg-slate-800/50'
                        }`}>
                            <Maximize className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-white text-sm font-medium">Fullscreen Mode</span>
                                    <StatusIcon status={fullscreenCheck.status} />
                                </div>
                                {fullscreenCheck.status !== 'passed' ? (
                                    <button
                                        onClick={requestFullscreen}
                                        className="mt-2 w-full text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Maximize className="h-3 w-3" />
                                        Enter Fullscreen
                                    </button>
                                ) : (
                                    <p className="text-emerald-400 text-xs mt-1">Fullscreen active</p>
                                )}
                            </div>
                        </div>

                        {/* Monitoring info */}
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Monitor className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Active Monitoring</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {['Webcam Snapshots', 'Face Detection', 'Tab Tracking', 'Audio Monitoring', 'Fullscreen', 'Copy/Paste Block'].map(label => (
                                    <span key={label} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{label}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acknowledgement */}
                <div className={`mb-6 p-4 rounded-xl border transition-colors cursor-pointer ${
                    acknowledged ? 'border-violet-500/40 bg-violet-500/5' : 'border-slate-700 bg-slate-900'
                }`} onClick={() => setAcknowledged(a => !a)}>
                    <label className="flex items-start gap-3 cursor-pointer">
                        <div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 transition-all flex items-center justify-center ${
                            acknowledged ? 'border-violet-500 bg-violet-500' : 'border-slate-600'
                        }`}>
                            {acknowledged && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div>
                            <span className="text-white text-sm font-medium block mb-1">
                                I understand and consent to proctoring
                            </span>
                            <span className="text-slate-400 text-xs leading-relaxed">
                                This session will be monitored via webcam snapshots (every 30s), face detection, audio anomaly detection,
                                tab/window tracking, and fullscreen enforcement. Violations will be logged and may result in automatic submission.
                            </span>
                        </div>
                    </label>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="flex-shrink-0 text-slate-400 hover:text-white border-slate-700"
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={!isReady}
                        onClick={handleStart}
                        className={`flex-1 font-semibold transition-all ${
                            isReady
                                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {isReady ? (
                            <>
                                <Shield className="h-4 w-4 mr-2" />
                                Start Exam →
                            </>
                        ) : (
                            'Complete all checks to start'
                        )}
                    </Button>
                </div>

                {/* Status summary */}
                <div className="flex items-center justify-center gap-3 mt-4">
                    <StatusBadge status={cameraCheck.status} label="Camera" />
                    <StatusBadge status={fullscreenCheck.status} label="Fullscreen" />
                    <StatusBadge status={acknowledged ? 'passed' : 'idle'} label="Acknowledged" />
                </div>
            </div>
        </div>
    );
};

export default ProctoringGate;
