import React from "react";
import { EducationItem } from "../types";
import { Edit2 } from "lucide-react";

interface EducationItemCardProps {
  item: EducationItem;
  onEdit: () => void;
  onDelete: () => void;
}

export const EducationItemCard: React.FC<EducationItemCardProps> = ({
  item,
  onEdit,
  onDelete,
}) => {
  const degreeDetails = [item.degree, item.field].filter(Boolean).join(", ");
  const years =
    item.startYear && item.endYear
      ? `${item.startYear} – ${item.endYear}`
      : item.endYear
      ? `${item.endYear}`
      : item.startYear
      ? `${item.startYear}`
      : "";
  const initial = (item.school?.[0] || "E").toUpperCase();

  return (
    <div className="py-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Soft square initial icon */}
          <div className="h-9 w-9 rounded-lg bg-[#eef4ff] text-[#3558c8] font-semibold text-sm flex items-center justify-center shrink-0">
            {initial}
          </div>

          <div className="space-y-0.5">
            <h3 className="font-semibold text-ink text-[15px]">{item.school}</h3>
            {degreeDetails && <p className="text-sm text-sub">{degreeDetails}</p>}
            {years && <p className="text-xs text-muted">{years}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${item.school}`}
            className="text-sub hover:text-primary transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-0 p-0 text-xs"
          >
            <Edit2 className="h-3 w-3" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remove ${item.school}`}
            className="text-sub hover:text-danger transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
