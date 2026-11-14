import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "danger-outline" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      loading = false,
      disabled,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-10 px-5 text-base gap-2.5",
    };

    const variantClasses: Record<string, string> = {
      primary:
        "bg-primary hover:bg-primary-hover text-white border border-transparent shadow-sm focus-visible:ring-primary",
      secondary:
        "border border-line bg-card hover:bg-bg text-sub shadow-sm focus-visible:ring-primary",
      outline:
        "border border-line bg-card hover:bg-bg text-sub shadow-sm focus-visible:ring-primary",
      danger:
        "bg-danger hover:bg-danger-strong text-on-danger border border-transparent shadow-sm focus-visible:ring-danger",
      "danger-outline":
        "border border-danger bg-transparent hover:bg-danger-soft text-danger shadow-sm focus-visible:ring-danger",
      ghost:
        "border border-transparent bg-transparent hover:bg-line/40 text-sub focus-visible:ring-primary",
    };

    // Robust explicit inline styles with hardcoded fallbacks inside var()
    // Guarantees colors are never transparent or empty, even inside portals under <body>
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: "var(--color-primary, var(--primary, #ea580c))",
        color: "#ffffff",
        borderColor: "transparent",
      },
      secondary: {
        backgroundColor: "var(--color-card, var(--card, #ffffff))",
        color: "var(--color-sub, var(--sub, #344054))",
        borderColor: "var(--color-line, var(--line, #e4e7ec))",
      },
      outline: {
        backgroundColor: "var(--color-card, var(--card, #ffffff))",
        color: "var(--color-sub, var(--sub, #344054))",
        borderColor: "var(--color-line, var(--line, #e4e7ec))",
      },
      danger: {
        backgroundColor: "var(--danger, var(--color-danger, #dc2626))",
        color: "var(--on-danger, var(--color-on-danger, #ffffff))",
        borderColor: "transparent",
      },
      "danger-outline": {
        backgroundColor: "transparent",
        color: "var(--danger, var(--color-danger, #dc2626))",
        borderColor: "var(--danger, var(--color-danger, #dc2626))",
      },
      ghost: {
        backgroundColor: "transparent",
        color: "var(--color-sub, var(--sub, #344054))",
        borderColor: "transparent",
      },
    };

    const isDisabled = Boolean(disabled || loading);

    const mergedStyle: React.CSSProperties = {
      ...variantStyles[variant],
      ...(isDisabled
        ? {
            opacity: 0.45,
            cursor: "not-allowed",
          }
        : {}),
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={mergedStyle}
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center font-medium rounded-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-45 disabled:cursor-not-allowed select-none",
            sizeClasses[size],
            variantClasses[variant] || variantClasses.primary,
            className
          )
        )}
        {...props}
      >
        {loading ? (
          <span
            className="inline-block w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
            aria-hidden="true"
          />
        ) : (
          icon && <span aria-hidden="true">{icon}</span>
        )}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
