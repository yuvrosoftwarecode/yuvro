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
}

interface ExtractedFile {
  name: string;
  path: string;
  type: 'image' | 'pdf' | 'text' | 'unknown';
  blob?: Blob;
  text?: string;
  url?: string;
}

const getAccessibleUrl = (url: string | null) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `http://${url}`;
};

const getFileType = (filename: string): 'image' | 'pdf' | 'text' | 'unknown' => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['txt', 'md', 'csv', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'java', 'c', 'cpp'].includes(ext)) return 'text';
  return 'unknown';
};

const FileIcon = ({ type, className = "h-5 w-5" }: { type: string; className?: string }) => {
  if (type === 'image') return <ImageIcon className={className} />;
  if (type === 'pdf') return <FileText className={className} />;
  if (type === 'text') return <FileCode className={className} />;
  return <FileArchive className={className} />;
};

export const TaskFileViewer: React.FC<TaskFileViewerProps> = ({
  isOpen,
  onClose,
  fileUrl,
  comments,
  onAddComment,
  submitting = false
}) => {
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const annotationInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && fileUrl) {
      loadFile(getAccessibleUrl(fileUrl));
    } else {
      setExtractedFiles([]);
      setSelectedFile(null);
      setError(null);
    }
  }, [isOpen, fileUrl]);

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
             
             if (type === 'text') {
                fileData.text = await zipEntry.async('string');
             } else {
                const fileBlob = await zipEntry.async('blob');
                fileData.blob = fileBlob;
                fileData.url = URL.createObjectURL(fileBlob);
             }
             files.push(fileData);
          }
        }
        setExtractedFiles(files.sort((a,b) => a.name.localeCompare(b.name)));
        if (files.length > 0) setSelectedFile(files[0]);
      } else {
        // Not a zip, just a single file
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
      setError("Unable to load or process the file. It may be corrupted or inaccessible.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineClick = (lineNum: number) => {
    if (!selectedFile) return;
    const lineTag = `${selectedFile.name}_${lineNum} : `;
    
    // Check if tag is already in current comment to prevent duplicates
    if (newComment.includes(lineTag.trim())) {
      annotationInputRef.current?.focus();
      return;
    }
    
    setNewComment(prev => prev ? prev + '\n' + lineTag : lineTag);
    // Focus the input so teacher can immediately type
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] h-[100vh] m-0 p-0 rounded-none border-none shadow-none flex flex-col bg-slate-50 gap-0 overflow-hidden [&>button.absolute.right-4]:hidden">
        
        {/* Header - Global */}
        <div className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                 <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                 <DialogTitle className="text-lg font-black text-slate-800 tracking-tight">Submission Reviewer</DialogTitle>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{fileUrl?.split('/').pop()?.split('?')[0] || 'Task Files'}</p>
              </div>
           </div>
           <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
              <X className="h-5 w-5" />
           </Button>
        </div>

        {/* 3-Pane Layout */}
        <div className="flex-1 flex overflow-hidden">
           
           {/* Pane 1: Left - Files List (25%) */}
           <div className="w-1/4 min-w-[280px] max-w-[350px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0 relative z-0">
               <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Extracted Files</h3>
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                     <input type="text" placeholder="Search files..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-colors" />
                  </div>
               </div>
               <ScrollArea className="flex-1">
                  <div className="p-3 space-y-1.5">
                     {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center opacity-50">
                           <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                           <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Extracting Archive...</p>
                        </div>
                     ) : extractedFiles.length === 0 && !error ? (
                        <p className="text-center text-sm font-medium text-slate-400 py-10">No files found.</p>
                     ) : (
                        extractedFiles.map((file, i) => (
                           <button
                             key={i}
                             onClick={() => setSelectedFile(file)}
                             className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                                selectedFile?.path === file.path 
                                ? 'bg-primary border-primary shadow-md' 
                                : 'bg-transparent border-transparent hover:bg-slate-50'
                             } border`}
                           >
                              <div className={`shrink-0 p-2 rounded-lg ${
                                 selectedFile?.path === file.path ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'
                              }`}>
                                 <FileIcon type={file.type} className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className={`text-sm font-bold truncate ${selectedFile?.path === file.path ? 'text-white' : 'text-slate-700'}`}>
                                    {file.name}
                                 </p>
                                 <p className={`text-[10px] uppercase tracking-widest font-bold mt-0.5 ${selectedFile?.path === file.path ? 'text-primary-foreground/80' : 'text-slate-400'}`}>
                                    {file.type}
                                 </p>
                              </div>
                           </button>
                        ))
                     )}
                  </div>
               </ScrollArea>
           </div>

           {/* Pane 2: Middle - Content Viewer (50%) */}
           <div className="flex-1 bg-slate-100/50 flex flex-col h-full relative p-6">
               {error ? (
                  <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-red-100 shadow-sm">
                     <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                        <X className="h-8 w-8 text-red-400" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-800 mb-2">Extraction Error</h3>
                     <p className="text-slate-500 font-medium max-w-sm text-center">{error}</p>
                     <Button className="mt-6" variant="outline" onClick={() => window.open(getAccessibleUrl(fileUrl))}>
                        <Download className="h-4 w-4 mr-2" /> Download Original file
                     </Button>
                  </div>
               ) : isLoading ? (
                  <div className="h-full flex items-center justify-center">
                     <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
               ) : !selectedFile ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                     <FileArchive className="h-16 w-16 text-slate-400 mb-4" />
                     <h3 className="text-xl font-bold text-slate-700 mb-2">Select a File</h3>
                     <p className="font-medium text-slate-500 text-sm">Choose a file from the extracted list on the left to preview it.</p>
                  </div>
               ) : (
                  <div className="h-full w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative z-10">
                     {/* Toolbar */}
                     <div className="h-12 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-2">
                           <FileIcon type={selectedFile.type} className="h-4 w-4 text-slate-400" />
                           <span className="font-bold text-sm text-slate-700">{selectedFile.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 font-bold text-[11px] uppercase tracking-widest text-primary hover:bg-primary/10" onClick={() => {
                           if (selectedFile.url) window.open(selectedFile.url);
                           else if (fileUrl) window.open(getAccessibleUrl(fileUrl));
                        }}>
                           <Download className="h-3 w-3 mr-1.5" /> Direct Download
                        </Button>
                     </div>
                     
                     {/* Render Area */}
                     <div className="flex-1 overflow-auto bg-slate-50/30">
                        {selectedFile.type === 'image' && selectedFile.url && (
                           <div className="h-full flex items-center justify-center p-8">
                              <img src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-full object-contain drop-shadow-md rounded-lg" />
                           </div>
                        )}
                        {selectedFile.type === 'pdf' && selectedFile.url && (
                           <iframe src={`${selectedFile.url}#toolbar=0.5&view=FitH`} className="w-full h-full border-none" title={selectedFile.name} />
                        )}
                        {selectedFile.type === 'text' && (
                           <div className="h-full">
                              <CodeEditor 
                                 initialCode={selectedFile.text || ''} 
                                 readOnly={true}
                                 language={selectedFile.name.split('.').pop() === 'py' ? 'python' : selectedFile.name.split('.').pop() === 'js' ? 'javascript' : 'markdown'}
                                 className="h-full border-none rounded-none"
                                 onLineClick={handleLineClick}
                                 onTextSelect={handleTextSelect}
                              />
                           </div>
                        )}
                        {selectedFile.type === 'unknown' && (
                           <div className="h-full flex flex-col items-center justify-center text-center p-8">
                              <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200 shadow-inner">
                                 <FileText className="h-8 w-8 text-slate-300" />
                              </div>
                              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Preview Unavailable</h3>
                              <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
                                 The file type for <span className="font-bold text-slate-700">"{selectedFile.name}"</span> cannot be safely previewed in the browser pane natively.
                              </p>
                              <Button size="lg" className="font-bold shadow-lg h-12 px-8" onClick={() => selectedFile.url && window.open(selectedFile.url)}>
                                 <Download className="h-5 w-5 mr-2" /> Download to View
                              </Button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
           </div>

           {/* Pane 3: Right - Annotations (25%) */}
           <div className="w-1/4 min-w-[300px] max-w-[400px] bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
               <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 h-[69px]">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Annotations</h3>
               </div>
               
               <ScrollArea className="flex-1 bg-slate-50/30">
                  <div className="p-4 space-y-4">
                     {comments.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                           <Send className="h-10 w-10 text-slate-400 mb-4" />
                           <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">No annotations yet</p>
                        </div>
                     ) : (
                        comments.map((c) => (
                           <div key={c.id} className={`p-4 rounded-2xl shadow-sm border ${
                                 c.faculty ? 'bg-blue-50/30 border-blue-100 ml-0 mr-4 rounded-tl-sm' : 'bg-white border-slate-200 ml-4 mr-0 rounded-tr-sm'
                              }`}>
                              <div className="flex items-center justify-between mb-2">
                                 <span className={`text-[10px] font-black uppercase tracking-widest ${c.faculty ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {c.faculty ? 'Faculty Evaluator' : 'Student'}
                                 </span>
                                 <span className="text-[10px] text-slate-400 font-bold">{format(new Date(c.created_at), 'HH:mm')}</span>
                              </div>
                              <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{c.comment}</p>
                           </div>
                        ))
                     )}
                     <div ref={commentsEndRef} />
                  </div>
               </ScrollArea>
               
               <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] space-y-3">
                  <Textarea 
                     ref={annotationInputRef}
                     value={newComment}
                     onChange={(e) => setNewComment(e.target.value)}
                     onKeyDown={handleKeyDownToSubmit}
                     placeholder="Type an annotation or general feedback..."
                     className="min-h-[90px] bg-slate-50 focus:bg-white resize-none border-slate-200 rounded-xl"
                  />
                  <Button 
                     onClick={handleSendComment} 
                     disabled={!newComment.trim() || submitting}
                     className="w-full h-11 font-bold shadow-md hover:shadow-lg transition-all rounded-xl"
                  >
                     <Send className="h-4 w-4 mr-2" />
                     Post Annotation
                  </Button>
               </div>
           </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
