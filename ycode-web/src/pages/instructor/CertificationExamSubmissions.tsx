import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCertificationExamSubmissions, getCertificationExam, CertificationExam } from '@/services/certificationService';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/common/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/common/DashboardLayout';
import { Eye, Clock, Calendar, CheckCircle, Award } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CertificationExamSubmissions() {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [exam, setExam] = useState<CertificationExam | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (examId) {
            fetchData(examId);
        }
    }, [examId]);

    const fetchData = async (id: string) => {
        try {
            setLoading(true);
            const [examData, submissionsData] = await Promise.all([
                getCertificationExam(id),
                getCertificationExamSubmissions(id)
            ]);
            setExam(examData as CertificationExam);
            setSubmissions(submissionsData as any[]);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };



    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return '-';
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const diff = Math.floor((endTime - startTime) / 60000); // minutes
        return `${diff} min`;
    };

    return (
        <DashboardLayout
            title={exam?.title || 'Certification Analytics'}
            subtitle="View participant submissions and performance"
            actions={
                <button
                    onClick={() => navigate('/instructor/certifications')}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                    ← Back to Exams
                </button>
            }
        >
            <div className="px-6 py-6">
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
                                    <TableHead className="text-left font-semibold text-gray-900">Student</TableHead>
                                    <TableHead className="text-left font-semibold text-gray-900">Status</TableHead>
                                    <TableHead className="text-left font-semibold text-gray-900">Score</TableHead>
                                    <TableHead className="text-left font-semibold text-gray-900">Duration</TableHead>
                                    <TableHead className="text-left font-semibold text-gray-900">Submitted At</TableHead>
                                    <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {submissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No submissions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    submissions.map((sub) => (
                                        <TableRow key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <TableCell>
                                                <div className="font-medium text-gray-900">{sub.user_name}</div>
                                                <div className="text-xs text-gray-500">{sub.user_email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={sub.status} />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col gap-1">
                                                    <span>{sub.marks !== null ? `${sub.marks} / ${exam?.passing_marks || 60}` : '-'}</span>
                                                    {sub.certificate && (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] w-fit font-bold uppercase tracking-wider py-0.5">
                                                            🎓 Certified
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {calculateDuration(sub.started_at, sub.submitted_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {sub.submitted_at ? format(new Date(sub.submitted_at), 'MMM d, yyyy h:mm a') : '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {sub.certificate && (
                                                        <a
                                                            href={(() => {
                                                                const apiBase = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:8000/api';
                                                                const host = apiBase.replace(/\/api\/?$/, '');
                                                                return `${host}/api/assessment/certificates/${sub.certificate.id}/view/`;
                                                            })()}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-md transition-colors flex items-center justify-center"
                                                            title={`View Earned Certificate (${sub.certificate.display_id})`}
                                                        >
                                                            <Award className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => navigate(`/instructor/certifications/submissions/${sub.id}`)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
