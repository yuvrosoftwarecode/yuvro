import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={twMerge(
          clsx(
            "w-full rounded-input border border-line bg-card px-3 py-2 text-[15px] text-ink placeholder:text-muted/60",
            "transition-all duration-150 ease-in-out",
            "focus:border-primary focus:ring-[3px] focus:ring-primary/18 focus:outline-none",
            "disabled:opacity-50 disabled:bg-line/20 disabled:cursor-not-allowed",
            error && "border-danger focus:border-danger focus:ring-danger/18",
            className
          )
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
