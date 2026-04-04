import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, List, Trophy, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { StatsCard } from '@/components/common/StatsCard';

interface ProctoringEvent {
    activity_type: string;
    timestamp: string;
    image_path?: string;
    meta_data?: {
        copied_text?: string;
        pasted_text?: string;
        cut_text?: string;
        key?: string;
        platform?: string;
    };
}

interface QuestionActivity {
    id: string;
    question_title: string;
    question_type: string;
    total_question_time: number;
    is_correct?: boolean;
    violation_count?: number;
    navigation_activities?: ProctoringEvent[];
    proctoring_activities?: ProctoringEvent[];
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
}

interface ProctoringSessionViewerProps {
    submission: Submission;
    title?: string;
}

const ProctoringSessionViewer: React.FC<ProctoringSessionViewerProps> = ({ submission }) => {
    // Calculate total violations
    const totalViolations = (submission.proctoring_events?.filter((e: any) =>
        !['snapshot', 'camera_enabled', 'camera_disabled'].includes(e.activity_type)).length || 0) +
        (submission.question_activities?.reduce((acc: number, q: any) => acc + (q.violation_count || 0), 0) || 0);

    const questionActivities = submission.question_activities || [];

    const getImageUrl = (imgUrl: string | undefined) => {
        if (!imgUrl) return '';
        if (imgUrl.startsWith('http')) return imgUrl;

        let cleanPath = imgUrl.replace(/\\/g, '/');
        if (cleanPath.startsWith('uploads/')) {
            cleanPath = cleanPath.substring('uploads/'.length);
        } else if (cleanPath.startsWith('/uploads/')) {
            cleanPath = cleanPath.substring('/uploads/'.length);
        }

        if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
        }

        const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api').replace(/\/$/, '');
        const rootUrl = baseUrl.replace(/\/api\/?$/, '');
        return `${rootUrl}/media/${cleanPath}`;
    };

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard
                    label="Total Score"
                    value={submission.marks !== null ? submission.marks : '-'}
                    icon={Trophy}
                    colorScheme="amber"
                    size="md"
                />

                <StatsCard
                    label="Status"
                    value={submission.status.replace('_', ' ')}
                    icon={Activity}
                    colorScheme="blue"
                    size="md"
                />

                <StatsCard
                    label="Total Violations"
                    value={totalViolations}
                    icon={AlertTriangle}
                    colorScheme="red"
                    size="md"
                />

                <StatsCard
                    label="Submitted At"
                    value={submission.submitted_at ? format(new Date(submission.submitted_at), 'MMM d, h:mm a') : '-'}
                    icon={Clock}
                    colorScheme="emerald"
                    size="md"
                />
            </div>

            {/* Question Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Question Breakdown & Proctoring Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {questionActivities.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No question activity data recorded.</div>
                        ) : (
                            questionActivities.map((activity, index) => (
                                <div key={activity.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-900">Q{index + 1}: {activity.question_title}</span>
                                                <Badge variant="outline" className="text-xs uppercase bg-gray-50">{activity.question_type}</Badge>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Time Spent: {Math.floor((activity.total_question_time || 0) / 60)}m {(activity.total_question_time || 0) % 60}s
                                            </div>
                                        </div>
                                        <div>
                                            {activity.is_correct ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Correct</Badge>
                                            ) : activity.is_correct === false ? (
                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Incorrect</Badge>
                                            ) : (
                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Ungraded</Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 bg-gray-50 rounded-md p-3 text-sm">
                                        <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <List className="h-4 w-4" /> Activity Log
                                        </h5>
                                        <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                                            {[...(activity.navigation_activities || []), ...(activity.proctoring_activities || [])]
                                                .filter(log => !['snapshot', 'camera_enabled', 'camera_disabled'].includes(log.activity_type))
                                                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                                .map((log, i) => (
                                                    <div key={i} className={`flex items-center justify-between py-1.5 px-3 rounded-md mb-1 ${
                                                        log.activity_type.includes('violation') || log.activity_type.includes('detected') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-white border text-gray-600'
                                                        }`}>
                                                        <span className="font-medium capitalize">{log.activity_type.replace(/_/g, ' ')}</span>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs text-gray-400">{format(new Date(log.timestamp), 'h:mm:ss a')}</span>
                                                            {log.meta_data?.key && (
                                                                <span className="text-xs text-gray-500 border px-1 rounded bg-gray-100 mt-1">
                                                                    Key: {log.meta_data.key}
                                                                </span>
                                                            )}
                                                            {log.meta_data?.platform && (
                                                                <span className="text-xs text-red-500 border border-red-200 px-1.5 py-0.5 rounded bg-red-50 mt-1">
                                                                    Platform: {log.meta_data.platform}
                                                                </span>
                                                            )}
                                                            {log.meta_data?.copied_text && (
                                                                <span className="text-xs text-gray-600 border px-1.5 py-0.5 rounded bg-gray-50 mt-1 max-w-[250px] truncate">
                                                                    Copied: {log.meta_data.copied_text}
                                                                </span>
                                                            )}
                                                            {log.meta_data?.pasted_text && (
                                                                <span className="text-xs text-gray-600 border px-1.5 py-0.5 rounded bg-gray-50 mt-1 max-w-[250px] truncate">
                                                                    Pasted: {log.meta_data.pasted_text}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                            {(activity.navigation_activities?.length === 0 && activity.proctoring_activities?.length === 0) && (
                                                <div className="text-gray-400 italic py-2 text-center text-xs">No specific events recorded for this question.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* General Events  and Snapshots wrapper */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Events */}
                <Card>
                    <CardHeader>
                        <CardTitle>General Session Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                            {(() => {
                                const allEvents: ProctoringEvent[] = [
                                    ...(submission.proctoring_events || []),
                                    ...(submission.general_events || [])
                                ];

                                if (submission.question_activities) {
                                    submission.question_activities.forEach(qActivity => {
                                        if (qActivity.proctoring_activities && Array.isArray(qActivity.proctoring_activities)) {
                                            allEvents.push(...qActivity.proctoring_activities);
                                        }
                                        if (qActivity.navigation_activities && Array.isArray(qActivity.navigation_activities)) {
                                            allEvents.push(...qActivity.navigation_activities);
                                        }
                                    });
                                }

                                const filteredEvents = allEvents
                                    .filter(event => !['snapshot', 'camera_enabled', 'camera_disabled'].includes(event.activity_type))
                                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                                if (filteredEvents.length === 0) {
                                    return <div className="text-gray-400 italic py-4 text-center text-sm">No general events recorded.</div>;
                                }

                                return filteredEvents.map((event, i) => (
                                    <div key={i} className={`flex justify-between items-start p-3 rounded-md border ${
                                        (event.activity_type.includes('violation') || event.activity_type.includes('detected') || event.activity_type === 'tab_switched' || event.activity_type === 'window_focus_lost' || event.activity_type === 'devtools_opened') 
                                        ? 'bg-red-50 border-red-100 text-red-700' 
                                        : 'bg-gray-50 border-gray-100 text-gray-700'
                                        }`}>
                                        <span className="font-semibold text-sm capitalize">{event.activity_type.replace(/_/g, ' ')}</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-gray-400">{format(new Date(event.timestamp), 'h:mm:ss a')}</span>
                                            {event.meta_data?.platform && (
                                                <span className="text-xs text-red-500 border border-red-200 px-1.5 py-0.5 rounded bg-red-50 mt-1">
                                                    Platform: {event.meta_data.platform}
                                                </span>
                                            )}
                                            {event.meta_data?.copied_text && (
                                                <span className="text-[11px] text-gray-600 border px-1.5 py-0.5 rounded bg-white mt-1 max-w-[180px] truncate">
                                                    Copied: {event.meta_data.copied_text}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </CardContent>
                </Card>

                {/* Proctoring Snapshots */}
                <Card>
                    <CardHeader>
                        <CardTitle>Proctoring Snapshots</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {(() => {
                                const allSnapshots: ProctoringEvent[] = [
                                    ...(submission.proctoring_events || []),
                                    ...(submission.general_events || [])
                                ];

                                if (submission.question_activities) {
                                    submission.question_activities.forEach(qActivity => {
                                        if (qActivity.camera_snapshots && Array.isArray(qActivity.camera_snapshots)) {
                                            allSnapshots.push(...qActivity.camera_snapshots);
                                        }
                                    });
                                }

                                const snapshotsToRender = allSnapshots
                                    .filter(e => e.image_path || (e.activity_type === 'snapshot' && e.image_path))
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                                if (snapshotsToRender.length === 0) {
                                    return <div className="col-span-full text-center py-12 text-gray-400 text-sm italic border-2 border-dashed rounded-lg">No proctoring snapshots available.</div>;
                                }

                                return snapshotsToRender.map((event, i) => {
                                    const imgUrl = getImageUrl(event.image_path);
                                    return (
                                        <div key={`snap-${i}`} className="group relative border border-gray-200 rounded-lg overflow-hidden cursor-pointer bg-black shadow-sm transition-all hover:shadow-md">
                                            <div className="aspect-video bg-gray-900 flex items-center justify-center">
                                                <img
                                                    src={imgUrl}
                                                    alt={`Snapshot ${i + 1}`}
                                                    className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => window.open(imgUrl, '_blank')}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Camera+Error';
                                                    }}
                                                />
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] p-2 leading-none">
                                                {format(new Date(event.timestamp), 'h:mm:ss a')}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProctoringSessionViewer;
