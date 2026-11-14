import React, { useState, forwardRef } from "react";

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  hasError?: boolean;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ id, hasError, className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className={`inp ${hasError ? "err" : ""} ${className}`.trim()}>
        <input ref={ref} id={id} type={showPassword ? "text" : "password"} {...props} />
        <button
          type="button"
          className={`eye ${showPassword ? "on" : ""}`}
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          <svg className="show" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg className="off" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        </button>
      </div>
    );
  },
);

PasswordField.displayName = "PasswordField";
