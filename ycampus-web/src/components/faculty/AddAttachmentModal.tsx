import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import attachmentService, { ALLOWED_FILE_TYPES, ALLOWED_MIME_TYPES, formatFileSize } from '@/services/attachmentService';
import type { Attachment } from '@/services/attachmentService';

interface SelectOption {
  id: string;
  name: string;
}

interface BatchOption {
  id: string;
  name: string;
}

interface AddAttachmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Options from the syllabus page */
  batches: BatchOption[];
  allAssignments: any[];
  editAttachment?: Attachment | null;
}

// -- Helpers: all filter by batch_name so all departments under a year-range are visible --

function getUniqueDepts(assignments: any[], batchName: string): SelectOption[] {
  if (!batchName) return [];
  const depts = new Map<string, string>();
  assignments
    .filter(a => a.semester_subject_details?.batch_name === batchName)
    .forEach(a => {
      if (a.semester_subject_details?.department_id && a.semester_subject_details?.department_name) {
        depts.set(String(a.semester_subject_details.department_id), a.semester_subject_details.department_name);
      }
    });
  return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
}

function getUniqueSubjects(assignments: any[], batchName: string, departmentIds: string[]): SelectOption[] {
  if (!batchName || departmentIds.length === 0) return [];
  const subs = new Map<string, { name: string; code?: string }>();
  assignments
    .filter(a =>
      a.semester_subject_details?.batch_name === batchName &&
      departmentIds.includes(String(a.semester_subject_details?.department_id))
    )
    .forEach(a => {
      const details = a.semester_subject_details?.subject_details;
      if (details) {
        subs.set(String(details.id), {
          name: details.subject_name || details.name || 'Unknown',
          code: details.short_code,
        });
      }
    });
  return Array.from(subs.entries()).map(([id, info]) => ({ id, name: info.name + (info.code ? ` (${info.code})` : '') }));
}

