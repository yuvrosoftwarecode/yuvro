import React from 'react';
import { StatsCard } from '@/components/common/StatsCard';
import { Users, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';

interface AnalyticsStatsProps {
    uniqueCandidates?: number;
    registeredCount: number;
    attemptedCount: number;
    completedCount: number;
    showRegistered?: boolean;
}

export default function AnalyticsStats({
    uniqueCandidates,
    registeredCount,
    attemptedCount,
    completedCount,
    showRegistered = true,
}: AnalyticsStatsProps) {

    const completionRate = attemptedCount > 0
        ? Math.round((completedCount / attemptedCount) * 100)
        : 0;

    return (
        <div className={`mb-6 grid grid-cols-1 md:grid-cols-${showRegistered ? '4' : '3'} gap-6`}>
            {showRegistered && (
                <StatsCard
                    label="Total Registered"
                    value={registeredCount}
                    icon={Users}
                    colorScheme="blue"
                />
            )}

            {uniqueCandidates !== undefined && (
                <StatsCard
                    label="Unique Candidates"
                    value={uniqueCandidates}
                    icon={UserCheck}
                    colorScheme="purple"
                />
            )}

            <StatsCard
                label="Total Attempts"
                value={attemptedCount}
                icon={CheckCircle}
                colorScheme="green"
            />

            <StatsCard
                label="Completion Rate"
                value={`${completionRate}%`}
                icon={AlertTriangle}
                colorScheme="amber"
            />
        </div>
    );
}
