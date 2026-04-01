import React from 'react';
import { Info, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProgressCircleWidgetProps {
  title?: string;
  totalSolved: number;
  totalQuestions: number;
  onNext?: () => void;
  onPrev?: () => void;
  canNext?: boolean;
  canPrev?: boolean;
}

const ProgressCircleWidget: React.FC<ProgressCircleWidgetProps> = ({
  title = "DSA Topics",
  totalSolved,
  totalQuestions,
  onNext,
  onPrev,
  canNext = false,
  canPrev = false
}) => {
  const radius = 42;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  
  // Progress is single segment now (Topic Progress)
  const progress = totalQuestions > 0 ? (totalSolved / totalQuestions) * 100 : 0;
  const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

  return (
    <div className="pt-2 px-4 pb-4">
      {/* Header with Navigation Chevrons */}
      <div className="flex items-center justify-between mb-4 relative h-6">
        {/* Left Chevron */}
        <button 
          onClick={onPrev}
          disabled={!canPrev}
          className={`p-1 rounded-md transition-colors ${canPrev ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-900' : 'text-gray-100 cursor-not-allowed'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Centered Badge */}
        <div className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 shadow-sm grow mx-2 text-center truncate">
            <span className="text-sm font-medium text-gray-900 tracking-tighter">{title}</span>
        </div>

        {/* Right Chevron */}
        <button 
          onClick={onNext}
          disabled={!canNext}
          className={`p-1 rounded-md transition-colors ${canNext ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-900' : 'text-gray-100 cursor-not-allowed'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 py-1">
        {/* SVG Side: Left (Simplified for Topics) */}
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Base Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#F8FAFC"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            
            {/* Single Topic Progress Segment */}
            <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#6366f1"
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                style={{ 
                    transition: 'stroke-dashoffset 1s ease-out' 
                }}
                strokeLinecap="round"
                fill="transparent"
            />
          </svg>
          
          {/* Center Text (Ultra Compact) */}
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-bold text-gray-900 tracking-tighter leading-none">{totalSolved}</span>
            <div className="w-4 h-[1px] bg-gray-200 my-0.5"></div>
            <span className="text-[10px] font-medium text-gray-400 tracking-widest uppercase leading-none">{totalQuestions}</span>
          </div>
        </div>

        {/* Info Side: Right (Topic Summary) */}
        <div className="flex-1 space-y-3 pr-0.5">
          <div className="flex flex-col group">
            <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                <span className="text-[12px] font-medium text-gray-400 group-hover:text-gray-900 transition-colors tracking-tight">
                    Topics done
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-gray-900 tabular-nums">{totalSolved}</span>
                <span className="text-[11px] font-medium text-gray-300">/ {totalQuestions} topics</span>
            </div>
          </div>
          
          <div className="flex flex-col group">
            <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                <span className="text-[12px] font-medium text-gray-400 group-hover:text-gray-900 transition-colors tracking-tight">
                    Next target
                </span>
            </div>
            <span className="text-[12px] font-medium text-indigo-500 leading-tight">
                {totalSolved < totalQuestions ? "Next module available" : "Module completed!"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressCircleWidget;
