import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockInterviewService } from '@/services/mockInterviewService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import PageHeader from "@/components/common/PageHeader";
import { Eye, Clock, Calendar, CheckCircle, ArrowLeft, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function MockInterviewAnalytics() {
    const { mockInterviewId } = useParams<{ mockInterviewId: string }>();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [mockInterview, setMockInterview] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const fetchedRef = useRef(false);
    const [viewingText, setViewingText] = useState<{ title: string; text: string } | null>(null);
    const [viewingFaceChecks, setViewingFaceChecks] = useState<any[] | null>(null);

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
            default: return 'bg-white text-gray-700';
        }
    };

    const calculateScoreColor = (score?: number) => {
        if (score === undefined || score === null) return 'text-gray-500';
        if (score >= 80) return 'text-emerald-600 font-bold';
        if (score >= 60) return 'text-amber-600 font-bold';
        return 'text-rose-600 font-bold';
    };

    return (
        
            <SidebarProvider>
<div className="flex min-h-screen bg-gray-50/50 w-full overflow-hidden">
                <AdminSidebar />
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <PageHeader 
                            title={mockInterview?.title || 'Mock Interview Analytics'}
                            actions={
                                <button
                                    onClick={() => navigate('/admin/mock-interview')}
                                    className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Interviews
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
                                                <TableHead className="text-left font-semibold text-gray-900">Custom JD</TableHead>
                                                <TableHead className="text-left font-semibold text-gray-900">Custom Resume</TableHead>
                                                <TableHead className="text-left font-semibold text-gray-900">Face Checks</TableHead>
                                                <TableHead className="text-left font-semibold text-gray-900">Duration</TableHead>
                                                <TableHead className="text-left font-semibold text-gray-900">Date</TableHead>
                                                <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="text-center py-8">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : submissions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                                        No submissions found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                submissions.map((sub) => (
                                                    <TableRow key={sub.id} className="border-b border-gray-100 hover:bg-white">
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
                                                            {sub.state_data?.jd_text ? (
                                                                <button
                                                                    onClick={() => setViewingText({ title: "Custom Job Description", text: sub.state_data.jd_text })}
                                                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold underline flex items-center gap-1"
                                                                >
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                    View JD
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sub.state_data?.resume_text ? (
                                                                <button
                                                                    onClick={() => setViewingText({ title: "Custom Resume Profile", text: sub.state_data.resume_text })}
                                                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold underline flex items-center gap-1"
                                                                >
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                    View Resume
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sub.state_data?.face_enrollment ? (
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                                                                        Enrolled
                                                                    </Badge>
                                                                    {sub.state_data?.face_checks?.length > 0 ? (
                                                                        (() => {
                                                                            const warnings = sub.state_data.face_checks.filter((c: any) => c.status === 'warning').length;
                                                                            return (
                                                                                <button
                                                                                    onClick={() => setViewingFaceChecks(sub.state_data.face_checks)}
                                                                                    className={`text-xs font-semibold underline flex items-center gap-1 ${
                                                                                        warnings > 0 ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'
                                                                                    }`}
                                                                                >
                                                                                    {warnings > 0 ? (
                                                                                        <>
                                                                                            <ShieldAlert className="h-3 w-3 text-rose-500" />
                                                                                            {warnings} Flagged
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                                                                            Passed ({sub.state_data.face_checks.length})
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <span className="text-gray-400 text-[10px] italic">No verify logs</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">—</span>
                                                            )}
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

            <Dialog open={!!viewingText} onOpenChange={() => setViewingText(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{viewingText?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono">
                        {viewingText?.text || "No text available."}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewingFaceChecks} onOpenChange={() => setViewingFaceChecks(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Face Proctoring Verification Log</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                        {viewingFaceChecks && viewingFaceChecks.length > 0 ? (
                            <div className="overflow-x-auto border rounded-md">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Detected</TableHead>
                                            <TableHead>Verified</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Details/Warnings</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewingFaceChecks.map((check, idx) => (
                                            <TableRow key={idx} className={check.status === 'warning' ? 'bg-red-50 hover:bg-red-50' : ''}>
                                                <TableCell className="text-xs text-gray-500 font-mono">
                                                    {check.timestamp ? format(new Date(check.timestamp), 'HH:mm:ss (MMM d)') : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={check.face_detected ? 'secondary' : 'destructive'} className="text-xs">
                                                        {check.face_detected ? `${check.num_faces || 1} Face(s)` : 'No Face'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={check.verified ? 'secondary' : 'outline'} className="text-xs">
                                                        {check.verified === true ? 'Yes' : check.verified === false ? 'No' : 'Stub'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={check.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                        {check.status || 'success'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[200px] truncate" title={check.message || check.risk_flags?.join(', ') || 'OK'}>
                                                    {check.message || check.risk_flags?.join(', ') || 'Face matched successfully.'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No verification check logs recorded yet.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
