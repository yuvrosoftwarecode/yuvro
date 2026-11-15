import React, { useState, useEffect, useRef } from "react";
import { useProfileStore } from "../store/profileStore";
import { usePerformanceStore } from "@/features/performance/store/performanceStore";
import { Avatar } from "@/components/profile-ui/Avatar";
import { Button } from "@/components/profile-ui/Button";
import { Input } from "@/components/profile-ui/Input";
import { Textarea } from "@/components/profile-ui/Textarea";
import { ProgressBar } from "@/components/profile-ui/ProgressBar";
import { ConfirmDialog } from "@/components/profile-ui/ConfirmDialog";
import { computeProfileStrength } from "@/lib/validators";
import { isValidWebsite, isValidPhone, validateUsernameFormat } from "@/lib/validators";
import { toast } from "@/lib/toastStore";
import { useUsernameAvailability } from "../hooks/useUsernameAvailability";
import { buildPublicProfileUrl, formatPublicProfileDisplayUrl } from "@/lib/publicUrl";

interface IdentityPanelProps {
  onNavigateTab?: (tab: string) => void;
  isOwner?: boolean;
}

export const IdentityPanel: React.FC<IdentityPanelProps> = ({
  onNavigateTab,
  isOwner = true,
}) => {
  const {
    profile,
    saveProfile,
    uploadAvatar,
    removeAvatar,
  } = useProfileStore();

  const { data: perfData, fetchPerformance } = usePerformanceStore();

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [emailPublic, setEmailPublic] = useState(true);
  const [phone, setPhone] = useState("");
  const [phonePublic, setPhonePublic] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const usernameAvailability = useUsernameAvailability(username, profile?.username || "");

  // Sync state when entering edit mode
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setUsername(profile.username || "");
      setHeadline(profile.headline || "");
      setLocation(profile.location || "");
      setWebsite(profile.website || "");
      setEmail(profile.email || "");
      setEmailPublic(profile.emailPublic ?? true);
      setPhone(profile.phone || "");
      setPhonePublic(profile.phonePublic ?? false);
      setErrors({});
    }
  }, [profile, isEditing]);

  // Focus first input on entering edit mode
  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 50);
    }
  }, [isEditing]);

  // Check if form is dirty
  const isDirty = Boolean(
    profile &&
      (firstName !== (profile.firstName || "") ||
        lastName !== (profile.lastName || "") ||
        username !== (profile.username || "") ||
        headline !== (profile.headline || "") ||
        location !== (profile.location || "") ||
        website !== (profile.website || "") ||
        phone !== (profile.phone || "") ||
        emailPublic !== (profile.emailPublic ?? true) ||
        phonePublic !== (profile.phonePublic ?? false))
  );

  // Warn before unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && isEditing) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isEditing]);

  // Keyboard shortcut: Esc to cancel, Ctrl/Cmd+Enter to save
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancelClick();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, isDirty, firstName, username, website, phone]);

  if (!profile) return null;

  const strength = computeProfileStrength(profile);
  const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.username || "Student";
  const githubConn = profile.connections?.find((c) => c.platform === "github" && c.connected);
  const linkedinConn = profile.connections?.find((c) => c.platform === "linkedin" && c.connected);

  const formattedJoinedDate = profile.dateJoined
    ? new Date(profile.dateJoined).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "Nov 2026";

  const handleCopyLink = () => {
    const publicUrl = buildPublicProfileUrl(profile.username);
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Profile link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar image must be smaller than 5 MB");
      return;
    }
    await uploadAvatar(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleSaveSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!usernameAvailability.canSave || usernameAvailability.isChecking) {
      newErrors.username = usernameAvailability.message || "Invalid or unavailable username";
    }

    if (website && !isValidWebsite(website)) {
      newErrors.website = "Website must start with https://";
    }

    if (phone && !isValidPhone(phone)) {
      newErrors.phone = "Include valid international phone with country code (e.g. +91)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus first error field
      if (newErrors.firstName) firstNameInputRef.current?.focus();
      else if (newErrors.username) usernameInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim().toLowerCase(),
        headline: headline.trim(),
        location: location.trim(),
        website: website.trim(),
        phone: phone.trim(),
        emailPublic,
        phonePublic,
      });

      if (success) {
        setIsEditing(false);
      }
    } catch (err: any) {
      if (
        err?.status === 409 ||
        err?.details?.code === "taken" ||
        err?.details?.field === "username" ||
        err?.message?.includes("taken")
      ) {
        setErrors((prev) => ({
          ...prev,
          username: `${username.trim().toLowerCase()} is already taken`,
        }));
        usernameInputRef.current?.focus();
      } else {
        toast.error(err.message || "Failed to save profile changes");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside
      className="w-full lg:w-[296px] max-w-full min-w-0 box-border text-left flex flex-col items-stretch space-y-5 pt-1"
      style={{ boxSizing: "border-box" }}
    >
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFile}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Discard unsaved changes?"
        description="You have unsaved edits in your profile. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Continue editing"
        variant="danger"
        onConfirm={() => {
          setIsEditing(false);
          setShowDiscardConfirm(false);
        }}
      />

      <ConfirmDialog
        open={showRemovePhotoConfirm}
        onOpenChange={setShowRemovePhotoConfirm}
        title="Remove profile photo?"
        description="Your photo will be deleted and your avatar will revert to your initials."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={async () => {
          await removeAvatar();
          setShowRemovePhotoConfirm(false);
        }}
      />

      {isOwner && isEditing ? (
        /* ================= IN-PLACE EDIT MODE ================= */
        <div
          className="bg-card border border-line rounded-card p-5 space-y-4 w-full min-w-0 box-border text-left"
          style={{ boxSizing: "border-box" }}
        >
          <div className="flex items-center justify-between border-b border-line pb-3 w-full min-w-0">
            <h2 className="text-base font-semibold text-ink">Edit profile</h2>
            <button
              type="button"
              onClick={handleCancelClick}
              className="text-xs text-muted hover:text-ink font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveSubmit();
            }}
            className="space-y-3.5 text-left w-full min-w-0 box-border"
          >
            <div className="grid grid-cols-2 gap-2 w-full min-w-0 box-border">
              <div className="w-full min-w-0 box-border">
                <label className="block text-xs font-medium text-ink mb-1">
                  First name <span className="text-danger">*</span>
                </label>
                <Input
                  ref={firstNameInputRef}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  error={Boolean(errors.firstName)}
                  placeholder="First name"
                  className="w-full min-w-0 box-border"
                />
                {errors.firstName && (
                  <p className="text-[11px] text-danger mt-1">{errors.firstName}</p>
                )}
              </div>
              <div className="w-full min-w-0 box-border">
                <label className="block text-xs font-medium text-ink mb-1">Last name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full min-w-0 box-border"
                />
              </div>
            </div>

            <div className="w-full min-w-0 box-border">
              <label className="block text-xs font-medium text-ink mb-1">
                Username <span className="text-danger">*</span>
              </label>
              <Input
                ref={usernameInputRef}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  if (errors.username) {
                    setErrors((prev) => {
                      const { username: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                error={Boolean(
                  errors.username ||
                    usernameAvailability.status === "taken" ||
                    usernameAvailability.status === "invalid"
                )}
                placeholder="username"
                className="w-full min-w-0 box-border"
              />
              {usernameAvailability.message && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-[11px] mt-1 ${
                    usernameAvailability.status === "available"
                      ? "text-success"
                      : usernameAvailability.status === "taken" ||
                        usernameAvailability.status === "invalid"
                      ? "text-danger"
                      : "text-muted"
                  }`}
                >
                  {usernameAvailability.message}
                </p>
              )}
              {errors.username && !usernameAvailability.message && (
                <p className="text-[11px] text-danger mt-1">{errors.username}</p>
              )}
              <p className="text-[11px] text-muted mt-1 leading-tight">
                Changing your username changes your public link.
              </p>
              <p
                className="font-mono text-[11px] text-muted mt-0.5"
                style={{
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {buildPublicProfileUrl(username || "username")}
              </p>
            </div>

            <div className="w-full min-w-0 box-border">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-ink">Headline</label>
                <span className="text-[10px] text-muted">{headline.length}/120</span>
              </div>
              <Textarea
                value={headline}
                maxLength={120}
                rows={2}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Backend developer | CS student"
                className="w-full min-w-0 box-border"
              />
            </div>

            <div className="w-full min-w-0 box-border">
              <label className="block text-xs font-medium text-ink mb-1">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hyderabad, India"
                className="w-full min-w-0 box-border"
              />
            </div>

            <div className="w-full min-w-0 box-border">
              <label className="block text-xs font-medium text-ink mb-1">Website</label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                error={Boolean(errors.website)}
                placeholder="https://example.com"
                className="w-full min-w-0 box-border"
              />
              <p className="text-[11px] text-muted mt-0.5">Must start with https://</p>
              {errors.website && (
                <p className="text-[11px] text-danger mt-1">{errors.website}</p>
              )}
            </div>

            <div className="w-full min-w-0 box-border">
              <label className="block text-xs font-medium text-ink mb-1">Email</label>
              <div
                className="text-sm text-ink py-1"
                style={{
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {email}
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Managed in your account. Contact support to change it.
              </p>
              <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs text-sub">
                <input
                  type="checkbox"
                  checked={emailPublic}
                  onChange={(e) => setEmailPublic(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Show on public profile</span>
              </label>
            </div>

            <div className="w-full min-w-0 box-border">
              <label className="block text-xs font-medium text-ink mb-1">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={Boolean(errors.phone)}
                placeholder="+919876543210"
                className="w-full min-w-0 box-border"
              />
              <p className="text-[11px] text-muted mt-0.5">Include country code, e.g. +91</p>
              {errors.phone && (
                <p className="text-[11px] text-danger mt-1">{errors.phone}</p>
              )}
              <label className="mt-1.5 flex items-center gap-2 cursor-pointer text-xs text-sub">
                <input
                  type="checkbox"
                  checked={phonePublic}
                  onChange={(e) => setPhonePublic(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Show on public profile</span>
              </label>
            </div>

            <div className="pt-2 flex items-center gap-2 w-full min-w-0 box-border">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full cursor-pointer"
                loading={isSaving}
                disabled={
                  !isDirty ||
                  isSaving ||
                  !usernameAvailability.canSave ||
                  usernameAvailability.isChecking
                }
              >
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelClick}
                disabled={isSaving}
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : (
        /* ================= PERSISTENT VIEW MODE ================= */
        <div
          className="space-y-4 w-full min-w-0 box-border text-left flex flex-col items-stretch"
          style={{ boxSizing: "border-box" }}
        >
          {/* Avatar and photo actions */}
          <div className="flex flex-col items-start text-left w-full min-w-0 box-border pt-1">
            <div className="relative group flex-none">
              <Avatar
                src={profile.avatarUrl}
                name={fullName}
                size="profile"
                className="ring-4 ring-card shadow-sm flex-none w-32 h-32"
              />
            </div>

            {isOwner && (
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-left w-full min-w-0 box-border">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="hover:text-primary font-medium underline-offset-2 hover:underline cursor-pointer transition-colors"
                >
                  Change photo
                </button>
                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setShowRemovePhotoConfirm(true)}
                    className="text-muted hover:text-danger font-medium underline-offset-2 hover:underline cursor-pointer"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Identity details */}
          <div className="text-left space-y-1 w-full min-w-0 box-border">
            <h1
              className="text-2xl font-bold text-ink tracking-tight"
              style={{
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              {fullName}
            </h1>
            <p
              className="text-base text-muted"
              style={{
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              @{profile.username}
            </p>
            {profile.headline ? (
              <p
                className="text-sm text-sub pt-1 leading-snug"
                style={{
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {profile.headline}
              </p>
            ) : isOwner ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs hover:text-primary font-medium mt-1 inline-block cursor-pointer hover:underline transition-colors"
              >
                Add a headline
              </button>
            ) : null}
          </div>

          {/* Full-width In-place Edit Profile button */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full min-w-0 box-border h-9 px-4 rounded-input bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-ink font-medium text-sm transition-colors flex items-center justify-center select-none cursor-pointer"
            >
              Edit profile
            </button>
          )}

          {/* Details list (no icons) */}
          <div className="space-y-2 text-xs sm:text-[13px] text-sub pt-1 border-t border-line w-full min-w-0 box-border text-left">
            {profile.location && (
              <div
                className="grid gap-x-3 text-left w-full min-w-0 pt-2"
                style={{ gridTemplateColumns: "76px minmax(0, 1fr)" }}
              >
                <span className="text-muted">Location</span>
                <span
                  className="font-medium text-ink"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {profile.location}
                </span>
              </div>
            )}

            {profile.website && (
              <div
                className="grid gap-x-3 text-left w-full min-w-0"
                style={{ gridTemplateColumns: "76px minmax(0, 1fr)" }}
              >
                <span className="text-muted">Website</span>
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-primary font-medium hover:underline transition-colors"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {profile.website.replace(/^https?:\/\//, "")}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </div>
            )}

            {profile.email && profile.emailPublic && (
              <div
                className="grid gap-x-3 text-left w-full min-w-0"
                style={{ gridTemplateColumns: "76px minmax(0, 1fr)" }}
              >
                <span className="text-muted">Email</span>
                <a
                  href={`mailto:${profile.email}`}
                  className="hover:text-primary font-medium hover:underline transition-colors"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {profile.email}
                </a>
              </div>
            )}

            {profile.phone && profile.phonePublic && (
              <div
                className="grid gap-x-3 text-left w-full min-w-0"
                style={{ gridTemplateColumns: "76px minmax(0, 1fr)" }}
              >
                <span className="text-muted">Phone</span>
                <span
                  className="font-medium text-ink"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {profile.phone}
                </span>
              </div>
            )}

            {githubConn && (
              <div
                className="grid gap-x-3 text-left w-full min-w-0"
                style={{ gridTemplateColumns: "76px minmax(0, 1fr)" }}
              >
                <span className="text-muted">GitHub</span>
                <a
                  href={`https://github.com/${githubConn.handle}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-primary font-medium hover:underline transition-colors"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  github.com/{githubConn.handle}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </div>
            )}

            {linkedinConn && Boolean(linkedinConn.handle && !linkedinConn.handle.includes(" ")) && (
              <div
                className="grid gap-x-3 text-left w-full min-w-0"
                style={{ gridTemplateColumns: "76px minmax(0, 1fr)" }}
              >
                <span className="text-muted">LinkedIn</span>
                <a
                  href={`https://linkedin.com/in/${linkedinConn.handle}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-primary font-medium hover:underline transition-colors"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  linkedin.com/in/{linkedinConn.handle}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </div>
            )}

            <div
              className="grid gap-x-3 text-left w-full min-w-0"
              style={{ gridTemplateColumns: "76px minmax(0, 1fr)" }}
            >
              <span className="text-muted">Joined</span>
              <span
                className="text-muted"
                style={{
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {formattedJoinedDate}
              </span>
            </div>
          </div>

          {/* Public Profile Link row */}
          {isOwner && (
            <div className="p-3 rounded-card bg-card border border-line space-y-2 w-full min-w-0 box-border text-left">
              <div className="flex items-center gap-2 w-full min-w-0">
                <span
                  className="font-mono text-xs text-muted"
                  style={{
                    flex: "1 1 0%",
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {formatPublicProfileDisplayUrl(profile.username)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="hover:text-primary font-medium text-xs cursor-pointer hover:underline transition-colors"
                  style={{ flex: "none" }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="w-full min-w-0">
                <a
                  href={buildPublicProfileUrl(profile.username)}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-[11px] hover:text-primary text-left transition-colors hover:underline"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  View public profile &rarr;
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </div>
            </div>
          )}

          {/* Hairline Divider */}
          <div className="border-t border-line my-4 w-full" />

          {/* 2x2 Stats Grid */}
          <div
            className="grid gap-2 text-left w-full min-w-0 box-border"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
          >
            <div className="p-3 rounded-card bg-card border border-line min-w-0 box-border">
              <div className="text-xl font-bold text-ink truncate">
                {perfData?.labsCompleted ?? 0}
              </div>
              <div className="text-[11px] text-muted truncate">Labs completed</div>
            </div>
            <div className="p-3 rounded-card bg-card border border-line min-w-0 box-border">
              <div className="text-xl font-bold text-ink truncate">
                {perfData?.stats?.currentStreak ?? 0}
              </div>
              <div className="text-[11px] text-muted truncate">Day streak</div>
            </div>
            <div className="p-3 rounded-card bg-card border border-line min-w-0 box-border">
              <div className="text-xl font-bold text-ink truncate">
                {perfData?.sprintsShipped ?? 0}
              </div>
              <div className="text-[11px] text-muted truncate">Sprints shipped</div>
            </div>
            <div className="p-3 rounded-card bg-card border border-line min-w-0 box-border">
              <div className="text-xl font-bold text-ink truncate">
                {perfData?.mockInterviews ?? 0}
              </div>
              <div className="text-[11px] text-muted truncate">Mock interviews</div>
            </div>
          </div>

          {/* Hairline Divider & Profile Strength */}
          {isOwner && strength.percentage < 100 && (
            <>
              <div className="border-t border-line my-4 w-full" />
              <div className="space-y-2.5 text-left p-3.5 rounded-card bg-card border border-line w-full min-w-0 box-border">
                <div className="flex items-center justify-between text-xs font-semibold text-ink w-full min-w-0">
                  <span>Profile strength</span>
                  <span className="text-primary">{strength.percentage}%</span>
                </div>
                <ProgressBar value={strength.percentage} height={6} />
                <div className="space-y-1.5 pt-1 w-full min-w-0">
                  {strength.incompleteItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs text-muted w-full min-w-0"
                    >
                      <span className="truncate mr-2">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.id === "photo") {
                            fileInputRef.current?.click();
                          } else if (item.id === "github" || item.id === "linkedin") {
                            onNavigateTab?.("connections");
                          } else {
                            onNavigateTab?.("overview");
                          }
                        }}
                        className="hover:text-primary font-medium text-xs flex-none cursor-pointer hover:underline transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
};
