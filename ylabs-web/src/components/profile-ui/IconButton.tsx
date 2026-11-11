import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "ghost" | "secondary" | "danger";
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", size = "md", className, children, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-7 w-7 p-1 text-xs",
      md: "h-8 w-8 p-1.5 text-sm",
    };

    const variantClasses = {
      ghost: "text-muted hover:text-ink hover:bg-line/40",
      secondary: "border border-line bg-card text-sub hover:bg-bg",
      danger: "text-muted hover:text-danger hover:bg-danger-subtle",
    };

    return (
      <button
        ref={ref}
        type="button"
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center rounded-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed",
            sizeClasses[size],
            variantClasses[variant],
            className
          )
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
