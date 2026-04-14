import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock, Calendar, BarChart3, Users, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Simplified DataTable embedded for CandidatesTable specific to Practice Tests
interface Submission {
    id: string;
    user: string;
    user_name: string;
    user_email?: string;
    status?: string;
    marks?: number;
    score?: number;
    started_at?: string;
    submitted_at?: string;
    completed_at?: string;
    created_at?: string;
    time_spent?: number;
    proctoring_events?: any[];
    total_violations?: number;
}

interface CandidatesTableProps {
    submissions: Submission[];
    onViewDetails: (id: string, submission: Submission) => void;
    onViewAnalytics?: (userId: string) => void;
    showProctoring?: boolean;
    loading?: boolean;
}

export default function CandidatesTable({
    submissions,
    onViewDetails,
    onViewAnalytics,
    showProctoring = true,
    loading = false,
}: CandidatesTableProps) {
    
    // Status Badge generator
    const getStatusBadge = (status?: string) => {
        return (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-xs">
                {status || 'Submitted'}
            </Badge>
        );
    };

    const calculateDuration = (sub: Submission) => {
        // 1. Prefer backend calculated time_spent if available
        if (sub.time_spent !== undefined && sub.time_spent !== null) {
            const mins = Math.max(1, Math.ceil(sub.time_spent / 60));
            return `${mins} min`;
        }

        const start = sub.started_at;
        const end = sub.submitted_at || sub.completed_at;

        if (!start || !end) return '-';
        
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        
        if (isNaN(startTime) || isNaN(endTime)) return '-';
        
        // Use Math.ceil so that even a few seconds show as 1 min instead of 0
        const diff = Math.max(1, Math.ceil((endTime - startTime) / 60000));
        return `${diff} min`;
    };

    const getProctoringWarning = (events?: any[]) => {
        if (!events || events.length === 0) return 0;
        return events.filter((event) =>
            !['snapshot', 'camera_enabled', 'camera_disabled', 'periodic_snapshot'].includes(event.activity_type)
        ).length;
    };

    return (
        <Card className="border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Candidate Submissions
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="w-7 h-7 border-4 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : submissions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-muted border-b border-border">
                                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidate</th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Score</th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time Taken</th>
                                    {showProctoring && <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proctoring</th>}
                                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted At</th>
                                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((sub, i) => {
                                    const submittedDate = sub.submitted_at || sub.completed_at || sub.created_at;
                                    const score = sub.marks ?? sub.score ?? 0;
                                    // Use backend total_violations if available, fallback to local calc
                                    const warningCount = sub.total_violations !== undefined 
                                        ? sub.total_violations 
                                        : getProctoringWarning(sub.proctoring_events);

                                    return (
                                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="font-medium text-foreground">{sub.user_name || 'Student'}</div>
                                                {sub.user_email && <div className="text-xs text-muted-foreground">{sub.user_email}</div>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {getStatusBadge(sub.status)}
                                            </td>
                                            <td className="px-5 py-3.5 text-center font-mono font-medium text-foreground">
                                                {score}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {calculateDuration(sub)}
                                                </div>
                                            </td>
                                            {showProctoring && (
                                                <td className="px-5 py-3.5">
                                                    {warningCount > 0 ? (
                                                        <Badge className="bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400">
                                                            Warning ({warningCount})
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                            Clean
                                                        </Badge>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {submittedDate ? new Date(submittedDate).toLocaleString(undefined, {
                                                        year: 'numeric', month: 'short', day: 'numeric',
                                                        hour: 'numeric', minute: '2-digit'
                                                    }) : '-'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {onViewAnalytics && (
                                                        <button
                                                            onClick={() => onViewAnalytics(sub.user)}
                                                            className="p-1.5 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30 rounded-md transition-colors"
                                                            title="View Analytics"
                                                        >
                                                            <BarChart3 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => onViewDetails(sub.id, sub)}
                                                        className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                        title="View Detailed Results"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border bg-card text-center px-6 m-4">
                        <div className="p-3.5 bg-muted rounded-full mb-4">
                            <ClipboardList className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-medium mb-1">Nothing here yet</p>
                        <p className="text-muted-foreground text-sm">No submissions recorded yet for this test.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
