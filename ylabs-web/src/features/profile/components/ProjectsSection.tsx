import React, { useState } from "react";
import { Section } from "@/components/profile-ui/Section";
import { TextLink } from "@/components/profile-ui/TextLink";
import { Button } from "@/components/profile-ui/Button";
import { EmptyState } from "@/components/profile-ui/EmptyState";
import { OwnerOnly } from "@/components/profile-ui/OwnerOnly";
import { ProjectItem } from "../types";
import { useProfileStore } from "../store/profileStore";
import { ProjectForm } from "./ProjectForm";
import { ProjectItemCard } from "./ProjectItemCard";

export const ProjectsSection: React.FC<{ isOwner?: boolean }> = ({
  isOwner = true,
}) => {
  const { profile, addProject, updateProject, deleteProject } = useProfileStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const projects = profile?.projects || [];

  const handleAddSave = async (data: Omit<ProjectItem, "id">) => {
    const ok = await addProject(data);
    if (ok) setIsAdding(false);
  };

  const handleUpdateSave = async (data: Omit<ProjectItem, "id">) => {
    if (!editingId) return;
    const ok = await updateProject(editingId, data);
    if (ok) setEditingId(null);
  };

  return (
    <Section
      id="projects-section"
      title="Projects"
      eyebrow="Portfolio"
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
        {/* Inline Add Form */}
        {isAdding && (
          <div className="rounded-card border border-line bg-card p-4 sm:p-5">
            <ProjectForm
              onSave={handleAddSave}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* Existing Projects in auto-fill grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((item) =>
              editingId === item.id ? (
                <div
                  key={item.id}
                  className="col-span-full rounded-card border border-line bg-card p-4 sm:p-5"
                >
                  <ProjectForm
                    initialData={item}
                    onSave={handleUpdateSave}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <ProjectItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingId(item.id)}
                  onDelete={() => deleteProject(item.id)}
                  isOwner={isOwner}
                />
              )
            )}
          </div>
        ) : !isAdding ? (
          <OwnerOnly isOwner={isOwner}>
            <EmptyState
              title="Showcase what you've built"
              description="Highlight key engineering projects, hackathons, or open-source repositories."
              action={
                <Button size="sm" variant="primary" onClick={() => setIsAdding(true)}>
                  Add project
                </Button>
              }
            />
          </OwnerOnly>
        ) : null}
      </div>
    </Section>
  );
};
