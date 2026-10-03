import { useState } from "react";
import { getLabIconUrl } from "@/lib/labIcons";
import { Network, Briefcase, Boxes } from "lucide-react";

interface LabIconProps {
  name: string;
  icon?: string;
  size?: string;
  className?: string;
}

export function LabIcon({ name, icon, size = "h-8 w-8", className = "" }: LabIconProps) {
  const [imgErr, setImgErr] = useState(false);
  const url = getLabIconUrl(name);
  if (url && !imgErr) {
    return (
      <img
        src={url}
        alt={name}
        className={`${size} object-contain shrink-0 ${className}`}
        onError={() => setImgErr(true)}
      />
    );
  }

  if (name.toLowerCase().includes("data structure") && name.toLowerCase().includes("scenario")) {
    return <Boxes className={`${size} shrink-0 text-primary ${className}`} />;
  }

  if (name.toLowerCase().includes("data structure")) {
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
