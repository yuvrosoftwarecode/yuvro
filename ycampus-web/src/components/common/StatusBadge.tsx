import React from 'react';

export type StatusType =
    | 'active' | 'approved' | 'published'
    | 'draft' | 'pending' | 'under_review'
    | 'inactive' | 'closed' | 'archived' | 'expired'
    | 'rejected' | 'failed'
    | 'paused' | 'on_hold'
    | string;

interface StatusBadgeProps {
    status: StatusType;
    label?: string;
    className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = "" }) => {
    const s = status.toLowerCase();

    const getStatusStyles = (status: string) => {
        switch (status) {
            // Success / Green
            case 'active':
            case 'approved':
            case 'published':
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200';

            // Warning / Yellow / Orange
            case 'draft':
            case 'pending':
            case 'under_review':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';

            case 'paused':
            case 'on_hold':
            case 'archived':
                return 'bg-orange-100 text-orange-700 border-orange-200';

            // Error / Red
            case 'rejected':
            case 'failed':
            case 'expired':
                return 'bg-red-100 text-red-700 border-red-200';

            // Neutral / Gray
            case 'inactive':
            case 'closed':
            case 'hidden':
                return 'bg-gray-100 text-gray-700 border-gray-200';

            // Special color for SkillTest draft if we want to keep blue (it's often used for "in progress")
            // but for standardization sticking to yellow/orange for draft is better.
            // If we really want blue:
            case 'blue_draft':
                return 'bg-blue-100 text-blue-700 border-blue-200';

            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const displayLabel = label || status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1);

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyles(s)} ${className}`}>
            {displayLabel}
        </span>
    );
};

export default StatusBadge;
