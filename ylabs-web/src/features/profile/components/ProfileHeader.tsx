import React, { useRef, useState } from "react";
import { useProfileStore } from "../store/profileStore";
import { toast } from "@/lib/toastStore";
import { MapPin, Camera, Trash2, Loader2, UploadCloud, Edit2 } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";

interface ProfileHeaderProps {
  activeTab: "profile" | "performance" | "settings";
  onTabChange: (tab: "profile" | "performance" | "settings") => void;
  onEditProfile?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  activeTab,
  onTabChange,
  onEditProfile,
}) => {
  const { profile, uploadAvatar, removeAvatar, uploadCover, removeCover } = useProfileStore();
  const [copied, setCopied] = useState(false);

  const [coverDropdownOpen, setCoverDropdownOpen] = useState(false);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const coverRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(coverRef, () => setCoverDropdownOpen(false));
  useClickOutside(avatarRef, () => setAvatarDropdownOpen(false));

  if (!profile) return null;

  const fullName =
    `${profile.firstName} ${profile.lastName}`.trim() ||
    profile.username ||
    profile.email?.split("@")[0] ||
    "Student";
  const initial = (
    profile.firstName?.[0] ||
    profile.username?.[0] ||
    profile.email?.[0] ||
    "S"
  ).toUpperCase();
  const publicUrl = profile.username
    ? `yuvro.com/u/${profile.username}`
    : profile.email
    ? `yuvro.com/u/${profile.email.split("@")[0]}`
    : "yuvro.com";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${publicUrl}`);
      setCopied(true);
      toast.success("Profile link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    setCoverDropdownOpen(false);
    await uploadCover(file);
    setIsUploadingCover(false);
    e.target.value = "";
  };

  const handleRemoveCover = async () => {
    setIsUploadingCover(true);
    setCoverDropdownOpen(false);
    await removeCover();
    setIsUploadingCover(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    setAvatarDropdownOpen(false);
    await uploadAvatar(file);
    setIsUploadingAvatar(false);
    e.target.value = "";
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setAvatarDropdownOpen(false);
    await removeAvatar();
    setIsUploadingAvatar(false);
  };

  const isProfile = activeTab === "profile";
  const isPerformance = activeTab === "performance";
  const isSettings = activeTab === "settings";

  return (
    <div className="space-y-4">
      {/* Standalone White Header Card with Hero Banner */}
      <div className="rounded-[12px] border border-line bg-card overflow-hidden shadow-sm">
        {/* Cover Banner */}
        <div
          className="relative h-44 sm:h-52 w-full overflow-hidden bg-gradient-to-r from-[#eef2ff] via-[#f0fdf4] to-[#f8fafc] dark:from-[#1e293b] dark:to-[#0f172a]"
          style={
            profile.coverUrl
              ? {
                  backgroundImage: `url(${profile.coverUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {profile.coverUrl && (
            <div className="absolute inset-0 bg-black/20" />
          )}

          {/* Hidden Cover File Input */}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
          />

          {/* Cover Action Button */}
          <div className="absolute top-4 right-4 z-20" ref={coverRef}>
            {!profile.coverUrl ? (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="cursor-pointer bg-white/90 hover:bg-white dark:bg-card/90 dark:hover:bg-card text-ink px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-sm shadow-sm transition-colors border border-line/60"
              >
                {isUploadingCover ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5 text-primary" />
                )}
                <span>{isUploadingCover ? "Uploading..." : "Upload cover"}</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCoverDropdownOpen(!coverDropdownOpen)}
                  disabled={isUploadingCover}
                  className="cursor-pointer bg-white/90 hover:bg-white dark:bg-card/90 dark:hover:bg-card text-ink px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-sm shadow-sm transition-colors border border-line/60"
                >
                  {isUploadingCover ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Edit2 className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>{isUploadingCover ? "Updating..." : "Edit cover"}</span>
                </button>
                {coverDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-30 w-36 bg-card border border-line rounded-lg shadow-lg overflow-hidden py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCoverDropdownOpen(false);
                        coverInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-sub hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="w-full text-left px-3 py-2 text-xs text-danger hover:bg-danger-subtle flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Info Row (Avatar + Details + Actions) */}
        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-12 sm:-mt-14 mb-2">
            {/* Avatar + Info */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar Container with overlapping position */}
              <div className="relative group/avatar shrink-0 select-none" ref={avatarRef}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />

                <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-card bg-card shadow-md overflow-hidden flex items-center justify-center">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={`${fullName}'s profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#eef4ff] text-[#3558c8] flex items-center justify-center text-3xl font-bold">
                      {initial}
                    </div>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 grid place-items-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Avatar Action Trigger Button (Camera Pill) */}
                <div className="absolute bottom-0 right-0">
                  {!profile.avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      aria-label="Upload profile photo"
                      className="h-8 w-8 rounded-full bg-card border border-line text-sub hover:text-primary shadow-sm flex items-center justify-center transition-colors cursor-pointer"
                      title="Upload profile photo"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                        disabled={isUploadingAvatar}
                        aria-label="Edit profile photo"
                        className="h-8 w-8 rounded-full bg-card border border-line text-sub hover:text-primary shadow-sm flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit profile photo"
                      >
                        <Camera className="w-4 h-4" />
                      </button>

                      {avatarDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-30 w-36 bg-card border border-line rounded-lg shadow-lg overflow-hidden py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarDropdownOpen(false);
                              avatarInputRef.current?.click();
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-sub hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" /> Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="w-full text-left px-3 py-2 text-xs text-danger hover:bg-danger-subtle flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Text Info */}
              <div className="space-y-1 min-w-0 pb-1">
                <h1 className="text-2xl font-bold text-ink tracking-tight">
                  {fullName}
                </h1>

                {profile.headline && (
                  <p className="text-[15px] text-sub leading-snug">
                    {profile.headline}
                  </p>
                )}

                {profile.location && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted pt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                      <span>{profile.location}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Links */}
            <div className="flex items-center gap-5 self-start sm:self-end shrink-0 text-sm pb-2">
              <button
                type="button"
                onClick={onEditProfile || (() => onTabChange("settings"))}
                className="text-sub hover:text-primary font-medium transition-colors cursor-pointer bg-transparent border-0 p-0"
              >
                Edit profile
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="text-sub hover:text-primary font-medium transition-colors cursor-pointer bg-transparent border-0 p-0"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Navigation Tabs (outside the card on the gray background) */}
      <nav
        role="tablist"
        aria-label="Profile navigation"
        className="flex items-center gap-8 border-b border-line pt-2 text-sm font-medium"
      >
        <button
          type="button"
          role="tab"
          aria-selected={isProfile}
          aria-current={isProfile ? "page" : undefined}
          onClick={() => onTabChange("profile")}
          className={`pb-3 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none ${
            isProfile
              ? "text-ink font-semibold border-b-2 border-primary -mb-px"
              : "text-muted hover:text-ink"
          }`}
        >
          Profile
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isPerformance}
          aria-current={isPerformance ? "page" : undefined}
          onClick={() => onTabChange("performance")}
          className={`pb-3 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none ${
            isPerformance
              ? "text-ink font-semibold border-b-2 border-primary -mb-px"
              : "text-muted hover:text-ink"
          }`}
        >
          Performance
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isSettings}
          aria-current={isSettings ? "page" : undefined}
          onClick={() => onTabChange("settings")}
          className={`pb-3 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none ${
            isSettings
              ? "text-ink font-semibold border-b-2 border-primary -mb-px"
              : "text-muted hover:text-ink"
          }`}
        >
          Settings
        </button>
      </nav>
    </div>
  );
};
