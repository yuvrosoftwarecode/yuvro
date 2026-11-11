import React, { useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { EducationItem } from "../types";
import { useProfileStore } from "../store/profileStore";
import { EducationForm } from "./EducationForm";
import { EducationItemCard } from "./EducationItemCard";

export const EducationSection: React.FC = () => {
  const { profile, addEducation, updateEducation, deleteEducation } = useProfileStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const educationList = profile?.education || [];

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
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Education</h2>
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
            <EducationForm
              onSave={handleAddSave}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* Existing Items */}
        {educationList.map((item) =>
          editingId === item.id ? (
            <div key={item.id} className="py-4">
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
              onEdit={() => {
                setIsAdding(false);
                setEditingId(item.id);
              }}
              onDelete={() => deleteEducation(item.id)}
            />
          )
        )}

        {educationList.length === 0 && !isAdding && (
          <p className="text-sm text-muted italic py-3 text-center">
            No education history added yet.
          </p>
        )}
      </div>
    </Card>
  );
};
