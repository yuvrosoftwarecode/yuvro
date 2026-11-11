import React, { forwardRef } from "react";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TextLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  to?: string;
  href?: string;
  variant?: "primary" | "muted" | "danger";
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export const TextLink = forwardRef<HTMLButtonElement | HTMLAnchorElement, TextLinkProps>(
  ({ to, href, variant = "primary", size = "sm", icon, children, className, onClick, ...props }, ref) => {
    const baseClasses = clsx(
      "inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      size === "sm" ? "text-sm py-1 px-2 -my-1 -mx-2" : "text-[15px] py-1.5 px-2.5 -my-1.5 -mx-2.5",
      variant === "primary" && "text-primary hover:bg-primary-subtle hover:text-primary-hover",
      variant === "muted" && "text-muted hover:bg-line/40 hover:text-ink",
      variant === "danger" && "text-danger hover:bg-danger-subtle hover:text-red-700"
    );

    const mergedClass = twMerge(baseClasses, className);

    if (to) {
      return (
        <Link
          to={to as any}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={mergedClass}
          onClick={onClick as any}
        >
          {icon && <span aria-hidden="true">{icon}</span>}
          {children}
        </Link>
      );
    }

    if (href) {
      return (
        <a
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={mergedClass}
          onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {icon && <span aria-hidden="true">{icon}</span>}
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        className={mergedClass}
        onClick={onClick}
        {...props}
      >
        {icon && <span aria-hidden="true">{icon}</span>}
        {children}
      </button>
    );
  }
);

TextLink.displayName = "TextLink";
