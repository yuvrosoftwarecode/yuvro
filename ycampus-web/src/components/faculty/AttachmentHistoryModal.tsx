import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2, Search, FolderOpen, Download, Eye, Pencil, Trash2,
  FileText, FileImage, FileArchive, File as FileFallback, X, FileCode,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import attachmentService, { formatFileSize } from '@/services/attachmentService';
import type { Attachment } from '@/services/attachmentService';
import AddAttachmentModal from './AddAttachmentModal';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';
import { BaseFileViewer, getFileType } from '@/components/shared/BaseFileViewer';
import JSZip from 'jszip';

interface ExtractedZipFile {
  name: string;
  path: string;
  type: 'image' | 'pdf' | 'text' | 'document' | 'unknown';
  text?: string;
  url?: string;
}

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml'
};

const ZipFileIcon = ({ type }: { type: string }) => {
  if (type === 'image') return <FileImage className="h-3.5 w-3.5 shrink-0" />;
  if (type === 'text') return <FileCode className="h-3.5 w-3.5 shrink-0" />;
  return <FileText className="h-3.5 w-3.5 shrink-0" />;
};

interface AttachmentHistoryModalProps {
  open: boolean;
  onClose: () => void;
  batches: { id: string; name: string }[];
  allAssignments: any[];
}

