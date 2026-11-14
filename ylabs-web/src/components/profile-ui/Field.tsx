import React from "react";
import { twMerge } from "tailwind-merge";

export interface FieldProps {
  id: string;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}) => {
  return (
    <div className={twMerge("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-sub select-none"
        >
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div>{children}</div>

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium text-danger animate-fadeIn"
        >
          {error}
        </p>
      )}
    </div>
  );
};
