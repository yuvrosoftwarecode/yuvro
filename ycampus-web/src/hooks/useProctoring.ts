import { useEffect, useCallback, useRef } from 'react';
import restApiAuthUtil from '../utils/RestApiAuthUtil';

interface ProctoringConfig {
    assessmentId: string;
    assessmentType: 'skill-tests' | 'contests' | 'mock-interviews' | 'job-tests' | 'certification-exams';
    enabled: boolean;
    submissionId?: string | null;
    questionId?: string; // Optional context
    onViolation?: (type: string, data?: any) => void;
}

export const useProctoring = ({ assessmentId, assessmentType, enabled, submissionId, questionId, mediaStream, onViolation }: ProctoringConfig & { mediaStream?: MediaStream | null }) => {
    const lastActiveRef = useRef<number>(Date.now());
    const hasEnteredFullscreen = useRef<boolean>(false);
    const questionIdRef = useRef(questionId);

    useEffect(() => { questionIdRef.current = questionId; }, [questionId]);

    const logActivity = useCallback(async (activityType: string, metaData: any = {}) => {
        if (!enabled || (assessmentType === 'skill-tests' && !submissionId)) return;

        try {
            // Dynamic URL based on assessment type
            const url = `/assessment/${assessmentType}/${assessmentId}/log-activity/`;
            const activeQuestionId = metaData.question_id || questionIdRef.current;

            const payload = {
                activity_type: activityType,
                meta_data: metaData,
                timestamp: new Date().toISOString(),
                ...(activeQuestionId && { question_id: activeQuestionId })
            };

            await restApiAuthUtil.post(url, payload);
        } catch (error) {
            console.error('Proctoring log error:', error);
            // Fail silently to not disrupt user exam
        }
    }, [assessmentId, assessmentType, enabled, submissionId]);

    // 1. Visibility Change (Tab Switch)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.hidden) {
                logActivity('tab_switched', { type: 'hidden' });
            } else {
                logActivity('tab_switched', { type: 'visible' });
                if (onViolation) onViolation('tab_switch');
                
                // Check clipboard for forbidden platforms
                try {
                    const text = await navigator.clipboard.readText();
                    const forbiddenDomains = ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'webex.com'];
                    const foundUrl = forbiddenDomains.find(domain => text.includes(domain));
                    if (foundUrl) {
                        logActivity('forbidden_platform_detected', { platform: foundUrl, matched_text: text });
                        if (onViolation) onViolation('forbidden_platform', { platform: foundUrl });
                    }
                } catch (e) {
                    // Ignore error if clipboard read is denied
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [logActivity, onViolation]);

    // 2. Window Blur/Focus
    useEffect(() => {
        const handleBlur = () => logActivity('window_blur');
        const handleFocus = () => logActivity('window_focus');

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [logActivity]);

    // 3. Copy/Paste/Cut/Context Menu
    useEffect(() => {
        const handlePreventDefault = (e: Event) => {
            e.preventDefault();
        };

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            const selectedText = window.getSelection()?.toString() || '';
            logActivity('copy_detected', { copied_text: selectedText, key: 'Ctrl+C' });
        }

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const pastedText = e.clipboardData?.getData('text') || '';
            logActivity('paste_detected', { pasted_text: pastedText, key: 'Ctrl+V' });
        }

        const handleCut = (e: ClipboardEvent) => {
            e.preventDefault();
            const selectedText = window.getSelection()?.toString() || '';
            logActivity('cut_detected', { cut_text: selectedText, key: 'Ctrl+X' });
        }

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logActivity('right_click_detected', { x: e.clientX, y: e.clientY });
        };

        const handleDragDrop = (e: DragEvent) => {
            e.preventDefault();
        };

        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('cut', handleCut);
        document.addEventListener('contextmenu', handleContextMenu);
        // Block drag and drop
        document.addEventListener('dragstart', handleDragDrop);
        document.addEventListener('drop', handleDragDrop);
        document.addEventListener('dragover', handleDragDrop); // Needed to prevent default drop behavior in some browsers

        return () => {
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('dragstart', handleDragDrop);
            document.removeEventListener('drop', handleDragDrop);
            document.removeEventListener('dragover', handleDragDrop);
        };
    }, [enabled, logActivity]);

    // 4. Fullscreen Change & Enforcement
    useEffect(() => {
        if (!enabled) return;

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                // Only log exit if we have previously entered successful fullscreen
                if (hasEnteredFullscreen.current) {
                    logActivity('fullscreen_exit');
                    if (onViolation) onViolation('fullscreen_exit');
                }
            } else {
                hasEnteredFullscreen.current = true;
                logActivity('fullscreen_enter');
            }
        };

        const initialCheckTimeout = setTimeout(() => {
            if (!document.fullscreenElement && hasEnteredFullscreen.current) {
                logActivity('fullscreen_exit', { trigger: 'initial_check' });
                if (onViolation) onViolation('fullscreen_exit');
            }
        }, 5000); // 5 sec delay for initial check, only if previously entered

        const enforcementInterval = setInterval(() => {
            // Only enforce if the student has officially initialized fullscreen mode once
            if (!document.fullscreenElement && hasEnteredFullscreen.current) {
                logActivity('fullscreen_exit', { trigger: 'interval_check' });
                if (onViolation) onViolation('fullscreen_exit');
            }
        }, 3000);

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        return () => {
            clearTimeout(initialCheckTimeout);
            clearInterval(enforcementInterval);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [logActivity, onViolation, enabled]);

    // 5. Keyboard Shortcut Detection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const ctrlOrMeta = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            // 1. Common Developer Tools Shortcuts
            if (e.key === 'F12') {
                e.preventDefault();
                logActivity('keyboard_shortcut', { key: 'F12', description: 'Developer Tools attempt' });
            }

            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
            if (ctrlOrMeta && shift && ['i', 'j', 'c'].includes(key)) {
                e.preventDefault();
                logActivity('keyboard_shortcut', {
                    key: `Ctrl+Shift+${key.toUpperCase()}`,
                    description: 'Developer Tools (Inspect/Console/Element) attempt'
                });
            }

            // Ctrl+U (View Source)
            if (ctrlOrMeta && key === 'u') {
                e.preventDefault();
                logActivity('keyboard_shortcut', { key: 'Ctrl+U', description: 'View Source attempt' });
            }

            // 2. Block other sensitive shortcuts
            if (ctrlOrMeta) {
                if (['a', 'p', 's'].includes(key)) {
                    e.preventDefault();
                    logActivity('keyboard_shortcut', { key: `Ctrl+${key.toUpperCase()}` });
                }
            }

            if (e.key === 'PrintScreen') {
                logActivity('keyboard_shortcut', { key: 'PrintScreen' });
            }

            if (e.altKey && e.key === 'Tab') {
                logActivity('keyboard_shortcut', { key: 'Alt+Tab' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [logActivity]);

    // 6. Camera Snapshot Logic
    useEffect(() => {
        if (!enabled) return;

        let internalStream: MediaStream | null = null;
        let isActive = true;
        let intervalId: NodeJS.Timeout;
        const video = document.createElement('video');
        video.muted = true; // Essential to prevent audio feedback/repeating sound
        video.style.position = 'fixed';
        video.style.top = '0';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);

        const canvas = document.createElement('canvas');

        const takeAndUploadSnapshot = async (currentStream: MediaStream) => {
            if (!currentStream.active || !isActive || (assessmentType === 'skill-tests' && !submissionId)) return;
            console.log('useProctoring [ycampus-web]: takeAndUploadSnapshot starting...');

            try {
                if (video.paused || video.ended || video.srcObject !== currentStream) {
                    video.srcObject = currentStream;
                    await video.play().catch(() => { });
                }

                const captureFrame = () => {
                    if (!isActive || !currentStream.active) return;
                    if (video.readyState < 2) return;

                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;

                    if (canvas.width < 10 || canvas.height < 10) return;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        console.log('useProctoring [ycampus-web]: Frame captured on canvas, converting to blob...');

                        canvas.toBlob(async (blob) => {
                            if (blob && isActive) {
                                console.log('useProctoring [ycampus-web]: Blob generated successfully, uploading...', { size: blob.size });
                                const formData = new FormData();
                                formData.append('snapshot', blob, 'snapshot.png');
                                formData.append('activity_type', 'snapshot');
                                formData.append('timestamp', new Date().toISOString());
                                const activeQId = questionIdRef.current;
                                if (activeQId) {
                                    formData.append('question_id', activeQId);
                                }

                                const url = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api'}/assessment/${assessmentType}/${assessmentId}/log-activity/`;
                                const token = restApiAuthUtil.getAuthToken();

                                try {
                                    const response = await fetch(url, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`
                                        },
                                        body: formData
                                    });
                                    const resJson = await response.json().catch(() => ({}));
                                    console.log('useProctoring [ycampus-web]: Snapshot successfully uploaded to backend:', resJson);
                                } catch (err) {
                                    console.error('useProctoring [ycampus-web]: Snapshot upload failed', err);
                                }
                            }
                        }, 'image/png');
                    }
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
                console.error('useProctoring [ycampus-web]: Snapshot capture error:', err);
            }
        };

        const initCamera = async () => {
            try {
                let streamToUse = mediaStream;

                if (!streamToUse) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (!isActive) {
                        stream.getTracks().forEach(t => t.stop());
                        return;
                    }
                    internalStream = stream;
                    streamToUse = internalStream;
                }

                if (streamToUse && isActive) {
                    logActivity('camera_enabled');
                    const s = streamToUse;

                    let started = false;
                    const startCapture = async () => {
                        if (started || !isActive) return;
                        started = true;
                        try {
                            await video.play().catch(() => { });
                        } catch (e) {}
                        
                        takeAndUploadSnapshot(s);

                        clearInterval(intervalId);
                        intervalId = setInterval(() => {
                            if (s && s.active && isActive) {
                                takeAndUploadSnapshot(s);
                            }
                        }, 15000); // 15 seconds snapshot
                    };

                    video.autoplay = true;
                    video.muted = true;
                    video.playsInline = true;

                    video.onloadedmetadata = startCapture;
                    video.srcObject = s;

                    if (video.readyState >= 1) {
                        startCapture();
                    }
                }

            } catch (err) {
                if (isActive) {
                    console.error('Failed to access camera for proctoring', err);
                    logActivity('camera_disabled', { error: String(err) });
                }
            }
        };

        if (mediaStream) {
            if (mediaStream.active) {
                 initCamera();
            }
        } else {
             initCamera();
        }

        return () => {
            isActive = false;
            if (intervalId) clearInterval(intervalId);
            if (internalStream) {
                internalStream.getTracks().forEach(track => track.stop());
            }
            video.srcObject = null;
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
        };
    }, [assessmentId, assessmentType, enabled, logActivity, mediaStream]);

    return { logActivity };
};
