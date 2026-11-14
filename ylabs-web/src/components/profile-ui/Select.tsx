import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, disabled, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={disabled}
        className={twMerge(
          clsx(
            "w-full rounded-input border border-line bg-card px-3 py-2 text-sm text-ink",
            "transition-all duration-150 ease-in-out cursor-pointer",
            "focus:border-primary focus:ring-[3px] focus:ring-primary/22 focus:outline-none",
            "disabled:opacity-50 disabled:bg-line/20 disabled:cursor-not-allowed",
            error && "border-danger focus:border-danger focus:ring-danger/22",
            className
          )
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";
