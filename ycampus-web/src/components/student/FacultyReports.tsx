import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { FileText, Eye, Download, BookOpen, Search, Loader2, FileArchive, FileCode, FileImage } from 'lucide-react';
import { Input } from '@/components/ui/input';
import studentAttachmentService, { StudentAttachment } from '@/services/studentAttachmentService';
import { BaseFileViewer, getFileType } from '@/components/shared/BaseFileViewer';
import JSZip from 'jszip';

interface FacultyReportsProps {
  subjectId: string;
}

interface ExtractedFile {
  name: string;
  path: string;
  type: 'image' | 'pdf' | 'text' | 'document' | 'unknown';
  blob?: Blob;
  text?: string;
  url?: string;
}

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml'
};

const getAccessibleUrl = (url: string) =>
  url.startsWith('http') ? url : `http://${url}`;

const FileItemIcon = ({ type }: { type: string }) => {
  if (type === 'image') return <FileImage className="h-3.5 w-3.5 shrink-0" />;
  if (type === 'text') return <FileCode className="h-3.5 w-3.5 shrink-0" />;
  return <FileText className="h-3.5 w-3.5 shrink-0" />;
};

const FacultyReports: React.FC<FacultyReportsProps> = ({ subjectId }) => {
  const [reports, setReports] = useState<StudentAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReport, setActiveReport] = useState<StudentAttachment | null>(null);

  // ZIP extraction state
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<ExtractedFile | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [zipSearchQuery, setZipSearchQuery] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await studentAttachmentService.list({ subject: subjectId, search: searchQuery || undefined });
        setReports(data);
      } catch (error) {
        console.error('Failed to fetch faculty reports', error);
      } finally {
        setLoading(false);
      }
    };
    if (subjectId) fetchReports();
  }, [subjectId, searchQuery]);

  const isZipFile = (report: StudentAttachment) =>
    report.file_type?.includes('zip') || report.file_type?.includes('rar') || report.file_name?.toLowerCase().endsWith('.zip');

  const handleSelectReport = async (report: StudentAttachment) => {
    // Clear previous ZIP state when switching reports
    setExtractedFiles([]);
    setSelectedZipFile(null);
    setZipSearchQuery('');
    setActiveReport(report);

    if (isZipFile(report)) {
      setIsExtracting(true);
      try {
        const res = await fetch(getAccessibleUrl(report.file));
        if (!res.ok) throw new Error('Failed to fetch ZIP');
        const blob = await res.blob();
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(blob);
        const files: ExtractedFile[] = [];

        for (const [path, zipEntry] of Object.entries(loadedZip.files)) {
          if (!zipEntry.dir && !path.startsWith('__MACOSX/') && !path.includes('/.')) {
            const type = getFileType(zipEntry.name);
            const ext = zipEntry.name.split('.').pop()?.toLowerCase() || '';
            const fileData: ExtractedFile = {
              name: zipEntry.name.split('/').pop() || zipEntry.name,
              path,
              type
            };

            if (type === 'text') {
              fileData.text = await zipEntry.async('string');
            } else {
              const data = await zipEntry.async('uint8array');
              const fileBlob = new Blob([data.buffer as ArrayBuffer], {
                type: MIME_TYPES[ext] || 'application/octet-stream'
              });
              fileData.blob = fileBlob;
              fileData.url = URL.createObjectURL(fileBlob);
            }
            files.push(fileData);
          }
        }

        const sorted = files.sort((a, b) => a.name.localeCompare(b.name));
        setExtractedFiles(sorted);
        if (sorted.length > 0) setSelectedZipFile(sorted[0]);
      } catch (err) {
        console.error('ZIP extraction failed', err);
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const handleDownload = (report: StudentAttachment) => {
    const a = document.createElement('a');
    a.href = report.file;
    a.download = report.file_name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderPreview = () => {
    if (!activeReport) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-muted/20">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <Eye className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No document opened</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Click the <span className="font-medium">Read</span> button on any report to preview it here.
          </p>
        </div>
      );
    }

    // ZIP: show loading, then the selected extracted file
    if (isZipFile(activeReport)) {
      if (isExtracting) {
        return (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            <p className="text-sm text-muted-foreground">Extracting archive…</p>
          </div>
        );
      }
      if (!selectedZipFile) return null;

      // Pass preloaded text for text files; pass blob URL for all others
      return (
        <BaseFileViewer
          url={selectedZipFile.url ?? ''}
          fileName={selectedZipFile.name}
          fileType={selectedZipFile.type === 'text' ? 'text/plain' : undefined}
          preloadedText={selectedZipFile.type === 'text' ? selectedZipFile.text : undefined}
          fallbackDownloadFn={() => handleDownload(activeReport)}
        />
      );
    }

    return (
      <BaseFileViewer
        url={activeReport.file}
        fileName={activeReport.file_name}
        fileType={activeReport.file_type || ''}
        fallbackDownloadFn={() => handleDownload(activeReport)}
      />
    );
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
      </div>
    );
  }

  const filteredZipFiles = extractedFiles.filter(f =>
    f.name.toLowerCase().includes(zipSearchQuery.toLowerCase())
  );

  return (
    <div className="h-full p-6">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-border shadow-sm bg-background">
        {/* Left: Attachments list */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <div className="flex flex-col overflow-hidden h-full">
            <div className="px-4 py-3 border-b border-border bg-gray-50/50 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Faculty Reports</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full border">
                  {reports.length} files
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 bg-white">
              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No Faculty Reports Available</p>
                  <p className="text-xs mt-1">Faculty reports have not been published for this content yet.</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {reports.map((report) => {
                    const isActive = activeReport?.id === report.id;
                    const isZip = isZipFile(report);
                    return (
                      <div key={report.id}>
                        {/* Report card — identical to original */}
                        <div
                          className={`rounded-lg border p-3 transition-colors ${
                            isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-md bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                              {isZip
                                ? <FileArchive className="h-5 w-5 text-amber-600" />
                                : <FileText className="h-5 w-5 text-red-600" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={report.file_name}>
                                {report.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                By {report.uploaded_by_name} • {new Date(report.created_at).toLocaleDateString()} • {studentAttachmentService.formatFileSize(report.file_size)}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant={isActive ? 'default' : 'outline'}
                                  className="h-7 text-xs gap-1.5 px-2.5"
                                  onClick={() => handleSelectReport(report)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Read
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1.5 px-2.5"
                                  onClick={() => handleDownload(report)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ZIP sub-tree — inline, below the active ZIP report card */}
                        {isActive && isZip && (
                          <div className="mt-1.5 ml-3 pl-3 border-l-2 border-primary/20">
                            {isExtracting ? (
                              <div className="py-3 flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="text-xs">Extracting archive…</span>
                              </div>
                            ) : (
                              <>
                                {extractedFiles.length > 5 && (
                                  <div className="relative mb-1.5 mt-1">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <Input
                                      placeholder="Search files..."
                                      value={zipSearchQuery}
                                      onChange={(e) => setZipSearchQuery(e.target.value)}
                                      className="h-7 pl-7 text-xs bg-white"
                                    />
                                  </div>
                                )}
                                <div className="space-y-0.5 py-1">
                                  {filteredZipFiles.map((file, i) => (
                                    <button
                                      key={i}
                                      onClick={() => setSelectedZipFile(file)}
                                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-xs ${
                                        selectedZipFile?.path === file.path
                                          ? 'bg-primary text-primary-foreground'
                                          : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      <FileItemIcon type={file.type} />
                                      <span className="truncate">{file.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="mx-0 bg-border hover:bg-primary/20 transition-colors w-1" />

        {/* Right: Document Viewer */}
        <ResizablePanel defaultSize={65} minSize={30}>
          <div className="flex flex-col overflow-hidden h-full">
            <div className="px-4 py-3 border-b border-border bg-gray-50/50 flex items-center gap-2 shrink-0">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm truncate">
                {selectedZipFile
                  ? selectedZipFile.name
                  : activeReport
                  ? activeReport.file_name
                  : 'Document Preview'}
              </h3>
            </div>
            <div className="flex-1 overflow-hidden bg-white relative">
              {renderPreview()}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default FacultyReports;
