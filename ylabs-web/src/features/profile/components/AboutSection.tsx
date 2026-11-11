import React, { useState, useEffect } from "react";
import { Section } from "@/components/profile-ui/Section";
import { TextLink } from "@/components/profile-ui/TextLink";
import { Button } from "@/components/profile-ui/Button";
import { Textarea } from "@/components/profile-ui/Textarea";
import { useProfileStore } from "../store/profileStore";
import { Edit2 } from "lucide-react";

export const AboutSection: React.FC = () => {
  const { profile, saveProfile } = useProfileStore();
  const [isEditing, setIsEditing] = useState(false);
  const [aboutText, setAboutText] = useState(profile?.about || "");
  const [saving, setSaving] = useState(false);

  // Sync state if profile changes
  useEffect(() => {
    if (profile?.about !== undefined) {
      setAboutText(profile.about);
    }
  }, [profile?.about]);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveProfile({ about: aboutText });
    setSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setAboutText(profile?.about || "");
    setIsEditing(false);
  };

  return (
    <Section
      title="About"
      actions={
        !isEditing ? (
          <TextLink
            size="sm"
            icon={<Edit2 className="h-3.5 w-3.5" />}
            onClick={() => setIsEditing(true)}
          >
            Edit
          </TextLink>
        ) : null
      }
    >
      {isEditing ? (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label htmlFor="inline-about-input" className="sr-only">
              About summary
            </label>
            <Textarea
              id="inline-about-input"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder="Write a brief overview of your background, technical interests, and experience..."
              rows={4}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSave} loading={saving}>
              Save
            </Button>
            <TextLink variant="muted" size="sm" onClick={handleCancel}>
              Cancel
            </TextLink>
          </div>
        </div>
      ) : (
        <p className="text-[15px] leading-[1.55] text-sub whitespace-pre-line">
          {profile?.about?.trim() || (
            <span className="text-muted italic">
              No summary provided yet. Click "Edit" to tell people about yourself.
            </span>
          )}
        </p>
      )}
    </Section>
  );
};
