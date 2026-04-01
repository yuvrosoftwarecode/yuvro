import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockInterviewService } from '@/services/mockInterviewService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Eye, Clock, Calendar, CheckCircle, Search, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface InterviewSession {
    id: string;
    role_title: string;
    role_level: string;
    difficulty: string;
    duration_minutes: number;
    actual_duration?: string;
    status: string;
    created_at: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
    report?: {
        overall_score: number;
    }
}

export default function MockInterviewReports() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<InterviewSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const data = await mockInterviewService.getAllInterviewSessions();
            if (Array.isArray(data)) {
                const mapped = data.map((item: any) => ({
                    ...item,
                    user: item.user_details || { id: '', username: 'Unknown', email: '' }
                }));
                // Sort by date
                const sorted = mapped.sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setSessions(sorted);
            }
        } catch (error) {
            console.error('Failed to fetch interview sessions:', error);
            toast.error('Failed to load interview reports');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'started': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'abandoned': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-white text-gray-700';
        }
    };

    const calculateScoreColor = (score?: number) => {
        if (score === undefined || score === null) return 'text-gray-500';
        if (score >= 80) return 'text-emerald-600 font-bold';
        if (score >= 60) return 'text-amber-600 font-bold';
        return 'text-rose-600 font-bold';
    };

    const filteredSessions = sessions.filter(session => {
        const query = searchQuery.toLowerCase();
        return (
            (session.user?.username || '').toLowerCase().includes(query) ||
            (session.user?.email || '').toLowerCase().includes(query) ||
            (session.role_title || '').toLowerCase().includes(query)
        );
    });

    return (
        
            <SidebarProvider>
<div className="flex min-h-screen bg-gray-50/50 w-full overflow-hidden">
                <AdminSidebar />
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Mock Interview Reports</h1>
                                <p className="text-muted-foreground">View and analyze all student mock interview sessions</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="border shadow-sm">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                            <Bot className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                                            <h3 className="text-2xl font-bold text-gray-900">{sessions.length}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border shadow-sm">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                                            <CheckCircle className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Completed Interviews</p>
                                            <h3 className="text-2xl font-bold text-gray-900">
                                                {sessions.filter(s => s.status === 'completed').length}
                                            </h3>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="mb-6">
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by student or role..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <Card className="border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-0">
                                    <Table>
                                        <TableHeader className="bg-white">
                                            <TableRow className="border-b border-gray-200">
                                                <TableHead className="font-semibold text-gray-900">Candidate</TableHead>
                                                <TableHead className="font-semibold text-gray-900">Role & Level</TableHead>
                                                <TableHead className="font-semibold text-gray-900">Status</TableHead>
                                                <TableHead className="font-semibold text-gray-900">AI Score</TableHead>
                                                <TableHead className="font-semibold text-gray-900">Duration</TableHead>
                                                <TableHead className="font-semibold text-gray-900">Date</TableHead>
                                                <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-12">
                                                        <div className="flex justify-center items-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredSessions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                                                        No interview sessions found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredSessions.map((session) => (
                                                    <TableRow key={session.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                                    {session.user?.username?.charAt(0).toUpperCase() || 'U'}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-gray-900">{session.user?.username || 'Unknown'}</div>
                                                                    <div className="text-xs text-gray-500">{session.user?.email}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium text-gray-900">{session.role_title}</div>
                                                            <div className="text-xs text-gray-500">{session.role_level} • {session.difficulty}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={getStatusColor(session.status)} variant="outline">
                                                                {session.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={calculateScoreColor(session.report?.overall_score)}>
                                                                {session.report?.overall_score ? `${Math.round(session.report.overall_score)}%` : '-'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {session.actual_duration || `${session.duration_minutes}m`}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm text-gray-600">
                                                                {format(new Date(session.created_at), 'MMM d, yyyy')}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                {format(new Date(session.created_at), 'h:mm a')}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <button
                                                                onClick={() => navigate(`/admin/mock-interview/reports/${session.id}`)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                                title="View Report"
                                                                disabled={session.status !== 'completed'}
                                                            >
                                                                <Eye className={`h-4 w-4 ${session.status !== 'completed' ? 'text-gray-300' : ''}`} />
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </SidebarProvider>
    );
}
