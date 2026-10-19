import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import restApiAuthUtil from '../utils/RestApiAuthUtil';
import { getGlobalProctoringData } from '../utils/proctoringStore';

// ─── API base — never hardcode localhost ──────────────────────────────────────
const BACKEND_API_BASE = import.meta.env.VITE_BACKEND_API_BASE_URL
    ? import.meta.env.VITE_BACKEND_API_BASE_URL.replace(/\/+$/, '')   // strip trailing slash
    : 'http://localhost:8000/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProctoringConfig {
    assessmentId: string;
    assessmentType: 'skill-tests' | 'contests' | 'mock-interviews' | 'job-tests' | 'certification-exams' | 'skill_evaluation' | string;
    enabled: boolean;
    questionId?: string;
    questionTitle?: string;
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
    questionTitle,
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
    const questionTitleRef = useRef(questionTitle);

    useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
    useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);
    useEffect(() => { questionIdRef.current = questionId; }, [questionId]);
    useEffect(() => { questionTitleRef.current = questionTitle; }, [questionTitle]);
    
    const pauseFsRef = useRef(pauseFullscreenChecks);
    useEffect(() => { pauseFsRef.current = pauseFullscreenChecks; }, [pauseFullscreenChecks]);

    const shortcutAttemptRef = useRef<string | null>(null);
    const captureFrameRef = useRef<(() => Promise<Blob | null>) | null>(null);
    const captureScreenFrameRef = useRef<(() => Promise<Blob | null>) | null>(null);
    const hasInitializedRef = useRef(false);
    const keysDownRef = useRef(new Set<string>());

    // ── Core logActivity ──────────────────────────────────────────────────────
    const logActivity = useCallback(async (activityType: string, metaData: any = {}, explicitBlob?: Blob | null) => {
        if (!enabled && 
            activityType !== 'vitarka_session_started' && 
            activityType !== 'passport_photo_captured' && 
            activityType !== 'initial_screenshot_captured') {
            return null;
        }

        try {
            const url = `/skill_evaluation/evaluations/${assessmentId}/log_activity/`;
            const activeQuestionId = metaData.question_id || questionIdRef.current;
            const activeQuestionTitle = metaData.question_title || questionTitleRef.current;
            const timestamp = new Date().toISOString();
            
            const violationTypes = [
                'tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 
                'new_tab_detected', 'new_window_detected', 'face_not_detected', 
                'multiple_faces_detected', 'face_recognition_failed', 'violation_critical', 
                'suspicious_activity', 'device_change', 'external_monitor', 
                'forbidden_platform_detected', 'screen_share_stopped', 'camera_stopped', 
                'mic_stopped', 'repeated_permission_loss', 'copy_detected', 
                'paste_detected', 'cut_detected', 'screenshot_detected', 'right_click_detected'
            ];
            const isViolation = violationTypes.some(vt => activityType.includes(vt));
            
            let blob: Blob | null = null;
            let screenBlob: Blob | null = null;

            if (activityType === 'initial_screenshot_captured') {
                screenBlob = explicitBlob || (captureScreenFrameRef.current ? await captureScreenFrameRef.current() : null);
            } else if (activityType === 'passport_photo_captured') {
                blob = explicitBlob || (captureFrameRef.current ? await captureFrameRef.current() : null);
            } else {
                blob = explicitBlob || null;
                if (!blob && isViolation && captureFrameRef.current) {
                    blob = await captureFrameRef.current();
                }
                if (isViolation && captureScreenFrameRef.current) {
                    screenBlob = await captureScreenFrameRef.current();
                }
            }

            const submissionLevelTypes = ['passport_photo_captured', 'initial_screenshot_captured'];
            const shouldSendQuestionId = activeQuestionId && !submissionLevelTypes.includes(activityType);
            const shouldSendQuestionTitle = activeQuestionTitle && !submissionLevelTypes.includes(activityType);

            let response;
            if (blob || screenBlob) {
                const formData = new FormData();
                formData.append('activity_type', activityType);
                formData.append('meta_data', JSON.stringify(metaData));
                formData.append('timestamp', timestamp);
                if (shouldSendQuestionId) formData.append('question_id', activeQuestionId);
                if (shouldSendQuestionTitle) formData.append('question_title', activeQuestionTitle);
                
                if (blob) {
                    formData.append('snapshot', blob, activityType === 'passport_photo_captured' ? 'passport.jpg' : 'snapshot.jpg');
                }
                if (screenBlob) {
                    formData.append('screenshot', screenBlob, 'screenshot.jpg');
                }
                
                response = await restApiAuthUtil.post(url, formData) as any;
            } else {
                const payload = {
                    activity_type: activityType,
                    meta_data: metaData,
                    timestamp: timestamp,
                    ...(shouldSendQuestionId && { question_id: activeQuestionId }),
                    ...(shouldSendQuestionTitle && { question_title: activeQuestionTitle }),
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
            if (tabSwitchAllowed === true) return; // Ignore if explicitly allowed
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
            
            // Infer Snipping Tool (Win+Shift+S) or Mac (Cmd+Shift+3/4/5) based on keys held during blur
            if (keysDownRef.current.has('meta') && keysDownRef.current.has('shift')) {
                logActivity('screenshot_detected', { description: 'Inferred screenshot from OS shortcut' });
                onViolationRef.current?.('screenshot_detected');
            } else {
                logActivity('window_blur');
            }
            
            // Clear keys down since we won't get keyup events while blurred
            keysDownRef.current.clear();
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
            if (enableCopyPaste === true) return;
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
            if (enableCopyPaste === true) return;
            e.preventDefault();
            const pastedText = e.clipboardData?.getData('text') || '';
            const method = shortcutAttemptRef.current === 'v' ? 'keyboard_shortcut' : 'direct';
            logActivity('paste_detected', { method, pasted_text: pastedText });
            onViolationRef.current?.('paste_detected');
        };
        const handleCut = (e: ClipboardEvent) => {
            if (enableCopyPaste === true) return;
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
            // Always prevent browser context menu to forbid 'Inspect' and dev tools,
            // regardless of whether copy/paste is enabled.
            e.preventDefault();
            e.stopPropagation();
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
            keysDownRef.current.add(key);
            if (e.metaKey) keysDownRef.current.add('meta');
            if (e.shiftKey) keysDownRef.current.add('shift');
            if (e.ctrlKey) keysDownRef.current.add('ctrl');
            if (e.altKey) keysDownRef.current.add('alt');

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

            const code = (e.code || '').toLowerCase();
            const isDevToolsLetter = (
                ['i', 'j', 'c', 'k', 'e', 's', 'm', 'u', 'd', 'p', 'ˆ', '∆', 'ç', '¨', '', '´', 'ß', 'µ', 'î', 'π'].includes(key) ||
                ['keyi', 'keyj', 'keyc', 'keyk', 'keye', 'keys', 'keym', 'keyd', 'keyu', 'keyp'].includes(code)
            );

            // ── Cmd+Option+I/J/C (Mac DevTools — Chrome, Safari, Edge) ───────
            if (meta && alt && isDevToolsLetter) {
                blocked = true;
                logActivity('devtools_opened', { key: `Cmd+Option+${code || key}`, description: 'DevTools (Mac) blocked' });
                onViolationRef.current?.('devtools_opened');
            }

            // ── Cmd+Shift+I/J/C (Mac — Firefox DevTools) ──────────────────────
            if (meta && shift && isDevToolsLetter) {
                blocked = true;
                logActivity('devtools_opened', { key: `Cmd+Shift+${code || key}`, description: 'DevTools (Mac Firefox) blocked' });
                onViolationRef.current?.('devtools_opened');
            }

            // ── Ctrl+Shift+I/J/C/K/E/S/M (Windows/Linux DevTools) ─────────────
            if (ctrl && (shift || alt) && isDevToolsLetter) {
                blocked = true;
                logActivity('devtools_opened', { key: `Ctrl+Shift+${code || key}`, description: 'DevTools blocked' });
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

            // ── Screenshots (Windows/Mac: Win/Cmd+Shift+S) ────────────────────
            if (meta && shift && key === 's') {
                logActivity('screenshot_detected', { key: `Win/Cmd+Shift+S`, description: 'Screenshot attempt' });
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
                if (enableCopyPaste !== true) {
                    shortcutAttemptRef.current = key;
                    setTimeout(() => { shortcutAttemptRef.current = null; }, 100);
                }
            } else if (ctrlOrMeta && !shift && ['a','p','s'].includes(key)) {
                if (enableCopyPaste !== true) {
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

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            keysDownRef.current.delete(key);
            if (!e.metaKey) keysDownRef.current.delete('meta');
            if (!e.shiftKey) keysDownRef.current.delete('shift');
            if (!e.ctrlKey) keysDownRef.current.delete('ctrl');
            if (!e.altKey) keysDownRef.current.delete('alt');

            const meta = e.metaKey;
            const shift = e.shiftKey;

            // ── PrintScreen (Often only fires keyup on Windows) ───────────────
            if (key === 'printscreen') {
                logActivity('screenshot_detected', { key: 'PrintScreen', description: 'Screenshot attempt' });
                onViolationRef.current?.('screenshot_detected');
            }
            
            // ── Screenshots (Windows/Mac: Win/Cmd+Shift+S) fallback ───────────
            if (meta && shift && key === 's') {
                logActivity('screenshot_detected', { key: `Win/Cmd+Shift+S`, description: 'Screenshot attempt' });
                onViolationRef.current?.('screenshot_detected');
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        window.addEventListener('keyup', handleKeyUp, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('keyup', handleKeyUp, { capture: true });
        };
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

        // Shared off-screen video elements
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.style.position = 'fixed';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '320px';
        video.style.height = '240px';
        video.style.opacity = '0.001';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-9999';
        document.body.appendChild(video);

        const screenVideo = document.createElement('video');
        screenVideo.muted = true;
        screenVideo.playsInline = true;
        screenVideo.autoplay = true;
        screenVideo.style.position = 'fixed';
        screenVideo.style.top = '0';
        screenVideo.style.left = '0';
        screenVideo.style.width = '320px';
        screenVideo.style.height = '240px';
        screenVideo.style.opacity = '0.001';
        screenVideo.style.pointerEvents = 'none';
        screenVideo.style.zIndex = '-9999';
        document.body.appendChild(screenVideo);

        const activeScr = screenStream || getGlobalProctoringData()?.screenStream;
        if (activeScr) {
            screenVideo.srcObject = activeScr;
            screenVideo.play().catch(() => {});
        }

        const captureStream = async (stream: MediaStream | null | undefined, fallbackVid: HTMLVideoElement, quality = 0.6): Promise<Blob | null> => {
            if (!stream) return null;
            const track = stream.getVideoTracks().find(t => t.readyState === 'live');
            if (!track) return null;

            // Strategy 1: WebCodecs MediaStreamTrackProcessor (works on both display media & camera tracks, even in background/hidden tabs)
            if (typeof (window as any).MediaStreamTrackProcessor === 'function') {
                try {
                    const processor = new (window as any).MediaStreamTrackProcessor({ track });
                    const reader = processor.readable.getReader();
                    const readPromise = reader.read();
                    const timeoutPromise = new Promise<{ value: undefined; done: true }>((resolve) => 
                        setTimeout(() => resolve({ value: undefined, done: true }), 400)
                    );
                    const result = await Promise.race([readPromise, timeoutPromise]);
                    if (result && result.value) {
                        const frame = result.value;
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = frame.displayWidth || frame.codedWidth || 1280;
                            canvas.height = frame.displayHeight || frame.codedHeight || 720;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
                                const b = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
                                if (b) return b;
                            }
                        } finally {
                            frame.close();
                            reader.releaseLock();
                        }
                    } else {
                        reader.releaseLock();
                    }
                } catch (e) {
                    // Fall through to other strategies
                }
            }

            // Strategy 2: ImageCapture API (only works on camera tracks from getUserMedia, NOT screen share)
            const isDisplayMedia = !!((track.getSettings && (track.getSettings() as any).displaySurface));
            if (!isDisplayMedia && typeof (window as any).ImageCapture === 'function') {
                try {
                    const capturer = new (window as any).ImageCapture(track);
                    const bitmap = await Promise.race([
                        capturer.grabFrame(),
                        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 400))
                    ]);
                    if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
                        const canvas = document.createElement('canvas');
                        canvas.width = bitmap.width;
                        canvas.height = bitmap.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(bitmap, 0, 0);
                            const b = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
                            if (b) return b;
                        }
                    }
                } catch (e) {
                    // Fall back to video element
                }
            }

            // Strategy 3: Video Element + Canvas
            if (fallbackVid) {
                try {
                    if (fallbackVid.srcObject !== stream) {
                        fallbackVid.srcObject = stream;
                    }
                    if (fallbackVid.paused) {
                        await fallbackVid.play().catch(() => {});
                    }
                    if (fallbackVid.readyState < 2) {
                        await new Promise<void>((resolve) => {
                            const timer = setTimeout(resolve, 300);
                            const onReady = () => {
                                clearTimeout(timer);
                                fallbackVid.removeEventListener('loadeddata', onReady);
                                fallbackVid.removeEventListener('canplay', onReady);
                                resolve();
                            };
                            fallbackVid.addEventListener('loadeddata', onReady);
                            fallbackVid.addEventListener('canplay', onReady);
                        });
                    }
                    const width = fallbackVid.videoWidth;
                    const height = fallbackVid.videoHeight;
                    if (width > 0 && height > 0) {
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(fallbackVid, 0, 0, width, height);
                            const b = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
                            if (b) return b;
                        }
                    }
                } catch (e) {
                    return null;
                }
            }
            return null;
        };

        // Expose capture functions for violations and snapshots
        captureFrameRef.current = async (): Promise<Blob | null> => {
            if (!isActive) return null;
            const liveStream = (mediaStream && mediaStream.active && mediaStream.getVideoTracks().some(t => t.readyState === 'live'))
                ? mediaStream
                : (internalStream && internalStream.active ? internalStream : getGlobalProctoringData()?.cameraStream);
            return captureStream(liveStream, video, 0.5);
        };

        captureScreenFrameRef.current = async (): Promise<Blob | null> => {
            if (!isActive) return null;
            const liveStream = (screenStream && screenStream.active && screenStream.getVideoTracks().some(t => t.readyState === 'live'))
                ? screenStream
                : getGlobalProctoringData()?.screenStream;
            return captureStream(liveStream, screenVideo, 0.6);
        };

        // ── Snapshot uploader ─────────────────────────────────────────────────
        const takeAndUploadSnapshot = async (stream: MediaStream) => {
            if (!isActive) return;
            try {
                if (video.srcObject !== stream) {
                    video.srcObject = stream;
                }

                const captureAndUpload = async () => {
                    const blob = await captureFrameRef.current?.();
                    const screenBlob = await captureScreenFrameRef.current?.();
                    if ((!blob && !screenBlob) || !isActive) return;

                    const formData = new FormData();
                    if (blob) {
                        formData.append('snapshot', blob, 'snapshot.jpg');
                    }
                    if (screenBlob) {
                        formData.append('screenshot', screenBlob, 'screenshot.jpg');
                    }
                    formData.append('activity_type', 'snapshot');
                    formData.append('timestamp', new Date().toISOString());
                    const activeQId = questionIdRef.current;
                    const activeQTitle = questionTitleRef.current;
                    if (activeQId) formData.append('question_id', activeQId);
                    if (activeQTitle) formData.append('question_title', activeQTitle);

                    const url = `/skill_evaluation/evaluations/${assessmentId}/log_activity/`;
                    try {
                        const response = await restApiAuthUtil.post(url, formData) as any;
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

        // ── Camera Timeout Logic ──────────────────────────────────────────────
        let cameraTimeoutId: ReturnType<typeof setTimeout> | null = null;
        const cameraKey = `cam_disabled_${assessmentId}`;

        const checkCameraTimeout = () => {
            const disabledTime = localStorage.getItem(cameraKey);
            if (disabledTime) {
                const elapsed = Date.now() - parseInt(disabledTime, 10);
                if (elapsed >= 60000) {
                    onAutoSubmitRef.current?.();
                } else {
                    cameraTimeoutId = setTimeout(checkCameraTimeout, 60000 - elapsed + 500);
                }
            }
        };

        const markCameraDisabled = (err?: any) => {
            logActivity('camera_disabled', { error: String(err || 'Track ended') });
            onViolationRef.current?.('camera_disabled');
            if (!localStorage.getItem(cameraKey)) {
                localStorage.setItem(cameraKey, Date.now().toString());
            }
            checkCameraTimeout();
        };

        const markCameraEnabled = () => {
            logActivity('camera_enabled');
            localStorage.removeItem(cameraKey);
            if (cameraTimeoutId) clearTimeout(cameraTimeoutId);
        };

        checkCameraTimeout();

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
                    markCameraEnabled();
                    const videoTrack = streamToUse.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.onended = () => {
                            if (isActive) markCameraDisabled('Track ended');
                        };
                    }

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
                    video.play().catch(console.warn);

                    const scrToUse = screenStream || getGlobalProctoringData()?.screenStream;
                    if (scrToUse) {
                        screenVideo.autoplay = true;
                        screenVideo.srcObject = scrToUse;
                        screenVideo.play().catch(console.warn);
                    }

                    // Fallback in case metadata is already loaded
                    if (video.readyState >= 1) {
                        startCapture();
                    }
                }
            } catch (err) {
                if (isActive) {
                    console.error('Camera init failed for proctoring:', err);
                    markCameraDisabled(err);
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
            if (cameraTimeoutId) clearTimeout(cameraTimeoutId);
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
