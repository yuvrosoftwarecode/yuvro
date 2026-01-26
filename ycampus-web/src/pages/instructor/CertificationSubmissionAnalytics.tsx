import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCertificationSubmission } from '@/services/certificationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { Clock, AlertTriangle, CheckCircle, XCircle, Code, List } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CertificationSubmissionAnalytics() {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (submissionId) {
            fetchSubmission(submissionId);
        }
    }, [submissionId]);

    const fetchSubmission = async (id: string) => {
        try {
            setLoading(true);
            const data = await getCertificationSubmission(id);
            setSubmission(data);
        } catch (error) {
            console.error('Failed to fetch submission:', error);
            toast.error('Failed to load submission details');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !submission) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Calculate stats
    const totalViolations = (submission.proctoring_events?.filter((e: any) => !['snapshot', 'camera_enabled', 'camera_disabled'].includes(e.activity_type)).length || 0) +
        (submission.question_activities?.reduce((acc: number, q: any) => acc + (q.violation_count || 0), 0) || 0);

    const questionActivities = submission.question_activities || [];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title={`${submission.user_name} - Analytics`}
                        subtitle={submission.exam_title}
                        actions={
                            <button
                                onClick={() => navigate(-1)}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                            >
                                ← Back
                            </button>
                        }
                    />

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
                                        questionActivities.map((activity: any, index: number) => (
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

                                                {/* Granular Logs */}
                                                <div className="mt-4 bg-gray-50 rounded-md p-3 text-sm">
                                                    <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                        <List className="h-4 w-4" /> Activity Log
                                                    </h5>
                                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                                        {/* Merge and sort navigation & proctoring activities */}
                                                        {[...(activity.navigation_activities || []), ...(activity.proctoring_activities || [])]
                                                            .filter((log: any) => !['snapshot', 'camera_enabled', 'camera_disabled'].includes(log.activity_type))
                                                            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                                            .map((log: any, i: number) => (
                                                                <div key={i} className={`flex items-center justify-between py-1 px-2 rounded ${log.activity_type.includes('violation') || log.activity_type.includes('detected') ? 'bg-red-50 text-red-700' : 'text-gray-600'
                                                                    }`}>
                                                                    <span>{log.activity_type.replace(/_/g, ' ')}</span>
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-xs text-gray-400">{format(new Date(log.timestamp), 'h:mm:ss a')}</span>
                                                                        {log.meta_data && (log.meta_data.copied_text || log.meta_data.pasted_text || log.meta_data.cut_text) && (
                                                                            <span className="text-xs text-gray-500 italic max-w-xs truncate">
                                                                                "{log.meta_data.copied_text || log.meta_data.pasted_text || log.meta_data.cut_text}"
                                                                            </span>
                                                                        )}
                                                                        {log.meta_data && log.meta_data.key && (
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

                        {/* General Events (Submission Level) */}
                        <Card>
                            <CardHeader>
                                <CardTitle>General Session Events</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {([...(submission.proctoring_events || []), ...(submission.general_events || [])]
                                        .filter((event: any) => !['snapshot', 'camera_enabled', 'camera_disabled'].includes(event.activity_type))
                                        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                        .map((event: any, i: number) => (
                                            <div key={i} className={`flex justify-between items-center p-2 border-b last:border-0 ${event.activity_type.includes('violation') || event.activity_type.includes('detected') ? 'bg-red-50 text-red-700' : 'text-gray-700'
                                                }`}>
                                                <span className="font-medium">{event.activity_type.replace(/_/g, ' ')}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm text-gray-400">{format(new Date(event.timestamp), 'h:mm:ss a')}</span>
                                                    {event.meta_data && (event.meta_data.copied_text || event.meta_data.pasted_text || event.meta_data.cut_text) && (
                                                        <span className="text-xs text-gray-500 italic max-w-[200px] truncate">
                                                            "{event.meta_data.copied_text || event.meta_data.pasted_text || event.meta_data.cut_text}"
                                                        </span>
                                                    )}
                                                    {event.meta_data && event.meta_data.key && (
                                                        <span className="text-xs text-gray-500 border px-1 rounded bg-gray-100">
                                                            {event.meta_data.key}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {(submission.proctoring_events || []).length === 0 && (submission.general_events || []).length === 0 && (
                                        <div className="text-center py-4 text-gray-500 italic">No general session events recorded.</div>
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
                                    {/* Combine all events that might have images */
                                        (() => {
                                            const allSnapshots = [
                                                ...(submission.proctoring_events || []),
                                                ...(submission.general_events || [])
                                            ];

                                            if (submission.question_activities) {
                                                submission.question_activities.forEach((qActivity: any) => {
                                                    if (qActivity.camera_snapshots && Array.isArray(qActivity.camera_snapshots)) {
                                                        allSnapshots.push(...qActivity.camera_snapshots);
                                                    }
                                                });
                                            }

                                            const snapshotsToRender = allSnapshots
                                                .filter((e: any) => e.image_path || (e.activity_type === 'snapshot' && e.image_path))
                                                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort newest first

                                            if (snapshotsToRender.length === 0) {
                                                return (
                                                    <div className="col-span-full text-center py-8 text-gray-500 italic">
                                                        No proctoring snapshots available.
                                                    </div>
                                                );
                                            }

                                            return snapshotsToRender.map((event: any, i: number) => {
                                                // Construct URL
                                                // If path starts with uploads/, prepend API base URL + /media/ (or just match serve logic)
                                                // Our settings serve /media/ mapped to uploads/
                                                let imgUrl = event.image_path;
                                                if (imgUrl && !imgUrl.startsWith('http')) {
                                                    // Normalize backslashes
                                                    let cleanPath = imgUrl.replace(/\\/g, '/');

                                                    // Remove inputs/uploads prefix if it matches MEDIA_ROOT pattern
                                                    if (cleanPath.startsWith('uploads/')) {
                                                        cleanPath = cleanPath.substring('uploads/'.length);
                                                    } else if (cleanPath.startsWith('/uploads/')) {
                                                        cleanPath = cleanPath.substring('/uploads/'.length);
                                                    }

                                                    // Ensure cleanPath doesn't start with /
                                                    if (cleanPath.startsWith('/')) {
                                                        cleanPath = cleanPath.substring(1);
                                                    }

                                                    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api').replace(/\/$/, '');
                                                    const rootUrl = baseUrl.replace(/\/api\/?$/, ''); // Remove /api or /api/ from end

                                                    imgUrl = `${rootUrl}/media/${cleanPath}`;
                                                }

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
                </div>
            </div>
        </div>
    );
}
