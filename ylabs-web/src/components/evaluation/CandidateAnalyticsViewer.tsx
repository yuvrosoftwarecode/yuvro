import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { yhubApiAuthUtil } from '@/utils/RestApiAuthUtil';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
    Clock, 
    AlertTriangle, 
    List, 
    Trophy, 
    Activity, 
    ShieldAlert, 
    Network, 
    Camera, 
    Maximize, 
    FileText, 
    CheckCircle2,
    XCircle, 
    AlertCircle,
    Eye,
    ShieldCheck,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { LabSubmissionViewer } from './LabSubmissionViewer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


interface ProctoringEvent {
    activity_type: string;
    timestamp: string;
    image_path?: string;
    screen_path?: string;
    meta_data?: {
        copied_text?: string;
        pasted_text?: string;
        cut_text?: string;
        selected_text?: string;
        method?: string;
        key?: string;
        platform?: string;
        db_level?: number;
    };
    question_title?: string;
    question_no?: string;
}

import { Candidate } from '@/lib/recruiterCandidates';


interface ProctoringEvent {
    activity_type: string;
    timestamp: string;
    image_path?: string;
    screen_path?: string;
    meta_data?: {
        copied_text?: string;
        pasted_text?: string;
        cut_text?: string;
        selected_text?: string;
        method?: string;
        key?: string;
        platform?: string;
        db_level?: number;
    };
    question_title?: string;
    question_no?: string;
}

interface CandidateAnalyticsViewerProps {
    candidate: Candidate;
    evaluation?: any;
}

