import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { StatsCard } from '@/components/common/StatsCard';

interface ProctoringEvent {
    activity_type: string;
    timestamp: string;
    image_path?: string;
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
}

interface QuestionActivity {
    id: string;
    question_title: string;
    question_type: string;
    total_question_time: number;
    is_correct?: boolean;
    violation_count?: number;
    question_content?: string;
    mcq_options?: any;
    answer_data?: any;
    navigation_activities?: ProctoringEvent[];
    proctoring_activities?: ProctoringEvent[];
    question_activities?: ProctoringEvent[];
    camera_snapshots?: ProctoringEvent[];
}

interface Submission {
    id: string;
    user_name: string;
    status: string;
    marks: number | null;
    submitted_at: string | null;
    proctoring_events?: ProctoringEvent[];
    general_events?: ProctoringEvent[];
    question_activities?: QuestionActivity[];
    skill_test_title?: string;
    exam_title?: string;
    job_test_title?: string;
}

interface ProctoringSessionViewerProps {
    submission: Submission;
    title?: string;
}

const getImageUrl = (imgUrl: string | undefined) => {
    if (!imgUrl) return '';
    
    let processedUrl = imgUrl;
    
    if (processedUrl.includes('minio:9000') || processedUrl.includes('http://minio/')) {
        processedUrl = processedUrl.replace('minio:9000', 'localhost:9000').replace('http://minio/', 'http://localhost:9000/');
    }

    if (processedUrl.startsWith('http')) return processedUrl;

    let cleanPath = processedUrl?.replace(/\\/g, '/');
    if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.substring('uploads/'.length);
    } else if (cleanPath.startsWith('/uploads/')) {
        cleanPath = cleanPath.substring('/uploads/'.length);
    }

    if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
    }

    const baseUrl = (import.meta.env.VITE_BACKEND_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api')?.replace(/\/$/, '');
    const rootUrl = baseUrl?.replace(/\/api\/?$/, '');
    return `${rootUrl}/media/${cleanPath}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const log = data.log;
        const severity = data.severity;
        const isSnapshot = data.isSnapshot;
        
        const isPureSnapshot = isSnapshot && (!log.activity_type || log.activity_type === 'snapshot');
        
        return (
            <div className="bg-card p-3 rounded-lg shadow-xl border border-border max-w-[240px]">
                <div className="font-mono text-[10px] text-muted-foreground mb-2">{label}</div>
                <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${severity === 2 ? 'bg-rose-500' : severity === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    <span className="font-bold text-sm">{data.severityName}</span>
                </div>
                
                <div className="space-y-3">
                    {/* Render text details if there is an activity type (and it's not just a standalone snapshot without other meaning) */}
                    {!isPureSnapshot && log.activity_type && (
                        <div className="space-y-1">
                            <span className="font-semibold capitalize text-xs text-foreground block">
                                {log.activity_type.replace(/_/g, ' ')}
                            </span>
                            {log.meta_data && Object.keys(log.meta_data).length > 0 && (
                                <div className="mt-2 space-y-1 pt-2 border-t border-border/50">
                                    {log.meta_data.key && (
                                        <div className="text-[10px] truncate"><span className="text-muted-foreground">Key:</span> <kbd className="px-1 border bg-muted font-mono rounded">{log.meta_data.key}</kbd></div>
                                    )}
                                    {log.meta_data.copied_text && (
                                        <div className="text-[10px] truncate" title={log.meta_data.copied_text}><span className="text-muted-foreground">Copy:</span> "{log.meta_data.copied_text}"</div>
                                    )}
                                    {log.meta_data.pasted_text && (
                                        <div className="text-[10px] truncate" title={log.meta_data.pasted_text}><span className="text-muted-foreground">Paste:</span> "{log.meta_data.pasted_text}"</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Render Image if exists */}
                    {isSnapshot && (
                        <div className={`space-y-2 ${!isPureSnapshot ? 'pt-2 border-t border-border/50' : ''}`}>
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                                <Camera className="h-3 w-3" /> Snapshot Captured
                            </div>
                            <img src={getImageUrl(log.image_path)} alt="Snapshot" className="w-full object-cover bg-black rounded" />
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const ProctoringSessionViewer: React.FC<ProctoringSessionViewerProps> = ({ submission, title }) => {
    const navigate = useNavigate();
    const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

    // Escape listener for Lightbox
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveLightboxImg(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Format Timestamp safely
    const formatEventTime = (timestampStr: string) => {
        try {
            const date = new Date(timestampStr);
            if (isNaN(date.getTime())) return 'Invalid date';
            return format(date, 'h:mm:ss a');
        } catch (e) {
            return timestampStr || 'N/A';
        }
    };

    // Calculate Risk Score and categorize events
    const riskAnalysis = React.useMemo(() => {
        let score = 0;
        const details: { type: string; count: number; points: number }[] = [];
        const eventCounts: Record<string, number> = {};

        const addEventToCount = (type: string) => {
            eventCounts[type] = (eventCounts[type] || 0) + 1;
        };

        // Gather all events
        const allEvents: ProctoringEvent[] = [];
        if (submission.proctoring_events) {
            allEvents.push(...submission.proctoring_events);
        }
        if (submission.general_events) {
            allEvents.push(...submission.general_events);
        }
        if (submission.question_activities) {
            submission.question_activities.forEach(q => {
                if (q.navigation_activities) allEvents.push(...q.navigation_activities);
                if (q.proctoring_activities) allEvents.push(...q.proctoring_activities);
            });
        }

        // Deduplicate events by type and timestamp
        const uniqueEvents = allEvents.filter((event, index, self) =>
            self.findIndex(e => e.activity_type === event.activity_type && e.timestamp === event.timestamp) === index
        );

        // Map events to violations vs system logs
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
            'network_disconnected', 'network_connected', 'violation_warning', 'violation'
        ];

        uniqueEvents.forEach(e => {
            const type = e.activity_type;
            if (['snapshot', 'camera_enabled', 'camera_disabled'].includes(type)) {
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

        // Add standard system logs (network, camera, session, focus)
        uniqueEvents.forEach(e => {
            const type = e.activity_type;
            if (['network_disconnected', 'network_connected', 'camera_enabled', 'camera_disabled', 'focus_gained', 'session_start', 'session_submit'].includes(type)) {
                if (!systemLogs.some(sl => sl.activity_type === type && sl.timestamp === e.timestamp)) {
                    systemLogs.push(e);
                }
            }
        });

        // Compute Risk Score
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
        let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40';

        if (score > 0 && score <= 4) {
            level = 'Low';
            colorScheme = 'blue';
            colorClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40';
        } else if (score > 4 && score <= 8) {
            level = 'Medium';
            colorScheme = 'amber';
            colorClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40';
        } else if (score > 8 && score <= 15) {
            level = 'High';
            colorScheme = 'orange';
            colorClass = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40';
        } else if (score > 15) {
            level = 'Critical';
            colorScheme = 'red';
            colorClass = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40';
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
            systemLogs: systemLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        };
    }, [submission]);



    // Gather snapshots
    const snapshots = React.useMemo(() => {
        const allSnapshots: ProctoringEvent[] = [];
        if (submission.proctoring_events) {
            allSnapshots.push(...submission.proctoring_events);
        }
        if (submission.general_events) {
            allSnapshots.push(...submission.general_events);
        }
        if (submission.question_activities) {
            submission.question_activities.forEach(q => {
                if (q.camera_snapshots) {
                    allSnapshots.push(...q.camera_snapshots);
                }
            });
        }

        const seenPaths = new Set<string>();
        const uniqueSnapshots: ProctoringEvent[] = [];
        allSnapshots.forEach(e => {
            if (e.image_path && !seenPaths.has(e.image_path)) {
                seenPaths.add(e.image_path);
                uniqueSnapshots.push(e);
            }
        });

        return uniqueSnapshots
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [submission]);

    const totalViolations = riskAnalysis.violations.length;
    const questionActivities = submission.question_activities || [];

    return (
        <div className="px-6 py-6 space-y-6">
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
                <StatsCard
                    label="Total Score"
                    value={submission.marks !== null ? `${submission.marks}` : '-'}
                    icon={Trophy}
                    colorScheme="amber"
                    size="md"
                />

                <StatsCard
                    label="Submission Status"
                    value={submission?.status?.replace('_', ' ') || ''}
                    icon={Activity}
                    colorScheme="blue"
                    size="md"
                />

                <StatsCard
                    label="Risk Level"
                    value={riskAnalysis.level}
                    icon={riskAnalysis.level === 'Clean' ? ShieldCheck : ShieldAlert}
                    colorScheme={riskAnalysis.colorScheme}
                    size="md"
                    className="border-2"
                />

                <div className="flex flex-col bg-card border border-border shadow-sm rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Total Violations</span>
                        <div className={`p-2 rounded-lg ${totalViolations > 0 ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground mb-2">{totalViolations}</div>
                    <div className="flex items-center gap-3 text-xs mt-auto pt-2 border-t text-muted-foreground">
                        <div className="flex items-center gap-1" title="Normal"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>{riskAnalysis.normalCount}</div>
                        <div className="flex items-center gap-1" title="General"><div className="w-2 h-2 rounded-full bg-amber-500"></div>{riskAnalysis.generalCount}</div>
                        <div className="flex items-center gap-1" title="Critical"><div className="w-2 h-2 rounded-full bg-rose-500"></div>{riskAnalysis.criticalCount}</div>
                    </div>
                </div>

                <StatsCard
                    label="Submitted At"
                    value={submission.submitted_at ? format(new Date(submission.submitted_at), 'MMM d, h:mm a') : '-'}
                    icon={Clock}
                    colorScheme="purple"
                    size="md"
                />
            </div>

            {/* Detailed Tabs Container */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 w-full md:w-[650px] mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="questions">Question Breakdown</TabsTrigger>
                    <TabsTrigger value="violations" className="flex items-center gap-1.5">
                        Violations
                        {totalViolations > 0 && (
                            <Badge variant="destructive" className="h-4 min-w-4 px-1 flex items-center justify-center text-[10px]">
                                {totalViolations}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="system">System & Network</TabsTrigger>
                </TabsList>

                {/* 1. Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Risk Score details card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-1 border border-border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                                    Risk Score Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b">
                                        <span className="text-sm font-medium text-muted-foreground">Computed Risk Score:</span>
                                        <Badge className={`text-sm font-bold px-3 py-1 ${riskAnalysis.colorClass}`}>
                                            {riskAnalysis.score} pts ({riskAnalysis.level})
                                        </Badge>
                                    </div>
                                    
                                    {riskAnalysis.details.length === 0 ? (
                                        <div className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2 py-4">
                                            <ShieldCheck className="h-5 w-5" />
                                            No proctoring anomalies or violations detected!
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {riskAnalysis.details.map((detail, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <span className="capitalize text-muted-foreground">
                                                        {detail.type?.replace(/_/g, ' ') || ''}
                                                        <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                                                            (x{detail.count})
                                                        </span>
                                                    </span>
                                                    <span className="font-semibold text-foreground">+{detail.points} pts</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats info card */}
                        <Card className="md:col-span-2 border border-border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-muted-foreground" />
                                    Session Health
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Fullname:</span>
                                            <span className="font-semibold">{submission.user_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">Test:</span>
                                            <span className="font-semibold truncate max-w-[200px]">{submission.skill_test_title || submission.exam_title || submission.job_test_title || 'Assessment'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Status:</span>
                                            <Badge variant="outline" className="capitalize">{submission?.status?.replace('_', ' ') || ''}</Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Risk Rating:</span>
                                            <span className={`font-semibold capitalize text-${riskAnalysis.colorScheme}-600 dark:text-${riskAnalysis.colorScheme}-400`}>
                                                {riskAnalysis.level} Risk
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Camera Status:</span>
                                            <span className="font-semibold flex items-center gap-1">
                                                {snapshots.length > 0 ? (
                                                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                                        <Camera className="h-3.5 w-3.5" /> Camera Captured
                                                    </span>
                                                ) : (
                                                    <span className="text-red-500 flex items-center gap-1">
                                                        <Camera className="h-3.5 w-3.5" /> Camera Off/No snap
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subbed timestamp:</span>
                                            <span className="font-semibold text-xs">{submission.submitted_at ? format(new Date(submission.submitted_at), 'yyyy-MM-dd HH:mm:ss') : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Proctoring Snapshots Section */}
                    <Card className="border border-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Camera className="h-5 w-5 text-muted-foreground" />
                                Proctoring Snapshots ({snapshots.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {snapshots.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground italic bg-gray-50 dark:bg-card/50 border border-dashed rounded-lg">
                                    No snapshots were recorded for this assessment.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {snapshots.map((event, i) => {
                                        const imgUrl = getImageUrl(event.image_path);
                                        return (
                                            <div 
                                                key={`snap-${i}`} 
                                                className="group relative border border-border rounded-lg overflow-hidden cursor-zoom-in bg-black shadow-sm hover:shadow-md transition-all duration-200"
                                                onClick={() => setActiveLightboxImg(imgUrl)}
                                            >
                                                <div className="aspect-video w-full relative">
                                                    <img
                                                        src={imgUrl}
                                                        alt={`Snapshot ${i + 1}`}
                                                        className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Load+Error';
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                                                        <Eye className="h-6 w-6 text-white" />
                                                    </div>
                                                </div>
                                                <div className="bg-card text-card-foreground text-[10px] p-2 flex justify-between items-center border-t">
                                                    <span className="font-medium">{formatEventTime(event.timestamp)}</span>
                                                    {event.activity_type !== 'snapshot' && event.activity_type && (
                                                        <Badge variant="destructive" className="h-4 px-1 py-0 text-[8px] capitalize">
                                                            {event.activity_type?.replace(/_/g, ' ')}
                                                        </Badge>
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

                {/* 2. Question Breakdown Tab */}
                <TabsContent value="questions" className="space-y-6">
                    <Card className="border border-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                Question-by-Question Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {questionActivities.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No question activity data recorded.</div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Horizontal Question Selector */}
                                    <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border bg-card shadow-sm p-2">
                                        <div className="flex w-max space-x-2 p-1">
                                            {questionActivities.map((activity, index) => (
                                                <button
                                                    key={activity.id}
                                                    onClick={() => setSelectedQuestionIndex(index)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                                        selectedQuestionIndex === index 
                                                            ? 'bg-primary text-primary-foreground shadow-sm' 
                                                            : 'hover:bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] shadow-sm ${selectedQuestionIndex === index ? 'bg-primary-foreground text-primary border-none' : 'bg-background text-foreground border'}`}>
                                                        {index + 1}
                                                    </span>
                                                    Q{index + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>

                                    {/* Selected Question Details */}
                                    {(() => {
                                        const activity = questionActivities[selectedQuestionIndex];
                                        if (!activity) return null;

                                        // Merge events and allow 'snapshot'
                                        const qEvents = [
                                            ...(activity.navigation_activities || []),
                                            ...(activity.proctoring_activities || []),
                                            ...(activity.question_activities || []),
                                            ...(activity.camera_snapshots || []) // Include snapshots!
                                        ].filter(log => !['camera_enabled', 'camera_disabled'].includes(log.activity_type || ''))
                                         .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                                        return (
                                            <div className="border border-border rounded-lg p-5 bg-card shadow-sm transition-all duration-200">
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 pb-3 border-b">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-base text-foreground">
                                                                Q{selectedQuestionIndex + 1}: {activity.question_title}
                                                            </span>
                                                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                                                {activity.question_type}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                Time Spent: {Math.floor((activity.total_question_time || 0) / 60)}m {(activity.total_question_time || 0) % 60}s
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Eye className="h-3.5 w-3.5" />
                                                                Visits: {(activity.question_activities || []).filter(log => log.activity_type === 'question_viewed').length}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {activity.is_correct ? (
                                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">Correct</Badge>
                                                        ) : activity.is_correct === false ? (
                                                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400">Incorrect</Badge>
                                                        ) : (
                                                            <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Ungraded</Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Question Content & Responses */}
                                                <div className="mb-6 space-y-4 text-sm bg-muted/10 p-4 rounded-lg border border-border">
                                                    {activity.question_content && (
                                                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activity.question_content }} />
                                                    )}
                                                    
                                                    {activity.question_type === 'mcq_single' || activity.question_type === 'mcq_multiple' ? (
                                                        <div className="mt-4">
                                                            <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">Options</div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {Array.isArray(activity.mcq_options) ? activity.mcq_options.map((opt: any, i: number) => {
                                                                    const optText = opt.text || opt.content || '';
                                                                    let ans = activity.answer_data;
                                                                    if (ans && typeof ans === 'object') {
                                                                        ans = ans.answer !== undefined ? ans.answer : ans;
                                                                    }
                                                                    const isSelected = Array.isArray(ans) 
                                                                        ? ans.includes(optText) 
                                                                        : ans === optText;
                                                                    const isCorrect = opt.is_correct;
                                                                return (
                                                                    <div key={opt.id || i} className={`p-2 rounded border flex items-center gap-2 ${isSelected ? (isCorrect ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800') : (isCorrect ? 'bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-900/10 dark:border-emerald-900/50' : 'bg-background')}`}>
                                                                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                                                                            {isSelected && <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />}
                                                                        </div>
                                                                        <span dangerouslySetInnerHTML={{ __html: opt.content || opt.text || '' }} className="flex-1" />
                                                                        {isCorrect && <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 ml-2">Correct Answer</Badge>}
                                                                        {isSelected && !isCorrect && <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200 ml-2">Selected</Badge>}
                                                                    </div>
                                                                );
                                                            }) : (
                                                                <div className="text-muted-foreground italic col-span-2">Options data not available</div>
                                                            )}
                                                            </div>
                                                        </div>
                                                    ) : activity.question_type === 'coding' ? (
                                                        <div className="space-y-2 mt-4">
                                                            <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">Submitted Code</div>
                                                            <pre className="p-3 bg-zinc-950 text-zinc-50 rounded-md overflow-x-auto text-xs font-mono">
                                                                <code>{activity.answer_data?.code || activity.answer_data || 'No code submitted'}</code>
                                                            </pre>
                                                        </div>
                                                    ) : activity.question_type === 'subjective' ? (
                                                        <div className="space-y-2 mt-4">
                                                            <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">Submitted Answer</div>
                                                            <div className="p-3 bg-background border rounded-md whitespace-pre-wrap">
                                                                {activity.answer_data || 'No answer submitted'}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="bg-muted/30 rounded-lg p-4 text-sm border overflow-hidden">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="font-semibold text-foreground flex items-center gap-2">
                                                            <Activity className="h-4 w-4 text-muted-foreground" /> Question Action Timeline
                                                        </h5>
                                                        <div className="flex items-center gap-4 text-xs">
                                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Normal</div>
                                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded"><div className="w-2 h-2 rounded-full bg-amber-500"></div> General</div>
                                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Critical</div>
                                                        </div>
                                                    </div>
                                                    {qEvents.length === 0 ? (
                                                        <div className="text-muted-foreground italic text-xs">No anomalies or navigation events recorded for this question.</div>
                                                    ) : (
                                                        <ScrollArea className="w-full pb-4">
                                                            <div style={{ width: Math.max(800, qEvents.length * 80), height: 350 }}>
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <AreaChart 
                                                                        data={qEvents.map((log) => {
                                                                            const criticalTypes = ['tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 'new_tab_detected', 'new_window_detected', 'face_not_detected', 'multiple_faces_detected', 'face_recognition_failed', 'violation_critical', 'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected'];
                                                                            const generalTypes = ['copy_detected', 'paste_detected', 'cut_detected', 'select_all_detected', 'right_click_detected', 'keyboard_shortcut', 'screenshot_detected', 'screen_share_started', 'screen_share_ended', 'suspicious_movement', 'audio_anomaly', 'network_disconnection', 'network_reconnection', 'violation_warning', 'fullscreen_exit'];
                                                                            
                                                                            const isC = criticalTypes.some(vt => log.activity_type?.includes(vt));
                                                                            const isG = generalTypes.some(vt => log.activity_type?.includes(vt));
                                                                            const isV = isC || isG || log.activity_type?.includes('violation') || log.activity_type?.includes('detected') || log.activity_type?.includes('lost');
                                                                            const isS = !!log.image_path;
                                                                            const severity = isC ? 2 : (isG || isV) ? 1 : 0;
                                                                            const isPureSnapshot = isS && (!log.activity_type || log.activity_type === 'snapshot');
                                                                            
                                                                            return {
                                                                                name: formatEventTime(log.timestamp),
                                                                                severity: severity,
                                                                                severityName: isPureSnapshot ? 'Snapshot' : severity === 2 ? 'Critical' : severity === 1 ? 'General' : 'Normal',
                                                                                log: log,
                                                                                isSnapshot: isS
                                                                            };
                                                                        })} 
                                                                        margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
                                                                    >
                                                                        <defs>
                                                                            <linearGradient id="colorSeverity" x1="0" y1="1" x2="0" y2="0">
                                                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15}/>
                                                                                <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.15}/>
                                                                                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                                                            </linearGradient>
                                                                            <linearGradient id="colorStroke" x1="0" y1="1" x2="0" y2="0">
                                                                                <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                                                                                <stop offset="50%" stopColor="#f59e0b" stopOpacity={1}/>
                                                                                <stop offset="100%" stopColor="#f43f5e" stopOpacity={1}/>
                                                                            </linearGradient>
                                                                        </defs>
                                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickMargin={15} stroke="hsl(var(--muted-foreground))" />
                                                                        <YAxis 
                                                                            domain={[0, 2.2]} 
                                                                            ticks={[0, 1, 2]} 
                                                                            tickFormatter={(value) => value === 0 ? 'Normal' : value === 1 ? 'General' : value === 2 ? 'Critical' : ''}
                                                                            tick={{ fontSize: 10, fontWeight: 600 }}
                                                                            width={60}
                                                                            stroke="none"
                                                                        />
                                                                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                                                                        
                                                                        {/* Horizontal reference lines for each level */}
                                                                        <ReferenceLine y={2} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.4} />
                                                                        <ReferenceLine y={1} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
                                                                        <ReferenceLine y={0} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} />

                                                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                                                        
                                                                        <Area 
                                                                            type="monotone" 
                                                                            dataKey="severity" 
                                                                            stroke="url(#colorStroke)" 
                                                                            fillOpacity={1} 
                                                                            fill="url(#colorSeverity)" 
                                                                            strokeWidth={2}
                                                                            activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                                                                            dot={(props) => {
                                                                                const { cx, cy, payload } = props;
                                                                                if (!cx || !cy) return null;
                                                                                const fill = payload.severity === 2 ? '#f43f5e' : payload.severity === 1 ? '#f59e0b' : '#10b981';
                                                                                return <circle key={`dot-${payload.name}-${cx}`} cx={cx} cy={cy} r={4} fill={fill} stroke="white" strokeWidth={1.5} />;
                                                                            }}
                                                                        />
                                                                    </AreaChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                            <ScrollBar orientation="horizontal" />
                                                        </ScrollArea>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. Violations Tab */}
                <TabsContent value="violations" className="space-y-6">
                    <Card className="border border-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-5 w-5" />
                                Proctoring Violations Timeline ({totalViolations})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {totalViolations === 0 ? (
                                <div className="text-center py-12 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center gap-3 bg-emerald-50/20 dark:bg-emerald-950/5 border border-dashed border-emerald-200 dark:border-emerald-800/30 rounded-lg">
                                    <ShieldCheck className="h-10 w-10 text-emerald-500" />
                                    <div className="font-semibold text-base">Perfect Session Integrity!</div>
                                    <p className="text-xs text-muted-foreground">The student did not trigger any proctoring flags during the assessment.</p>
                                </div>
                            ) : (
                                <div className="relative border-l border-border pl-6 ml-3 space-y-6">
                                    {riskAnalysis.violations.map((event, idx) => {
                                        const criticalTypes = ['tab_switched', 'focus_lost', 'window_blur', 'devtools_opened', 'new_tab_detected', 'new_window_detected', 'face_not_detected', 'multiple_faces_detected', 'face_recognition_failed', 'violation_critical', 'suspicious_activity', 'device_change', 'external_monitor', 'forbidden_platform_detected'];
                                        const isCritical = criticalTypes.some(vt => event.activity_type.includes(vt));

                                        let icon = AlertTriangle;
                                        let color = isCritical 
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' 
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
                                        
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

                                                <div className={`p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow ${isCritical ? 'border-rose-200 dark:border-rose-900/50' : 'border-border'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold text-sm capitalize ${isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                                                {event.activity_type?.replace(/_/g, ' ') || ''}
                                                            </span>
                                                            <Badge variant={isCritical ? 'destructive' : 'outline'} className="text-[10px] h-4 px-1 py-0 uppercase">
                                                                {isCritical ? 'Critical' : 'General'}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {formatEventTime(event.timestamp)}
                                                        </span>
                                                    </div>

                                                    {/* Meta detail description */}
                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        {event.meta_data?.method && (
                                                            <div><strong>Method:</strong> <Badge variant="secondary" className="text-[10px] h-4 py-0 px-1 ml-1">{event.meta_data.method}</Badge></div>
                                                        )}
                                                        {event.meta_data?.platform && (
                                                            <div><strong>Platform/Browser:</strong> {event.meta_data.platform}</div>
                                                        )}
                                                        {event.meta_data?.key && (
                                                            <div><strong>Trigger Key:</strong> <kbd className="px-1 border bg-muted font-mono">{event.meta_data.key}</kbd></div>
                                                        )}
                                                        {event.meta_data?.copied_text && (
                                                            <div className="bg-muted/40 p-2 border rounded font-mono text-[11px] truncate max-w-full">
                                                                <strong>Text Copied:</strong> "{event.meta_data.copied_text}"
                                                            </div>
                                                        )}
                                                        {event.meta_data?.pasted_text && (
                                                            <div className="bg-muted/40 p-2 border rounded font-mono text-[11px] truncate max-w-full">
                                                                <strong>Text Pasted:</strong> "{event.meta_data.pasted_text}"
                                                            </div>
                                                        )}
                                                        {event.meta_data?.cut_text && (
                                                            <div className="bg-muted/40 p-2 border rounded font-mono text-[11px] truncate max-w-full">
                                                                <strong>Text Cut:</strong> "{event.meta_data.cut_text}"
                                                            </div>
                                                        )}
                                                        {event.meta_data?.selected_text && (
                                                            <div className="bg-muted/40 p-2 border rounded font-mono text-[11px] truncate max-w-full">
                                                                <strong>Text Selected:</strong> "{event.meta_data.selected_text}"
                                                            </div>
                                                        )}
                                                        {event.meta_data?.db_level !== undefined && (
                                                            <div><strong>Ambient Audio Noise:</strong> {event.meta_data.db_level} dB</div>
                                                        )}
                                                    </div>
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
                    <Card className="border border-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Network className="h-5 w-5 text-muted-foreground" />
                                Network Status & System Events Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {riskAnalysis.systemLogs.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground italic bg-gray-50 dark:bg-card/50 border border-dashed rounded-lg">
                                    No system, camera, or network logs were recorded.
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {riskAnalysis.systemLogs.map((event, idx) => {
                                        const isConn = event.activity_type === 'network_connected' || event.activity_type === 'camera_enabled' || event.activity_type === 'focus_gained';
                                        const isDis = event.activity_type === 'network_disconnected' || event.activity_type === 'camera_disabled' || event.activity_type === 'focus_lost';
                                        
                                        return (
                                            <div key={idx} className="flex justify-between items-center py-3">
                                                <div className="flex items-center gap-3">
                                                    {isConn ? (
                                                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                                                    ) : isDis ? (
                                                        <XCircle className="h-4.5 w-4.5 text-rose-500" />
                                                    ) : (
                                                        <Activity className="h-4.5 w-4.5 text-blue-500" />
                                                    )}
                                                    <span className="font-semibold text-sm capitalize text-foreground">
                                                        {event.activity_type?.replace(/_/g, ' ') || ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {event.meta_data?.platform && (
                                                        <span className="text-[10px] border px-1.5 py-0.5 rounded bg-muted">
                                                            {event.meta_data.platform}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">
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

export default ProctoringSessionViewer;
