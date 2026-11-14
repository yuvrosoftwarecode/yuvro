import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero" | "profile";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-xs font-medium",
  lg: "h-10 w-10 text-sm font-medium",
  xl: "h-12 w-12 text-base font-semibold",
  hero: "h-24 w-24 text-3xl font-bold",
  profile: "h-32 w-32 text-4xl font-bold",
};

export function hashStringToColor(str: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = [
    { bg: "bg-[#fff7ed] dark:bg-[#2e1d0f]", text: "text-[#ea580c] dark:text-[#f97316]" },
    { bg: "bg-[#edfcf2] dark:bg-[#132d20]", text: "text-[#157f3d] dark:text-[#17b26a]" },
    { bg: "bg-[#f5f3ff] dark:bg-[#231e3d]", text: "text-[#7c3aed] dark:text-[#a78bfa]" },
    { bg: "bg-[#fffbeb] dark:bg-[#2e2009]", text: "text-[#b45309] dark:text-[#f59e0b]" },
    { bg: "bg-[#fef2f2] dark:bg-[#2d1a1c]", text: "text-[#dc2626] dark:text-[#ef4444]" },
    { bg: "bg-[#ecfeff] dark:bg-[#112a2e]", text: "text-[#0e7490] dark:text-[#22d3ee]" },
  ];
  return palette[Math.abs(hash) % palette.length];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = "User",
  size = "md",
  className,
  ...props
}) => {
  const initial = (name.trim()[0] || "U").toUpperCase();
  const color = hashStringToColor(name);

  return (
    <div
      className={twMerge(
        clsx(
          "relative shrink-0 rounded-full overflow-hidden select-none flex items-center justify-center font-medium",
          sizeClasses[size],
          !src && `${color.bg} ${color.text}`,
          className
        )
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Hide image and fall back to initials on load failure
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};
