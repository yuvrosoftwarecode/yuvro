import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ProgressBarProps {
  value: number; // 0 to 100
  height?: number; // px, default 6
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  height = 6,
  className,
  trackClassName,
  barClassName,
  label,
}) => {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${clamped}%`}
      className={twMerge(
        clsx("w-full bg-line overflow-hidden rounded-full", className, trackClassName)
      )}
      style={{ height: `${height}px` }}
    >
      <div
        className={twMerge(
          clsx("h-full bg-primary rounded-full transition-all duration-300", barClassName)
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
