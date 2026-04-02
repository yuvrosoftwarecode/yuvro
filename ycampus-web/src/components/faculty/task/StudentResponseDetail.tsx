import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, CheckCircle, XCircle, FileText, Eye } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TaskSubmission, TaskComment } from '@/services/taskService';
import { format } from 'date-fns';
import { TaskFileViewer } from '@/components/shared/TaskFileViewer';
import { CodeEditor } from '@/components/ui/code-editor';

interface StudentResponseDetailProps {
  response: TaskSubmission;
  onAddComment: (comment: string) => void;
  onUpdateStatus: (status: 'accepted' | 'rejected') => void;
  onBack: () => void;
  submitting?: boolean;
}

const StudentResponseDetail: React.FC<StudentResponseDetailProps> = ({
  response,
  onAddComment,
  onUpdateStatus,
  onBack,
  submitting = false
}) => {
  const [newComment, setNewComment] = useState('');
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<{ line?: number; text?: string } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const annotationInputRef = useRef<HTMLTextAreaElement>(null);
  const student = response.student_details || {};
  const user = student.user_details || {};

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [response.comments]);

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleKeyDownToSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleLineClick = (lineNum: number) => {
    const lineTag = `Answer_${lineNum} : `;
    if (newComment.includes(lineTag.trim())) {
      annotationInputRef.current?.focus();
      return;
    }
    setNewComment(prev => prev ? prev + '\n' + lineTag : lineTag);
    setTimeout(() => annotationInputRef.current?.focus(), 10);
  };

  const handleTextSelect = (text: string, startLine: number) => {
    const lineTag = `Answer_${startLine} : `;
    const fullSnippet = `${lineTag}"${text}"\n`;
    if (newComment.includes(fullSnippet.trim())) {
      annotationInputRef.current?.focus();
      return;
    }
    setNewComment(prev => prev ? prev + '\n' + fullSnippet : fullSnippet);
    setTimeout(() => annotationInputRef.current?.focus(), 10);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Responses
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border-2 border-primary/10">
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">
                  {user.first_name} {user.last_name}
                </h1>
                <Badge variant={getStatusBadgeVariant(response.status)} className="capitalize px-3 text-[10px] h-5">
                  {response.status}
                </Badge>
              </div>
              <div className="flex gap-4 text-xs  text-muted-foreground mt-0.5">
                <span>Roll No: {student.roll_number || 'N/A'}</span>
                <span>Submitted: {response.submitted_at ? format(new Date(response.submitted_at), 'MMM dd, HH:mm') : 'Not submitted'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onUpdateStatus('rejected')}
            disabled={submitting || response.status === 'rejected'}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onUpdateStatus('accepted')}
            disabled={submitting || response.status === 'accepted'}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Submission Content Area */}
            <div className="space-y-8">
              {response.answer && (
                <div className="space-y-3">
                  <h4 className="text-[13px] font-bold  px-1 ">Submitted answer</h4>
                  <CodeEditor 
                    initialCode={response.answer}
                    readOnly={true}
                    language="markdown"
                    onLineClick={handleLineClick}
                    onTextSelect={handleTextSelect}
                    highlightLine={activeHighlight?.line}
                    highlightText={activeHighlight?.text}
                    className="border-slate-200 shadow-sm rounded-xl overflow-hidden"
                    showLanguageSelector={false}
                    showCopyButton={true}
                    showRunButton={false}
                  />
                </div>
              )}

              {response.file && (
                <div className="space-y-3">
                  <h4 className="text-[13px] font-bold px-1 ">Attachment</h4>
                  <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/10 shadow-inner">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[240px]">
                          {response.file.split('/').pop()}
                        </p>
                        <p className="text-[11px]  text-slate-400 mt-0.5">Primary submission resource</p>
                      </div>
                    </div>
                    <Button variant="outline" className="shadow-sm font-bold border-slate-200 h-10 px-5" onClick={() => setIsFileViewerOpen(true)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review Files
                    </Button>
                  </div>
                </div>
              )}

              {!response.answer && !response.file && (
                <div className="py-20 text-center bg-slate-50/50 border border-dashed rounded-2xl">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold text-sm">No content submitted yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Discussion Section */}
        <div className="space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b shadow-sm">
              <CardTitle className="text-lg">Discussion</CardTitle>
              <CardDescription>Live feedback and queries</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                   {response.comments.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center text-center opacity-40">
                      <Send className="h-10 w-10 mb-2" />
                      <p className="text-sm font-bold text-slate-500">No messages yet</p>
                    </div>
                  ) : (
                    response.comments.map((comment: TaskComment) => {
                      const annotationMatch = comment.comment.match(/([a-zA-Z0-9._-]+)[_:]L?(\d+)/);
                      return (
                        <div
                          key={comment.id}
                          className={`p-4 rounded-xl max-w-[90%] border shadow-sm transition-all ${
                            comment.faculty
                              ? 'bg-[#EFF6FF] border-blue-200 border-l-4 border-l-blue-500 ml-0 mr-auto'
                              : 'bg-[#F0FDF4] border-emerald-200 border-r-4 border-r-emerald-500 ml-auto mr-0'
                          } ${annotationMatch ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (annotationMatch) {
                               const [, _filename, lineStr] = annotationMatch;
                               const quoteMatch = comment.comment.match(/"([^"]*)"/);
                               setActiveHighlight({ line: parseInt(lineStr), text: quoteMatch ? quoteMatch[1] : undefined });
                            }
                          }}
                        >
                          <div className="flex justify-between items-center gap-6 mb-2">
                            <span className="font-bold text-[11px] text-[#020817]">
                              {comment.faculty ? 'Faculty' : 'Student'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {format(new Date(comment.created_at), 'M/d/yyyy, hh:mm:ss a')}
                            </span>
                          </div>
                          <p className="text-sm text-[#020817] leading-relaxed whitespace-pre-wrap">
                            {(() => {
                              const regex = /^Answer_(\d+)\s*:\s*(?:"([^"]*)")?/gm;
                              const parts = [];
                              let lastIndex = 0;
                              let match;

                              while ((match = regex.exec(comment.comment)) !== null) {
                                if (match.index > lastIndex) {
                                  parts.push(comment.comment.substring(lastIndex, match.index));
                                }

                                const [, lineStr, quotedText] = match;
                                parts.push(
                                  <button
                                    key={match.index}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent double trigger with bubble click
                                      setActiveHighlight({ line: parseInt(lineStr), text: quotedText });
                                    }}
                                    className="text-primary hover:underline font-semibold bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 inline-flex items-center gap-1 group transition-all mr-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Answer:{lineStr}
                                  </button>
                                );
                                lastIndex = regex.lastIndex;
                              }

                              if (lastIndex < comment.comment.length) {
                                parts.push(comment.comment.substring(lastIndex));
                              }

                              return parts.length > 0 ? parts : comment.comment;
                            })()}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-slate-50/50">
                <div className="space-y-3">
                  <Textarea
                    ref={annotationInputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyDownToSubmit}
                    placeholder="Provide feedback..."
                    className="min-h-[80px] bg-white resize-none shadow-inner"
                  />
                  <Button 
                    onClick={handleSubmitComment} 
                    className="w-full shadow-lg transition-transform active:scale-95" 
                    disabled={!newComment.trim() || submitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* 3-Pane File Viewer Integration */}
      <TaskFileViewer 
        isOpen={isFileViewerOpen}
        onClose={() => setIsFileViewerOpen(false)}
        fileUrl={response.file || null}
        comments={response.comments}
        onAddComment={onAddComment}
        submitting={submitting}
      />
    </div>
  );
};

export default StudentResponseDetail;