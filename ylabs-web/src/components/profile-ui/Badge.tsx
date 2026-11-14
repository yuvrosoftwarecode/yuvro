import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
}

const variantStyles = {
  default: "bg-gray-100 text-sub dark:bg-gray-800 dark:text-gray-300",
  primary: "bg-[#fff7ed] text-[#ea580c] dark:bg-[#2e1d0f] dark:text-[#f97316]",
  success: "bg-[#edfcf2] text-[#157f3d] dark:bg-[#132d20] dark:text-[#17b26a]",
  warning: "bg-[#fffbeb] text-[#d97706] dark:bg-[#2e2009] dark:text-[#f59e0b]",
  danger: "bg-[#fef3f2] text-[#dc2626] dark:bg-[#2d1a1c] dark:text-[#ef4444]",
  neutral: "bg-gray-50 text-muted border border-line dark:bg-gray-900/50 dark:text-gray-400",
};

const dotColors = {
  default: "bg-sub dark:bg-gray-300",
  primary: "bg-[#ea580c] dark:bg-[#f97316]",
  success: "bg-[#157f3d] dark:bg-[#17b26a]",
  warning: "bg-[#d97706] dark:bg-[#f59e0b]",
  danger: "bg-[#dc2626] dark:bg-[#ef4444]",
  neutral: "bg-muted",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  dot = false,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap select-none",
          size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1",
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx(
            "rounded-full shrink-0",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            dotColors[variant]
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
