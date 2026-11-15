import React, { useRef, useState } from "react";
import { Section } from "@/components/profile-ui/Section";
import { Button } from "@/components/profile-ui/Button";
import { useProfileStore } from "../store/profileStore";
import { formatFileSize, formatRelativeTime } from "@/lib/dateHelpers";
import { toast } from "@/lib/toastStore";
import { ConfirmDialog } from "@/components/profile-ui/ConfirmDialog";
import { OwnerOnly } from "@/components/profile-ui/OwnerOnly";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

export const ResumeSection: React.FC<{ isOwner?: boolean }> = ({
  isOwner = true,
}) => {
  const { profile, uploadResume, removeResume } = useProfileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resume = profile?.resume;

  const handleValidateAndUpload = async (file?: File) => {
    if (!file) return;

    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error("Please upload a PDF, DOC, or DOCX document.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Resume file size must be 5 MB or less.");
      return;
    }

    setUploading(true);
    await uploadResume(file);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleValidateAndUpload(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleValidateAndUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const extension = resume?.fileName?.split(".").pop()?.toUpperCase() || "PDF";
  const uploadedLabel = resume?.uploadedAt ? formatRelativeTime(resume.uploadedAt) : "";

  return (
    <>
      <Section
        id="resume-section"
        title="Resume"
        eyebrow="Documents"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload resume file"
        />

        {resume ? (
          <div className="flex items-center justify-between gap-4 p-4 rounded-card border border-line bg-card">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* File-type typographic badge */}
              <div className="h-10 w-10 rounded-input bg-primary-subtle text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {extension === "DOC" || extension === "DOCX" ? "DOC" : "PDF"}
              </div>

              <div className="space-y-0.5 min-w-0">
                <a
                  href={resume.url || "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold text-sm hover:text-primary hover:underline truncate block transition-colors"
                  title={resume.fileName}
                >
                  {resume.fileName}
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>{formatFileSize(resume.fileSize)}</span>
                  {uploadedLabel && (
                    <>
                      <span>&bull;</span>
                      <span>Uploaded {uploadedLabel}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <OwnerOnly isOwner={isOwner}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  loading={uploading}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted hover:text-danger"
                  onClick={() => setConfirmOpen(true)}
                >
                  Remove
                </Button>
              </OwnerOnly>
            </div>
          </div>
        ) : (
          <OwnerOnly isOwner={isOwner}>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col items-center justify-center p-8 rounded-card border-2 border-dashed transition-colors text-center ${
                isDragOver
                  ? "border-primary bg-primary-subtle/50"
                  : "border-line bg-card/40 hover:bg-card/70"
              }`}
            >
              <h4 className="text-sm font-semibold text-ink">
                Upload your resume
              </h4>
              <p className="mt-1 text-xs text-muted max-w-sm">
                PDF, DOC, or DOCX documents up to 5 MB
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                >
                  Choose file
                </Button>
              </div>
            </div>
          </OwnerOnly>
        )}
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove resume?"
        description="Are you sure you want to remove your resume? You will need to re-upload it to share with recruiters."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={removeResume}
      />
    </>
  );
};
