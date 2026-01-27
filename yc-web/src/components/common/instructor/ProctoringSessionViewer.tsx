import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, List } from 'lucide-react';
import { format } from 'date-fns';

interface ProctoringEvent {
    activity_type: string;
    timestamp: string;
    image_path?: string;
    meta_data?: {
        copied_text?: string;
        pasted_text?: string;
        cut_text?: string;
        key?: string;
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
    // Specific titles for different contexts
    skill_test_title?: string;
    exam_title?: string;
}

interface ProctoringSessionViewerProps {
    submission: Submission;
    title?: string;
}

const ProctoringSessionViewer: React.FC<ProctoringSessionViewerProps> = ({ submission, title }) => {
    const navigate = useNavigate();

    // Calculate total violations
    const totalViolations = (submission.proctoring_events?.filter((e: any) =>
        !['snapshot', 'camera_enabled', 'camera_disabled'].includes(e.activity_type)).length || 0) +
        (submission.question_activities?.reduce((acc: number, q: any) => acc + (q.violation_count || 0), 0) || 0);

    const questionActivities = submission.question_activities || [];

    const getImageUrl = (imgUrl: string | undefined) => {
        if (!imgUrl) return '';
        if (imgUrl.startsWith('http')) return imgUrl;

        // Path normalization logic from CertificationSubmissionAnalytics
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-gray-500">Total Score</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-2">
                            {submission.marks !== null ? submission.marks : '-'}
                        </h3>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <div className="mt-2">
                            <Badge variant="outline" className="text-lg py-1 px-3">
                                {submission.status.replace('_', ' ')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-gray-500">Total Violations</p>
                        <div className="flex items-center mt-2 gap-2 text-red-600">
                            <AlertTriangle className="h-6 w-6" />
                            <h3 className="text-3xl font-bold">{totalViolations}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-gray-500">Submitted At</p>
                        <div className="flex items-center mt-2 gap-2 text-gray-700">
                            <Clock className="h-5 w-5" />
                            <span className="text-sm font-medium">
                                {submission.submitted_at ? format(new Date(submission.submitted_at), 'MMM d, h:mm a') : '-'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
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
                                <div key={activity.id} className="border rounded-lg p-4 bg-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-900">Q{index + 1}: {activity.question_title}</span>
                                                <Badge variant="outline" className="text-xs uppercase">{activity.question_type}</Badge>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Time Spent: {Math.floor((activity.total_question_time || 0) / 60)}m {(activity.total_question_time || 0) % 60}s
                                            </div>
                                        </div>
                                        <div>
                                            {activity.is_correct ? (
                                                <Badge className="bg-green-100 text-green-700">Correct</Badge>
                                            ) : activity.is_correct === false ? (
                                                <Badge className="bg-red-100 text-red-700">Incorrect</Badge>
                                            ) : (
                                                <Badge className="bg-gray-100 text-gray-700">Ungraded</Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 bg-gray-50 rounded-md p-3 text-sm">
                                        <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <List className="h-4 w-4" /> Activity Log
                                        </h5>
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {[...(activity.navigation_activities || []), ...(activity.proctoring_activities || [])]
                                                .filter(log => !['snapshot', 'camera_enabled', 'camera_disabled'].includes(log.activity_type))
                                                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                                .map((log, i) => (
                                                    <div key={i} className={`flex items-center justify-between py-1 px-2 rounded ${log.activity_type.includes('violation') || log.activity_type.includes('detected') ? 'bg-red-50 text-red-700' : 'text-gray-600'
                                                        }`}>
                                                        <span>{log.activity_type.replace(/_/g, ' ')}</span>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs text-gray-400">{format(new Date(log.timestamp), 'h:mm:ss a')}</span>
                                                            {log.meta_data?.key && (
                                                                <span className="text-xs text-gray-500 border px-1 rounded bg-gray-100">
                                                                    {log.meta_data.key}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                            {(activity.navigation_activities?.length === 0 && activity.proctoring_activities?.length === 0) && (
                                                <div className="text-gray-400 italic">No specific events recorded for this question.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* General Events */}
            <Card>
                <CardHeader>
                    <CardTitle>General Session Events</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {([...(submission.proctoring_events || []), ...(submission.general_events || [])]
                            .filter(event => !['snapshot', 'camera_enabled', 'camera_disabled'].includes(event.activity_type))
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                            .map((event, i) => (
                                <div key={i} className={`flex justify-between items-center p-2 border-b last:border-0 ${event.activity_type.includes('violation') || event.activity_type.includes('detected') ? 'bg-red-50 text-red-700' : 'text-gray-700'
                                    }`}>
                                    <span className="font-medium">{event.activity_type.replace(/_/g, ' ')}</span>
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm text-gray-400">{format(new Date(event.timestamp), 'h:mm:ss a')}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Proctoring Snapshots */}
            <Card>
                <CardHeader>
                    <CardTitle>Proctoring Snapshots</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                                return <div className="col-span-full text-center py-8 text-gray-500 italic">No proctoring snapshots available.</div>;
                            }

                            return snapshotsToRender.map((event, i) => {
                                const imgUrl = getImageUrl(event.image_path);
                                return (
                                    <div key={`snap-${i}`} className="group relative border rounded-lg overflow-hidden cursor-pointer bg-black">
                                        <div className="aspect-video">
                                            <img
                                                src={imgUrl}
                                                alt={`Snapshot ${i + 1}`}
                                                className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                                                onClick={() => window.open(imgUrl, '_blank')}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Load+Error';
                                                }}
                                            />
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
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
    );
};

export default ProctoringSessionViewer;
