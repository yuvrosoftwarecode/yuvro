import React from 'react';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { Eye, Clock, Calendar, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column } from '@/components/common/DataTable';

interface Submission {
    id: string;
    user: string;
    user_name: string;
    user_email?: string;
    status: string;
    marks?: number;
    started_at: string;
    submitted_at?: string;
    completed_at?: string;
    proctoring_events?: any[];
}

interface CandidatesTableProps {
    submissions: Submission[];
    onViewDetails: (id: string) => void;
    onViewAnalytics?: (userId: string) => void;
    showProctoring?: boolean;
}

export default function CandidatesTable({
    submissions,
    onViewDetails,
    onViewAnalytics,
    showProctoring = true,
}: CandidatesTableProps) {

    const calculateDuration = (start?: string, end?: string) => {
        if (!start || !end) return '-';
        // Use completed_at if submitted_at is missing (common in skill tests)
        const endTimeStr = end;

        if (!endTimeStr) return '-';

        const startTime = new Date(start).getTime();
        const endTime = new Date(endTimeStr).getTime();

        if (isNaN(startTime) || isNaN(endTime)) return '-';

        const diff = Math.max(0, Math.floor((endTime - startTime) / 60000));
        return `${diff} min`;
    };

    const getProctoringWarning = (events?: any[]) => {
        if (!events || events.length === 0) return 0;
        return events.filter((event) =>
            !['snapshot', 'camera_enabled', 'camera_disabled'].includes(event.activity_type)
        ).length;
    };

    const columns: Column<Submission>[] = [
        {
            header: 'Candidate',
            cell: (sub) => (
                <div>
                    <div className="font-medium text-gray-900">{sub.user_name}</div>
                    {sub.user_email && <div className="text-xs text-gray-500">{sub.user_email}</div>}
                </div>
            )
        },
        {
            header: 'Status',
            cell: (sub) => <StatusBadge status={sub.status} />
        },
        {
            header: 'Score',
            className: 'font-medium',
            cell: (sub) => (sub.marks !== null && sub.marks !== undefined ? sub.marks : '-')
        },
        {
            header: 'Time Taken',
            cell: (sub) => {
                const submittedDate = sub.submitted_at || sub.completed_at;
                return (
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {calculateDuration(sub.started_at, submittedDate)}
                    </div>
                );
            }
        },
        // Conditionally add Proctoring column if enabled
        ...(showProctoring ? [{
            header: 'Proctoring',
            cell: (sub: Submission) => {
                const warningCount = getProctoringWarning(sub.proctoring_events);
                return warningCount > 0 ? (
                    <Badge className="bg-red-100 text-red-700 border border-red-200">
                        Warning ({warningCount})
                    </Badge>
                ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Clean
                    </Badge>
                );
            }
        }] : []),
        {
            header: 'Submitted At',
            cell: (sub) => {
                const submittedDate = sub.submitted_at || sub.completed_at;
                return (
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                        <Calendar className="h-3.5 w-3.5" />
                        {submittedDate ? format(new Date(submittedDate), 'MMM d, yyyy h:mm a') : '-'}
                    </div>
                );
            }
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (sub) => (
                <div className="flex justify-end gap-2">
                    {onViewAnalytics && (
                        <button
                            onClick={() => onViewAnalytics(sub.user)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                            title="View Analytics"
                        >
                            <BarChart3 className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onViewDetails(sub.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="View Details"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <DataTable
            data={submissions}
            columns={columns}
            keyExtractor={(sub) => sub.id}
            emptyState={{
                message: "No submissions found.",
                subMessage: "Candidates submissions will appear here once they start the assessment."
            }}
        />
    );
}
