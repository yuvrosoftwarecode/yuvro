import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, FileText, Image as ImageIcon, FileCode, Download, Loader2, FileArchive, Search, LayoutGrid } from 'lucide-react';
import JSZip from 'jszip';

interface DocPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
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

const getAccessibleUrl = (url: string | null) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `http://${url}`;
};

const getFileType = (filename: string): 'image' | 'pdf' | 'text' | 'document' | 'unknown' => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext)) return 'document';
  if (['txt', 'md', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'java', 'c', 'cpp', 'sql', 'sh', 'rb', 'php', 'go', 'xml', 'yaml', 'log'].includes(ext)) return 'text';
  return 'unknown';
};

const FileIcon = ({ type, className = "h-5 w-5" }: { type: string; className?: string }) => {
  if (type === 'image') return <ImageIcon className={className} />;
  if (type === 'pdf') return <FileText className={className} />;
  if (type === 'text') return <FileCode className={className} />;
  if (type === 'document') return <FileText className={className} />;
  return <FileArchive className={className} />;
};

export const DocPreviewDialog: React.FC<DocPreviewDialogProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName
}) => {
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && fileUrl) {
      loadFile(getAccessibleUrl(fileUrl));
    } else if (!isOpen) {
      setExtractedFiles([]);
      setSelectedFile(null);
      setError(null);
      setSearchQuery('');
    }
  }, [isOpen, fileUrl]);

  const loadFile = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      
      const isZip = fileName.toLowerCase().endsWith('.zip') || blob.type === 'application/zip' || blob.type === 'application/x-zip-compressed';

      if (isZip) {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(blob);
        const files: ExtractedFile[] = [];

        for (const [path, zipEntry] of Object.entries(loadedZip.files)) {
          if (!zipEntry.dir) {
             const type = getFileType(zipEntry.name);
             const fileData: ExtractedFile = { name: zipEntry.name, path, type };
             const ext = zipEntry.name.split('.').pop()?.toLowerCase() || '';
             
             if (type === 'text') {
                fileData.text = await zipEntry.async('string');
             } else {
                const data = await zipEntry.async('uint8array');
                const fileBlob = new Blob([data.buffer as ArrayBuffer], { type: MIME_TYPES[ext] || 'application/octet-stream' });
                fileData.blob = fileBlob;
                fileData.url = URL.createObjectURL(fileBlob);
             }
             files.push(fileData);
          }
        }
        const sorted = files.sort((a,b) => a.name.localeCompare(b.name));
        setExtractedFiles(sorted);
        
        if (sorted.length > 0) {
          setSelectedFile(sorted[0]);
        }
      } else {
        const type = getFileType(fileName);
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const mimeType = MIME_TYPES[ext] || blob.type || 'application/octet-stream';
        const typedBlob = new Blob([blob], { type: mimeType });
        const blobUrl = URL.createObjectURL(typedBlob);
        const fileObj: ExtractedFile = { name: fileName, path: fileName, type, blob: typedBlob, url: blobUrl };
        if (type === 'text') {
           fileObj.text = await blob.text();
        }
        setExtractedFiles([fileObj]);
        setSelectedFile(fileObj);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to process the file preview.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiles = extractedFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isZipFile = fileName.toLowerCase().endsWith('.zip');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] m-0 p-0 rounded-2xl border border-slate-200 shadow-2xl flex flex-col bg-slate-50 gap-0 overflow-hidden [&>button.absolute.right-4]:hidden">
        
        {/* Header */}
        <div className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800 truncate max-w-[400px]">
                {fileName}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">In-app Document Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {fileUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 font-semibold text-xs border-slate-200"
                onClick={() => window.open(fileUrl)}
              >
                <Download className="h-3.5 w-3.5 mr-2" /> Download Original
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar for ZIP files */}
          {isZipFile && (
            <div className="w-[300px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">Archive Contents</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search files..." 
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-1.5">
                  {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-50">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                      <p className="text-xs text-slate-400 font-medium">Extracting ZIP...</p>
                    </div>
                  ) : filteredFiles.map((file, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left border ${
                        selectedFile?.path === file.path ? 'bg-primary border-primary text-white shadow-md' : 'bg-transparent border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className={`shrink-0 p-2 rounded-lg ${selectedFile?.path === file.path ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <FileIcon type={file.type} className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${selectedFile?.path === file.path ? 'text-white' : 'text-slate-700'}`}>{file.name}</p>
                        <p className={`text-[10px] uppercase tracking-wider mt-0.5 ${selectedFile?.path === file.path ? 'text-white/80' : 'text-slate-400'}`}>{file.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Main Preview Pane */}
          <div className="flex-1 bg-slate-100/50 flex flex-col h-full relative p-6">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-slate-500 font-semibold text-sm">Preparing document preview...</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl p-8 border border-red-100 shadow-sm text-center">
                <X className="h-12 w-12 text-red-500 mb-4 bg-red-50 rounded-full p-2" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">Failed to load</h3>
                <p className="text-slate-500 font-medium max-w-sm">{error}</p>
              </div>
            ) : selectedFile ? (
              <div className="h-full w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                {/* Filename header */}
                <div className="h-12 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between px-4 shrink-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileIcon type={selectedFile.type} className="h-4 w-4 text-slate-400" />
                    {selectedFile.name}
                  </div>
                  {selectedFile.url && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[11px] font-bold text-primary" 
                      onClick={() => selectedFile.url && window.open(selectedFile.url)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Download File
                    </Button>
                  )}
                </div>

                {/* Viewport content */}
                <div className="flex-1 overflow-hidden relative">
                  {selectedFile.type === 'image' && selectedFile.url && (
                    <div className="w-full h-full flex items-center justify-center p-8 overflow-auto bg-slate-50">
                      <img src={selectedFile.url} className="max-w-full max-h-full object-contain rounded-lg shadow-sm border" alt="" />
                    </div>
                  )}

                  {selectedFile.type === 'pdf' && selectedFile.url && (
                    <iframe src={selectedFile.url} title="PDF Preview" className="w-full h-full border-0" />
                  )}

                  {selectedFile.type === 'text' && (
                    <ScrollArea className="h-full w-full bg-[#1E1E1E]">
                      <pre className="p-6 text-sm text-slate-100 font-mono leading-relaxed select-text overflow-x-auto whitespace-pre-wrap">
                        {selectedFile.text || ''}
                      </pre>
                    </ScrollArea>
                  )}

                  {(selectedFile.type === 'document' || selectedFile.type === 'unknown') && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                      <FileText className="h-16 w-16 text-slate-300 mb-4" />
                      <h3 className="text-base font-bold text-slate-800">
                        {selectedFile.type === 'document' ? 'Preview Unavailable for Office Files' : 'Preview not available'}
                      </h3>
                      <p className="text-sm text-slate-500 mt-2 mb-6 max-w-sm">Please download this file to view its content on your device.</p>
                      {selectedFile.url ? (
                        <Button onClick={() => selectedFile.url && window.open(selectedFile.url)}>
                          <Download className="h-4 w-4 mr-2" /> Download File
                        </Button>
                      ) : fileUrl ? (
                        <Button onClick={() => window.open(fileUrl)}>
                          <Download className="h-4 w-4 mr-2" /> Download Original ZIP
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <FileArchive className="h-16 w-16 text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Select a File</h3>
                <p className="text-slate-500 font-medium text-sm">Choose a file from the sidebar to preview.</p>
              </div>
            )}
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
};
