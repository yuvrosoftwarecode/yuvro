import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ as: Component = "div", className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={twMerge(
          clsx(
            "rounded-[10px] border border-line bg-card p-4 sm:p-5 shadow-none transition-all duration-150 hover:shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:hover:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
            className
          )
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = "Card";
