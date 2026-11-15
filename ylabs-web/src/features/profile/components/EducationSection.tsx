import React, { useState } from "react";
import { Section } from "@/components/profile-ui/Section";
import { TextLink } from "@/components/profile-ui/TextLink";
import { Button } from "@/components/profile-ui/Button";
import { EmptyState } from "@/components/profile-ui/EmptyState";
import { OwnerOnly } from "@/components/profile-ui/OwnerOnly";
import { EducationItem } from "../types";
import { useProfileStore } from "../store/profileStore";
import { EducationForm } from "./EducationForm";
import { EducationItemCard } from "./EducationItemCard";

export const EducationSection: React.FC<{ isOwner?: boolean }> = ({
  isOwner = true,
}) => {
  const { profile, addEducation, updateEducation, deleteEducation } = useProfileStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const education = profile?.education || [];

  const handleAddSave = async (data: Omit<EducationItem, "id">) => {
    const ok = await addEducation(data);
    if (ok) setIsAdding(false);
  };

  const handleUpdateSave = async (data: Omit<EducationItem, "id">) => {
    if (!editingId) return;
    const ok = await updateEducation(editingId, data);
    if (ok) setEditingId(null);
  };

  return (
    <Section
      id="education-section"
      title="Education"
      eyebrow="Credentials"
      actions={
        !isAdding && !editingId ? (
          <OwnerOnly isOwner={isOwner}>
            <TextLink size="sm" onClick={() => setIsAdding(true)}>
              Add
            </TextLink>
          </OwnerOnly>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Inline Add Panel */}
        {isAdding && (
          <div className="rounded-card border border-line bg-card p-4 sm:p-5">
            <EducationForm
              onSave={handleAddSave}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* Existing Education Timeline */}
        {education.length > 0 ? (
          <div className="pt-2 pl-1">
            {education.map((item, index) =>
              editingId === item.id ? (
                <div
                  key={item.id}
                  className="rounded-card border border-line bg-card p-4 sm:p-5 mb-4"
                >
                  <EducationForm
                    initialData={item}
                    onSave={handleUpdateSave}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <EducationItemCard
                  key={item.id}
                  item={item}
                  isLast={index === education.length - 1}
                  onEdit={() => setEditingId(item.id)}
                  onDelete={() => deleteEducation(item.id)}
                  isOwner={isOwner}
                />
              )
            )}
          </div>
        ) : !isAdding ? (
          <OwnerOnly isOwner={isOwner}>
            <EmptyState
              title="Add your education"
              description="Include your university, degree, field of study, and graduation year."
              action={
                <Button size="sm" variant="primary" onClick={() => setIsAdding(true)}>
                  Add education
                </Button>
              }
            />
          </OwnerOnly>
        ) : null}
      </div>
    </Section>
  );
};
