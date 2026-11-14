import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          "flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-[10px] border border-dashed border-line bg-card/50",
          className
        )
      )}
    >
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
          {icon}
        </div>
      )}
      <h4 className="text-[15px] font-semibold text-ink">{title}</h4>
      {description && (
        <p className="mt-1 max-w-sm text-xs sm:text-[13px] text-muted leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
