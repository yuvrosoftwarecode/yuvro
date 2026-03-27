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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Response Review</h1>
            <p className="text-muted-foreground text-sm">Reviewing submission from {user.first_name || 'Student'}</p>
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
          {/* Student Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary">
                    {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-foreground">
                      {user.first_name} {user.last_name}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(response.status)} className="capitalize px-3">
                      {response.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span>Roll No: {student.roll_number || 'N/A'}</span>
                    <span>Submitted: {response.submitted_at ? format(new Date(response.submitted_at), 'MMM dd, HH:mm') : 'Not submitted'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission content */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Student Submission</CardTitle>
                  <CardDescription>Main answer and attached files</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {response.answer && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Text Answer</h4>
                  <div className="p-4 bg-muted/20 rounded-xl border leading-relaxed whitespace-pre-wrap text-sm italic text-slate-700">
                    {response.answer}
                  </div>
                </div>
              )}

              {response.file && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Attachment</h4>
                  <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border shadow-sm">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                          {response.file.split('/').pop()}
                        </p>
                        <p className="text-xs text-muted-foreground">Attached Document or Archive</p>
                      </div>
                    </div>
                    <Button className="shadow-sm font-bold" onClick={() => setIsFileViewerOpen(true)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review Files
                    </Button>
                  </div>
                </div>
              )}

              {!response.answer && !response.file && (
                <div className="py-12 text-center text-muted-foreground italic">
                  No content submitted yet.
                </div>
              )}
            </CardContent>
          </Card>
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
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No messages yet</p>
                    </div>
                  ) : (
                    response.comments.map((comment: TaskComment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-2xl max-w-[90%] border shadow-sm ${
                          comment.faculty
                            ? 'bg-blue-50/50 border-blue-100 ml-0 mr-auto'
                            : 'bg-white border-slate-100 ml-auto mr-0'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-4 mb-2">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">
                            {comment.faculty ? 'Faculty' : 'Student'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(comment.created_at), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{comment.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-slate-50/50">
                <div className="space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
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