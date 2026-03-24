import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockInterviewService } from '@/services/mockInterviewService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import RoleSidebar from '@/components/common/RoleSidebar';
import PageHeader from '@/components/common/PageHeader';
import { Eye, Clock, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MockInterviewAnalytics() {
    const { mockInterviewId } = useParams<{ mockInterviewId: string }>();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [mockInterview, setMockInterview] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const fetchedRef = React.useRef(false);

    useEffect(() => {
        if (mockInterviewId && !fetchedRef.current) {
            fetchedRef.current = true;
            fetchData(mockInterviewId);
        }
    }, [mockInterviewId]);

    const fetchData = async (id: string) => {
        try {
            setLoading(true);
            const [interviewData, submissionsData] = await Promise.all([
                mockInterviewService.getMockInterview(id),
                mockInterviewService.getMockInterviewSubmissions(id)
            ]);
            setMockInterview(interviewData);
            setSubmissions(submissionsData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'started': return 'bg-blue-100 text-blue-700';
            case 'abandoned': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const calculateScoreColor = (score?: number) => {
        if (score === undefined || score === null) return 'text-gray-500';
        if (score >= 80) return 'text-emerald-600 font-bold';
        if (score >= 60) return 'text-amber-600 font-bold';
        return 'text-rose-600 font-bold';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <PageHeader
                            title={mockInterview?.title || 'Mock Interview Analytics'}
                            subtitle="View participant submissions and performance"
                            actions={
                                <button
                                    onClick={() => navigate('/admin/mock-interview')}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                                >
                                    ← Back to Interviews
                                </button>
                            }
                        />

                        <div className="mt-6">
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card>
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                            <CheckCircle className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Total Participants</p>
                                            <h3 className="text-2xl font-bold text-gray-900">{submissions.length}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border border-gray-200 shadow-sm">
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-gray-200">
                                                <TableHead className="text-left font-semibold text-gray-900">Candidate</TableHead>
                                                <TableHead className="text-left font-semibold text-gray-900">Status</TableHead>
                                                <TableHead className="text-left font-semibold text-gray-900">AI Score</TableHead>
                                                <TableHead className="text-left font-semibold text-gray-900">Duration</TableHead>
                                                <TableHead className="text-left font-semibold text-gray-900">Date</TableHead>
                                                <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : submissions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                        No submissions found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                submissions.map((sub) => (
                                                    <TableRow key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <TableCell>
                                                            <div className="font-medium text-gray-900">{sub.user_name || 'Unknown'}</div>
                                                            <div className="text-xs text-gray-500">{sub.user_email}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={getStatusColor(sub.status)} variant="outline">
                                                                {sub.status.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={calculateScoreColor(sub.report_summary?.overall_score)}>
                                                                {sub.report_summary?.overall_score !== undefined
                                                                    ? `${Math.round(sub.report_summary.overall_score)}%`
                                                                    : '-'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {sub.actual_duration_display || '-'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {sub.created_at ? format(new Date(sub.created_at), 'MMM d, yyyy') : '-'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <button
                                                                onClick={() => {
                                                                    if (sub.interview_session_id) {
                                                                        navigate(`/admin/mock-interview/reports/${sub.interview_session_id}`);
                                                                    } else {
                                                                        toast.error('Report details not available');
                                                                    }
                                                                }}
                                                                disabled={!sub.interview_session_id}
                                                                className={`p-2 rounded-md transition-colors ${sub.interview_session_id
                                                                    ? 'text-blue-600 hover:bg-blue-50'
                                                                    : 'text-gray-300 cursor-not-allowed'
                                                                    }`}
                                                                title="View Report"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
