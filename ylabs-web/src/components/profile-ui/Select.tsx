import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={twMerge(
            clsx(
              "w-full appearance-none rounded-input border border-line bg-card px-3 py-2 pr-9 text-[15px] text-ink",
              "transition-all duration-150 ease-in-out cursor-pointer",
              "focus:border-primary focus:ring-[3px] focus:ring-primary/18 focus:outline-none",
              "disabled:opacity-50 disabled:bg-line/20 disabled:cursor-not-allowed",
              error && "border-danger focus:border-danger focus:ring-danger/18",
              className
            )
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
