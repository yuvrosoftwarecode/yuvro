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
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${trackClassName}`} style={{ height: heightStyle }}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClassName}`}
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
