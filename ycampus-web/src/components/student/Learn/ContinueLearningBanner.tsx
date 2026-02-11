import React from "react";
import { Link } from "react-router-dom";
import { Flame, ArrowRight, BookOpen } from "lucide-react";
import type { ContinueProgress } from "../Learn/types";

interface Props {
    continueProgress: ContinueProgress;
}

const ContinueLearningBanner: React.FC<Props> = ({ continueProgress }) => {
    const hasProgress = continueProgress.subject_id && continueProgress.total_lessons > 0;
    const progressPercent = Math.max(0, Math.min(100, continueProgress.percent || 0));

    if (!hasProgress) {
        // "Start New" State
        return (
            <div className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-teal-100 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-teal-900 flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                            Start Your Journey
                        </h3>
                        <p className="text-teal-700 text-sm">
                            Explore our subjects and start building your career today.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // "Continue" State
    return (
        <Link
            to={`/student/learn/${continueProgress.subject_id}`}
            className="group block w-full relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm hover:shadow-md transition-all duration-300"
        >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-blue-50/80 to-transparent pointer-events-none" />

            <div className="relative z-10 p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Info */}
                <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2 text-blue-900">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600">
                            <BookOpen className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600/80">Pick where you left off</span>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-gray-900 truncate pr-4">
                            {continueProgress.subject_name || "Subject"}
                        </h3>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-gray-500">
                            <span>Lesson {continueProgress.lesson} of {continueProgress.total_lessons}</span>
                            <span className="text-blue-600">{progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 group-hover:brightness-110"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Action Indicator */}
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
                        <ArrowRight className="w-6 h-6" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ContinueLearningBanner;
