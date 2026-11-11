import React from "react";
import { ProjectItem } from "../types";
import { formatMonthRange } from "@/lib/dateHelpers";
import { Edit2 } from "lucide-react";

interface ProjectItemCardProps {
  item: ProjectItem;
  onEdit: () => void;
  onDelete: () => void;
}

export const ProjectItemCard: React.FC<ProjectItemCardProps> = ({
  item,
  onEdit,
  onDelete,
}) => {
  const period = formatMonthRange(item.from, item.to, item.ongoing);
  const initial = (item.name?.[0] || "P").toUpperCase();
  const displayUrl = item.link ? item.link.replace(/^https?:\/\//, "") : "";

  return (
    <div className="py-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Soft square initial icon */}
          <div className="h-9 w-9 rounded-lg bg-[#eef4ff] text-[#3558c8] font-semibold text-sm flex items-center justify-center shrink-0">
            {initial}
          </div>

          <div className="space-y-0.5">
            <h3 className="font-semibold text-ink text-[15px]">{item.name}</h3>
            {item.role && <p className="text-sm text-sub">{item.role}</p>}
            {period && <p className="text-xs text-muted">{period}</p>}
          </div>
        </div>

        {/* Action text links */}
        <div className="flex items-center gap-4 text-sm shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit project ${item.name}`}
            className="text-sub hover:text-primary transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-0 p-0 text-xs"
          >
            <Edit2 className="h-3 w-3" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remove project ${item.name}`}
            className="text-sub hover:text-danger transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Remove
          </button>
        </div>
      </div>

      {item.bullets && item.bullets.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-sub leading-[1.55] ml-11">
          {item.bullets.map((bullet, idx) => (
            <li key={idx}>{bullet}</li>
          ))}
        </ul>
      )}

      {item.technologies && item.technologies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 ml-11">
          {item.technologies.map((tech) => (
            <span
              key={tech}
              className="px-2.5 py-0.5 rounded-md border border-line bg-[#f9fafb] dark:bg-[#1a2230] text-sub text-xs"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {item.link && (
        <div className="mt-2.5 ml-11">
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {displayUrl}
          </a>
        </div>
      )}
    </div>
  );
};
