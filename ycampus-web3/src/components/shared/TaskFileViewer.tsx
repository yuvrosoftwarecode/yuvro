import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { X, FileText, Image as ImageIcon, FileCode, Download, Send, Loader2, FileArchive, Search, LayoutGrid, CheckCircle } from 'lucide-react';
import JSZip from 'jszip';
import { TaskComment } from '@/services/taskService';
import { format } from 'date-fns';
import { CodeEditor } from '@/components/ui/code-editor';

interface TaskFileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  comments: TaskComment[];
  onAddComment: (text: string) => void;
  submitting?: boolean;
  initialHighlight?: { line?: number; text?: string; filename?: string } | null;
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

export const TaskFileViewer: React.FC<TaskFileViewerProps> = ({
  isOpen,
  onClose,
  fileUrl,
  comments,
  onAddComment,
  submitting = false,
  initialHighlight = null
}) => {
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [activeHighlight, setActiveHighlight] = useState<{ line?: number; text?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const annotationInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && fileUrl) {
      loadFile(getAccessibleUrl(fileUrl));
    } else if (!isOpen) {
      setExtractedFiles([]);
      setSelectedFile(null);
      setError(null);
      setActiveHighlight(null);
    }
  }, [isOpen, fileUrl]);

  useEffect(() => {
    if (isOpen && initialHighlight && extractedFiles.length > 0) {
      if (initialHighlight.filename) {
        const file = extractedFiles.find(f => f.name === initialHighlight.filename);
        if (file) {
           setSelectedFile(file);
           setActiveHighlight({ line: initialHighlight.line, text: initialHighlight.text });
        }
      } else {
        setActiveHighlight({ line: initialHighlight.line, text: initialHighlight.text });
      }
    }
  }, [isOpen, initialHighlight, extractedFiles]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const loadFile = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      
      const filename = url.split('/').pop()?.split('?')[0] || 'Unknown';
      const isZip = filename.toLowerCase().endsWith('.zip');

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
        
        if (sorted.length > 0 && !initialHighlight) {
          setSelectedFile(sorted[0]);
        }
      } else {
        const type = getFileType(filename);
        const fileObj: ExtractedFile = { name: filename, path: filename, type, blob, url };
        if (type === 'text') {
           fileObj.text = await blob.text();
        }
        setExtractedFiles([fileObj]);
        setSelectedFile(fileObj);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to process the file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineClick = (lineNum: number) => {
    if (!selectedFile) return;
    const lineTag = `${selectedFile.name}_${lineNum} : `;
    if (newComment.includes(lineTag.trim())) {
      annotationInputRef.current?.focus();
      return;
    }
    setNewComment(prev => prev ? prev + '\n' + lineTag : lineTag);
    setTimeout(() => annotationInputRef.current?.focus(), 10);
  };

  const handleTextSelect = (text: string, startLine: number) => {
    if (!selectedFile) return;
    const lineTag = `${selectedFile.name}_${startLine} : `;
    const fullSnippet = `${lineTag}"${text}"\n`;
    if (newComment.includes(fullSnippet.trim())) {
      annotationInputRef.current?.focus();
      return;
    }
    setNewComment(prev => prev ? prev + '\n' + fullSnippet : fullSnippet);
    setTimeout(() => annotationInputRef.current?.focus(), 10);
  };

  const handleSendComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleKeyDownToSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const handleAnnotationLinkClick = (filename: string, lineNum: number, quotedText?: string) => {
    const file = extractedFiles.find(f => f.name === filename);
    if (file) {
      setSelectedFile(file);
      setActiveHighlight({ line: lineNum, text: quotedText });
    }
  };

  const filteredFiles = extractedFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] h-[100vh] m-0 p-0 rounded-none border-none shadow-none flex flex-col bg-slate-50 gap-0 overflow-hidden [&>button.absolute.right-4]:hidden">
        
        <div className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                 <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                 <DialogTitle className="text-lg font-black text-slate-800 tracking-tight">Submission Reviewer</DialogTitle>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">{fileUrl?.split('/').pop()?.split('?')[0] || 'Task Files'}</p>
              </div>
           </div>
           <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
              <X className="h-5 w-5" />
           </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
           
           <div className="w-1/4 min-w-[280px] max-w-[350px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
               <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Extracted Files</h3>
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
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
                           <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Extracting Archive...</p>
                        </div>
                     ) : filteredFiles.map((file, i) => (
                        <button
                           key={i}
                           onClick={() => setSelectedFile(file)}
                           className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group border ${
                              selectedFile?.path === file.path ? 'bg-primary border-primary shadow-md' : 'bg-transparent border-transparent hover:bg-slate-50'
                           }`}
                        >
                           <div className={`shrink-0 p-2 rounded-lg ${selectedFile?.path === file.path ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              <FileIcon type={file.type} className="h-4 w-4" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${selectedFile?.path === file.path ? 'text-white' : 'text-slate-700'}`}>{file.name}</p>
                              <p className={`text-[10px] uppercase tracking-widest font-bold mt-0.5 ${selectedFile?.path === file.path ? 'text-primary-foreground/80' : 'text-slate-400'}`}>{file.type === 'document' ? 'Office' : file.type}</p>
                           </div>
                        </button>
                     ))}
                  </div>
               </ScrollArea>
           </div>

           <div className="flex-1 bg-slate-100/50 flex flex-col h-full relative p-6">
               {!selectedFile && !error && !isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                     <FileArchive className="h-16 w-16 text-slate-400 mb-4" />
                     <h3 className="text-xl font-bold text-slate-700 mb-2">Select a File</h3>
                     <p className="font-medium text-slate-500 text-sm">Choose a file to preview it.</p>
                  </div>
               ) : error ? (
                  <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl p-8 border border-red-100 shadow-sm text-center">
                     <X className="h-12 w-12 text-red-400 mb-4 bg-red-50 rounded-full p-2" />
                     <h3 className="text-lg font-bold text-slate-800 mb-2">Error</h3>
                     <p className="text-slate-600 font-medium max-w-sm">{error}</p>
                  </div>
               ) : selectedFile && (
                  <div className="h-full w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative z-10">
                     <div className="h-12 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-700">
                           <FileIcon type={selectedFile.type} className="h-4 w-4 text-slate-400" />
                           {selectedFile.name}
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 font-bold text-[11px] uppercase tracking-widest text-primary" onClick={() => selectedFile.url && window.open(selectedFile.url)}>
                           <Download className="h-3 w-3 mr-1.5" /> Download
                        </Button>
                     </div>
                     <div className="flex-1 overflow-hidden">
                        {selectedFile.type === 'image' && selectedFile.url && (
                           <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                              <img src={selectedFile.url} className="max-w-full max-h-full object-contain" alt="" />
                           </div>
                        )}
                        {selectedFile.type === 'pdf' && selectedFile.url && <iframe src={selectedFile.url} title="Preview" className="w-full h-full border-0" />}
                        {selectedFile.type === 'text' && (
                           <CodeEditor 
                              initialCode={selectedFile.text || ''} 
                              readOnly={true}
                              language={selectedFile.name.split('.').pop() === 'py' ? 'python' : 'javascript'}
                              className="h-full border-0 rounded-none shadow-none"
                              onLineClick={handleLineClick}
                              onTextSelect={handleTextSelect}
                              highlightLine={activeHighlight?.line}
                              highlightText={activeHighlight?.text}
                           />
                        )}
                        {(selectedFile.type === 'document' || selectedFile.type === 'unknown') && (
                           <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                              <FileText className="h-16 w-16 text-slate-300 mb-4" />
                              <h3 className="text-lg font-bold text-slate-800">{selectedFile.type === 'document' ? 'Preview Unavailable for Office Files' : 'Preview not available'}</h3>
                              <p className="text-sm text-slate-500 mt-2 mb-6">Please download this file to view its content.</p>
                              <Button onClick={() => selectedFile.url && window.open(selectedFile.url)}>
                                 <Download className="h-4 w-4 mr-2" /> Download File
                              </Button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
           </div>

           <div className="w-1/4 min-w-[300px] max-w-[400px] bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
               <div className="h-16 px-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Annotations</h3>
               </div>
               <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                     {(() => {
                        const filtered = comments.filter(c => {
                           if (!selectedFile) return false;
                           const match = c.comment.match(/([a-zA-Z0-9._-]+)[_:]L?(\d+)/);
                           if (!match) return false;
                           return match[1] === selectedFile.name;
                        });

                        if (filtered.length === 0) {
                           return (
                              <div className="py-20 text-center opacity-30">
                                 <Send className="h-10 w-10 mx-auto mb-4" />
                                 <p className="text-xs font-black uppercase tracking-widest">{selectedFile ? 'No annotations for this file' : 'Select a file to see annotations'}</p>
                              </div>
                           );
                        }

                        return filtered.map((c) => {
                           const annotationMatch = c.comment.match(/([a-zA-Z0-9._-]+)[_:]L?(\d+)/);
                           return (
                              <div 
                                 key={c.id} 
                                 className={`p-4 rounded-2xl border shadow-sm transition-all ${
                                    c.faculty ? 'bg-blue-50/30 border-blue-100 mr-4 hover:bg-blue-100/40' : 'bg-white border-slate-100 ml-4 hover:bg-slate-50'
                                 } ${annotationMatch ? 'cursor-pointer border-blue-200/50' : ''}`}
                                 onClick={() => {
                                    if (annotationMatch) {
                                       const [, filename, lineStr] = annotationMatch;
                                       const quoteMatch = c.comment.match(/"([^"]*)"/);
                                       handleAnnotationLinkClick(filename, parseInt(lineStr), quoteMatch ? quoteMatch[1] : undefined);
                                    }
                                 }}
                              >
                                 <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${c.faculty ? 'text-blue-600' : 'text-slate-400'}`}>{c.faculty ? 'Faculty' : 'Student'}</span>
                                    <span className="text-[10px] text-slate-300 font-bold">{format(new Date(c.created_at), 'HH:mm')}</span>
                                 </div>
                              <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                 {(() => {
                                    const regex = /([a-zA-Z0-9._-]+)[_:]L?(\d+)/g;
                                    const parts = [];
                                    let lastIndex = 0;
                                    let match;
                                    while ((match = regex.exec(c.comment)) !== null) {
                                       if (match.index > lastIndex) parts.push(c.comment.substring(lastIndex, match.index));
                                       const [, filename, lineStr] = match;
                                       const quoteMatch = c.comment.match(/"([^"]*)"/);
                                       parts.push(
                                          <button key={match.index} onClick={(e) => { e.stopPropagation(); handleAnnotationLinkClick(filename, parseInt(lineStr), quoteMatch ? quoteMatch[1] : undefined); }} className="text-primary font-bold hover:underline bg-primary/5 px-1 rounded inline-flex items-center gap-1">
                                             <FileCode className="h-3 w-3" />
                                             {filename}:{lineStr}
                                          </button>
                                       );
                                       lastIndex = regex.lastIndex;
                                    }
                                    if (lastIndex < c.comment.length) parts.push(c.comment.substring(lastIndex));
                                    return parts.length > 0 ? parts : c.comment;
                                 })()}
                              </p>
                           </div>
                           );
                        });
                     })()}
                     <div ref={commentsEndRef} />
                  </div>
               </ScrollArea>
               <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                  <Textarea 
                     ref={annotationInputRef} 
                     value={newComment} 
                     onChange={(e) => setNewComment(e.target.value)} 
                     onKeyDown={handleKeyDownToSubmit} 
                     className="min-h-[100px] resize-none bg-slate-50 focus:bg-white transition-colors border-slate-200 rounded-xl" 
                     placeholder="Add annotation..." 
                  />
                  <Button onClick={handleSendComment} className="w-full h-11 font-bold shadow-md rounded-xl" disabled={!newComment.trim() || submitting}>
                     <Send className="h-4 w-4 mr-2" /> Post Annotation
                  </Button>
               </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
