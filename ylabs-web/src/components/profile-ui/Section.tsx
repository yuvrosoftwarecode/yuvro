import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import { Card } from "./Card";

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  headerClassName?: string;
}

export const Section = forwardRef<HTMLDivElement, SectionProps>(
  ({ title, eyebrow, subtitle, actions, icon, children, className, headerClassName, ...props }, ref) => {
    const headingId = React.useId();

    return (
      <Card
        as="section"
        ref={ref}
        aria-labelledby={headingId}
        className={twMerge("space-y-4", className)}
        {...props}
      >
        <header className={twMerge("flex items-start justify-between gap-4", headerClassName)}>
          <div className="space-y-0.5">
            {eyebrow && (
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-0.5">
                {eyebrow}
              </div>
            )}
            <div className="flex items-center gap-2">
              {icon && <span className="text-muted" aria-hidden="true">{icon}</span>}
              <h2 id={headingId} className="text-[16px] font-semibold text-ink">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-[13px] text-muted">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>

        <div>{children}</div>
      </Card>
    );
  }
);

Section.displayName = "Section";
