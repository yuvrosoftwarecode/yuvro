import React, { useState, useEffect } from "react";
import { Section } from "@/components/profile-ui/Section";
import { TextLink } from "@/components/profile-ui/TextLink";
import { Button } from "@/components/profile-ui/Button";
import { Textarea } from "@/components/profile-ui/Textarea";
import { EmptyState } from "@/components/profile-ui/EmptyState";
import { useProfileStore } from "../store/profileStore";

export const AboutSection: React.FC<{ isOwner?: boolean }> = ({ isOwner = true }) => {
  const { profile, saveProfile } = useProfileStore();
  const [isEditing, setIsEditing] = useState(false);
  const [aboutText, setAboutText] = useState(profile?.about || "");
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (profile?.about !== undefined) {
      setAboutText(profile.about);
    }
  }, [profile?.about]);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveProfile({ about: aboutText.trim() });
    setSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setAboutText(profile?.about || "");
    setIsEditing(false);
  };

  const hasAbout = Boolean(profile?.about?.trim());
  const isLong = (profile?.about?.length || 0) > 280;

  return (
    <Section
      title="About"
      actions={
        isOwner && hasAbout && !isEditing ? (
          <TextLink size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </TextLink>
        ) : null
      }
    >
      {isOwner && isEditing ? (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label htmlFor="inline-about-input" className="sr-only">
              About summary
            </label>
            <Textarea
              id="inline-about-input"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value.slice(0, 500))}
              placeholder="Write a brief overview of your background, technical interests, and experience..."
              rows={4}
              autoFocus
            />
            <div className="flex justify-end mt-1 text-[11px] text-muted">
              {aboutText.length} / 500
            </div>
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
      ) : hasAbout ? (
        <div className="space-y-2">
          <p
            className={`text-sm leading-relaxed text-sub whitespace-pre-line transition-all ${
              !isExpanded && isLong ? "line-clamp-4" : ""
            }`}
          >
            {profile?.about}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs hover:text-primary font-medium hover:underline cursor-pointer transition-colors"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      ) : !isOwner ? (
        <p className="text-sm text-muted">No information provided.</p>
      ) : (
        <EmptyState
          title="No summary provided yet"
          description="Click 'Edit' to tell people about yourself."
          action={
            <Button size="sm" variant="primary" onClick={() => setIsEditing(true)}>
              Add about
            </Button>
          }
        />
      )}
    </Section>
  );
};
