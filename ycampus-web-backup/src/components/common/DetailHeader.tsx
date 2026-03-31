import React from 'react';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { Building2, Calendar, Pencil, Clock, Users, Trophy, BarChart2, LucideIcon } from 'lucide-react';

export interface StatItem {
    label: string;
    value: string | number;
    icon: LucideIcon;
    colorClass?: string;
    iconColorClass?: string;
}

interface DetailHeaderProps {
    title: string;
    type: string;
    status: string;
    organizer: string;
    createdAt?: string;
    stats: StatItem[];
    onEdit?: () => void;
    // Optional custom classes or overrides can be added here
}

export default function DetailHeader({
    title,
    type,
    status,
    organizer,
    createdAt,
    stats,
    onEdit
}: DetailHeaderProps) {
    return (
        <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative p-8 md:p-10 z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-white hover:bg-slate-200 text-slate-700 border-slate-200">
                                {type.toUpperCase()}
                            </Badge>
                            <StatusBadge status={status} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                            {title}
                        </h1>
                        <div className="flex items-center gap-6 text-slate-500 text-sm">
                            <span className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {organizer}
                            </span>
                            {createdAt && (
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Created on {new Date(createdAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            <Pencil className="w-4 h-4" />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Stats Footer */}
            {stats.length > 0 && (
                <div className={`grid grid-cols-2 md:grid-cols-${stats.length} border-t border-slate-100 bg-white divide-x divide-slate-100`}>
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div key={index} className="p-4 flex flex-col items-center justify-center text-center group hover:bg-white transition-colors">
                                <span className="text-slate-500 text-xs uppercase tracking-wider mb-1">{stat.label}</span>
                                <span className={`text-xl font-bold flex items-center gap-2 ${stat.colorClass || 'text-slate-700'}`}>
                                    <Icon className={`w-5 h-5 ${stat.iconColorClass || 'text-slate-500'}`} />
                                    {stat.value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
