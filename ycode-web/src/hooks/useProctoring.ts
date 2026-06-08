import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import restApiAuthUtil from '../utils/RestApiAuthUtil';

// ─── API base — never hardcode localhost ──────────────────────────────────────
const BACKEND_API_BASE = import.meta.env.VITE_BACKEND_API_BASE_URL
    ? import.meta.env.VITE_BACKEND_API_BASE_URL.replace(/\/+$/, '')   // strip trailing slash
    : 'http://localhost:8000/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProctoringConfig {
    assessmentId: string;
    assessmentType: 'skill-tests' | 'contests' | 'mock-interviews' | 'job-tests' | 'certification-exams';
    enabled: boolean;
    questionId?: string;
    mediaStream?: MediaStream | null;
    tabSwitchThreshold?: number;
    violationThreshold?: number;
    onViolation?: (type: string, data?: any) => void;
    onAutoSubmit?: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useProctoring = ({
    assessmentId,
    assessmentType,
    enabled,
    questionId,
    mediaStream,
    onViolation,
    onAutoSubmit,
}: ProctoringConfig) => {

    // Refs so callbacks never go stale
    const onViolationRef = useRef(onViolation);
    const onAutoSubmitRef = useRef(onAutoSubmit);
    const questionIdRef = useRef(questionId);

    useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
    useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);
    useEffect(() => { questionIdRef.current = questionId; }, [questionId]);

    // ── Core logActivity ──────────────────────────────────────────────────────
    const logActivity = useCallback(async (activityType: string, metaData: any = {}) => {
        if (!enabled) return null;

        try {
            const url = `/assessment/${assessmentType}/${assessmentId}/log-activity/`;
            const activeQuestionId = metaData.question_id || questionIdRef.current;
            const payload = {
                activity_type: activityType,
                meta_data: metaData,
                timestamp: new Date().toISOString(),
                ...(activeQuestionId && { question_id: activeQuestionId }),
            };

            const response = await restApiAuthUtil.post(url, payload) as any;
            const data = response;

            // Backend signals auto-submit (threshold exceeded)
            if (data?.auto_submitted === true || data?.status === 'auto_submitted') {
                onAutoSubmitRef.current?.();
            }

            return data;
        } catch (error) {
            console.error('Proctoring log error:', error);
            return null; // Fail silently — never disrupt the exam
        }
    }, [assessmentId, assessmentType, enabled]);

    // ── 1. Visibility Change (Tab Switch) ─────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;
        const handleVisibilityChange = async () => {
            if (document.hidden) {
                await logActivity('tab_switched', { type: 'hidden' });
            } else {
                const data = await logActivity('tab_switched', { type: 'visible' });
                // Check if backend triggered auto-submit via tab switch threshold
                if (data?.auto_submitted) return;

                onViolationRef.current?.('tab_switch');

                // Check clipboard for forbidden video-call platforms
                try {
                    const text = await navigator.clipboard.readText();
                    const forbiddenDomains = [
                        'meet.google.com', 'zoom.us', 'teams.microsoft.com', 'webex.com',
                        'discord.com', 'slack.com', 'skype.com',
                    ];
                    const foundUrl = forbiddenDomains.find(d => text.includes(d));
                    if (foundUrl) {
                        logActivity('forbidden_platform_detected', { platform: foundUrl });
                        onViolationRef.current?.('forbidden_platform', { platform: foundUrl });
                    }
                } catch {
                    // Clipboard permission denied — ignore
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [enabled, logActivity]);

    // ── 2. Window Blur / Focus ────────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;
        const handleBlur = () => logActivity('window_blur');
        const handleFocus = () => logActivity('window_focus');
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [enabled, logActivity]);

    // ── 3. Copy / Paste / Cut / Context Menu / Drag ──────────────────────────
    useEffect(() => {
        if (!enabled) return;

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            let selectedText = window.getSelection()?.toString() || '';
            if (!selectedText && document.activeElement instanceof HTMLTextAreaElement) {
                const ta = document.activeElement;
                selectedText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
            }
            logActivity('copy_detected', { copied_text: selectedText });
            onViolationRef.current?.('copy_detected');
        };
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const pastedText = e.clipboardData?.getData('text') || '';
            logActivity('paste_detected', { pasted_text: pastedText });
            onViolationRef.current?.('paste_detected');
        };
        const handleCut = (e: ClipboardEvent) => {
            e.preventDefault();
            let selectedText = window.getSelection()?.toString() || '';
            if (!selectedText && document.activeElement instanceof HTMLTextAreaElement) {
                const ta = document.activeElement;
                selectedText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
            }
            logActivity('cut_detected', { cut_text: selectedText });
            onViolationRef.current?.('cut_detected');
        };
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logActivity('right_click_detected', { x: e.clientX, y: e.clientY });
            onViolationRef.current?.('right_click_detected');
        };
        const handleDrag = (e: DragEvent) => { e.preventDefault(); };

        document.addEventListener('copy', handleCopy, true);
        document.addEventListener('paste', handlePaste, true);
        document.addEventListener('cut', handleCut, true);
        document.addEventListener('contextmenu', handleContextMenu, true);
        document.addEventListener('dragstart', handleDrag, true);
        document.addEventListener('drop', handleDrag, true);
        document.addEventListener('dragover', handleDrag, true);

        return () => {
            document.removeEventListener('copy', handleCopy, true);
            document.removeEventListener('paste', handlePaste, true);
            document.removeEventListener('cut', handleCut, true);
            document.removeEventListener('contextmenu', handleContextMenu, true);
            document.removeEventListener('dragstart', handleDrag, true);
            document.removeEventListener('drop', handleDrag, true);
            document.removeEventListener('dragover', handleDrag, true);
        };
    }, [enabled, logActivity]);

    // ── 4. Fullscreen Enforcement ─────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                logActivity('fullscreen_exit');
                onViolationRef.current?.('fullscreen_exit');
            } else {
                logActivity('fullscreen_enter');
            }
        };

        // Initial check after 2s (allow page to settle)
        const initTimeout = setTimeout(() => {
            if (!document.fullscreenElement) {
                logActivity('fullscreen_exit', { trigger: 'initial_check' });
                onViolationRef.current?.('fullscreen_exit');
            }
        }, 2000);

        // Periodic check every 3s
        const pollInterval = setInterval(() => {
            if (!document.fullscreenElement) {
                logActivity('fullscreen_exit', { trigger: 'interval_check' });
                onViolationRef.current?.('fullscreen_exit');
            }
        }, 3000);

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            clearTimeout(initTimeout);
            clearInterval(pollInterval);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [enabled, logActivity]);

    // ── 5. Keyboard Shortcuts — DevTools & Restricted ────────────────────────
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey;
            const meta = e.metaKey;           // Cmd on Mac
            const ctrlOrMeta = ctrl || meta;
            const shift = e.shiftKey;
            const alt = e.altKey;             // Option on Mac

            let blocked = false;
            let description = '';

            // ── F-keys (all blocked) ──────────────────────────────────────────
            const fKeys = ['f1','f2','f3','f4','f5','f6','f7','f8','f9','f10','f11','f12'];
            if (fKeys.includes(key)) {
                blocked = true;
                description = `${e.key} blocked`;
            }

            // ── Cmd+Option+I/J/C (Mac DevTools — Chrome, Safari, Edge) ───────
            if (meta && alt && ['i','j','c'].includes(key)) {
                blocked = true;
                description = `Cmd+Option+${key.toUpperCase()} — DevTools (Mac)`;
            }

            // ── Cmd+Shift+I/J/C (Mac — Firefox DevTools) ──────────────────────
            if (meta && shift && ['i','j','c'].includes(key)) {
                blocked = true;
                description = `Cmd+Shift+${key.toUpperCase()} — DevTools (Mac Firefox)`;
            }

            // ── Ctrl+Shift+I/J/C/K/E/S/M (Windows/Linux DevTools) ─────────────
            if (ctrl && shift && ['i','j','c','k','e','s','m'].includes(key)) {
                blocked = true;
                description = `Ctrl+Shift+${key.toUpperCase()} — DevTools`;
            }

            // ── Ctrl+U / Cmd+U (View Source) ───────────────────────────────────
            if (ctrlOrMeta && key === 'u') {
                blocked = true;
                description = 'View Source blocked';
            }

            // ── Ctrl+R / Cmd+R (Reload) ────────────────────────────────────────
            if (ctrlOrMeta && key === 'r') {
                blocked = true;
                description = 'Reload blocked';
            }

            // ── Ctrl+L / Cmd+L (Address bar) ──────────────────────────────────
            if (ctrlOrMeta && key === 'l') {
                blocked = true;
                description = 'Address bar blocked';
            }

            // ── Ctrl+C/V/X/A/P/S (Copy, Paste, Cut, Select all, Print, Save) ───
            if (ctrlOrMeta && !shift && ['c','v','x','a','p','s'].includes(key)) {
                blocked = true;
                description = `Ctrl+${key.toUpperCase()} blocked`;
            }

            // ── PrintScreen ────────────────────────────────────────────────────
            if (e.key === 'PrintScreen') {
                // Can't fully block but log it
                logActivity('keyboard_shortcut', { key: 'PrintScreen', description: 'Screenshot attempt' });
                onViolationRef.current?.('keyboard_shortcut');
            }

            // ── Alt+Tab ───────────────────────────────────────────────────────
            if (alt && key === 'tab') {
                logActivity('keyboard_shortcut', { key: 'Alt+Tab', description: 'App switch attempt' });
                onViolationRef.current?.('keyboard_shortcut');
            }

            if (blocked) {
                e.preventDefault();
                e.stopPropagation();
                logActivity('keyboard_shortcut', { key: e.key, description });
                onViolationRef.current?.('keyboard_shortcut');
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [enabled, logActivity]);

    // ── 6. Network Disconnection Tracking ────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        const handleOffline = () => logActivity('network_disconnection');
        const handleOnline = () => logActivity('network_reconnection');

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [enabled, logActivity]);

    // ── 7. Camera Snapshot (every 30s) ────────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        let internalStream: MediaStream | null = null;
        let isActive = true;
        let snapshotIntervalId: ReturnType<typeof setInterval>;

        // Shared off-screen video + canvas
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.style.position = 'fixed';
        video.style.top = '0';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);

        const canvas = document.createElement('canvas');

        // ── Snapshot uploader ─────────────────────────────────────────────────
        const takeAndUploadSnapshot = async (stream: MediaStream) => {
            if (!stream.active || !isActive) return;
            console.log('useProctoring [ycode-web]: takeAndUploadSnapshot starting...');
            try {
                if (video.srcObject !== stream) {
                    video.srcObject = stream;
                    // Let autoPlay handle playback
                }

                const captureFrame = () => {
                    if (!isActive || !stream.active) return;
                    if (video.readyState < 2) return;

                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    console.log('useProctoring [ycode-web]: Frame captured on canvas, converting to blob...');

                    canvas.toBlob(async (blob) => {
                        if (!blob || !isActive) return;
                        console.log('useProctoring [ycode-web]: Blob generated successfully, uploading...', { size: blob.size });

                        const formData = new FormData();
                        formData.append('snapshot', blob, 'snapshot.png');
                        formData.append('activity_type', 'snapshot');
                        formData.append('timestamp', new Date().toISOString());
                        const activeQId = questionIdRef.current;
                        if (activeQId) formData.append('question_id', activeQId);

                        const url = `/assessment/${assessmentType}/${assessmentId}/log-activity/`;
                        try {
                            const response = await restApiAuthUtil.post(url, formData) as any;
                            console.log('useProctoring [ycode-web]: Snapshot successfully uploaded to backend:', response);
                            toast.success('Proctoring Snapshot Captured', {
                                duration: 1500,
                                position: 'top-center',
                                id: 'snapshot-toast',
                            });
                            if (response?.status === 'auto_submitted' || response?.auto_submitted === true) {
                                onAutoSubmitRef.current?.();
                            }
                        } catch (err) {
                            console.error('useProctoring [ycode-web]: Snapshot upload failed:', err);
                        }
                    }, 'image/png');
                };

                if (video.readyState >= 2) {
                    captureFrame();
                } else {
                    const onDataLoaded = () => {
                        captureFrame();
                        video.removeEventListener('loadeddata', onDataLoaded);
                        video.removeEventListener('canplay', onDataLoaded);
                    };
                    video.addEventListener('loadeddata', onDataLoaded);
                    video.addEventListener('canplay', onDataLoaded);
                }
            } catch (err) {
                console.error('useProctoring [ycode-web]: Snapshot capture error:', err);
            }
        };


        // ── Audio Anomaly Detection ───────────────────────────────────────────
        const initAudioMonitor = async () => {
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaStreamSource(micStream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                let anomalyCount = 0;

                const audioIntervalId = setInterval(() => {
                    if (!isActive) {
                        clearInterval(audioIntervalId);
                        audioCtx.close();
                        micStream.getTracks().forEach(t => t.stop());
                        return;
                    }
                    analyser.getByteFrequencyData(dataArray);
                    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                    // Threshold: avg > 60 indicates elevated/suspicious audio
                    if (avg > 60) {
                        anomalyCount++;
                        // Only log if sustained (3 consecutive readings) to avoid false positives
                        if (anomalyCount >= 3) {
                            logActivity('audio_anomaly', { volume_level: Math.round(avg) });
                            anomalyCount = 0; // reset after logging
                        }
                    } else {
                        anomalyCount = 0;
                    }
                }, 2000);
            } catch {
                // Mic access denied — already handled by AssessmentInterface camera init
            }
        };

        // ── Camera init ───────────────────────────────────────────────────────
        const initCamera = async () => {
            try {
                let streamToUse = mediaStream;

                if (!streamToUse) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (!isActive) { stream.getTracks().forEach(t => t.stop()); return; }
                    internalStream = stream;
                    streamToUse = stream;
                }

                if (streamToUse && isActive) {
                    logActivity('camera_enabled');

                    let started = false;
                    const startCapture = async () => {
                        if (started || !isActive) return;
                        started = true;
                        // Let autoPlay handle playback

                        // First snapshot immediately
                        await takeAndUploadSnapshot(streamToUse!);

                        // Then every 30 seconds
                        clearInterval(snapshotIntervalId);
                        snapshotIntervalId = setInterval(() => {
                            if (streamToUse?.active && isActive) {
                                takeAndUploadSnapshot(streamToUse);
                            }
                        }, 30000);


                    };

                    video.autoplay = true;
                    video.muted = true;
                    video.playsInline = true;

                    video.onloadedmetadata = startCapture;
                    video.srcObject = streamToUse;

                    // Fallback in case metadata is already loaded
                    if (video.readyState >= 1) {
                        startCapture();
                    }
                }
            } catch (err) {
                if (isActive) {
                    console.error('Camera init failed for proctoring:', err);
                    logActivity('camera_disabled', { error: String(err) });
                }
            }
        };

        initCamera();
        initAudioMonitor();

        return () => {
            isActive = false;
            clearInterval(snapshotIntervalId);
            if (internalStream) internalStream.getTracks().forEach(t => t.stop());
            video.srcObject = null;
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
        };
    }, [assessmentId, assessmentType, enabled, mediaStream, logActivity]);

    return { logActivity };
};
