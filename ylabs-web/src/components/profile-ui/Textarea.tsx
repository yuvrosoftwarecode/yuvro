import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, disabled, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={twMerge(
          clsx(
            "w-full rounded-input border border-line bg-card px-3 py-2 text-[15px] text-ink placeholder:text-muted/60 leading-[1.55]",
            "transition-all duration-150 ease-in-out",
            "focus:border-primary focus:ring-[3px] focus:ring-primary/18 focus:outline-none",
            "disabled:opacity-50 disabled:bg-line/20 disabled:cursor-not-allowed resize-y",
            error && "border-danger focus:border-danger focus:ring-danger/18",
            className
          )
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
