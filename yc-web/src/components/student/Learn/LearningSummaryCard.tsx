import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, BarChart, ArrowRight, BookOpen } from 'lucide-react';
import type { Stats, ContinueProgress } from '../Learn/types';
import { getCourseIconConfig } from "@/utils/CourseIcons";

interface LearningSummaryCardProps {
    stats: Stats;
    lastActivity?: ContinueProgress;
}

const LearningSummaryCard: React.FC<LearningSummaryCardProps> = ({ stats, lastActivity }) => {

    const getLessonMsg = (count: number) => {
        if (count === 0) return "Start your first lesson today 🚀";
        return "You're making great progress! 🌟";
    };

    const getTimeMsg = (time: string) => {
        if (time === "0m" || time === "0h") return "Invest time in yourself ⏰";
        return "Consistency is key! 🔥";
    };

    const getAvgMsg = (avg: number) => {
        if (avg === 0) return "Every expert starts somewhere 🌱";
        if (avg < 50) return "Keep going to boost your score 📈";
        return "You are doing amazing! 🌈";
    };

    // Helper for "Continue Learning" section
    const renderContinueLearning = () => {
        if (!lastActivity || !lastActivity.course_id || lastActivity.total_lessons === 0) {
            return (
                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Start learning a new skill</p>
                        <p className="text-xs text-gray-500">Explore our library to get started.</p>
                    </div>
                </div>
            );
        }

        const { Icon, bg } = getCourseIconConfig(lastActivity.course_name || "");
        const progressPercent = Math.max(0, Math.min(100, lastActivity.percent || 0));

        return (
            <div className="mt-2 pt-2 border-t border-gray-100">
                <Link
                    to={`/student/learn/${lastActivity.course_id}`}
                    className="group block w-full relative overflow-hidden rounded-xl bg-blue-50/30 hover:bg-blue-50 transition-all duration-200"
                >
                    <div className="p-2.5">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className={`flex items-center justify-center w-6 h-6 rounded-md ${bg.replace('600', '100').replace('500', '100')} ${bg.replace('bg-', 'text-').replace('100', '600')}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 group-hover:text-gray-700 transition-colors">Pick where you left off</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 truncate mb-1.5 group-hover:text-blue-600 transition-colors">
                                    {lastActivity.course_name}
                                </h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-medium text-gray-500">
                                        <span>Lesson {lastActivity.lesson}/{lastActivity.total_lessons}</span>
                                        <span className="text-gray-700">{progressPercent}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-300 group-hover:bg-blue-500"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-md flex flex-col justify-between h-full hover:shadow-lg transition-all duration-300">
            <div>
                <div className="flex justify-between items-end mb-1.5">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Learning Summary</h3>
                    </div>
                </div>

                {/* Inline Metrics Row */}
                <div className="grid grid-cols-3 gap-6 py-1">
                    <div className="text-left group p-2 rounded-lg hover:bg-gray-50 transition-colors -ml-2">
                        <div className="flex items-center justify-start gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lessons</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">{stats.lessons_completed}</p>
                        <p className="text-xs text-gray-400 font-medium">
                            {getLessonMsg(stats.lessons_completed)}
                        </p>
                    </div>
                    <div className="text-left group p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-start gap-2 mb-1">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">{stats.time_spent}</p>
                        <p className="text-xs text-gray-400 font-medium">
                            {getTimeMsg(stats.time_spent)}
                        </p>
                    </div>
                    <div className="text-left group p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-start gap-2 mb-1">
                            <BarChart className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">{stats.avg_progress}%</p>
                        <p className="text-xs text-gray-400 font-medium">
                            {getAvgMsg(stats.avg_progress)}
                        </p>
                    </div>
                </div>
            </div>

            {/* "Pick where you left off" Section */}
            {renderContinueLearning()}
        </div>
    );
};

export default LearningSummaryCard;
