import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Upload, Send, FileText, CheckCircle2, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { taskService, Task, TaskSubmission, TaskComment } from '@/services/taskService';
import { CodeEditor } from '@/components/ui/code-editor';
import { format } from 'date-fns';

// Helper to extract subject name from task
const getSubjectName = (t: Task): string => {
  const sd = t.subject_details;
  if (!sd) return '';
  return sd.name || sd.subject_name || sd.subject || sd.title || String(t.subject) || '';
};

const StudentTask: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Debug authentication
  console.log('StudentTask component loaded, user:', user);

  // State management
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, TaskSubmission>>({});
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskContent, setTaskContent] = useState<string>('');
  const [newComment, setNewComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTaskView, setShowTaskView] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Sync with URL parameters after tasks are loaded
  useEffect(() => {
    const view = searchParams.get('view');
    const taskId = searchParams.get('taskId');
    if (view === 'task' && taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        handleTaskClick(task);
      }
    }
  }, [tasks]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const data = await taskService.getTasks();
      setTasks(data);

      const submissionMap: Record<string, TaskSubmission> = {};
      await Promise.all(data.map(async (task) => {
        const subs = await taskService.getTaskSubmissions(task.id);
        if (subs.length > 0) submissionMap[task.id] = subs[0];
      }));
      setSubmissions(submissionMap);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tasks.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Polling for updates when a task is active
  useEffect(() => {
    let interval: any;
    if (showTaskView && currentTask) {
      interval = setInterval(async () => {
        try {
          const subs = await taskService.getTaskSubmissions(currentTask.id);
          if (subs.length > 0) {
            setSubmissions(prev => ({ ...prev, [currentTask.id]: subs[0] }));
          }
        } catch (err) {
          console.error("Polling failed", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [showTaskView, currentTask]);

  const uniqueSubjects = Array.from(
    new Set(tasks.map(getSubjectName).filter(Boolean))
  ) as string[];

  const getTaskStatus = (taskId: string): string => {
    const sub = submissions[taskId];
    if (!sub) return 'pending';
    if (sub.is_submitted) return 'completed';
    return 'in_progress';
  };

  const filteredTasks = tasks.filter(t => {
    const subjectName = getSubjectName(t);
    const matchesSubject = selectedCourse === 'all' || subjectName === selectedCourse;
    const matchesStatus = selectedStatus === 'all' || getTaskStatus(t.id) === selectedStatus;
    return matchesSubject && matchesStatus;
  });
  // Handlers
  const handleTaskClick = (task: Task) => {
    setCurrentTask(task);
    const sub = submissions[task.id];
    setTaskContent(sub?.answer || '');
    setSelectedFile(null);
    setShowTaskView(true);
    // Update URL to persist state
    setSearchParams({ view: 'task', taskId: task.id });
  };

  const handleBackToTasks = () => {
    setShowTaskView(false);
    setCurrentTask(null);
    setTaskContent('');
    setNewComment('');
    setSelectedFile(null);
    setSearchParams({});
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddComment = async () => {
    if (!currentTask || !newComment.trim()) return;
    let sub = submissions[currentTask.id];

    try {
      if (!sub) {
        const formData = new FormData();
        formData.append('task', currentTask.id);
        formData.append('answer', '');
        formData.append('is_submitted', 'false');
        sub = await taskService.createTaskSubmission(formData);
        setSubmissions(prev => ({ ...prev, [currentTask.id]: sub }));
      }

      const addedComment = await taskService.addCommentToSubmission(sub.id, newComment);
      setSubmissions(prev => ({
        ...prev,
        [currentTask.id]: {
          ...sub,
          comments: [...(sub.comments || []), addedComment]
        }
      }));
      setNewComment('');
    } catch (err) {
      toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" });
    }
  };

  const handleSubmitTask = async () => {
    if (!currentTask) return;

    try {
      setIsSubmitting(true);
      const sub = submissions[currentTask.id];
      const formData = new FormData();
      formData.append('answer', taskContent);
      formData.append('is_submitted', 'true');
      formData.append('task', currentTask.id);

      if (selectedFile && !sub?.file) {
        formData.append('file', selectedFile);
      }

      let updatedSub;
      if (sub) {
        updatedSub = await taskService.submitTask(sub.id, formData);
      } else {
        updatedSub = await taskService.createTaskSubmission(formData);
      }

      setSubmissions(prev => ({ ...prev, [currentTask.id]: updatedSub }));
      toast({ title: "Success", description: "Task submitted successfully!" });
      handleBackToTasks();
    } catch (err) {
      toast({ title: "Error", description: "Failed to submit task.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (taskId: string) => {
    const status = getTaskStatus(taskId);
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        const sub = submissions[taskId];
        if (sub?.status === 'accepted') return 'default';
        if (sub?.status === 'rejected') return 'destructive';
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusLabelText = (taskId: string) => {
    const status = getTaskStatus(taskId);
    const sub = submissions[taskId];
    if (status === 'completed') {
      if (sub?.status === 'accepted') return 'Accepted';
      if (sub?.status === 'rejected') return 'Rejected';
      return 'Submitted';
    }
    return status === 'in_progress' ? 'In Progress' : 'Pending';
  };

  if (showTaskView && currentTask) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToTasks}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tasks
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{currentTask.title}</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
              <CardDescription>{currentTask.description}</CardDescription>
            </CardHeader>
          </Card>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* File upload info */}
          {submissions[currentTask.id]?.file && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Submitted File: <a href={submissions[currentTask.id].file} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Attachment</a></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {selectedFile && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm text-primary font-medium">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span>Selected for upload: {selectedFile.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="h-8 text-xs">Remove</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Content Area */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Your Work
                    {getTaskStatus(currentTask.id) !== 'completed' && (
                      <Button onClick={handleUploadClick} variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        {selectedFile ? 'Change File' : 'Upload File'}
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[520px] w-full rounded-md border overflow-hidden">
                    {currentTask?.task_type === 'coding' ? (
                      <CodeEditor
                        initialCode={taskContent}
                        onCodeChange={setTaskContent}
                        readOnly={getTaskStatus(currentTask.id) === 'completed'}
                        className="h-full border-0"
                      />
                    ) : (
                      <Textarea
                        value={taskContent}
                        onChange={(e) => setTaskContent(e.target.value)}
                        placeholder={getTaskStatus(currentTask.id) === 'completed'
                          ? 'No content available for this task.'
                          : 'Type your solution here...'
                        }
                        className="h-full resize-none border-0 focus-visible:ring-0 text-sm p-4"
                        disabled={getTaskStatus(currentTask.id) === 'completed'}
                      />
                    )}
                  </div>

                  {getTaskStatus(currentTask.id) !== 'completed' && (
                    <div className="flex justify-end mt-4">
                      <Button onClick={handleSubmitTask} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit Task
                      </Button>
                    </div>
                  )}
                  {getTaskStatus(currentTask.id) === 'completed' && (
                    <div className="flex justify-end mt-4">
                      <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Task submitted
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Comments */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Discussion</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea ref={scrollAreaRef} className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {submissions[currentTask.id]?.comments?.map((comment: TaskComment) => (
                        <div key={comment.id} className={`p-3 rounded-xl border ${comment.faculty
                          ? 'bg-blue-50/50 border-blue-100 ml-0 mr-4'
                          : 'bg-slate-50 border-slate-100 ml-4 mr-0'
                          }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[11px]  tracking-wider text-slate-500">
                              {comment.faculty ? (comment.faculty_details?.full_name || 'Faculty') : 'You'}
                            </span>
                            <span className="text-[10px]  font-medium">
                              {format(new Date(comment.created_at), 'HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">{comment.comment}</p>
                        </div>
                      ))}
                      {(!submissions[currentTask.id]?.comments || submissions[currentTask.id].comments.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20">
                          <Send className="h-10 w-10 mb-2" />
                          <p className="text-sm font-bold  tracking-widest">No messages yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment or ask a question..."
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-muted-foreground">View and complete your assigned tasks</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Subjects
                </label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="bg-white hover:bg-slate-50 transition-colors h-11">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {uniqueSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Status
                </label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-2xl bg-slate-50 animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="grid gap-4">
            {filteredTasks.map((task) => (
              <Card
                key={task.id}
                className="cursor-pointer hover:shadow-lg transition-all border-slate-200 group"
                onClick={() => handleTaskClick(task)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] capitalize tracking-widest">
                          {task.task_type || 'Task'}
                        </Badge>
                        <span className="text-[10px] tracking-widest">
                          {getSubjectName(task)}
                        </span>
                      </div>

                      <CardTitle className="text-lg leading-none">
                        {task.title}
                      </CardTitle>

                      <CardDescription className="line-clamp-2 text-sm mt-1">
                        {task.description}
                      </CardDescription>

                    </div>

                    <Badge
                      variant={getStatusBadgeVariant(task.id) as any}
                      className="shrink-0 font-bold px-3 py-1"
                    >
                      {getStatusLabelText(task.id)}
                    </Badge>

                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Created : {format(new Date(task.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>

                    {task.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Due :{format(new Date(task.due_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 py-20 bg-slate-50/50">
            <CardContent>
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                <p className=" font-bold  tracking-widest text-sm">No tasks found</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentTask;