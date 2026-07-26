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
    screenStream?: MediaStream | null;
    tabSwitchThreshold?: number;
    violationThreshold?: number;
    enableCopyPaste?: boolean;
    tabSwitchAllowed?: boolean;
    onViolation?: (type: string, data?: any) => void;
    onAutoSubmit?: () => void;
    pauseFullscreenChecks?: () => boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useProctoring = ({
    assessmentId,
    assessmentType,
    enabled,
    questionId,
    mediaStream,
    screenStream,
    enableCopyPaste,
    tabSwitchAllowed,
    onViolation,
    onAutoSubmit,
    pauseFullscreenChecks,
}: ProctoringConfig) => {

    // Refs so callbacks never go stale
    const onViolationRef = useRef(onViolation);
    const onAutoSubmitRef = useRef(onAutoSubmit);
    const questionIdRef = useRef(questionId);

    useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
    useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);
    useEffect(() => { questionIdRef.current = questionId; }, [questionId]);
    
    const pauseFsRef = useRef(pauseFullscreenChecks);
    useEffect(() => { pauseFsRef.current = pauseFullscreenChecks; }, [pauseFullscreenChecks]);

    const shortcutAttemptRef = useRef<string | null>(null);
    const captureFrameRef = useRef<(() => Promise<Blob | null>) | null>(null);
    const captureScreenFrameRef = useRef<(() => Promise<Blob | null>) | null>(null);
    const hasInitializedRef = useRef(false);

    // ── Core logActivity ──────────────────────────────────────────────────────
    const logActivity = useCallback(async (activityType: string, metaData: any = {}, explicitBlob?: Blob | null) => {
        if (!enabled) return null;

        try {
            const url = `/skill_evaluation/evaluations/${assessmentId}/log_activity/`;
            const activeQuestionId = metaData.question_id || questionIdRef.current;
            const timestamp = new Date().toISOString();
            
            const criticalTypes = ['tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 'new_tab_detected', 'new_window_detected', 'face_not_detected', 'multiple_faces_detected', 'face_recognition_failed', 'violation_critical', 'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected', 'screen_share_stopped', 'camera_stopped', 'mic_stopped', 'repeated_permission_loss'];
            const isCritical = criticalTypes.some(vt => activityType.includes(vt));
            
            let blob: Blob | null = explicitBlob || null;
            let screenBlob: Blob | null = null;
            if (!blob && isCritical && captureFrameRef.current) {
                blob = await captureFrameRef.current();
            }
            if (!explicitBlob && isCritical && captureScreenFrameRef.current) {
                screenBlob = await captureScreenFrameRef.current();
            }

            const submissionLevelTypes = ['passport_photo_captured', 'initial_screenshot_captured'];
            const shouldSendQuestionId = activeQuestionId && !submissionLevelTypes.includes(activityType);

            let response;
            if (blob || screenBlob) {
                const formData = new FormData();
                formData.append('activity_type', activityType);
                formData.append('meta_data', JSON.stringify(metaData));
                formData.append('timestamp', timestamp);
                if (shouldSendQuestionId) formData.append('question_id', activeQuestionId);
                
                if (blob) {
                    formData.append('snapshot', blob, 'snapshot.png');
                }
                if (screenBlob) {
                    formData.append('screenshot', screenBlob, 'screenshot.png');
                }
                
                response = await restApiAuthUtil.post(url, formData) as any;
            } else {
                const payload = {
                    activity_type: activityType,
                    meta_data: metaData,
                    timestamp: timestamp,
                    ...(shouldSendQuestionId && { question_id: activeQuestionId }),
                };
                response = await restApiAuthUtil.post(url, payload) as any;
            }

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
    }, [assessmentId, enabled]);

    // ── 1. Visibility Change (Tab Switch) ─────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;
        const handleVisibilityChange = async () => {
            if (tabSwitchAllowed !== false) return; // Ignore if allowed
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
        if (!enabled || tabSwitchAllowed !== false) return; // Ignore blur if tab switch allowed
        const handleBlur = () => {
            // Ignore blur if the user just clicked into an iframe (like the IDE)
            if (document.activeElement?.tagName === 'IFRAME') return;
            logActivity('window_blur');
        };
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
            if (enableCopyPaste !== false) return;
            e.preventDefault();
            let selectedText = window.getSelection()?.toString() || '';
            if (!selectedText && document.activeElement instanceof HTMLTextAreaElement) {
                const ta = document.activeElement;
                selectedText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
            }
            const method = shortcutAttemptRef.current === 'c' ? 'keyboard_shortcut' : 'direct';
            logActivity('copy_detected', { method, copied_text: selectedText });
            onViolationRef.current?.('copy_detected');
        };
        const handlePaste = (e: ClipboardEvent) => {
            if (enableCopyPaste !== false) return;
            e.preventDefault();
            const pastedText = e.clipboardData?.getData('text') || '';
            const method = shortcutAttemptRef.current === 'v' ? 'keyboard_shortcut' : 'direct';
            logActivity('paste_detected', { method, pasted_text: pastedText });
            onViolationRef.current?.('paste_detected');
        };
        const handleCut = (e: ClipboardEvent) => {
            if (enableCopyPaste !== false) return;
            e.preventDefault();
            let selectedText = window.getSelection()?.toString() || '';
            if (!selectedText && document.activeElement instanceof HTMLTextAreaElement) {
                const ta = document.activeElement;
                selectedText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
            }
            const method = shortcutAttemptRef.current === 'x' ? 'keyboard_shortcut' : 'direct';
            logActivity('cut_detected', { method, cut_text: selectedText });
            onViolationRef.current?.('cut_detected');
        };
        const handleContextMenu = (e: MouseEvent) => {
            if (enableCopyPaste !== false) return;
            e.preventDefault();
            logActivity('right_click_detected', { method: 'direct', x: e.clientX, y: e.clientY });
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
            if (pauseFsRef.current?.()) return;
            if (!document.fullscreenElement) {
                logActivity('fullscreen_exit');
                onViolationRef.current?.('fullscreen_exit');
            } else {
                logActivity('fullscreen_enter');
            }
        };

        // Initial check after 2s (allow page to settle)
        const initTimeout = setTimeout(() => {
            if (pauseFsRef.current?.()) return;
            if (!document.fullscreenElement) {
                logActivity('fullscreen_exit', { trigger: 'initial_check' });
                onViolationRef.current?.('fullscreen_exit');
            }
        }, 2000);

        // Removed periodic 3s check to prevent spamming the backend.
        // Fullscreen changes are handled by the 'fullscreenchange' event listener below.

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            clearTimeout(initTimeout);
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
                if (key === 'f12') {
                    logActivity('devtools_opened', { key: e.key, description: 'F12 DevTools blocked' });
                    onViolationRef.current?.('devtools_opened');
                } else {
                    description = `${e.key} blocked`;
                }
            }

            // ── Cmd+Option+I/J/C (Mac DevTools — Chrome, Safari, Edge) ───────
            if (meta && alt && ['i','j','c'].includes(key)) {
                blocked = true;
                logActivity('devtools_opened', { key: `Cmd+Option+${key.toUpperCase()}`, description: 'DevTools (Mac)' });
                onViolationRef.current?.('devtools_opened');
            }

            // ── Cmd+Shift+I/J/C (Mac — Firefox DevTools) ──────────────────────
            if (meta && shift && ['i','j','c'].includes(key)) {
                blocked = true;
                logActivity('devtools_opened', { key: `Cmd+Shift+${key.toUpperCase()}`, description: 'DevTools (Mac Firefox)' });
                onViolationRef.current?.('devtools_opened');
            }

            // ── Ctrl+Shift+I/J/C/K/E/S/M (Windows/Linux DevTools) ─────────────
            if (ctrl && shift && ['i','j','c','k','e','s','m'].includes(key)) {
                blocked = true;
                logActivity('devtools_opened', { key: `Ctrl+Shift+${key.toUpperCase()}`, description: 'DevTools' });
                onViolationRef.current?.('devtools_opened');
            }

            // ── New Tab (Ctrl/Cmd + T) ────────────────────────────────────────
            if (ctrlOrMeta && key === 't') {
                blocked = true;
                logActivity('new_tab_detected', { key: `Ctrl/Cmd+T`, description: 'New tab blocked' });
                onViolationRef.current?.('new_tab_detected');
            }

            // ── New Window (Ctrl/Cmd + N) ─────────────────────────────────────
            if (ctrlOrMeta && key === 'n') {
                blocked = true;
                logActivity('new_window_detected', { key: `Ctrl/Cmd+N`, description: 'New window blocked' });
                onViolationRef.current?.('new_window_detected');
            }

            // ── Screenshots (Mac: Cmd+Shift+3/4/5) ────────────────────────────
            if (meta && shift && ['3','4','5'].includes(key)) {
                logActivity('screenshot_detected', { key: `Cmd+Shift+${key}`, description: 'Screenshot attempt' });
                onViolationRef.current?.('screenshot_detected');
            }

            // ── PrintScreen ────────────────────────────────────────────────────
            if (key === 'printscreen') {
                logActivity('screenshot_detected', { key: 'PrintScreen', description: 'Screenshot attempt' });
                onViolationRef.current?.('screenshot_detected');
            }

            // ── Ctrl+U / Cmd+U (View Source) ───────────────────────────────────
            if (ctrlOrMeta && key === 'u') {
                blocked = true;
                logActivity('devtools_opened', { key: 'Ctrl/Cmd+U', description: 'View Source blocked' });
                onViolationRef.current?.('devtools_opened');
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
            if (ctrlOrMeta && !shift && ['c','v','x'].includes(key)) {
                if (enableCopyPaste === false) {
                    shortcutAttemptRef.current = key;
                    setTimeout(() => { shortcutAttemptRef.current = null; }, 100);
                }
            } else if (ctrlOrMeta && !shift && ['a','p','s'].includes(key)) {
                if (enableCopyPaste === false) {
                    blocked = true;
                    
                    if (key === 'a') {
                        let selectedText = window.getSelection()?.toString() || '';
                        if (!selectedText && document.activeElement instanceof HTMLTextAreaElement) {
                            const ta = document.activeElement;
                            selectedText = ta.value.substring(ta.selectionStart, ta.selectionEnd);
                        }
                        logActivity('select_all_detected', { method: 'keyboard_shortcut', key: 'Ctrl/Cmd+A', selected_text: selectedText });
                        onViolationRef.current?.('select_all_detected');
                    } else {
                        description = `Ctrl+${key.toUpperCase()} blocked`;
                    }
                }
            }

            // ── Alt+Tab ───────────────────────────────────────────────────────
            if (alt && key === 'tab') {
                if (tabSwitchAllowed === false) {
                    logActivity('window_blur', { key: 'Alt+Tab', description: 'App switch attempt' });
                    onViolationRef.current?.('window_blur');
                }
            }

            if (blocked) {
                e.preventDefault();
                e.stopPropagation();
            }

            if (blocked && description) {
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

        const screenVideo = document.createElement('video');
        screenVideo.muted = true;
        screenVideo.playsInline = true;
        screenVideo.style.position = 'fixed';
        screenVideo.style.top = '0';
        screenVideo.style.left = '-9999px';
        screenVideo.style.width = '1px';
        screenVideo.style.height = '1px';
        screenVideo.style.opacity = '0';
        screenVideo.style.pointerEvents = 'none';
        document.body.appendChild(screenVideo);

        const canvas = document.createElement('canvas');

        // Expose a raw capture function for critical violations
        captureFrameRef.current = async (): Promise<Blob | null> => {
            return new Promise((resolve) => {
                if (!isActive || !video.srcObject) return resolve(null);
                if (video.readyState < 2) return resolve(null);
                
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            });
        };

        captureScreenFrameRef.current = async (): Promise<Blob | null> => {
            return new Promise((resolve) => {
                if (!isActive || !screenVideo.srcObject) return resolve(null);
                if (screenVideo.readyState < 2) return resolve(null);
                
                canvas.width = screenVideo.videoWidth || 1280;
                canvas.height = screenVideo.videoHeight || 720;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                
                ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            });
        };

        // ── Snapshot uploader ─────────────────────────────────────────────────
        const takeAndUploadSnapshot = async (stream: MediaStream) => {
            if (!stream.active || !isActive) return;
            try {
                if (video.srcObject !== stream) {
                    video.srcObject = stream;
                }

                const captureAndUpload = async () => {
                    const blob = await captureFrameRef.current?.();
                    if (!blob || !isActive) return;

                    const formData = new FormData();
                    formData.append('snapshot', blob, 'snapshot.png');
                    formData.append('activity_type', 'snapshot');
                    formData.append('timestamp', new Date().toISOString());
                    const activeQId = questionIdRef.current;
                    if (activeQId) formData.append('question_id', activeQId);

                    const url = `/skill_evaluation/evaluations/${assessmentId}/log_activity/`;
                    try {
                        const response = await restApiAuthUtil.post(url, formData) as any;
                        toast.success('Proctoring Snapshot Captured', {
                            duration: 1500,
                            position: 'top-center',
                            id: 'snapshot-toast',
                        });
                        if (response?.status === 'auto_submitted' || response?.auto_submitted === true) {
                            onAutoSubmitRef.current?.();
                        }
                    } catch (err) {
                        console.error('Snapshot upload failed:', err);
                    }
                };

                if (video.readyState >= 2) {
                    captureAndUpload();
                } else {
                    const onDataLoaded = () => {
                        captureAndUpload();
                        video.removeEventListener('loadeddata', onDataLoaded);
                        video.removeEventListener('canplay', onDataLoaded);
                    };
                    video.addEventListener('loadeddata', onDataLoaded);
                    video.addEventListener('canplay', onDataLoaded);
                }
            } catch (err) {
                console.error('Snapshot capture error:', err);
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

                        // First snapshot immediately (only once per instance to avoid StrictMode double-fire)
                        if (!hasInitializedRef.current) {
                            hasInitializedRef.current = true;
                            await takeAndUploadSnapshot(streamToUse!);
                        }

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

                    if (screenStream) {
                        screenVideo.autoplay = true;
                        screenVideo.srcObject = screenStream;
                        // Let autoplay handle playback. We don't strictly need to wait for loadedmetadata for screenVideo to initialize the camera capture loop.
                    }

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
            captureFrameRef.current = null;
            captureScreenFrameRef.current = null;
            clearInterval(snapshotIntervalId);
            if (internalStream) internalStream.getTracks().forEach(t => t.stop());
            video.srcObject = null;
            screenVideo.srcObject = null;
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
            if (screenVideo.parentNode) {
                screenVideo.parentNode.removeChild(screenVideo);
            }
        };
    }, [assessmentId, assessmentType, enabled, mediaStream, screenStream, logActivity]);

    return { logActivity };
};
