import { useState } from "react";
import { getLabIconUrl } from "@/lib/labIcons";
import {
  Layers,
  Boxes,
  Network,
  Server,
  AppWindow,
  FlaskConical,
  Zap,
  Database,
  Briefcase,
  Code,
  Terminal,
  GitBranch,
  Cpu,
  Workflow,
  Layout,
  Globe,
  Bot,
  Shield,
  type LucideIcon,
} from "lucide-react";

export const LUCIDE_ICON_MAP: Record<string, { icon: LucideIcon; colorClass: string }> = {
  layers: { icon: Layers, colorClass: "text-indigo-500" },
  layer: { icon: Layers, colorClass: "text-indigo-500" },
  systemdesign: { icon: Layers, colorClass: "text-indigo-500" },
  "system-design": { icon: Layers, colorClass: "text-indigo-500" },
  "system design": { icon: Layers, colorClass: "text-indigo-500" },
  architecture: { icon: Layers, colorClass: "text-indigo-500" },

  boxes: { icon: Boxes, colorClass: "text-primary" },
  box: { icon: Boxes, colorClass: "text-primary" },
  scenario: { icon: Boxes, colorClass: "text-primary" },
  microservices: { icon: Boxes, colorClass: "text-primary" },

  network: { icon: Network, colorClass: "text-primary" },
  algorithm: { icon: Network, colorClass: "text-primary" },
  dsa: { icon: Network, colorClass: "text-primary" },
  "data structure": { icon: Network, colorClass: "text-primary" },

  server: { icon: Server, colorClass: "text-violet-500" },
  backend: { icon: Server, colorClass: "text-violet-500" },

  appwindow: { icon: AppWindow, colorClass: "text-blue-500" },
  window: { icon: AppWindow, colorClass: "text-blue-500" },
  frontend: { icon: AppWindow, colorClass: "text-blue-500" },
  ui: { icon: AppWindow, colorClass: "text-blue-500" },
  layout: { icon: Layout, colorClass: "text-blue-500" },

  flaskconical: { icon: FlaskConical, colorClass: "text-rose-500" },
  flask: { icon: FlaskConical, colorClass: "text-rose-500" },

  zap: { icon: Zap, colorClass: "text-amber-500" },
  fastapi: { icon: Zap, colorClass: "text-amber-500" },

  database: { icon: Database, colorClass: "text-emerald-500" },
  db: { icon: Database, colorClass: "text-emerald-500" },
  sql: { icon: Database, colorClass: "text-emerald-500" },
  mongo: { icon: Database, colorClass: "text-emerald-500" },
  mongodb: { icon: Database, colorClass: "text-emerald-500" },
  postgres: { icon: Database, colorClass: "text-emerald-500" },
  postgresql: { icon: Database, colorClass: "text-emerald-500" },
  sqlite: { icon: Database, colorClass: "text-emerald-500" },
  mysql: { icon: Database, colorClass: "text-emerald-500" },

  briefcase: { icon: Briefcase, colorClass: "text-warning" },
  portfolio: { icon: Briefcase, colorClass: "text-warning" },

  code: { icon: Code, colorClass: "text-primary" },
  terminal: { icon: Terminal, colorClass: "text-muted-foreground" },
  linux: { icon: Terminal, colorClass: "text-muted-foreground" },
  bash: { icon: Terminal, colorClass: "text-muted-foreground" },
  shell: { icon: Terminal, colorClass: "text-muted-foreground" },

  git: { icon: GitBranch, colorClass: "text-orange-500" },
  gitbranch: { icon: GitBranch, colorClass: "text-orange-500" },
  github: { icon: GitBranch, colorClass: "text-orange-500" },

  cpu: { icon: Cpu, colorClass: "text-cyan-500" },
  workflow: { icon: Workflow, colorClass: "text-sky-500" },
  devops: { icon: Workflow, colorClass: "text-sky-500" },

  globe: { icon: Globe, colorClass: "text-emerald-500" },
  web: { icon: Globe, colorClass: "text-emerald-500" },

  bot: { icon: Bot, colorClass: "text-purple-500" },
  ai: { icon: Bot, colorClass: "text-purple-500" },

  shield: { icon: Shield, colorClass: "text-emerald-500" },
  security: { icon: Shield, colorClass: "text-emerald-500" },
};