const getImageUrl = (imgUrl: string | undefined) => {
    if (!imgUrl) return '';
    
    let processedUrl = imgUrl;
    
    if (processedUrl.includes('minio:9000') || processedUrl.includes('http://minio/') || processedUrl.includes('yuvro-minio')) {
        processedUrl = processedUrl.replace('minio:9000', 'localhost:9100')
                                 .replace('http://minio/', 'http://localhost:9100/')
                                 .replace('yuvro-minio:9000', 'localhost:9100')
                                 .replace('yuvro-minio', 'localhost:9100');
    }

    if (processedUrl.startsWith('http')) return processedUrl;

    let cleanPath = processedUrl?.replace(/\\/g, '/');
    if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.substring('uploads/'.length);
    } else if (cleanPath.startsWith('/uploads/')) {
        cleanPath = cleanPath.substring('/uploads/'.length);
    }

    // Clean path to prevent double slashes and double media prefixes
    cleanPath = cleanPath.replace(/^\/+/, '');
    if (cleanPath.startsWith('media/')) {
        cleanPath = cleanPath.replace(/^media\//, '');
    }

    if (cleanPath.startsWith('ylabs/')) {
        return `http://localhost:9100/yuvro-local/${cleanPath}`;
    }

    const baseUrl = (import.meta.env.VITE_BACKEND_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002/api')?.replace(/\/$/, '');
    const rootUrl = baseUrl?.replace(/\/api\/?$/, '');
    return `${rootUrl}/media/${cleanPath}`;
};

const CustomTooltipContent = ({ data, label, setActiveLightboxImg }: any) => {
    const log = data.log;
    if (!log) return null;
    const severity = data.severity;
    const isSnapshot = data.isSnapshot;
    
    const isPureSnapshot = isSnapshot && (!log.activity_type || log.activity_type === 'snapshot');
    
    return (
        <div className="space-y-3">
            {label && <div className="font-mono text-[10px] text-slate-500 dark:text-neutral-400 mb-1">{label}</div>}
            {data?.time && label !== data.time && <div className="font-mono text-[10px] text-slate-500 dark:text-neutral-400 mb-2">{data.time}</div>}
            {log.question_no && (
                <div className="text-xs text-slate-500 dark:text-neutral-400 font-medium mb-2 border-b border-neutral-200 dark:border-white/10 pb-2">
                    <span className="font-semibold text-slate-900 dark:text-white">Question:</span> {log.question_no}
                </div>
            )}
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${severity === 2 ? 'bg-rose-500' : severity === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <span className="font-bold text-sm">{data.severityName}</span>
            </div>
            
            {!isPureSnapshot && log.activity_type && (
                <div className="space-y-1">
                    <span className="font-semibold capitalize text-xs text-slate-900 dark:text-white block">
                        {log.activity_type.replace(/_/g, ' ')}
                    </span>
                    {log.meta_data && Object.keys(log.meta_data).length > 0 && (
                        <div className="mt-2 space-y-1 pt-2 border-t border-neutral-200 dark:border-white/10">
                            {log.meta_data.key && (
                                <div className="text-[10px] truncate"><span className="text-slate-500 dark:text-neutral-400">Key:</span> <kbd className="px-1 border border-neutral-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 font-mono rounded">{log.meta_data.key}</kbd></div>
                            )}
                            {log.meta_data.copied_text && (
                                <div className="text-[10px] truncate" title={log.meta_data.copied_text}><span className="text-slate-500 dark:text-neutral-400">Copy:</span> "{log.meta_data.copied_text}"</div>
                            )}
                            {log.meta_data.pasted_text && (
                                <div className="text-[10px] truncate" title={log.meta_data.pasted_text}><span className="text-slate-500 dark:text-neutral-400">Paste:</span> "{log.meta_data.pasted_text}"</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {(log.image_path || log.screen_path) && (
                <div className={`space-y-2 ${!isPureSnapshot ? 'pt-2 border-t border-neutral-200 dark:border-white/10' : ''}`}>
                    <div className="flex items-center gap-1.5 text-blue-600  text-xs font-semibold">
                        <Camera className="h-3 w-3" /> Snapshot Captured
                    </div>
                    <div className={`grid ${log.image_path && log.screen_path ? 'grid-cols-2 gap-2' : 'grid-cols-1'}`}>
                        {log.image_path && (
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 dark:text-neutral-400">Camera</span>
                                {(() => {
                                    const isFaceViolation = ['face_not_detected', 'no_face_detected', 'multiple_faces_detected', 'face_mismatch', 'face_recognition_failed'].includes(log.activity_type || '');
                                    return (
                                        <img src={getImageUrl(log.image_path)} alt="Camera Snapshot" className={`w-full object-cover bg-black rounded cursor-pointer hover:opacity-90 transition-opacity ${isFaceViolation ? 'border-2 border-red-500 box-border' : ''}`} onClick={() => setActiveLightboxImg?.(getImageUrl(log.image_path))} />
                                    );
                                })()}
                            </div>
                        )}
                        {log.screen_path && (
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 dark:text-neutral-400">Screen</span>
                                <img src={getImageUrl(log.screen_path)} alt="Screen Snapshot" className="w-full object-cover bg-black rounded cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setActiveLightboxImg?.(getImageUrl(log.screen_path))} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (!data.log || data.isBaseline) return null;
        return (
            <div className="bg-white dark:bg-[#121215] p-3 rounded-lg shadow-xl border border-neutral-200 dark:border-white/10 max-w-[240px] -translate-y-12">
                <CustomTooltipContent data={data} label={label} />
            </div>
        );
    }
    return null;
};

const CandidateAnalyticsViewer = ({ candidate, evaluation, vitarkaSubmission: propVitarkaSubmission }: { candidate: any, evaluation: any, vitarkaSubmission?: any }) => {
    const [submission, setSubmission] = useState<any>(candidate.submission || candidate.rawSubmission);
    if (!submission) return <div className="p-6 text-neutral-500">No raw submission data available for this candidate.</div>;
    const navigate = useNavigate();
    const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
    const [frozenLog, setFrozenLog] = useState<any>(null);
    const [vitarkaQuestions, setVitarkaQuestions] = useState<any[]>([]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveLightboxImg(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const fetchVitarkaQuestions = async () => {
            if (!submission && !evaluation) return;
            
            const vitarkaSubmission = propVitarkaSubmission || evaluation?.submissions?.find((s: any) => s.type === "VITARKA_AI_INTERVIEW" && (s.user?.toString() === candidate.user?.id?.toString() || s.candidate === candidate.id)) || submission;
            let turns = vitarkaSubmission?.session_state?.turns || vitarkaSubmission?.turns || submission?.session_state?.turns || submission?.turns || null;

            if (!turns) {
                // If it's not in the submission yet, we will wait for propVitarkaSubmission to populate
            }

            if (turns) {
                let aiQuestions: any[] = [];
                let currentAiQ: any = null;
                if (Array.isArray(turns)) {
                    turns.forEach((t: any, idx: number) => {
                        const isAi = t.speaker === 'assistant' || t.role === 'assistant' || t.speaker === 'AI' || t.role === 'system' || t.type === 'ai';
                        if (isAi) {
                            currentAiQ = {
                                id: `v-q-${aiQuestions.length}`,
                                title: t.text || t.content || `Question ${aiQuestions.length + 1}`,
                                answer: null
                            };
                            aiQuestions.push(currentAiQ);
                        } else if (currentAiQ) {
                            const ansText = t.text || t.content || '';
                            if (ansText) {
                                currentAiQ.answer = (currentAiQ.answer ? currentAiQ.answer + '\n' : '') + ansText;
                            }
                        }
                    });
                }
                setVitarkaQuestions(aiQuestions);
            } else {
                // Fallback: extract questions from general_events if turns are missing
                const aiQuestions: any[] = [];
                const seenTitles = new Set<string>();
                const vitarkaSecId = evaluation?.sections?.find((s: any) => s.type === "VITARKA_AI_INTERVIEW")?.id;
                
                if (submission?.general_events && Array.isArray(submission.general_events)) {
                    submission.general_events.forEach((ev: any) => {
                        if (ev.question_title && (!vitarkaSecId || ev.question_id === vitarkaSecId)) {
                            if (!seenTitles.has(ev.question_title)) {
                                seenTitles.add(ev.question_title);
                                aiQuestions.push({
                                    id: `v-q-${aiQuestions.length}`,
                                    title: ev.question_title,
                                    answer: null
                                });
                            }
                        }
                    });
                }
                setVitarkaQuestions(aiQuestions);
            }
        };
        fetchVitarkaQuestions();
    }, [submission, evaluation, propVitarkaSubmission]);

    const formatEventTime = (timestampStr: string | number) => {
        try {
            const date = new Date(timestampStr);
            if (isNaN(date.getTime())) return 'Invalid date';
            return format(date, 'h:mm:ss a');
        } catch (e) {
            return timestampStr || 'N/A';
        }
    };

    const riskAnalysis = React.useMemo(() => {
        let score = 0;
        const details: { type: string; count: number; points: number }[] = [];
        const eventCounts: Record<string, number> = {};

        const addEventToCount = (type: string) => {
            eventCounts[type] = (eventCounts[type] || 0) + 1;
        };

        const allEvents: ProctoringEvent[] = [];
        if (submission?.proctoring_events) {
            allEvents.push(...submission.proctoring_events);
        }
        if (submission?.general_events) {
            allEvents.push(...submission.general_events);
        }
        if (submission?.question_activities) {
            submission.question_activities.forEach((q: any, index: number) => {
                const qNo = `Q${index + 1}`;
                if (q.navigation_activities) allEvents.push(...q.navigation_activities.map((e: any) => ({ ...e, question_title: q.question_title, question_no: qNo, question_id: q.id })));
                if (q.proctoring_activities) allEvents.push(...q.proctoring_activities.map((e: any) => ({ ...e, question_title: q.question_title, question_no: qNo, question_id: q.id })));
                if (q.camera_snapshots) allEvents.push(...q.camera_snapshots.map((e: any) => ({ ...e, question_title: q.question_title, question_no: qNo, question_id: q.id })));
            });
        }

        allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        let currentQNo = '';
        let currentQTitle = '';
        let currentQId = '';
        allEvents.forEach(e => {
            if (e.meta_data && e.meta_data.question_id) {
                e.question_id = e.meta_data.question_id;
            }
            if (e.question_no || e.question_id || e.question_title) {
                if (e.question_no) currentQNo = e.question_no;
                if (e.question_title) currentQTitle = e.question_title;
                if (e.question_id) currentQId = e.question_id;
            } else if (currentQNo || currentQId || currentQTitle) {
                if (currentQNo) e.question_no = currentQNo;
                if (currentQTitle) e.question_title = currentQTitle;
                if (currentQId) e.question_id = currentQId;
            }
        });

        const uniqueEvents = allEvents.filter((event, index, self) =>
            self.findIndex(e => e.activity_type === event.activity_type && e.timestamp === event.timestamp) === index
        );

        const violations: ProctoringEvent[] = [];
        const systemLogs: ProctoringEvent[] = [];

        const violationTypes = [
            'tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 
            'new_tab_detected', 'new_window_detected', 'face_not_detected', 
            'multiple_faces_detected', 'face_recognition_failed', 'violation_critical',
            'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected',
            'copy_detected', 'paste_detected', 'cut_detected', 'select_all_detected',
            'right_click_detected', 'screenshot_detected', 'keyboard_shortcut',
            'suspicious_movement', 'audio_anomaly', 'audio_anomaly_detected',
            'network_disconnected', 'network_connected', 'violation_warning', 'violation',
            'camera_disabled', 'mic_disabled', 'camera_stopped', 'mic_stopped'
        ];

        uniqueEvents.forEach(e => {
            const type = e.activity_type;
            if (['snapshot', 'camera_enabled'].includes(type)) {
                return;
            }

            const isViolation = violationTypes.some(vt => type.includes(vt));

            if (isViolation) {
                violations.push(e);
                addEventToCount(type);
            } else {
                systemLogs.push(e);
            }
        });

        uniqueEvents.forEach(e => {
            const type = e.activity_type;
            if (['network_disconnected', 'network_connected', 'camera_enabled', 'camera_disabled', 'camera_stopped', 'mic_disabled', 'mic_stopped', 'focus_gained', 'session_start', 'session_submit'].includes(type)) {
                if (!systemLogs.some(sl => sl.activity_type === type && sl.timestamp === e.timestamp)) {
                    systemLogs.push(e);
                }
            }
        });

        Object.entries(eventCounts).forEach(([type, count]) => {
            let weight = 1;
            if (type.includes('face_not_detected') || type.includes('no_face_detected')) {
                weight = 3;
            } else if (type.includes('multiple_faces_detected') || type.includes('multi_face_detected')) {
                weight = 5;
            } else if (type.includes('tab_switched') || type.includes('tab_switch') || type.includes('focus_lost') || type.includes('window_blur') || type.includes('fullscreen_exit')) {
                weight = 2;
            } else if (type.includes('copy_detected') || type.includes('clipboard_copy') || type.includes('copy') || type.includes('keyboard_shortcut') || type.includes('cut_detected') || type.includes('paste_detected') || type.includes('right_click')) {
                weight = 2;
            }

            const points = weight * count;
            score += points;
            details.push({ type, count, points });
        });

        let level: 'Clean' | 'Low' | 'Medium' | 'High' | 'Critical' = 'Clean';
        let colorScheme: 'green' | 'blue' | 'amber' | 'orange' | 'red' = 'green';
        let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200   ';

        if (score > 0 && score <= 4) {
            level = 'Low';
            colorScheme = 'blue';
            colorClass = 'bg-blue-50 text-blue-700 border-blue-200   ';
        } else if (score > 4 && score <= 8) {
            level = 'Medium';
            colorScheme = 'amber';
            colorClass = 'bg-amber-50 text-amber-700 border-amber-200   ';
        } else if (score > 8 && score <= 15) {
            level = 'High';
            colorScheme = 'orange';
            colorClass = 'bg-orange-50 text-orange-700 border-orange-200   ';
        } else if (score > 15) {
            level = 'Critical';
            colorScheme = 'red';
            colorClass = 'bg-red-50 text-red-700 border-red-200   ';
        }

        let normalCount = 0;
        let generalCount = 0;
        let criticalCount = 0;
        const cTypes = ['tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 'new_tab_detected', 'new_window_detected', 'face_not_detected', 'multiple_faces_detected', 'face_recognition_failed', 'violation_critical', 'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected'];
        const gTypes = ['copy_detected', 'paste_detected', 'cut_detected', 'select_all_detected', 'right_click_detected', 'keyboard_shortcut', 'screenshot_detected', 'screen_share_started', 'screen_share_ended', 'suspicious_movement', 'audio_anomaly', 'network_disconnection', 'network_reconnection', 'violation_warning', 'fullscreen_exit'];

        violations.forEach(v => {
            const isC = cTypes.some(vt => v.activity_type?.includes(vt));
            const isG = gTypes.some(vt => v.activity_type?.includes(vt));
            if (isC) criticalCount++;
            else if (isG) generalCount++;
            else normalCount++;
        });

        return {
            score,
            level,
            colorScheme,
            colorClass,
            details,
            normalCount,
            generalCount,
            criticalCount,
            violations: violations.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
            systemLogs: systemLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
            uniqueEvents: uniqueEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        };
    }, [submission]);

    const allImages = React.useMemo(() => {
        const allSnapshots: ProctoringEvent[] = [];
        if (submission?.proctoring_events) allSnapshots.push(...submission.proctoring_events);
        if (submission?.general_events) allSnapshots.push(...submission.general_events);

        const uniqueItems: { type: 'camera' | 'screen', path: string, event: ProctoringEvent }[] = [];
        allSnapshots.forEach(e => {
            if (e.image_path) uniqueItems.push({ type: 'camera', path: e.image_path, event: e });
            if (e.screen_path) uniqueItems.push({ type: 'screen', path: e.screen_path, event: e });
        });
        return uniqueItems.sort((a, b) => new Date(a.event.timestamp).getTime() - new Date(b.event.timestamp).getTime());
    }, [submission]);

    const passportItem = allImages.find(i => 
        i.event.activity_type === 'passport_photo_captured' || 
        i.path?.includes('passport_') || 
        i.event.image_path?.includes('passport_')
    );
    const initialScreenItem = allImages.find(i => 
        i.event.activity_type === 'initial_screenshot_captured'
    ) || allImages.find(i => i.type === 'screen' && i.event.activity_type !== 'snapshot');

    // General snapshots are all images (camera and screen captures) taken during the test
    const generalSnapshots = allImages.filter(i => {
        if (passportItem && (i.path === passportItem.path || i.event === passportItem.event)) return false;
        if (i.event.activity_type === 'passport_photo_captured') return false;
        if (initialScreenItem && (i.path === initialScreenItem.path || i.event === initialScreenItem.event)) return false;
        if (i.event.activity_type === 'initial_screenshot_captured') return false;
        return true;
    });

    const latestPassport = passportItem?.event || null;
    const latestScreenshot = initialScreenItem?.event || null;

    const totalViolations = riskAnalysis.violations.length;

    return (
        <div className="px-6 py-6 space-y-6">
            {/* Unified Top Banner */}
            <div className="bg-white dark:bg-[#121215] border border-neutral-200 dark:border-white/10 shadow-sm rounded-2xl flex flex-col xl:flex-row overflow-hidden">
                {/* Left Side: Stats Grid */}
                <div className="flex-1 flex flex-col p-5 border-b xl:border-b-0 xl:border-r border-neutral-200 dark:border-white/10">
                    {/* Row 1 */}
                    <div className="flex flex-col sm:flex-row gap-4 pb-4 border-b border-neutral-200 dark:border-white/10">
                        {/* Score */}
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-orange-50 text-orange-500">
                                <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{candidate.eci !== undefined ? `${candidate.eci}` : '-'}</p>
                                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">Total Score (ECI)</p>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px bg-neutral-200 self-stretch" />
                        {/* Status */}
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-blue-50 text-blue-500">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white capitalize">{candidate?.status?.replace('_', ' ') || ''}</p>
                                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">Submission Status</p>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px bg-neutral-200 self-stretch" />
                        {/* Risk Level */}
                        <div className="flex items-center gap-3 flex-1">
                            <div className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-full ${riskAnalysis.level === 'Clean' ? 'bg-green-50 text-green-500' : 'bg-rose-50 text-rose-500'}`}>
                                {riskAnalysis.level === 'Clean' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white capitalize">{riskAnalysis.level}</p>
                                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">Risk Level</p>
                            </div>
                        </div>
                    </div>
                    {/* Row 2 */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        {/* Violations */}
                        <div className="flex gap-3 flex-1">
                            <div className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-full ${totalViolations > 0 ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{totalViolations}</p>
                                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5">Total Violations</p>
                                <div className="flex items-center gap-2.5 text-[10px] text-slate-500 dark:text-neutral-400">
                                    <div className="flex items-center gap-1 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>{riskAnalysis.normalCount}</div>
                                    <div className="flex items-center gap-1 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>{riskAnalysis.generalCount}</div>
                                    <div className="flex items-center gap-1 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>{riskAnalysis.criticalCount}</div>
                                </div>
                            </div>
                        </div>
                        <div className="hidden sm:block w-px bg-neutral-200 self-stretch" />
                        {/* Submitted At */}
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-purple-50 text-purple-500">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{candidate.submittedAt ? format(new Date(candidate.submittedAt), 'MMM d, h:mm a') : '-'}</p>
                                <p className="text-xs font-bold text-purple-600 mt-0.5">Submitted At</p>
                            </div>
                        </div>
                        <div className="hidden sm:block flex-1" /> {/* Empty div to balance flex spacing on row 2 if needed, though matching the screenshot it's fine */}
                    </div>
                </div>

                {/* Right Side: Identity */}
                {(latestPassport || latestScreenshot) && (
                    <div className="flex gap-6 items-center justify-center p-6 xl:p-8 shrink-0 bg-white dark:bg-[#121215]">
                        {latestPassport && (
                            <div className="flex flex-col items-center gap-3">
                                <div 
                                    className="w-32 h-40 sm:w-36 sm:h-44 rounded-xl overflow-hidden ring-1 ring-emerald-400 p-0.5 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setActiveLightboxImg(latestPassport.image_path || null)}
                                    title="View Passport Photo"
                                >
                                    <img src={getImageUrl(latestPassport.image_path)} className="w-full h-full object-cover rounded-lg" alt="Passport" />
                                </div>
                                <span className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase bg-emerald-50 px-4 py-1.5 rounded-md">Passport</span>
                            </div>
                        )}
                        {latestScreenshot && (
                            <div className="flex flex-col items-center gap-3">
                                <div 
                                    className="w-44 h-40 sm:w-56 sm:h-44 rounded-xl overflow-hidden ring-1 ring-blue-400 p-0.5 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setActiveLightboxImg(latestScreenshot.image_path || latestScreenshot.screen_path || null)}
                                    title="View Screen Check"
                                >
                                    <img src={getImageUrl(latestScreenshot.image_path || latestScreenshot.screen_path)} className="w-full h-full object-cover rounded-lg" alt="Screen" />
                                </div>
                                <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-4 py-1.5 rounded-md">Screen Check</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 w-full md:w-[650px] mb-6 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-neutral-400 p-1 rounded-lg">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#121215] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                    <TabsTrigger value="sections" className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#121215] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">Section Breakdown</TabsTrigger>
                    <TabsTrigger value="violations" className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:dark:bg-[#121215] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">
                        Violations
                        {totalViolations > 0 && (
                            <Badge variant="destructive" className="text-white h-4 min-w-4 px-1 flex items-center justify-center text-[10px]">
                                {totalViolations}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="system" className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#121215] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">System & Network</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <Card className="border border-neutral-200 dark:border-white/10 rounded-2xl bg-slate-50/40 dark:bg-white/5 shadow-none p-2 text-slate-900 dark:text-white">
                        <CardHeader>
                            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-slate-500 dark:text-neutral-400" />
                                Risk Score Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-white/10">
                                    <span className="text-sm font-medium text-slate-500 dark:text-neutral-400">Computed Risk Score:</span>
                                    <Badge className={`text-sm font-bold px-3 py-1 ${riskAnalysis.colorClass}`}>
                                        {riskAnalysis.score} pts ({riskAnalysis.level})
                                    </Badge>
                                </div>
                                
                                {riskAnalysis.details.length === 0 ? (
                                    <div className="text-sm text-emerald-600  flex items-center gap-2 py-4">
                                        <ShieldCheck className="h-5 w-5" />
                                        No proctoring anomalies or violations detected!
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {riskAnalysis.details.map((detail, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="capitalize text-slate-500 dark:text-neutral-400">
                                                    {detail.type?.replace(/_/g, ' ') || ''}
                                                    <span className="text-xs text-slate-500 dark:text-neutral-400 ml-1.5 font-normal">
                                                        (x{detail.count})
                                                    </span>
                                                </span>
                                                <span className="font-semibold text-slate-900 dark:text-white">+{detail.points} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Overall Session Timeline */}
                    <Card className="border border-neutral-200 dark:border-white/10 rounded-2xl mt-6 bg-slate-50/50 dark:bg-white/10 text-slate-900 dark:text-white shadow-none">
                        <CardHeader className="pb-3 border-b border-neutral-200 dark:border-white/10 mb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-slate-500 dark:text-neutral-400" />
                                    Overall Test Timeline
                                </CardTitle>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-1 rounded"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Normal</div>
                                    <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-1 rounded"><div className="w-2 h-2 rounded-full bg-amber-500"></div> General</div>
                                    <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-1 rounded"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Critical</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {riskAnalysis.uniqueEvents.length === 0 ? (
                                <div className="text-slate-500 dark:text-neutral-400 italic text-xs py-4 text-center">No proctoring events recorded for this session.</div>
                            ) : (
                                <ScrollArea className="w-full pb-4">
                                    <div className="relative" style={{ width: Math.max(800, riskAnalysis.uniqueEvents.length * 60), height: 450 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart 
                                                onClick={(e) => {
                                                    if (e && e.activePayload && e.activeCoordinate) {
                                                        setFrozenLog({ 
                                                            data: e.activePayload[0].payload, 
                                                            label: e.activeLabel,
                                                            x: e.activeCoordinate.x,
                                                            y: e.activeCoordinate.y
                                                        });
                                                    } else {
                                                        setFrozenLog(null);
                                                    }
                                                }}
                                                data={riskAnalysis.uniqueEvents.map((log) => {
                                                    const criticalTypes = ['tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 'new_tab_detected', 'new_window_detected', 'face_not_detected', 'multiple_faces_detected', 'face_recognition_failed', 'violation_critical', 'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected', 'screen_share_stopped', 'camera_stopped', 'mic_stopped', 'repeated_permission_loss'];
                                                    const generalTypes = ['copy_detected', 'paste_detected', 'cut_detected', 'select_all_detected', 'right_click_detected', 'keyboard_shortcut', 'screenshot_detected', 'screen_share_started', 'screen_share_ended', 'suspicious_movement', 'audio_anomaly', 'network_disconnection', 'network_reconnection', 'violation_warning', 'fullscreen_exit', 'passport_photo_captured', 'initial_screenshot_captured'];
                                                    
                                                    const isC = criticalTypes.some(vt => log.activity_type?.includes(vt));
                                                    const isG = generalTypes.some(vt => log.activity_type?.includes(vt));
                                                    const isV = isC || isG || log.activity_type?.includes('violation') || log.activity_type?.includes('detected') || log.activity_type?.includes('lost');
                                                    const isS = !!log.image_path || !!log.screen_path;
                                                    const severity = isC ? 2 : (isG || isV) ? 1 : 0;
                                                    const isPureSnapshot = isS && (!log.activity_type || log.activity_type === 'snapshot');
                                                    
                                                    return {
                                                        name: log.question_no || formatEventTime(log.timestamp),
                                                        time: formatEventTime(log.timestamp),
                                                        severity: severity,
                                                        severityName: isPureSnapshot ? 'Snapshot' : severity === 2 ? 'Critical' : severity === 1 ? 'General' : 'Normal',
                                                        log: log,
                                                        isSnapshot: isS
                                                    };
                                                })} 
                                                margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorSeverityOverall" x1="0" y1="1" x2="0" y2="0">
                                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15}/>
                                                        <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.15}/>
                                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                                    </linearGradient>
                                                    <linearGradient id="colorStrokeOverall" x1="0" y1="1" x2="0" y2="0">
                                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                                                        <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
                                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={1}/>
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickMargin={15} stroke="#888888" />
                                                <YAxis 
                                                    domain={[0, 2.2]} 
                                                    ticks={[0, 1, 2]} 
                                                    tickFormatter={(value) => value === 0 ? 'Normal' : value === 1 ? 'General' : value === 2 ? 'Critical' : ''}
                                                    tick={{ fontSize: 10, fontWeight: 600 }}
                                                    width={60}
                                                    stroke="none"
                                                />
                                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#555555" strokeOpacity={0.5} />
                                                
                                                {/* Horizontal reference lines for each level */}
                                                <ReferenceLine y={2} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.4} />
                                                <ReferenceLine y={1} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
                                                <ReferenceLine y={0} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} />

                                                <Tooltip 
                                                    content={(props: any) => {
                                                        if (frozenLog) return null;
                                                        return <CustomTooltip {...props} />;
                                                    }} 
                                                    cursor={{ stroke: '#555555', strokeWidth: 1, strokeDasharray: '3 3' }} 
                                                />
                                                
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="severity" 
                                                    stroke="url(#colorStrokeOverall)" 
                                                    fillOpacity={1} 
                                                    fill="url(#colorSeverityOverall)" 
                                                    strokeWidth={2}
                                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', className: 'dark:!stroke-[#121215]', cursor: 'pointer' }}
                                                    dot={(props) => {
                                                        const { cx, cy, payload } = props;
                                                        if (!cx || !cy) return null;
                                                        const fill = payload.severity === 2 ? '#f43f5e' : payload.severity === 1 ? '#f59e0b' : '#10b981';
                                                        return <circle key={`dot-overall-${payload.name}-${cx}`} cx={cx} cy={cy} r={4} fill={fill} stroke="#ffffff" className="dark:!stroke-[#121215]" strokeWidth={1.5} />;
                                                    }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                        {frozenLog && (
                                            <div 
                                                className="absolute z-30 pointer-events-auto"
                                                style={{ left: frozenLog.x, top: frozenLog.y }}
                                            >
                                                {/* Tooltip positioned smartly based on space available */}
                                                <div 
                                                    className={`relative -translate-x-1/2 ${frozenLog.y < 225 ? 'translate-y-4' : '-translate-y-[calc(100%+20px)]'} bg-white dark:bg-[#121215]/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-neutral-200 dark:border-white/10 max-w-[240px]`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="absolute top-1 right-1 h-5 w-5 rounded-full hover:bg-slate-100 text-slate-500 dark:text-neutral-400" 
                                                        onClick={(e) => { e.stopPropagation(); setFrozenLog(null); }}
                                                    >
                                                        <X className="h-3.5 w-3.5"/>
                                                    </Button>
                                                    <CustomTooltipContent data={frozenLog.data} label={frozenLog.label} setActiveLightboxImg={setActiveLightboxImg} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                    {/* Proctoring Snapshots Section */}
                    <Tabs defaultValue="camera" className="w-full mt-6">
                        <Card className="border border-neutral-200 dark:border-white/10 rounded-2xl bg-slate-50/40 dark:bg-white/5 shadow-none p-2 text-slate-900 dark:text-white">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                                        <Camera className="h-5 w-5 text-slate-500 dark:text-neutral-400" />
                                        Proctoring Images
                                    </CardTitle>
                                    <TabsList className="grid grid-cols-2 w-full sm:w-[300px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-neutral-400 p-1 rounded-lg">
                                        <TabsTrigger value="camera" className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#121215] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">Camera ({generalSnapshots.filter(s => s.type === 'camera').length})</TabsTrigger>
                                        <TabsTrigger value="screen" className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#121215] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm">Screen ({generalSnapshots.filter(s => s.type === 'screen').length})</TabsTrigger>
                                    </TabsList>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <TabsContent value="camera" className="mt-0 space-y-0">
                                    {generalSnapshots.filter(i => i.type === 'camera').length === 0 ? (
                                        <div className="text-center py-10 text-slate-500 dark:text-neutral-400 italic bg-gray-50 dark:bg-white/5  border border-dashed border-neutral-200 dark:border-white/10 rounded-lg">
                                            No camera snapshots were recorded.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {generalSnapshots.filter(i => i.type === 'camera').map((item, i) => {
                                                const event = item.event;
                                                const imgUrl = getImageUrl(item.path);
                                                return (
                                                    <div 
                                                        key={`cam-${i}`} 
                                                        className="group relative border border-neutral-200 dark:border-white/10 rounded-lg overflow-hidden cursor-zoom-in bg-black shadow-sm hover:shadow-md transition-all duration-200"
                                                        onClick={() => setActiveLightboxImg(imgUrl)}
                                                    >
                                                        <div className="aspect-video w-full relative">
                                                            {(() => {
                                                                const isFaceViolation = ['face_not_detected', 'no_face_detected', 'multiple_faces_detected', 'face_mismatch', 'face_recognition_failed'].includes(event.activity_type || '');
                                                                return (
                                                                    <img
                                                                        src={imgUrl}
                                                                        alt={`Camera Snapshot ${i + 1}`}
                                                                        className={`object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity ${isFaceViolation ? 'border-4 border-red-500 box-border' : ''}`}
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Load+Error';
                                                                        }}
                                                                    />
                                                                );
                                                            })()}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                                                                <Eye className="h-6 w-6 text-white" />
                                                            </div>
                                                        </div>
                                                        <div className="bg-white dark:bg-[#121215] text-slate-900 dark:text-white text-[10px] p-2 flex justify-between items-center border-t border-neutral-200 dark:border-white/10">
                                                            <span className="font-medium">{formatEventTime(event.timestamp)}</span>
                                                            {event.activity_type !== 'snapshot' && event.activity_type && (
                                                                <Badge variant="destructive" className="text-white h-4 px-1 py-0 text-[8px] capitalize">
                                                                    {event.activity_type?.replace(/_/g, ' ')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="screen" className="mt-0 space-y-0">
                                    {generalSnapshots.filter(i => i.type === 'screen').length === 0 ? (
                                        <div className="text-center py-10 text-slate-500 dark:text-neutral-400 italic bg-gray-50 dark:bg-white/5  border border-dashed border-neutral-200 dark:border-white/10 rounded-lg">
                                            No screen share screenshots were recorded.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {generalSnapshots.filter(i => i.type === 'screen').map((item, i) => {
                                                const event = item.event;
                                                const imgUrl = getImageUrl(item.path);
                                                return (
                                                    <div 
                                                        key={`scr-${i}`} 
                                                        className="group relative border border-neutral-200 dark:border-white/10 rounded-lg overflow-hidden cursor-zoom-in bg-black shadow-sm hover:shadow-md transition-all duration-200"
                                                        onClick={() => setActiveLightboxImg(imgUrl)}
                                                    >
                                                        <div className="aspect-video w-full relative">
                                                            <img
                                                                src={imgUrl}
                                                                alt={`Screen Snapshot ${i + 1}`}
                                                                className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Load+Error';
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                                                                <Eye className="h-6 w-6 text-white" />
                                                            </div>
                                                        </div>
                                                        <div className="bg-white dark:bg-[#121215] text-slate-900 dark:text-white text-[10px] p-2 flex justify-between items-center border-t border-neutral-200 dark:border-white/10">
                                                            <span className="font-medium">{formatEventTime(event.timestamp)}</span>
                                                            {event.activity_type !== 'snapshot' && event.activity_type && (
                                                                <Badge variant="destructive" className="text-white h-4 px-1 py-0 text-[8px] capitalize">
                                                                    {event.activity_type?.replace(/_/g, ' ')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </TabsContent>
                            </CardContent>
                        </Card>
                    </Tabs>
                </TabsContent>

                {/* 2. Section Breakdown Tab */}
                <TabsContent value="sections" className="space-y-6">
                    <Card className="border border-neutral-200 dark:border-white/10 rounded-2xl bg-slate-50/40 dark:bg-white/5 shadow-none p-2 text-slate-900 dark:text-white">
                        <CardHeader>
                            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-slate-500 dark:text-neutral-400" />
                                Section-by-Section Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {!candidate.proctoringData?.sections ? (
                                <div className="text-center py-8 text-slate-500 dark:text-neutral-400">No section activity data recorded.</div>
                            ) : (
                                (() => {
                                    const rawSections = evaluation?.sections || [];
                                    const activeSections = rawSections.map((sec: any) => ({
                                        ...sec,
                                        type: sec.type || (sec.kind === 'labs' ? 'LAB' : sec.kind === 'assessment' ? 'KNOWLEDGE_ASSESSMENT' : sec.kind === 'discussion' ? 'VITARKA_AI_INTERVIEW' : undefined),
                                        questions: sec.questions?.length ? sec.questions : (sec.labs || [])
                                    }));

                                    if (activeSections.length === 0) {
                                        return <div className="text-center py-8 text-slate-500 dark:text-neutral-400">No section activity data recorded for this candidate.</div>;
                                    }

                                    return (
                                        <Tabs defaultValue={(() => {
                                            if (activeSections.length === 0) return 'labs';
                                            const labSec = activeSections.find((s: any) => s.type === 'LAB');
                                            if (labSec) return labSec.id || 'labs';
                                            const firstSec = activeSections[0];
                                            return firstSec.id || (firstSec.type === 'KNOWLEDGE_ASSESSMENT' ? 'assessment' : firstSec.type === 'SYSTEM_DESIGN' ? 'system_design' : 'vitarka');
                                        })()} className="w-full">
                                            <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 p-1 text-slate-500 dark:text-neutral-400 mb-4 max-w-full overflow-x-auto">
                                                {activeSections.map((sec: any, index: number) => {
                                                    const sectionTitle = sec.title || (sec.type === 'LAB' ? 'Engineering Labs' : sec.type === 'KNOWLEDGE_ASSESSMENT' ? 'Knowledge Assessment' : sec.type === 'SYSTEM_DESIGN' ? 'System Design' : 'Vitarka AI Discussion');
                                                    const sectionKey = sec.type === 'LAB' ? 'labs' : sec.type === 'KNOWLEDGE_ASSESSMENT' ? 'assessment' : sec.type === 'SYSTEM_DESIGN' ? 'system_design' : 'vitarka';
                                                    return (
                                                        <TabsTrigger key={`trigger-${sec.id || sectionKey}`} value={sec.id || sectionKey} className="data-[state=active]:bg-white data-[state=active]:dark:bg-[#121215] data-[state=active]:text-slate-900 data-[state=active]:dark:text-white data-[state=active]:shadow-sm text-[13px]">
                                                            {sectionTitle}
                                                        </TabsTrigger>
                                                    );
                                                })}
                                            </TabsList>
                                            {activeSections.map((sec: any, index: number) => {
                                        const sectionTitle = sec.title || (sec.type === 'LAB' ? 'Engineering Labs' : sec.type === 'KNOWLEDGE_ASSESSMENT' ? 'Knowledge Assessment' : sec.type === 'SYSTEM_DESIGN' ? 'System Design' : 'Vitarka AI Discussion');
                                        const sectionKey = sec.type === 'LAB' ? 'labs' : sec.type === 'KNOWLEDGE_ASSESSMENT' ? 'assessment' : sec.type === 'SYSTEM_DESIGN' ? 'system_design' : 'vitarka';
                                        const sectionMock = candidate.proctoringData?.sections?.[sectionKey as keyof typeof candidate.proctoringData.sections] || { score: 0, timeSpent: 0, events: [] };

                                        // Build a list of all question IDs in this section
                                        const secQuestionIds = new Set<string>();
                                        if (sec.questions) {
                                            sec.questions.forEach((q: any) => secQuestionIds.add(String(typeof q === 'string' ? q : q.id)));
                                        }
                                        // Also add from lab_submissions just in case
                                        if (sec.type === 'LAB' && submission?.lab_submissions) {
                                            submission.lab_submissions.forEach((ls: any) => secQuestionIds.add(String(ls.lab_question)));
                                        }
                                        if (sec.type === 'KNOWLEDGE_ASSESSMENT' && submission?.knowledge_submissions) {
                                            submission.knowledge_submissions.forEach((ks: any) => {
                                                if (ks.section === sec.id) ks.answers?.forEach((a: any) => secQuestionIds.add(String(a.question_id)));
                                            });
                                        }

                                        // Build a list of ALL question IDs in OTHER sections
                                        const otherSectionQuestionIds = new Set<string>();
                                        const otherSectionQuestionTitles = new Set<string>();
                                        const otherSectionIds = new Set<string>();
                                        activeSections.forEach((otherSec: any) => {
                                            if (otherSec.id !== sec.id) {
                                                otherSectionIds.add(String(otherSec.id));
                                                if (otherSec.questions) {
                                                    otherSec.questions.forEach((q: any) => {
                                                        otherSectionQuestionIds.add(String(typeof q === 'string' ? q : q.id));
                                                        const qt = typeof q === 'string' ? null : (q.title || q.text || q.content);
                                                        if (qt) otherSectionQuestionTitles.add(qt);
                                                    });
                                                }
                                                if (otherSec.type === 'LAB' && submission?.lab_submissions) {
                                                    submission.lab_submissions.forEach((ls: any) => otherSectionQuestionIds.add(String(ls.lab_question)));
                                                }
                                                if (otherSec.type === 'KNOWLEDGE_ASSESSMENT' && submission?.knowledge_submissions) {
                                                    submission.knowledge_submissions.forEach((ks: any) => {
                                                        if (ks.section === otherSec.id) ks.answers?.forEach((a: any) => otherSectionQuestionIds.add(String(a.question_id)));
                                                    });
                                                }
                                                if (otherSec.type === 'SYSTEM_DESIGN' && submission?.system_design_submissions) {
                                                    submission.system_design_submissions.forEach((sds: any) => {
                                                        if (sds.system_design_question) otherSectionQuestionIds.add(String(sds.system_design_question));
                                                        if (sds.question_id) otherSectionQuestionIds.add(String(sds.question_id));
                                                    });
                                                }
                                            }
                                        });

                                        const allSectionEvents = riskAnalysis.violations.filter((e: any) => {
                                            const vQId = e.question_id || (e.meta_data && e.meta_data.question_id);
                                            const vQTitle = e.question_title || (e.meta_data && e.meta_data.question_title);
                                            
                                            // If the event explicitly belongs to ANOTHER section, exclude it!
                                            if (vQId && (otherSectionQuestionIds.has(String(vQId)) || otherSectionIds.has(String(vQId))) && !secQuestionIds.has(String(vQId)) && String(vQId) !== String(sec.id)) {
                                                return false;
                                            }
                                            if (vQTitle && otherSectionQuestionTitles.has(vQTitle)) {
                                                return false;
                                            }
                                            // If the event has no question_id, we include it in all sections for now, or we could filter by timestamp if we had section times.
                                            
                                            const isCritical = e.activity_type.includes('critical') || e.activity_type.includes('face_not');
                                            let desc = e.activity_type.replace(/_/g, ' ');
                                            if (e.meta_data) {
                                                const md = e.meta_data;
                                                if (md.copied_text) desc += ': ' + md.copied_text.slice(0, 30);
                                                else if (md.platform) desc += ': ' + md.platform;
                                                else desc += ': ' + JSON.stringify(md);
                                            }
                                            e.desc = desc;
                                            e.severity = isCritical ? 2 : 1;
                                            return true;
                                        });
                                        
                                        // Use real time spent calculated from all section events
                                        let realTimeSpent = 0;
                                        const sectionAllEvents = riskAnalysis.uniqueEvents.filter((e: any) => {
                                            const vQId = e.question_id || (e.meta_data && e.meta_data.question_id);
                                            const vQTitle = e.question_title || (e.meta_data && e.meta_data.question_title);
                                            
                                            // If the event explicitly belongs to ANOTHER section, exclude it!
                                            if (vQId && (otherSectionQuestionIds.has(String(vQId)) || otherSectionIds.has(String(vQId))) && !secQuestionIds.has(String(vQId)) && String(vQId) !== String(sec.id)) {
                                                return false;
                                            }
                                            if (vQTitle && otherSectionQuestionTitles.has(vQTitle)) {
                                                return false;
                                            }
                                            return true;
                                        });

                                        if (sectionAllEvents && sectionAllEvents.length > 1) {
                                            const sortedEvents = [...sectionAllEvents].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                            const firstEvt = new Date(sortedEvents[0].timestamp).getTime();
                                            const lastEvt = new Date(sortedEvents[sortedEvents.length - 1].timestamp).getTime();
                                            // duration in minutes
                                            const diffMinutes = (lastEvt - firstEvt) / (1000 * 60);
                                            if (diffMinutes > 0) {
                                                realTimeSpent = Math.max(1, Math.round(diffMinutes));
                                            }
                                        }

                                        // Use real scores directly from the candidate object
                                        const realScore =
                                            sectionKey === 'labs'
                                                ? candidate.labsScore
                                                : sectionKey === 'assessment'
                                                ? candidate.assessmentScore
                                                : sectionKey === 'system_design'
                                                ? (candidate.systemDesignScore !== undefined ? candidate.systemDesignScore : 0)
                                                : candidate.vitarkaScore;
                                        // Fix: If section wasn't attempted, set score to 0 or N/A
                                        const displayScore = index === 0 ? (realScore !== undefined ? realScore : sectionMock.score) : 0;
                                        
                                        return (
                                            <TabsContent key={`content-${sec.id || sectionKey}`} value={sec.id || sectionKey} className="mt-0 outline-none">
                                                <div className="border border-neutral-200 dark:border-white/10 rounded-lg p-5 bg-white dark:bg-[#121215] shadow-sm transition-all duration-200">
                                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-neutral-200 dark:border-white/10">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-base text-slate-900 dark:text-white">
                                                                    Section {index + 1}: {sectionTitle}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-neutral-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    Time Spent: {realTimeSpent}m
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Trophy className="h-3.5 w-3.5" />
                                                                    Score: {displayScore}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 text-sm border border-neutral-200 dark:border-white/10 overflow-hidden">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h5 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                                <Activity className="h-4 w-4 text-slate-500 dark:text-neutral-400" /> Question-Wise Proctoring Breakdown
                                                            </h5>
                                                        </div>
                                                        {(() => {
                                                            let resolvedQuestions = sec.questions || [];
                                                            if (sec.type === 'VITARKA_AI_INTERVIEW' && vitarkaQuestions && vitarkaQuestions.length > 0) {
                                                                resolvedQuestions = vitarkaQuestions;
                                                            } else if (resolvedQuestions.length > 0 && typeof resolvedQuestions[0] === 'string') {
                                                                resolvedQuestions = resolvedQuestions.map((qId: string, idx: number) => ({
                                                                    id: qId,
                                                                    title: `Engineering Lab ${idx + 1}`
                                                                }));
                                                            } else if (sec.type === 'LAB' && submission?.lab_submissions && resolvedQuestions.length === 0) {
                                                                const uniqueLabs = new Map<string, any>();
                                                                submission.lab_submissions.forEach((ls: any, idx: number) => {
                                                                    if (!uniqueLabs.has(ls.lab_question)) {
                                                                        uniqueLabs.set(ls.lab_question, {
                                                                            id: ls.lab_question,
                                                                            title: ls.lab?.title || ls.lab_title || `Engineering Lab ${uniqueLabs.size + 1}`
                                                                        });
                                                                    }
                                                                });
                                                                resolvedQuestions = Array.from(uniqueLabs.values());
                                                            }

                                                            let sectionQuestions: { title: string; events: any[] }[] = [];
                                                            const matchedEvents = new Set<any>();
                                                            
                                                            if (resolvedQuestions && resolvedQuestions.length > 0) {
                                                                sectionQuestions = resolvedQuestions.map((q: any, qIdx: number) => {
                                                                    const qTitle = q.title || q.text || q.content || `Question ${qIdx + 1}`;
                                                                    const qId = typeof q === 'string' ? q : q.id;
                                                                    const qEvents = allSectionEvents.filter((v: any) => {
                                                                        const vQId = v.question_id || (v.meta_data && v.meta_data.question_id);
                                                                        if (vQId && qId && String(vQId) === String(qId)) return true;
                                                                        if (v.question_title && (v.question_title === q.title || v.question_title === q.text || v.question_title === q.content || qTitle.includes(v.question_title) || v.question_title.includes(qTitle))) return true;
                                                                        return false;
                                                                    });
                                                                    qEvents.forEach((e: any) => matchedEvents.add(e));
                                                                    return { title: qTitle, events: qEvents.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) };
                                                                });
                                                            }

                                                            // Append unmatched events as fallback groups
                                                            const unmatchedEvents = allSectionEvents.filter((e: any) => !matchedEvents.has(e));
                                                            if (unmatchedEvents.length > 0) {
                                                                const groups = new Map<string, any[]>();
                                                                unmatchedEvents.forEach((v: any) => {
                                                                    const vQId = v.question_id || (v.meta_data && v.meta_data.question_id);
                                                                    const isSectionId = activeSections.some((s: any) => s.id === vQId);
                                                                    const t = v.question_title || (isSectionId ? 'General Section Activity' : (vQId ? `Question ${vQId.slice(0,8)}` : 'General / Unknown Question'));
                                                                    if (t !== 'General Section Activity' && t !== 'General / Unknown Question') {
                                                                        if (!groups.has(t)) groups.set(t, []);
                                                                        groups.get(t)!.push(v);
                                                                    }
                                                                });
                                                                Array.from(groups.entries()).forEach(([title, events]) => {
                                                                    sectionQuestions.push({ title, events: events.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) });
                                                                });
                                                            }

                                                            // Filter out sectionQuestions that are actually from other sections if possible
                                                            // Or just render them.
                                                            if (sectionQuestions.length === 0) {
                                                                return <div className="text-slate-500 dark:text-neutral-400 italic text-xs">No questions found or candidate did not attempt.</div>;
                                                            }

                                                            return (
                                                                <Accordion type="single" collapsible className="w-full space-y-2">
                                                                    {sectionQuestions.map((q, qIdx) => (
                                                                        <AccordionItem key={qIdx} value={`q-${qIdx}`} className="bg-white dark:bg-[#121215] border border-neutral-200 dark:border-white/10 rounded-lg px-3 overflow-hidden shadow-sm">
                                                                            <AccordionTrigger className="py-3 hover:no-underline flex justify-between group">
                                                                                <div className="flex items-center gap-2 text-left">
                                                                                    <span className="font-semibold text-slate-800 dark:text-neutral-200 text-sm group-hover:text-blue-600 transition-colors">{qIdx + 1}. {q.title}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-3 pr-2">
                                                                                    {q.events.length > 0 && (
                                                                                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">
                                                                                            {q.events.length} Flags
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            </AccordionTrigger>
                                                                            <AccordionContent className="pt-2 pb-4 border-t border-neutral-100">
                                                                                {sec.type === 'VITARKA_AI_INTERVIEW' && (q as any).answer && (
                                                                                    <div className="mb-4 mt-2 bg-slate-50 dark:bg-white/5 p-3 rounded-lg text-sm text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-white/10">
                                                                                        <span className="font-semibold text-slate-900 dark:text-white block mb-1">Candidate's Answer:</span>
                                                                                        {(q as any).answer}
                                                                                    </div>
                                                                                )}
                                                                                {q.events.length === 0 ? (
                                                                                    <div className="text-slate-500 dark:text-neutral-400 italic text-xs py-2 px-1 flex items-center gap-2">
                                                                                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> No anomalies recorded for this question.
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="space-y-4 px-1 mt-2">
                                                                                        <div className="h-[180px] w-full border border-neutral-200 dark:border-white/10 rounded-lg bg-slate-50/50 dark:bg-white/10 p-2 relative">
                                                                                            <ResponsiveContainer width="100%" height="100%">
                                                                                                <AreaChart 
                                                                                                    data={(() => {
                                                                                                        let chartData: any[] = [];
                                                                                                        q.events.forEach((log: any, index: number) => {
                                                                                                            const isCritical = log.severity === 2;
                                                                                                            const isWarning = log.severity === 1;
                                                                                                            const logTime = new Date(log.timestamp).getTime();
                                                                                                            
                                                                                                            const point = {
                                                                                                                log,
                                                                                                                time: formatEventTime(log.timestamp),
                                                                                                                severity: log.severity || 0,
                                                                                                                severityName: isCritical ? 'Critical' : isWarning ? 'Warning' : 'Normal',
                                                                                                                isSnapshot: log.activity_type === 'snapshot',
                                                                                                                rawTime: logTime
                                                                                                            };
                                                                                                            
                                                                                                            const prevLog = index > 0 ? q.events[index - 1] : null;
                                                                                                            if (!prevLog || logTime - new Date(prevLog.timestamp).getTime() > 2000) {
                                                                                                                chartData.push({ time: formatEventTime(logTime - 1000), severity: 0, rawTime: logTime - 1000 });
                                                                                                            }
                                                                                                            
                                                                                                            chartData.push(point);
                                                                                                            
                                                                                                            const nextLog = index < q.events.length - 1 ? q.events[index + 1] : null;
                                                                                                            if (!nextLog || new Date(nextLog.timestamp).getTime() - logTime > 2000) {
                                                                                                                chartData.push({ time: formatEventTime(logTime + 1000), severity: 0, rawTime: logTime + 1000 });
                                                                                                            }
                                                                                                        });
                                                                                                        return chartData.sort((a, b) => a.rawTime - b.rawTime);
                                                                                                    })()}
                                                                                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                                                                                >
                                                                                                    <defs>
                                                                                                        <linearGradient id={`colorSeverity-${qIdx}`} x1="0" y1="0" x2="0" y2="1">
                                                                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                                                                            <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                                                                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                                                                                        </linearGradient>
                                                                                                        <linearGradient id={`colorSeverityFill-${qIdx}`} x1="0" y1="0" x2="0" y2="1">
                                                                                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                                                                                            <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                                                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                                                                                        </linearGradient>
                                                                                                    </defs>
                                                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#555555" strokeOpacity={0.3} />
                                                                                                    <XAxis dataKey="time" tick={{fontSize: 9, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                                                                                                    <YAxis hide domain={[0, 2.2]} />
                                                                                                    <Tooltip content={<CustomTooltip setActiveLightboxImg={setActiveLightboxImg} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                                                                    <Area type="monotone" dataKey="severity" stroke={`url(#colorSeverity-${qIdx})`} fill={`url(#colorSeverityFill-${qIdx})`} strokeWidth={2} />
                                                                                                </AreaChart>
                                                                                            </ResponsiveContainer>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </AccordionContent>
                                                                        </AccordionItem>
                                                                    ))}
                                                                </Accordion>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        );
                                    })}
                                </Tabs>
                                    );
                                })()
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. Violations Tab */}
                <TabsContent value="violations" className="space-y-6">
                    <Card className="border border-neutral-200 dark:border-white/10 rounded-2xl bg-slate-50/40 dark:bg-white/5 shadow-none p-2 text-slate-900 dark:text-white">
                        <CardHeader>
                            <CardTitle className="text-[10px] uppercase tracking-widest text-rose-600 flex items-center gap-2 font-bold">
                                <AlertCircle className="h-5 w-5" />
                                Proctoring Violations Timeline ({totalViolations})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {totalViolations === 0 ? (
                                <div className="text-center py-12 text-emerald-600  flex flex-col items-center justify-center gap-3 bg-emerald-50/20  border border-dashed border-neutral-200 dark:border-white/10 border-emerald-200  rounded-lg">
                                    <ShieldCheck className="h-10 w-10 text-emerald-500" />
                                    <div className="font-semibold text-base">Perfect Session Integrity!</div>
                                    <p className="text-xs text-slate-500 dark:text-neutral-400">The student did not trigger any proctoring flags during the assessment.</p>
                                </div>
                            ) : (
                                <div className="relative border-l border-neutral-200 dark:border-white/10 pl-6 ml-3 space-y-6">
                                    {riskAnalysis.violations.map((event, idx) => {
                                        const criticalTypes = ['tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 'new_tab_detected', 'new_window_detected', 'face_not_detected', 'multiple_faces_detected', 'face_recognition_failed', 'violation_critical', 'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected', 'screen_share_stopped', 'camera_stopped', 'mic_stopped', 'repeated_permission_loss'];
                                        const isCritical = criticalTypes.some(vt => event.activity_type.includes(vt));

                                        let icon = AlertTriangle;
                                        let color = isCritical 
                                            ? 'bg-rose-100 text-rose-700  ' 
                                            : 'bg-amber-100 text-amber-700  ';
                                        
                                        if (event.activity_type.includes('face')) {
                                            icon = Eye;
                                        } else if (event.activity_type.includes('tab_switched') || event.activity_type.includes('focus_lost') || event.activity_type.includes('window')) {
                                            icon = Maximize;
                                        } else if (event.activity_type.includes('copy') || event.activity_type.includes('paste') || event.activity_type.includes('cut')) {
                                            icon = FileText;
                                        }

                                        const IconComponent = icon;

                                        return (
                                            <div key={idx} className="relative group">
                                                {/* Line marker */}
                                                <div className={`absolute -left-[37px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background shadow-sm ${color}`}>
                                                    <IconComponent className="h-3.5 w-3.5" />
                                                </div>

                                                <div className={`p-4 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121215] shadow-sm hover:shadow-md transition-shadow ${isCritical ? 'border-rose-200 ' : 'border-neutral-200 dark:border-white/10'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold text-sm capitalize ${isCritical ? 'text-rose-600 ' : 'text-slate-900 dark:text-white'}`}>
                                                                {event.activity_type?.replace(/_/g, ' ') || ''}
                                                            </span>
                                                            <Badge variant={isCritical ? 'destructive' : 'outline'} className="text-slate-900 dark:text-white border-neutral-200 dark:border-white/10 text-[10px] h-4 px-1 py-0 uppercase">
                                                                {isCritical ? 'Critical' : 'General'}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                                                            {formatEventTime(event.timestamp)}
                                                        </span>
                                                    </div>

                                                    {/* Meta detail description */}
                                                    <div className="text-xs text-slate-500 dark:text-neutral-400 space-y-1">
                                                        {event.meta_data?.method && (
                                                            <div><strong>Method:</strong> <Badge variant="secondary" className="text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 text-[10px] h-4 py-0 px-1 ml-1">{event.meta_data.method}</Badge></div>
                                                        )}
                                                        {event.meta_data?.platform && (
                                                            <div><strong>Platform/Browser:</strong> {event.meta_data.platform}</div>
                                                        )}
                                                        {event.meta_data?.key && (
                                                            <div><strong>Trigger Key:</strong> <kbd className="px-1 border border-neutral-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 font-mono">{event.meta_data.key}</kbd></div>
                                                        )}
                                                        {event.meta_data?.copied_text && (
                                                            <div className="bg-slate-100/40 dark:bg-white/10 p-2 border border-neutral-200 dark:border-white/10 rounded font-mono text-[11px] truncate max-w-full">
                                                                <strong>Text Copied:</strong> "{event.meta_data.copied_text}"
                                                            </div>
                                                        )}
                                                        {event.meta_data?.pasted_text && (
                                                            <div className="bg-slate-100/40 dark:bg-white/10 p-2 border border-neutral-200 dark:border-white/10 rounded font-mono text-[11px] truncate max-w-full">
                                                                <strong>Text Pasted:</strong> "{event.meta_data.pasted_text}"
                                                            </div>
                                                        )}
                                                        {event.meta_data?.cut_text && (
                                                            <div className="bg-slate-100/40 dark:bg-white/10 p-2 border border-neutral-200 dark:border-white/10 rounded font-mono text-[11px] truncate max-w-full">
                                                                <strong>Text Cut:</strong> "{event.meta_data.cut_text}"
                                                            </div>
                                                        )}
                                                        {event.meta_data?.selected_text && (
                                                            <div className="bg-slate-100/40 dark:bg-white/10 p-2 border border-neutral-200 dark:border-white/10 rounded font-mono text-[11px] truncate max-w-full">
                                                                <strong>Text Selected:</strong> "{event.meta_data.selected_text}"
                                                            </div>
                                                        )}
                                                        {event.meta_data?.db_level !== undefined && (
                                                            <div><strong>Ambient Audio Noise:</strong> {event.meta_data.db_level} dB</div>
                                                        )}
                                                    </div>

                                                    {/* Captured Evidence Images (Screenshot & Camera) */}
                                                    {(event.screen_path || event.image_path) && (
                                                        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/10 space-y-2">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                                <Camera className="h-3.5 w-3.5 text-blue-500" />
                                                                <span>Captured Violation Evidence</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                                {event.screen_path && (
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                                                                            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                                <Maximize className="h-3 w-3" /> Screen Capture
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400">Click to expand</span>
                                                                        </div>
                                                                        <div 
                                                                            className="relative aspect-video rounded-lg overflow-hidden border border-blue-200 dark:border-blue-900/50 bg-black cursor-zoom-in group/img shadow-sm hover:shadow transition-all"
                                                                            onClick={() => setActiveLightboxImg(getImageUrl(event.screen_path))}
                                                                            title="View full screen capture"
                                                                        >
                                                                            <img 
                                                                                src={getImageUrl(event.screen_path)} 
                                                                                alt="Screen capture at violation" 
                                                                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                                                                onError={(e) => {
                                                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Screenshot+Load+Error';
                                                                                }}
                                                                            />
                                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                                                <Eye className="h-6 w-6 text-white" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {event.image_path && (
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                                                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                                <Camera className="h-3 w-3" /> Camera Snapshot
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400">Click to expand</span>
                                                                        </div>
                                                                        <div 
                                                                            className="relative aspect-video rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-900/50 bg-black cursor-zoom-in group/img shadow-sm hover:shadow transition-all"
                                                                            onClick={() => setActiveLightboxImg(getImageUrl(event.image_path))}
                                                                            title="View camera snapshot"
                                                                        >
                                                                            <img 
                                                                                src={getImageUrl(event.image_path)} 
                                                                                alt="Camera snapshot at violation" 
                                                                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                                                                onError={(e) => {
                                                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Camera+Load+Error';
                                                                                }}
                                                                            />
                                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                                                <Eye className="h-6 w-6 text-white" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. System & Network Tab */}
                <TabsContent value="system" className="space-y-6">
                    <Card className="border border-neutral-200 dark:border-white/10 rounded-2xl bg-slate-50/40 dark:bg-white/5 shadow-none p-2 text-slate-900 dark:text-white">
                        <CardHeader>
                            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                                <Network className="h-5 w-5 text-slate-500 dark:text-neutral-400" />
                                Network Status & System Events Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {riskAnalysis.systemLogs.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 dark:text-neutral-400 italic bg-gray-50 dark:bg-white/5  border border-dashed border-neutral-200 dark:border-white/10 rounded-lg">
                                    No system, camera, or network logs were recorded.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {riskAnalysis.systemLogs.map((event, idx) => {
                                        const isConn = event.activity_type === 'network_connected' || event.activity_type === 'camera_enabled' || event.activity_type === 'focus_gained';
                                        const isDis = event.activity_type === 'network_disconnected' || event.activity_type === 'camera_disabled' || event.activity_type === 'focus_lost';
                                        
                                        return (
                                            <div key={idx} className="flex justify-between items-center text-[13px] p-3 bg-white dark:bg-[#121215] rounded-lg border border-neutral-200 dark:border-white/10">
                                                <div className="flex items-center gap-3">
                                                    {isConn ? (
                                                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                                                    ) : isDis ? (
                                                        <XCircle className="h-4.5 w-4.5 text-rose-500" />
                                                    ) : (
                                                        <Activity className="h-4.5 w-4.5 text-blue-500" />
                                                    )}
                                                    <span className="font-semibold text-sm capitalize text-slate-900 dark:text-white">
                                                        {event.activity_type?.replace(/_/g, ' ') || ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {event.meta_data?.platform && (
                                                        <span className="text-[10px] border border-neutral-200 dark:border-white/10 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10">
                                                            {event.meta_data.platform}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-500 dark:text-neutral-400">
                                                        {formatEventTime(event.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Premium Lightbox Modal */}
            {activeLightboxImg && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 transition-all duration-300"
                    onClick={() => setActiveLightboxImg(null)}
                >
                    <div className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setActiveLightboxImg(null)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors text-sm font-semibold flex items-center gap-1 bg-black/50 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md cursor-pointer"
                        >
                            ✕ Close Esc
                        </button>
                        <img 
                            src={activeLightboxImg} 
                            alt="Snapshot Enlarged View" 
                            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl border border-white/10"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/800x600?text=Image+Load+Error';
                            }}
                        />
                    </div>
                </div>
            )}


        </div>
    );
};

export { CandidateAnalyticsViewer };













