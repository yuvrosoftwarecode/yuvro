import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface StatPillProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  value: number | string;
  label: string;
  subLabel?: string;
  onClick?: () => void;
  className?: string;
}

export const StatPill: React.FC<StatPillProps> = ({
  icon,
  value,
  label,
  subLabel,
  onClick,
  className,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={twMerge(
        clsx(
          "flex items-center gap-3 p-3 rounded-[8px] transition-colors",
          onClick && "cursor-pointer hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
          className
        )
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary-subtle text-primary">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] font-semibold text-ink tracking-tight leading-none">
            {value}
          </span>
          {subLabel && <span className="text-[11px] text-muted">{subLabel}</span>}
        </div>
        <div className="text-[12px] text-muted truncate mt-0.5">{label}</div>
      </div>
    </div>
  );
};
