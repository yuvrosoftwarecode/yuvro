import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSkillTestSubmissions, getSkillTestSubmission, SkillTest } from '@/services/skillTestService';
import skillTestService from '@/services/skillTestService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { Eye, Clock, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SkillTestSubmissions() {
    const { skillTestId } = useParams<{ skillTestId: string }>();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [skillTest, setSkillTest] = useState<SkillTest | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (skillTestId) {
            fetchData(skillTestId);
        }
    }, [skillTestId]);

    const fetchData = async (id: string) => {
        try {
            setLoading(true);
            const [testData, submissionsData] = await Promise.all([
                skillTestService.getSkillTest(id),
                skillTestService.getSkillTestSubmissions(id)
            ]);
            setSkillTest(testData);
            setSubmissions(submissionsData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'submitted': return 'bg-blue-100 text-blue-700';
            case 'in_progress': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
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
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title={skillTest?.title || 'Skill Test Analytics'}
                        subtitle="View participant submissions and performance"
                        actions={
                            <button
                                onClick={() => navigate('/instructor/skill-tests')}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                            >
                                ← Back to Tests
                            </button>
                        }
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                                                        <Badge className={getStatusColor(sub.status)} variant="outline">
                                                            {sub.status.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {sub.marks !== null ? `${sub.marks} / ${skillTest?.total_marks}` : '-'}
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
                                                        <button
                                                            onClick={() => navigate(`/instructor/skill-tests/submissions/${sub.id}`)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                            title="View Details"
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
    );
}
