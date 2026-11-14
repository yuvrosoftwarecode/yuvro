import React, { useState } from "react";
import { ProjectItem } from "../types";
import { formatMonthRange } from "@/lib/dateHelpers";
import { Avatar } from "@/components/profile-ui/Avatar";
import { Tag } from "@/components/profile-ui/Tag";
import { ConfirmDialog } from "@/components/profile-ui/ConfirmDialog";
import { OwnerOnly } from "@/components/profile-ui/OwnerOnly";

interface ProjectItemCardProps {
  item: ProjectItem;
  onEdit: () => void;
  onDelete: () => void;
  isOwner?: boolean;
}

export const ProjectItemCard: React.FC<ProjectItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  isOwner = true,
}) => {
  const [showAllBullets, setShowAllBullets] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const period = formatMonthRange(item.from, item.to, item.ongoing);
  const bullets = item.bullets || [];
  const visibleBullets = showAllBullets ? bullets : bullets.slice(0, 3);
  const hasMoreBullets = bullets.length > 3;

  return (
    <>
      <div className="rounded-card border border-line bg-card p-4 sm:p-5 space-y-3.5 hover:border-primary/40 transition-colors flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Avatar name={item.name} size="lg" className="rounded-input shrink-0" />

              <div className="space-y-0.5 min-w-0">
                <h3 className="font-semibold text-ink text-base truncate">
                  {item.name}
                </h3>
                {item.role && <p className="text-xs text-sub">{item.role}</p>}
                {period && <p className="text-xs text-muted">{period}</p>}
              </div>
            </div>

            <OwnerOnly isOwner={isOwner}>
              <div className="flex items-center gap-2 text-xs shrink-0">
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

          {/* Bullets */}
          {bullets.length > 0 && (
            <div className="space-y-1.5 pl-1">
              <ul className="list-disc space-y-1 pl-4 text-xs sm:text-[13px] text-sub leading-normal">
                {visibleBullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>

              {hasMoreBullets && (
                <button
                  type="button"
                  onClick={() => setShowAllBullets(!showAllBullets)}
                  className="text-xs hover:text-primary font-medium hover:underline cursor-pointer pl-4 transition-colors"
                >
                  {showAllBullets ? "Show less" : `Show ${bullets.length - 3} more`}
                </button>
              )}
            </div>
          )}

          {/* Technologies */}
          {item.technologies && item.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.technologies.map((tech) => (
                <Tag key={tech} label={tech} size="sm" />
              ))}
            </div>
          )}
        </div>

        {/* Project Link */}
        {item.link && (
          <div className="pt-2 border-t border-line text-xs">
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-primary font-mono hover:underline truncate block transition-colors"
            >
              {item.link.replace(/^https?:\/\//, "")}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove project?"
        description={`Are you sure you want to remove "${item.name}" from your profile? This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={onDelete}
      />
    </>
  );
};
