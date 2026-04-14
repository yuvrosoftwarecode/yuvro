import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, AlertTriangle, UserCheck } from 'lucide-react';

interface AnalyticsStatsProps {
    uniqueCandidates?: number;
    registeredCount: number;
    attemptedCount: number;
    completedCount: number;
    showRegistered?: boolean;
}

const StatsCard = ({ label, value, icon: Icon, colorClass }: any) => (
  <Card className="border-border bg-card">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

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
                    colorClass="bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                />
            )}

            {uniqueCandidates !== undefined && (
                <StatsCard
                    label="Unique Candidates"
                    value={uniqueCandidates}
                    icon={UserCheck}
                    colorClass="bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
                />
            )}

            <StatsCard
                label="Total Attempts"
                value={attemptedCount}
                icon={CheckCircle}
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
            />

            <StatsCard
                label="Completion Rate"
                value={`${completionRate}%`}
                icon={AlertTriangle}
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
            />
        </div>
    );
}
