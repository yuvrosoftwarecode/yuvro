import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProgressCircleWidgetProps {
  title?: string;
  totalSolved: number;
  totalQuestions: number;
  progressPercent?: number; // direct percent from server (0-100)
  onNext?: () => void;
  onPrev?: () => void;
  canNext?: boolean;
  canPrev?: boolean;
}

const ProgressCircleWidget: React.FC<ProgressCircleWidgetProps> = ({
  title = "DSA Topics",
  totalSolved,
  totalQuestions,
  progressPercent,
  onNext,
  onPrev,
  canNext = false,
  canPrev = false
}) => {
  const circumference = 2 * Math.PI * 40;
  const progress = progressPercent != null
    ? Math.min(progressPercent, 100)
    : totalQuestions > 0 ? (totalSolved / totalQuestions) * 100 : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="px-4 pb-5 pt-2">
      {/* Course Selector */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
            canPrev
              ? 'border-border/50 bg-muted/30 hover:bg-muted/60 text-gray-500'
              : 'border-border/20 bg-muted/10 text-gray-200 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 text-center py-2.5 px-3 rounded-xl border border-border/40 bg-muted/20">
          <span className="text-[11px] font-semibold text-gray-800 leading-tight truncate block">{title}</span>
        </div>

        <button
          onClick={onNext}
          disabled={!canNext}
          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
            canNext
              ? 'border-border/50 bg-muted/30 hover:bg-muted/60 text-gray-500'
              : 'border-border/20 bg-muted/10 text-gray-200 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Ring + Info */}
      <div className="flex items-center gap-5">
        {/* Circular Progress Ring */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              cx="48" cy="48" r="40"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
              opacity="0.5"
            />
            {/* Progress Arc */}
            <circle
              cx="48" cy="48" r="40"
              stroke="url(#ringGrad)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-gray-900 leading-none">{Math.round(progress)}%</span>
            <span className="text-[10px] text-gray-400 mt-0.5">{totalSolved} / {totalQuestions} topics</span>
          </div>
        </div>

        {/* Info Right */}
        <div className="space-y-3 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-saffron" />
              <span className="text-[11px] text-gray-400 font-medium">Topics done</span>
            </div>
            <p className="text-sm font-bold text-gray-900 ml-4">
              {totalSolved} <span className="text-xs font-normal text-gray-400">/ {totalQuestions}</span>
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-gray-400 font-medium">Next target</span>
            </div>
            <p className="text-[11px] font-semibold text-saffron ml-4 truncate">
              {totalSolved < totalQuestions ? 'Next module available' : 'Module completed! 🎉'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressCircleWidget;
