import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Trophy } from 'lucide-react';
import { Subject } from '@/services/subjectService';

interface AdminSubjectCardProps {
    subject: Subject;
    onClick: () => void;
    actionLabel?: string;
    statsLabel?: string;
    statsCount?: number | string;
}

const CONSTANT_GRADIENTS = [
    "from-slate-900 to-slate-700",
    "from-blue-900 to-blue-700",
    "from-indigo-900 to-indigo-700",
    "from-purple-900 to-purple-700",
    "from-teal-900 to-teal-700",
    "from-emerald-900 to-emerald-700",
    "from-orange-900 to-amber-700",
];

const AdminSubjectCard: React.FC<AdminSubjectCardProps> = ({
    subject,
    onClick,
    actionLabel = "Select",
    statsLabel = "Items",
    statsCount
}) => {
    // Pick a stable gradient based on the subject length or id
    const subjectIdStr = String(subject.id);
    const gradientIndex = (subjectIdStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % CONSTANT_GRADIENTS.length;
    const gradientClass = CONSTANT_GRADIENTS[gradientIndex];

    const subjectName = subject.subject_name || subject.name || "Untitled Subject";

    return (
        <Card
            className="group relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-gray-300 bg-white rounded-xl cursor-pointer flex flex-col h-full"
            onClick={onClick}
        >
            <CardContent className="p-0 flex flex-col h-full">
                {/* Header with gradient */}
                <div className={`bg-gradient-to-r ${gradientClass} p-4 text-white relative flex-grow`}>
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }} />
                    </div>

                    <div className="flex items-start justify-between relative z-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="h-4 w-4 text-white/70" />
                                <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                                    Subject
                                </span>
                            </div>
                            <h3 className="font-bold text-lg leading-tight mb-2 text-white line-clamp-2">
                                {subjectName}
                            </h3>
                        </div>

                        {subject.short_code && (
                            <div className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30 ml-2 shrink-0">
                                <span className="text-xs font-bold text-white">
                                    {subject.short_code}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 mt-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>{statsCount !== undefined ? `${statsCount} ${statsLabel}` : statsLabel}</span>
                        </div>
                        <div className="text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                            {actionLabel} →
                        </div>
                    </div>
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </CardContent>
        </Card>
    );
};

export default AdminSubjectCard;
