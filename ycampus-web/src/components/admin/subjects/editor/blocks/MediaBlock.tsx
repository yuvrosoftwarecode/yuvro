import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Image as ImageIcon,
  Video,
  FileText,
  UploadCloud,
  Loader2,
} from "lucide-react";
import { fileService } from "@/services/fileService";

interface MediaBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const MediaBlock: React.FC<MediaBlockProps> = ({ block, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await fileService.uploadFile(file);
      onChange({
        metadata: {
          ...block.metadata,
          url: response.url,
          filename: file.name,
        },
      });
    } catch (error) {
      console.error("Failed to upload file", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const getIcon = () => {
    if (block.type === "image") return <ImageIcon className="w-5 h-5" />;
    if (block.type === "video") return <Video className="w-5 h-5" />;
    if (block.type === "pdf") return <FileText className="w-5 h-5" />;
    return null;
  };

  return (
    <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 capitalize mb-2">
        {getIcon()} {block.type} Block
      </div>

      {!block.metadata?.url ? (
        <div
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
          ) : (
            <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
          )}
          <p className="text-sm font-medium text-slate-700">
            {uploading ? "Uploading..." : `Click to upload ${block.type}`}
          </p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={
              block.type === "image"
                ? "image/*"
                : block.type === "video"
                  ? "video/*, .mp4"
                  : ".pdf"
            }
            onChange={handleUpload}
          />

          {block.type === "video" && (
            <div
              className="mt-4 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-slate-500 mb-2">
                Or paste a YouTube URL:
              </p>
              <Input
                placeholder="https://youtube.com/..."
                className="text-sm"
                onBlur={(e) => {
                  if (e.target.value) {
                    onChange({
                      metadata: { ...block.metadata, url: e.target.value },
                    });
                  }
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {block.type === "image" && (
            <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white">
              <img
                src={block.metadata.url}
                alt="Preview"
                className="max-w-full max-h-[300px] object-contain mx-auto"
              />
            </div>
          )}
          {block.type === "video" && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              {block.metadata.url.includes("youtube") ||
              block.metadata.url.includes("youtu.be") ? (
                <iframe
                  src={`https://www.youtube.com/embed/${block.metadata.url.split("v=")[1]?.split("&")[0] || block.metadata.url.split("/").pop()}`}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <video
                  src={block.metadata.url}
                  controls
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          )}
          {block.type === "pdf" && (
            <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg">
              <div className="w-10 h-10 bg-red-100 text-red-600 flex items-center justify-center rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {block.metadata.filename || "Document.pdf"}
                </p>
                <p className="text-xs text-slate-500">PDF Document</p>
              </div>
            </div>
          )}

          {(block.type === "image" || block.type === "video") && (
            <Input
              value={block.metadata.caption || ""}
              onChange={(e) =>
                onChange({
                  metadata: { ...block.metadata, caption: e.target.value },
                })
              }
              placeholder="Add a caption..."
              className="border-none shadow-none focus-visible:ring-0 px-1 bg-transparent text-center text-sm text-slate-600"
            />
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  metadata: { ...block.metadata, url: null, filename: null },
                })
              }
            >
              Replace File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
