import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, User, Quote } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Student {
  id: string;
  rollNo: string;
  name: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

interface Comment {
  id: string;
  author: 'faculty' | 'student';
  message: string;
  timestamp: string;
  selectedText?: string;
}

interface StudentResponse {
  studentId: string;
  student: Student;
  answer: string;
  comments: Comment[];
}

interface StudentResponseDetailProps {
  response: StudentResponse;
  onAddComment: (comment: string, selectedText?: string) => void;
  onBack: () => void;
}

const StudentResponseDetail: React.FC<StudentResponseDetailProps> = ({
  response,
  onAddComment,
  onBack
}) => {
  const [newComment, setNewComment] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const answerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [response.comments]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedTextContent = selection.toString().trim();
      setSelectedText(selectedTextContent);
      // Add the selected text to the comment input
      setNewComment(prev => {
        const currentComment = prev.trim();
        const selectedTextRef = `Selected Text: "${selectedTextContent.toUpperCase()}"\n\n`;
        return currentComment ? `${currentComment}\n\n${selectedTextRef}` : selectedTextRef;
      });
    }
  };

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim(), selectedText || undefined);
      setNewComment('');
      setSelectedText('');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Responses
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Student Response Details</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and provide feedback</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Info and Answer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    {response.student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{response.student.name}</h3>
                    <Badge variant={getStatusBadgeVariant(response.student.status)}>
                      {response.student.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">Roll No: {response.student.rollNo}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Answer</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select text to add contextual comments
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]" ref={scrollAreaRef}>
                <div
                  ref={answerRef}
                  className="p-4 bg-muted/30 rounded-lg border cursor-text select-text leading-relaxed whitespace-pre-wrap"
                  onMouseUp={handleTextSelection}
                >
                  {response.answer}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Comments Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
              <CardDescription>Comments and feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={scrollAreaRef}
                className="h-[400px] mb-4 overflow-y-auto flex flex-col justify-end"
              >
                <div className="space-y-4">
                  {response.comments.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No comments yet. Be the first to provide feedback!
                    </p>
                  ) : (
                    response.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-lg ${
                          comment.author === 'faculty'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                            : 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">
                            {comment.author === 'student' ? 'Student' : 'Faculty'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment or question..."
                  className="min-h-[80px]"
                />
                <Button onClick={handleSubmitComment} className="w-full" disabled={!newComment.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentResponseDetail;