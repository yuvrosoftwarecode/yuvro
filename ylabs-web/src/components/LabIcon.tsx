import { getLabIconUrl } from "@/lib/labIcons";
import { Network, Briefcase } from "lucide-react";

interface LabIconProps {
  name: string;
  icon?: string;
  size?: string;
  className?: string;
}

export function LabIcon({ name, icon, size = "h-8 w-8", className = "" }: LabIconProps) {
  const url = getLabIconUrl(name);
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${size} object-contain shrink-0 ${className}`}
      />
    );
  }

  if (name === "Data Structures Lab") {
    return <Network className={`${size} shrink-0 text-primary ${className}`} />;
  }

  if (name === "Portfolio Lab" || name.toLowerCase().includes("portfolio")) {
    return <Briefcase className={`${size} shrink-0 text-warning ${className}`} />;
  }

  const display = icon && icon.trim().length > 0 ? icon : "💻";
  return (
    <span className={`leading-none select-none ${className}`} style={{ fontSize: "1.25em" }}>
      {display}
    </span>
  );
}
