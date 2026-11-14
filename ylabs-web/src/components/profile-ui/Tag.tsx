import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TagProps {
  label: string;
  onRemove?: () => void;
  variant?: "default" | "primary" | "success";
  size?: "sm" | "md";
  className?: string;
}

export const Tag: React.FC<TagProps> = ({
  label,
  onRemove,
  variant = "default",
  size = "md",
  className,
}) => {
  const variantClasses = {
    default: "bg-line/40 text-sub border border-line/60",
    primary: "bg-primary-subtle text-primary border border-primary/20",
    success: "bg-success-subtle text-success border border-success/20",
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 rounded",
    md: "text-xs px-2.5 py-1 rounded-[6px]",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 font-medium select-none",
          sizeClasses[size],
          variantClasses[variant],
          className
        )
      )}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
          className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors text-xs font-semibold leading-none"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </span>
  );
};
