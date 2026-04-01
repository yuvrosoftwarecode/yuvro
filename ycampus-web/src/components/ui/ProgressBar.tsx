import React from 'react';

interface Props {
  value: number; // 0-100
  className?: string;
  height?: number | string;
  trackClassName?: string;
  barClassName?: string;
}

const ProgressBar: React.FC<Props> = ({ value, className = '', height = 8, trackClassName = '', barClassName = '' }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={className}>
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50 ${trackClassName}`} style={{ height: heightStyle }}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${barClassName || 'bg-indigo-600'}`}
          style={{ width: `${pct}%` }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
};

export default ProgressBar;