function getUniqueSections(assignments: any[], batchName: string, departmentIds: string[], subjectId: string): SelectOption[] {
  if (!batchName || departmentIds.length === 0 || !subjectId) return [];
  const seen = new Map<string, string>();
  assignments
    .filter(a =>
      a.semester_subject_details?.batch_name === batchName &&
      departmentIds.includes(String(a.semester_subject_details?.department_id)) &&
      String(a.semester_subject_details?.subject_details?.id) === subjectId
    )
    .forEach(a => {
      const id = String(a.section);
      const name = a.section_name || `Section ${a.section}`;
      if (!seen.has(id)) seen.set(id, name);
    });
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

/** Resolve the real Batch UUID from (batch_name + dept_id) for the API POST */
function getBatchIdForSubmit(assignments: any[], batchName: string, deptId: string): string {
  const match = assignments.find(a =>
    a.semester_subject_details?.batch_name === batchName &&
    String(a.semester_subject_details?.department_id) === deptId
  );
  return String(match?.semester_subject_details?.batch_id || '');
}

const AddAttachmentModal: React.FC<AddAttachmentModalProps> = ({
  open,
  onClose,
  onSuccess,
  batches,
  allAssignments,
  editAttachment,
}) => {
  const { toast } = useToast();

  // selectedBatch stores the batch YEAR-RANGE NAME (e.g. "2024-2028"), not a UUID
  // The real batch UUID is resolved at submit time from (batchName + deptId)
  const [selectedBatch, setSelectedBatch] = useState<string>(editAttachment?.batch_name || '');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(
    editAttachment?.departments?.map(String) || []
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(editAttachment?.subject || '');
  const [selectedSections, setSelectedSections] = useState<string[]>(
    editAttachment?.sections?.map(String) || []
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deptOptions = getUniqueDepts(allAssignments, selectedBatch);
  const subjectOptions = getUniqueSubjects(allAssignments, selectedBatch, selectedDepts);
  const sectionOptions = getUniqueSections(allAssignments, selectedBatch, selectedDepts, selectedSubject);

  const resetForm = () => {
    setSelectedBatch('');
    setSelectedDepts([]);
    setSelectedSubject('');
    setSelectedSections([]);
    setFile(null);
    setFileError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateFile = (f: File): string => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(ext) && !ALLOWED_MIME_TYPES.includes(f.type)) {
      return `Unsupported file type. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`;
    }
    if (f.size > 50 * 1024 * 1024) {
      return 'File size must be under 50 MB.';
    }
    return '';
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
    } else {
      setFileError('');
      setFile(f);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const toggleDept = (id: string) => {
    setSelectedDepts(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
    setSelectedSubject('');
    setSelectedSections([]);
  };

  const toggleSection = (id: string) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const isFormValid =
    selectedBatch &&
    selectedDepts.length > 0 &&
    selectedSubject &&
    selectedSections.length > 0 &&
    (file || editAttachment);

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setUploading(true);
    try {
      // Resolve the real batch UUID from (batch_name + first selected dept_id)
      const batchId = getBatchIdForSubmit(allAssignments, selectedBatch, selectedDepts[0]);
      if (!batchId) {
        toast({ title: 'Error', description: 'Could not resolve batch ID. Please re-select batch and department.', variant: 'destructive' });
        setUploading(false);
        return;
      }
      const formData = new FormData();
      formData.append('batch', batchId);
      selectedDepts.forEach(d => formData.append('departments', d));
      formData.append('subject', selectedSubject);
      selectedSections.forEach(s => formData.append('sections', s));
      if (file) formData.append('file', file);

      if (editAttachment) {
        await attachmentService.update(editAttachment.id, formData);
        toast({ title: 'Updated', description: 'Attachment updated successfully.' });
      } else {
        await attachmentService.upload(formData);
        toast({ title: 'Uploaded', description: 'Attachment uploaded successfully.' });
      }
      handleClose();
      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Failed to upload attachment.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const fileIconColor = (type: string) => {
    if (type.includes('pdf')) return 'text-red-500';
    if (type.includes('image')) return 'text-blue-500';
    if (type.includes('zip')) return 'text-yellow-500';
    if (type.includes('word') || type.includes('doc')) return 'text-blue-700';
    if (type.includes('powerpoint') || type.includes('ppt')) return 'text-orange-500';
    return 'text-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {editAttachment ? 'Edit Attachment' : 'Add Attachment'}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-sm mt-1">
              Upload learning materials and share them with selected students.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Batch */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
              Batch <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedBatch} onValueChange={v => {
              setSelectedBatch(v);
              setSelectedDepts([]);
              setSelectedSubject('');
              setSelectedSections([]);
            }}>
              <SelectTrigger className="bg-gray-50 border-gray-200 h-10">
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department multi-select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
              Department(s) <span className="text-red-500">*</span>
            </Label>
            {!selectedBatch ? (
              <p className="text-xs text-muted-foreground py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
                Select a batch first
              </p>
            ) : (
              <div className="border border-gray-200 rounded-xl bg-gray-50 p-2 space-y-1 max-h-36 overflow-y-auto">
                {deptOptions.map(dept => (
                  <label
                    key={dept.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedDepts.includes(dept.id)
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-white border border-transparent'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selectedDepts.includes(dept.id) ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}>
                      {selectedDepts.includes(dept.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedDepts.includes(dept.id)}
                      onChange={() => toggleDept(dept.id)}
                    />
                    <span className={`text-sm font-medium ${selectedDepts.includes(dept.id) ? 'text-primary' : 'text-gray-700'}`}>
                      {dept.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedDepts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedDepts.map(id => {
                  const d = deptOptions.find(o => o.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {d?.name}
                      <button onClick={() => toggleDept(id)} className="ml-1 hover:text-primary/60">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedSubject}
              onValueChange={v => { setSelectedSubject(v); setSelectedSections([]); }}
              disabled={selectedDepts.length === 0}
            >
              <SelectTrigger className="bg-gray-50 border-gray-200 h-10">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section multi-select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
              Section(s) <span className="text-red-500">*</span>
            </Label>
            {!selectedSubject ? (
              <p className="text-xs text-muted-foreground py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
                Select a subject first
              </p>
            ) : (
              <div className="border border-gray-200 rounded-xl bg-gray-50 p-2 flex flex-wrap gap-2">
                {sectionOptions.map(sec => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
                      selectedSections.includes(sec.id)
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
                    }`}
                  >
                    {sec.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
              {editAttachment ? 'Replace File (optional)' : 'Upload Attachment'} {!editAttachment && <span className="text-red-500">*</span>}
            </Label>

            {file ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <FileText className={`w-8 h-8 flex-shrink-0 ${fileIconColor(file.type)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : editAttachment?.file_name ? (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-2">
                <FileText className="w-6 h-6 text-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-blue-700 font-medium">Current file: {editAttachment.file_name}</p>
                </div>
              </div>
            ) : null}

            {!file && (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : fileError
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50/50'
                }`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isDragging ? 'bg-primary/20' : 'bg-gray-100'
                  }`}>
                    <Upload className={`w-6 h-6 transition-colors ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {isDragging ? 'Drop your file here' : 'Drag & drop or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, PPT, PPTX, DOC, DOCX, ZIP, PNG, JPG · Max 50MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {fileError && (
              <div className="flex items-center gap-2 text-red-600 text-xs mt-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {fileError}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50/50">
          <Button variant="ghost" onClick={handleClose} className="font-semibold text-gray-500" disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || uploading}
            className="bg-primary hover:bg-primary/90 px-6 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editAttachment ? 'Updating...' : 'Uploading...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {editAttachment ? 'Update Attachment' : 'Upload Attachment'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAttachmentModal;
