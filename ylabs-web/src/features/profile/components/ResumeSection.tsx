import React, { useRef, useState } from "react";
import { Card } from "@/components/profile-ui/Card";
import { useProfileStore } from "../store/profileStore";
import { formatFileSize } from "@/lib/dateHelpers";
import { toast } from "@/lib/toastStore";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

export const ResumeSection: React.FC = () => {
  const { profile, uploadResume, removeResume } = useProfileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-base font-semibold text-ink">Resume</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload resume file"
      />

      {resume ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Soft blue PDF badge */}
            <div className="h-9 w-9 rounded-lg bg-[#eef4ff] text-[#3558c8] font-bold text-xs flex items-center justify-center shrink-0">
              PDF
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-sm text-ink">{resume.fileName}</p>
              <p className="text-xs text-muted">{formatFileSize(resume.fileSize)}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sub hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              {uploading ? "Uploading..." : "Replace"}
            </button>
            <button
              type="button"
              onClick={removeResume}
              className="text-sub hover:text-danger transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm font-medium text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
          >
            {uploading ? "Uploading..." : "+ Upload resume"}
          </button>
        </div>
      )}
    </Card>
  );
};
