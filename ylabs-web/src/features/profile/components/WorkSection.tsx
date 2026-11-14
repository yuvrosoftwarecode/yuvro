import React, { useState } from "react";
import { Section } from "@/components/profile-ui/Section";
import { TextLink } from "@/components/profile-ui/TextLink";
import { Button } from "@/components/profile-ui/Button";
import { EmptyState } from "@/components/profile-ui/EmptyState";
import { WorkItem } from "../types";
import { useProfileStore } from "../store/profileStore";
import { WorkForm } from "./WorkForm";
import { WorkItemCard } from "./WorkItemCard";

export const WorkSection: React.FC = () => {
  const { profile, addWork, updateWork, deleteWork } = useProfileStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const work = profile?.work || [];

  const handleAddSave = async (data: Omit<WorkItem, "id">) => {
    const ok = await addWork(data);
    if (ok) setIsAdding(false);
  };

  const handleUpdateSave = async (data: Omit<WorkItem, "id">) => {
    if (!editingId) return;
    const ok = await updateWork(editingId, data);
    if (ok) setEditingId(null);
  };

  return (
    <Section
      id="work-section"
      title="Work experience"
      eyebrow="History"
      actions={
        !isAdding && !editingId ? (
          <TextLink size="sm" onClick={() => setIsAdding(true)}>
            Add
          </TextLink>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Inline Add Panel */}
        {isAdding && (
          <div className="rounded-card border border-line bg-card p-4 sm:p-5">
            <WorkForm
              onSave={handleAddSave}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* Existing Work Timeline */}
        {work.length > 0 ? (
          <div className="pt-2 pl-1">
            {work.map((item, index) =>
              editingId === item.id ? (
                <div
                  key={item.id}
                  className="rounded-card border border-line bg-card p-4 sm:p-5 mb-4"
                >
                  <WorkForm
                    initialData={item}
                    onSave={handleUpdateSave}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <WorkItemCard
                  key={item.id}
                  item={item}
                  isLast={index === work.length - 1}
                  onEdit={() => setEditingId(item.id)}
                  onDelete={() => deleteWork(item.id)}
                />
              )
            )}
          </div>
        ) : !isAdding ? (
          <EmptyState
            title="Add your work experience"
            description="Include full-time roles, internships, freelance contracts, or research assistantships."
            action={
              <Button size="sm" variant="primary" onClick={() => setIsAdding(true)}>
                Add experience
              </Button>
            }
          />
        ) : null}
      </div>
    </Section>
  );
};