function fileIcon(type: string) {
  if (type?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (type?.includes('image')) return <FileImage className="w-5 h-5 text-blue-500" />;
  if (type?.includes('zip') || type?.includes('compressed')) return <FileArchive className="w-5 h-5 text-yellow-500" />;
  if (type?.includes('word') || type?.includes('doc')) return <FileText className="w-5 h-5 text-blue-700" />;
  if (type?.includes('powerpoint') || type?.includes('ppt') || type?.includes('presentation')) return <FileText className="w-5 h-5 text-orange-500" />;
  return <FileFallback className="w-5 h-5 text-gray-400" />;
}

function fileTypeBadge(type: string, fileName: string) {
  const ext = fileName?.split('.').pop()?.toUpperCase() || 'FILE';
  const colors: Record<string, string> = {
    PDF: 'bg-red-50 text-red-600 border-red-100',
    PNG: 'bg-blue-50 text-blue-600 border-blue-100',
    JPG: 'bg-blue-50 text-blue-600 border-blue-100',
    JPEG: 'bg-blue-50 text-blue-600 border-blue-100',
    WEBP: 'bg-blue-50 text-blue-600 border-blue-100',
    ZIP: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    DOC: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    DOCX: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    PPT: 'bg-orange-50 text-orange-600 border-orange-100',
    PPTX: 'bg-orange-50 text-orange-600 border-orange-100',
  };
  const cls = colors[ext] || 'bg-gray-50 text-gray-600 border-gray-100';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${cls}`}>
      {ext}
    </span>
  );
}

function getUniqueDepts(assignments: any[], batchName: string) {
  if (!batchName) return [];
  const depts = new Map<string, string>();
  assignments
    .filter(a => a.semester_subject_details?.batch_name === batchName)
    .forEach(a => {
      if (a.semester_subject_details?.department_id)
        depts.set(String(a.semester_subject_details.department_id), a.semester_subject_details.department_name);
    });
  return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
}

function getSubjectsForFilter(assignments: any[], batchName: string, deptId: string) {
  if (!batchName || !deptId) return [];
  const subs = new Map<string, string>();
  assignments
    .filter(a =>
      a.semester_subject_details?.batch_name === batchName &&
      String(a.semester_subject_details?.department_id) === deptId
    )
    .forEach(a => {
      const d = a.semester_subject_details?.subject_details;
      if (d) subs.set(String(d.id), d.subject_name || d.name);
    });
  return Array.from(subs.entries()).map(([id, name]) => ({ id, name }));
}

function getSectionsForFilter(assignments: any[], batchName: string, deptId: string, subjectId: string) {
  if (!batchName || !deptId || !subjectId) return [];
  const seen = new Map<string, string>();
  assignments
    .filter(a =>
      a.semester_subject_details?.batch_name === batchName &&
      String(a.semester_subject_details?.department_id) === deptId &&
      String(a.semester_subject_details?.subject_details?.id) === subjectId
    )
    .forEach(a => seen.set(String(a.section), a.section_name || `Section ${a.section}`));
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

const AttachmentHistoryModal: React.FC<AttachmentHistoryModalProps> = ({
  open, onClose, batches, allAssignments,
}) => {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterBatch, setFilterBatch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals/dialogs state
  const [editAttachment, setEditAttachment] = useState<Attachment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');
  const [previewName, setPreviewName] = useState<string>('');

  // ZIP extraction state (for preview dialog)
  const [zipFiles, setZipFiles] = useState<ExtractedZipFile[]>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<ExtractedZipFile | null>(null);
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [zipSearchQuery, setZipSearchQuery] = useState('');

  const filterDeptOptions = getUniqueDepts(allAssignments, filterBatch);
  const filterSubjectOptions = getSubjectsForFilter(allAssignments, filterBatch, filterDept);
  const filterSectionOptions = getSectionsForFilter(allAssignments, filterBatch, filterDept, filterSubject);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      // Note: filterBatch stores a year-range name (e.g. "2024-2028"), not a UUID.
      // The API batch filter expects a UUID, so we omit it and filter client-side below.
      const data = await attachmentService.list({
        department: filterDept || undefined,
        subject: filterSubject || undefined,
        section: filterSection || undefined,
        search: searchQuery || undefined,
      });
      setAttachments(data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load attachments.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Load on open or filter change
  useEffect(() => {
    if (open) loadAttachments();
  }, [open, filterBatch, filterDept, filterSubject, filterSection, searchQuery]);

  const filteredAttachments = useMemo(() => {
    let result = attachments;
    // Filter by batch name client-side (API only accepts UUID for batch)
    if (filterBatch) {
      result = result.filter(a => a.batch_name === filterBatch);
    }
    if (!searchQuery) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(a =>
      a.file_name.toLowerCase().includes(q) ||
      a.subject_name?.toLowerCase().includes(q)
    );
  }, [attachments, filterBatch, searchQuery]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await attachmentService.delete(deleteTarget.id);
      toast({ title: 'Deleted', description: 'Attachment deleted successfully.' });
      setDeleteTarget(null);
      await loadAttachments();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete attachment.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleView = async (attachment: Attachment) => {
    if (!attachment.file) {
      toast({ title: 'No file', description: 'File URL not available.', variant: 'destructive' });
      return;
    }
    // Reset ZIP state
    setZipFiles([]);
    setSelectedZipFile(null);
    setZipSearchQuery('');
    setPreviewUrl(attachment.file);
    setPreviewType(attachment.file_type || '');
    setPreviewName(attachment.file_name);

    const isZip = attachment.file_type?.includes('zip') || attachment.file_type?.includes('rar') || attachment.file_name?.toLowerCase().endsWith('.zip');
    if (isZip) {
      setIsExtractingZip(true);
      try {
        const url = attachment.file.startsWith('http') ? attachment.file : `http://${attachment.file}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Fetch failed');
        const blob = await res.blob();
        const zip = new JSZip();
        const loaded = await zip.loadAsync(blob);
        const files: ExtractedZipFile[] = [];
        for (const [path, entry] of Object.entries(loaded.files)) {
          if (!entry.dir && !path.startsWith('__MACOSX/') && !path.includes('/.')) {
            const type = getFileType(entry.name);
            const ext = entry.name.split('.').pop()?.toLowerCase() || '';
            const fd: ExtractedZipFile = { name: entry.name.split('/').pop() || entry.name, path, type };
            if (type === 'text') {
              fd.text = await entry.async('string');
            } else {
              const data = await entry.async('uint8array');
              const b = new Blob([data.buffer as ArrayBuffer], { type: MIME_TYPES[ext] || 'application/octet-stream' });
              fd.url = URL.createObjectURL(b);
            }
            files.push(fd);
          }
        }
        const sorted = files.sort((a, b) => a.name.localeCompare(b.name));
        setZipFiles(sorted);
        if (sorted.length > 0) setSelectedZipFile(sorted[0]);
      } catch (err) {
        console.error('ZIP extraction failed', err);
      } finally {
        setIsExtractingZip(false);
      }
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const a = document.createElement('a');
    a.href = attachment.file;
    a.download = attachment.file_name;
    a.click();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={o => !o && onClose()}>
        <DialogContent className="max-w-5xl rounded-2xl p-0 border-none shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-400" />
                Attachment History
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Filters */}
          <div className="bg-gray-50/80 border-b px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select
                value={filterBatch || '__all__'}
                onValueChange={v => { const val = v === '__all__' ? '' : v; setFilterBatch(val); setFilterDept(''); setFilterSubject(''); setFilterSection(''); }}
              >
                <SelectTrigger className="bg-white border-gray-200 h-9 text-sm">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Batches</SelectItem>
                  {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={filterDept || '__all__'}
                onValueChange={v => { const val = v === '__all__' ? '' : v; setFilterDept(val); setFilterSubject(''); setFilterSection(''); }}
                disabled={!filterBatch}
              >
                <SelectTrigger className="bg-white border-gray-200 h-9 text-sm">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Departments</SelectItem>
                  {filterDeptOptions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={filterSubject || '__all__'}
                onValueChange={v => { const val = v === '__all__' ? '' : v; setFilterSubject(val); setFilterSection(''); }}
                disabled={!filterDept}
              >
                <SelectTrigger className="bg-white border-gray-200 h-9 text-sm">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Subjects</SelectItem>
                  {filterSubjectOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={filterSection || '__all__'}
                onValueChange={v => setFilterSection(v === '__all__' ? '' : v)}
                disabled={!filterSubject}
              >
                <SelectTrigger className="bg-white border-gray-200 h-9 text-sm">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Sections</SelectItem>
                  {filterSectionOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm bg-white border-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto max-h-[50vh]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
              </div>
            ) : filteredAttachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="w-12 h-12 text-gray-200 mb-3" />
                <p className="font-semibold text-gray-500">No attachments found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting filters or upload a new attachment.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left">
                    {['File Name', 'Type', 'Batch', 'Department(s)', 'Subject', 'Section(s)', 'Uploaded By', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAttachments.map(att => (
                    <tr key={att.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {fileIcon(att.file_type)}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[150px]" title={att.file_name}>{att.file_name}</p>
                            <p className="text-[10px] text-muted-foreground">{formatFileSize(att.file_size)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{fileTypeBadge(att.file_type, att.file_name)}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium text-gray-700">{att.batch_name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 min-w-[100px] max-w-[140px]">
                          {att.department_details?.map(d => (
                            <Badge key={d.id} variant="outline" className="text-[10px] px-1.5 py-0 font-medium border-gray-200">
                              {d.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-700 font-medium min-w-[100px] block">{att.subject_name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 min-w-[80px]">
                          {att.section_details?.map(s => (
                            <Badge key={s.id} variant="secondary" className="text-[10px] px-1.5 py-0">{s.name}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-600 truncate max-w-[100px] block">{att.uploaded_by_name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(att.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-100 transition-opacity">
                          <button
                            onClick={() => handleView(att)}
                            title="View"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(att)}
                            title="Download"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditAttachment(att)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(att)}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50/30">
            <p className="text-xs text-muted-foreground">
              {filteredAttachments.length} attachment{filteredAttachments.length !== 1 ? 's' : ''} found
            </p>
            <Button variant="ghost" onClick={onClose} className="font-semibold text-gray-500">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editAttachment && (
        <AddAttachmentModal
          open={!!editAttachment}
          onClose={() => setEditAttachment(null)}
          onSuccess={() => { setEditAttachment(null); loadAttachments(); }}
          batches={batches}
          allAssignments={allAssignments}
          editAttachment={editAttachment}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl border-none shadow-2xl p-6">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-lg font-bold text-gray-900">
              Delete Attachment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">"{deleteTarget?.file_name}"</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-semibold text-gray-500 border-none hover:bg-gray-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold px-6 shadow-lg shadow-red-200 active:scale-95 transition-all"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={o => !o && setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
            {/* Preview header — unchanged */}
            <div className="flex items-center justify-between bg-slate-900 px-5 py-3 shrink-0">
              <div className="flex items-center gap-2">
                {fileIcon(previewType)}
                <p className="text-white font-semibold text-sm truncate max-w-md">
                  {selectedZipFile ? selectedZipFile.name : previewName}
                </p>
              </div>
              <button onClick={() => { setPreviewUrl(null); setZipFiles([]); setSelectedZipFile(null); }} className="text-white/60 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: splits into sidebar + viewer when ZIP */}
            <div className="flex w-full" style={{ height: '75vh', minHeight: '60vh' }}>
              {/* ZIP sidebar — only shown for ZIP files */}
              {zipFiles.length > 0 && (
                <div className="w-56 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
                  <div className="p-2 border-b border-slate-700">
                    {zipFiles.length > 6 && (
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={zipSearchQuery}
                          onChange={e => setZipSearchQuery(e.target.value)}
                          className="w-full pl-7 pr-2 py-1 bg-slate-700 rounded text-xs text-white placeholder-slate-400 outline-none"
                        />
                      </div>
                    )}
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-1.5 space-y-0.5">
                      {isExtractingZip ? (
                        <div className="py-6 flex flex-col items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                          <span className="text-xs text-slate-400">Extracting…</span>
                        </div>
                      ) : zipFiles
                          .filter(f => f.name.toLowerCase().includes(zipSearchQuery.toLowerCase()))
                          .map((file, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedZipFile(file)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                                selectedZipFile?.path === file.path
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <ZipFileIcon type={file.type} />
                              <span className="truncate">{file.name}</span>
                            </button>
                          ))
                      }
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Main viewer */}
              <div className="flex-1 bg-gray-900 min-w-0">
                {zipFiles.length > 0 ? (
                  selectedZipFile ? (
                    <BaseFileViewer
                      url={selectedZipFile.url ?? ''}
                      fileName={selectedZipFile.name}
                      fileType={selectedZipFile.type === 'text' ? 'text/plain' : undefined}
                      preloadedText={selectedZipFile.type === 'text' ? selectedZipFile.text : undefined}
                      fallbackDownloadFn={() => { const a = document.createElement('a'); a.href = previewUrl; a.download = previewName; a.click(); }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  )
                ) : (
                  <BaseFileViewer
                    url={previewUrl}
                    fileName={previewName}
                    fileType={previewType}
                    fallbackDownloadFn={() => { const a = document.createElement('a'); a.href = previewUrl; a.download = previewName; a.click(); }}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AttachmentHistoryModal;
