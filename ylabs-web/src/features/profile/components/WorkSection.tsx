import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { WorkItem } from "../types";
import { useProfileStore } from "../store/profileStore";
import { WorkForm } from "./WorkForm";
import { WorkItemCard } from "./WorkItemCard";

export const WorkSection: React.FC = () => {
  const { profile, addWork, updateWork, deleteWork } = useProfileStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const workList = profile?.work || [];

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
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Work</h2>
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
            <WorkForm
              onSave={handleAddSave}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* Existing Items */}
        {workList.map((item) =>
          editingId === item.id ? (
            <div key={item.id} className="py-4">
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
              onEdit={() => {
                setIsAdding(false);
                setEditingId(item.id);
              }}
              onDelete={() => deleteWork(item.id)}
            />
          )
        )}

        {workList.length === 0 && !isAdding && (
          <p className="text-sm text-muted italic py-3 text-center">
            No work experience added yet.
          </p>
        )}
      </div>
    </Card>
  );
};
