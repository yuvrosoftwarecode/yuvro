import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, FileText, CheckCircle2, AlertCircle, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import attachmentService, { ALLOWED_FILE_TYPES, ALLOWED_MIME_TYPES, formatFileSize } from '@/services/attachmentService';

interface SyllabusAttachModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Context passed down from the Syllabus page */
  context: {
    type: 'subject' | 'unit' | 'subunit';
    label: string;       // e.g. "Unit 1: Basics" or "Sub-Unit: Introduction"
    unitId?: string;
    subUnitId?: string;
    subjectId: string;
    batchId: string;
    departmentId: string;
    sectionId: string;
  };
}

const SyllabusAttachModal: React.FC<SyllabusAttachModalProps> = ({
  open, onClose, onSuccess, context,
}) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setUploadError(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    if (uploading) return;
    resetState();
    onClose();
  };

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(f.type) && !ALLOWED_FILE_TYPES.some(ext => f.name.toLowerCase().endsWith(ext))) {
      return `File type not supported. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`;
    }
    if (f.size > 50 * 1024 * 1024) {
      return 'File size must be under 50 MB.';
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    setUploadError(null);
    const err = validateFile(f);
    if (err) {
      setUploadError(err);
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('batch', context.batchId);
      formData.append('subject', context.subjectId);
      formData.append('departments', context.departmentId);
      formData.append('sections', context.sectionId);

      // Associate with the correct Unit or Sub-Unit (if not general subject attachment)
      if (context.type === 'unit' && context.unitId) {
        formData.append('unit', context.unitId);
      } else if (context.type === 'subunit' && context.unitId && context.subUnitId) {
        formData.append('unit', context.unitId);
        formData.append('sub_unit', context.subUnitId);
      }

      await attachmentService.upload(formData);

      toast({
        title: 'Attachment Uploaded',
        description: `File uploaded successfully for "${context.label}".`,
      });

      resetState();
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Upload failed. Please try again.';
      setUploadError(msg);
      toast({ title: 'Upload Failed', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 min-w-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />
              Add Attachment
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm mt-1 line-clamp-2 break-words">
              {context.label}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5 min-w-0 w-full">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer min-w-0 ${
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : file
                ? 'border-emerald-400 bg-emerald-50 cursor-default'
                : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ALLOWED_FILE_TYPES.join(',')}
              onChange={handleInputChange}
            />

            {file ? (
              <div className="flex items-center gap-3 w-full overflow-hidden">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-800 truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="p-1 rounded-full hover:bg-emerald-200 text-emerald-600 transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Drop a file here or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, Images — up to 50 MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {uploadError && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={handleClose} disabled={uploading} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="rounded-xl bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 active:scale-95 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyllabusAttachModal;
