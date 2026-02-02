import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Trophy } from 'lucide-react';
import { TOPIC_CATEGORY_LABELS, TOPIC_CATEGORY_GRADIENTS } from '@/lib/instructorConstants';

interface Course {
    id: string | number;
    name: string;
    category: string;
    short_code?: string;
}

interface InstructorCourseCardProps {
    course: Course;
    onClick: () => void;
    actionLabel?: string;
    statsLabel?: string;
    statsCount?: number | string;
}

const InstructorCourseCard: React.FC<InstructorCourseCardProps> = ({
    course,
    onClick,
    actionLabel = "Select",
    statsLabel = "Items",
    statsCount
}) => {
    const categoryLabel = TOPIC_CATEGORY_LABELS[course.category] || course.category;
    const gradientClass = TOPIC_CATEGORY_GRADIENTS[course.category] || "from-gray-900 to-gray-700";

    return (
        <Card
            className="group relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-gray-300 bg-white rounded-xl cursor-pointer"
            onClick={onClick}
        >
            <CardContent className="p-0">
                {/* Header with gradient */}
                <div className={`bg-gradient-to-r ${gradientClass} p-4 text-white relative overflow-hidden`}>
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
                                    {categoryLabel}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg leading-tight mb-2 text-white">
                                {course.name}
                            </h3>
                        </div>

                        {course.short_code && (
                            <div className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">
                                <span className="text-xs font-bold text-white">
                                    {course.short_code}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>{statsCount !== undefined ? `${statsCount} ${statsLabel}` : statsLabel}</span>
                        </div>
                        <div className="text-blue-600 font-semibold text-sm">
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

export default InstructorCourseCard;
