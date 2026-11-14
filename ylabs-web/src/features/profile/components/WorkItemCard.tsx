import React, { useState } from "react";
import { WorkItem } from "../types";
import { formatMonthRange } from "@/lib/dateHelpers";
import { Avatar } from "@/components/profile-ui/Avatar";
import { Badge } from "@/components/profile-ui/Badge";
import { Tag } from "@/components/profile-ui/Tag";
import { ConfirmDialog } from "@/components/profile-ui/ConfirmDialog";

interface WorkItemCardProps {
  item: WorkItem;
  isLast?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const WorkItemCard: React.FC<WorkItemCardProps> = ({
  item,
  isLast = false,
  onEdit,
  onDelete,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const period = formatMonthRange(item.from, item.to, item.current);

  return (
    <>
      <div className="relative flex items-start gap-3.5 pb-6 last:pb-0">
        {/* Timeline Rail & Dot */}
        <div className="relative flex flex-col items-center shrink-0">
          {/* Dot (10px, filled for current/Present) */}
          <div
            className={`h-2.5 w-2.5 rounded-full z-10 ${
              item.current
                ? "bg-primary ring-2 ring-primary/30"
                : "bg-line"
            }`}
          />
          {/* Vertical 2px rail line */}
          {!isLast && (
            <div className="w-[2px] bg-line absolute top-2.5 bottom-0" />
          )}
        </div>

        {/* Entry Content */}
        <div className="flex-1 min-w-0 space-y-2.5 -mt-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <Avatar
                name={item.company || item.role}
                size="md"
                className="rounded-input h-9 w-9 text-xs shrink-0"
              />

              <div className="space-y-0.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="font-semibold text-ink text-sm truncate">
                    {item.role}
                  </h3>
                  <Badge variant="neutral" size="sm">
                    {item.type}
                  </Badge>
                </div>

                <p className="text-xs text-sub font-medium truncate">
                  {item.company}
                </p>
                {period && <p className="text-[11px] text-muted">{period}</p>}
              </div>
            </div>

            {/* Quiet text links */}
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="hover:text-primary font-medium cursor-pointer transition-colors"
              >
                Edit
              </button>
              <span className="text-line" aria-hidden="true">&middot;</span>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="text-muted hover:text-danger font-medium cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Responsibilities bullets */}
          {item.responsibilities && item.responsibilities.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-sub leading-normal">
              {item.responsibilities.map((resp, idx) => (
                <li key={idx}>{resp}</li>
              ))}
            </ul>
          )}

          {/* Technologies */}
          {item.technologies && item.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {item.technologies.map((tech) => (
                <Tag key={tech} label={tech} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove work experience?"
        description={`Are you sure you want to remove "${item.role} at ${item.company}" from your profile?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={onDelete}
      />
    </>
  );
};
