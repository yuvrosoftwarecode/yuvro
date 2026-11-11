import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { ProjectItem } from "../types";
import { useProfileStore } from "../store/profileStore";
import { ProjectForm } from "./ProjectForm";
import { ProjectItemCard } from "./ProjectItemCard";

export const ProjectsSection: React.FC = () => {
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
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Projects</h2>
        {!isAdding && !editingId && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-sm font-medium text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
          >
            + Add
          </button>
        )}
      </div>

      <div className="divide-y divide-line/60">
        {/* Inline Add Panel */}
        {isAdding && (
          <div className="pb-4">
            <ProjectForm
              onSave={handleAddSave}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* Existing Items */}
        {projects.map((item) =>
          editingId === item.id ? (
            <div key={item.id} className="py-4">
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
              onEdit={() => {
                setIsAdding(false);
                setEditingId(item.id);
              }}
              onDelete={() => deleteProject(item.id)}
            />
          )
        )}

        {projects.length === 0 && !isAdding && (
          <p className="text-sm text-muted italic py-3 text-center">
            No projects added yet.
          </p>
        )}
      </div>
    </Card>
  );
};
