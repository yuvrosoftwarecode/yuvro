import React, { useState } from "react";
import { EducationItem } from "../types";
import { Avatar } from "@/components/profile-ui/Avatar";
import { ConfirmDialog } from "@/components/profile-ui/ConfirmDialog";
import { OwnerOnly } from "@/components/profile-ui/OwnerOnly";

interface EducationItemCardProps {
  item: EducationItem;
  isLast?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isOwner?: boolean;
}

export const EducationItemCard: React.FC<EducationItemCardProps> = ({
  item,
  isLast = false,
  onEdit,
  onDelete,
  isOwner = true,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const degreeDetails = [item.degree, item.field].filter(Boolean).join(", ");
  const years =
    item.startYear && item.endYear
      ? `${item.startYear} – ${item.endYear}`
      : item.endYear
      ? `${item.endYear}`
      : item.startYear
      ? `${item.startYear}`
      : "";

  return (
    <>
      <div className="relative flex items-start gap-3.5 pb-6 last:pb-0">
        {/* Timeline Rail & Dot */}
        <div className="relative flex flex-col items-center shrink-0">
          <div className="h-2.5 w-2.5 rounded-full bg-primary z-10" />
          {!isLast && (
            <div className="w-[2px] bg-line absolute top-2.5 bottom-0" />
          )}
        </div>

        {/* Entry Content */}
        <div className="flex-1 min-w-0 space-y-2 -mt-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <Avatar
                name={item.school}
                size="md"
                className="rounded-input h-9 w-9 text-xs shrink-0"
              />

              <div className="space-y-0.5 min-w-0">
                <h3 className="font-semibold text-ink text-sm truncate">
                  {item.school}
                </h3>
                {degreeDetails && <p className="text-xs text-sub truncate">{degreeDetails}</p>}
                {years && <p className="text-[11px] text-muted">{years}</p>}
              </div>
            </div>

            <OwnerOnly isOwner={isOwner}>
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
            </OwnerOnly>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove education?"
        description={`Are you sure you want to remove "${item.school}" from your education?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={onDelete}
      />
    </>
  );
};