interface LabIconProps {
  name: string;
  icon?: string;
  size?: string;
  className?: string;
}

export function LabIcon({ name, icon, size = "h-8 w-8", className = "" }: LabIconProps) {
  const [imgErr, setImgErr] = useState(false);

  const cleanIcon = (icon || "").trim();
  const iconKey = cleanIcon.toLowerCase().replace(/[\s-_]+/g, "");
  const nameLower = name.toLowerCase();

  // 1. Specific Data Structures Lab & Scenario heuristics
  if (nameLower.includes("data structure") && nameLower.includes("scenario")) {
    return <Boxes className={`${size} shrink-0 text-primary ${className}`} />;
  }

  if (
    nameLower.includes("data structure") ||
    nameLower.includes("algorithm") ||
    nameLower.includes("dsa")
  ) {
    return <Network className={`${size} shrink-0 text-primary ${className}`} />;
  }

  // 2. Explicit image URL
  if (cleanIcon.startsWith("http://") || cleanIcon.startsWith("https://") || cleanIcon.startsWith("/")) {
    if (!imgErr) {
      return (
        <img
          src={cleanIcon}
          alt={name}
          className={`${size} object-contain shrink-0 ${className}`}
          onError={() => setImgErr(true)}
        />
      );
    }
  }

  // 3. DevIcon brand match from lab title
  const devIconUrl = getLabIconUrl(name);
  if (devIconUrl && !imgErr) {
    return (
      <img
        src={devIconUrl}
        alt={name}
        className={`${size} object-contain shrink-0 ${className}`}
        onError={() => setImgErr(true)}
      />
    );
  }

  // 3. Explicit Lucide icon name (e.g. "Layers", "Boxes", "Server", "Database", "AppWindow")
  if (iconKey && LUCIDE_ICON_MAP[iconKey]) {
    const { icon: IconComp, colorClass } = LUCIDE_ICON_MAP[iconKey];
    return <IconComp className={`${size} shrink-0 ${colorClass} ${className}`} />;
  }

  // 4. Emoji or short unicode symbol (e.g. 💻, 🐧, ⚡, 🐘)
  if (
    cleanIcon &&
    (/\p{Extended_Pictographic}/u.test(cleanIcon) ||
      (cleanIcon.length <= 4 && !/^[a-zA-Z0-9]+$/.test(cleanIcon)))
  ) {
    return (
      <span
        className={`leading-none select-none inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ fontSize: "1.25em" }}
      >
        {cleanIcon}
      </span>
    );
  }

  // 5. Auto-resolution based on lab name heuristics
  if (
    nameLower.includes("system design") ||
    nameLower.includes("system-design") ||
    nameLower.includes("architecture")
  ) {
    return <Layers className={`${size} shrink-0 text-indigo-500 ${className}`} />;
  }

  if (nameLower.includes("portfolio")) {
    return <Briefcase className={`${size} shrink-0 text-warning ${className}`} />;
  }

  if (nameLower.includes("database") || nameLower.includes("sql") || nameLower.includes("mongo")) {
    return <Database className={`${size} shrink-0 text-emerald-500 ${className}`} />;
  }

  if (
    nameLower.includes("linux") ||
    nameLower.includes("bash") ||
    nameLower.includes("terminal") ||
    nameLower.includes("shell")
  ) {
    return <Terminal className={`${size} shrink-0 text-muted-foreground ${className}`} />;
  }

  if (nameLower.includes("frontend") || nameLower.includes(" ui")) {
    return <AppWindow className={`${size} shrink-0 text-blue-500 ${className}`} />;
  }

  if (nameLower.includes("backend") || nameLower.includes("api")) {
    return <Server className={`${size} shrink-0 text-violet-500 ${className}`} />;
  }

  // 6. Final fallback icon
  return <Code className={`${size} shrink-0 text-primary ${className}`} />;
}
