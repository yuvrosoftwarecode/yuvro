import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Upload, Send, FileText, CheckCircle2, Calendar, Clock, Paperclip } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { taskService, Task, TaskSubmission, TaskComment } from '@/services/taskService';
import { CodeEditor } from '@/components/ui/code-editor';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { TaskFileViewer } from '@/components/shared/TaskFileViewer';

// Helper to extract subject name from task
const getSubjectName = (t: Task): string => {
  const sd = t.subject_details;
  if (!sd) return '';
  return sd.name || sd.subject_name || sd.subject || sd.title || String(t.subject) || '';
};

// Ensure URLs are secure, helpful for iframe display
const getAccessibleUrl = (url: string | null) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `http://${url}`;
};

const StudentTask: React.FC = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // State management
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, TaskSubmission>>({});
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  
  const [taskContent, setTaskContent] = useState<string>('');
  const [answersData, setAnswersData] = useState<Record<number, string>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
  
  // File Upload State: maps index (or 'general') to File
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  
  const [newComment, setNewComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTaskView, setShowTaskView] = useState<boolean>(false);

  // File Viewer State
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  const [fileViewerUrl, setFileViewerUrl] = useState<string | null>(null);
  const [initialHighlight, setInitialHighlight] = useState<{ line?: number; text?: string } | null>(null);

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
    
    // Parse answers_data if available
    if (sub?.answers_data) {
      try {
        setAnswersData(typeof sub.answers_data === 'string' ? JSON.parse(sub.answers_data) : sub.answers_data);
      } catch (e) {
        setAnswersData({});
      }
    } else {
        setAnswersData({});
    }

    setActiveQuestionIndex(null);
    setSelectedFiles({});
    setShowTaskView(true);
    setSearchParams({ view: 'task', taskId: task.id });
  };

  const handleBackToTasks = () => {
    setShowTaskView(false);
    setCurrentTask(null);
    setTaskContent('');
    setAnswersData({});
    setActiveQuestionIndex(null);
    setNewComment('');
    setSelectedFiles({});
    setSearchParams({});
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, questionIndex: number | 'general') => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [questionIndex]: file }));
    }
  };


  const handleAddComment = async (commentText?: string) => {
    const textToSubmit = typeof commentText === 'string' ? commentText : newComment;
    if (!currentTask || !textToSubmit.trim()) return;
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

      const addedComment = await taskService.addCommentToSubmission(sub.id, textToSubmit);
      setSubmissions(prev => ({
        ...prev,
        [currentTask.id]: {
          ...sub,
          comments: [...(sub.comments || []), addedComment]
        }
      }));
      if (typeof commentText !== 'string') setNewComment('');
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
      
      const hasMultipleQuestions = currentTask.question_details && currentTask.question_details.length > 1;

      if (hasMultipleQuestions) {
          formData.append('answers_data', JSON.stringify(answersData));
        
         // Fallback robust aggregation for `answer` field
          let aggregatedAnswer = '';
          Object.entries(answersData).forEach(([idxStr, text]) => {
            const numIdx = parseInt(idxStr);
            const questionTitle = currentTask.question_details?.[numIdx]?.question_text || `Question ${numIdx + 1}`;
            aggregatedAnswer += `\n--- ${questionTitle} ---\n${text}\n`;
          });
          formData.append('answer', aggregatedAnswer.trim() || 'No text submitted.');
      } else {
          formData.append('answer', taskContent);
      }

      formData.append('is_submitted', 'true');
      formData.append('task', currentTask.id);

      // JSZip Multiple File Logic
      if (Object.keys(selectedFiles).length > 0 && !sub?.file) {
        if (Object.keys(selectedFiles).length === 1 && selectedFiles['general']) {
          // Exactly one file for a general task, just upload it natively
          formData.append('file', selectedFiles['general']);
        } else {
          // Multiple files (from multiple questions). Zip them together.
          const zip = new JSZip();
          toast({ title: "Processing", description: "Zipping files before upload..." });
          for (const [key, file] of Object.entries(selectedFiles)) {
              const fileNamePrefix = key === 'general' ? `Main_` : `Q${parseInt(key) + 1}_`;
              zip.file(`${fileNamePrefix}${file.name}`, file);
          }
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          formData.append('file', zipBlob, `${currentTask.title.replace(/[^a-zA-Z0-9]/g, '_')}_Files.zip`);
        }
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
      case 'pending': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed':
        const sub = submissions[taskId];
        if (sub?.status === 'accepted') return 'default';
        if (sub?.status === 'rejected') return 'destructive';
        return 'default';
      default: return 'secondary';
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

  const openFileViewer = (url: string) => {
    setFileViewerUrl(url);
    setIsFileViewerOpen(true);
    setInitialHighlight(null);
  };

  const handleAnnotationLinkClick = (_filename: string, lineNum: number, quotedText?: string) => {
    if (!currentTask) return;
    const sub = submissions[currentTask.id];
    if (!sub?.file) return;

    setFileViewerUrl(getAccessibleUrl(sub.file));
    setIsFileViewerOpen(true);
    setInitialHighlight({ line: lineNum, text: quotedText });
  };

  if (showTaskView && currentTask) {
    const isMultiQuestion = currentTask.question_details && currentTask.question_details.length > 1;
    const isDescriptive = currentTask.task_type === 'descriptive';
    const isCoding = currentTask.task_type === 'coding';

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToTasks}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tasks
            </Button>
            <h1 className="text-2xl font-semibold text-foreground">
              {currentTask.title}
              {currentTask.unit_name && (
                <span className="text-2xl font-semibold text-foreground">- {currentTask.unit_name}</span>
              )}
            </h1>
          </div>

          {/* Submissions Download Alert */}
          {submissions[currentTask.id]?.file && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm text-primary font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {submissions[currentTask.id].file?.split('/').pop()?.split('?')[0] || 'Task Attachment'}
                      </p>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">File already submitted — cannot change natively.</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => openFileViewer(getAccessibleUrl(submissions[currentTask.id].file!))}
                    className="font-bold border-slate-200"
                  >
                    View File
                  </Button>
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
                        {getTaskStatus(currentTask.id) === 'completed' && (
                          <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-xl">
                            <p className="text-sm font-bold text-slate-500">
                              Answered: <span className="text-slate-800">{Object.keys(answersData).filter(k => answersData[parseInt(k)]?.trim().length > 0).length}</span> / {currentTask.question_details?.length}
                            </p>
                            <p className="text-sm text-emerald-600 font-bold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                Task submitted
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {isMultiQuestion && activeQuestionIndex !== null && (
                          <div className="mb-4 p-4 bg-slate-50 border border-slate-100 rounded-xl relative shadow-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-xl"></div>
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setActiveQuestionIndex(null)}
                                className="text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 -ml-2 h-8 px-2 font-bold transition-colors"
                              >
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
                              </Button>
                              <div className="flex gap-2">
                                {currentTask.question_details?.[activeQuestionIndex]?.marks && (
                                  <Badge variant="outline" className="text-[10px] bg-white text-slate-600 font-bold shadow-none">
                                    {currentTask.question_details[activeQuestionIndex].marks} Marks
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap pl-1">
                              {currentTask.question_details?.[activeQuestionIndex]?.question_text || currentTask.question_details?.[activeQuestionIndex]?.title || 'Untitled Question'}
                            </p>
                          </div>
                        )}

                        <div className="h-[400px] w-full rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          {isCoding ? (
                            <CodeEditor 
                              initialCode={isMultiQuestion && activeQuestionIndex !== null ? (answersData[activeQuestionIndex] || '') : taskContent}
                              onCodeChange={(code: string) => {
                                if (isMultiQuestion && activeQuestionIndex !== null) {
                                  setAnswersData(prev => ({ ...prev, [activeQuestionIndex]: code }));
                                } else {
                                  setTaskContent(code);
                                }
                              }}
                              readOnly={getTaskStatus(currentTask.id) === 'completed'}
                              className="h-full border-0"
                            />
                          ) : (
                            <Textarea
                              value={isMultiQuestion && activeQuestionIndex !== null ? (answersData[activeQuestionIndex] || '') : taskContent}
                              onChange={(e) => {
                                if (isMultiQuestion && activeQuestionIndex !== null) {
                                  setAnswersData(prev => ({ ...prev, [activeQuestionIndex]: e.target.value }));
                                } else {
                                  setTaskContent(e.target.value);
                                }
                              }}
                              placeholder={getTaskStatus(currentTask.id) === 'completed' 
                                ? 'No content available for this task.' 
                                : 'Explain your answer in detail...'
                              }
                              className="h-full resize-none border-0 focus-visible:ring-0 text-base font-medium p-5 bg-slate-50/30"
                              disabled={getTaskStatus(currentTask.id) === 'completed'}
                            />
                          )}
                        </div>
                        
                        {/* File Upload UI directly in Workspace (Only for Descriptive types and not completed) */}
                        {isDescriptive && getTaskStatus(currentTask.id) !== 'completed' && (
                          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                             {/* The identifier index for this specific map key */}
                             {(() => {
                                const currentFileKey = isMultiQuestion && activeQuestionIndex !== null ? activeQuestionIndex : 'general';
                                const currentlySelectedFile = selectedFiles[currentFileKey];
                                
                                return (
                                  <div className="flex items-center justify-between bg-primary/5 rounded-xl border border-primary/20 p-4">
                                     <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                                           <Paperclip className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                           <span className="text-sm font-bold text-slate-800">
                                             {currentlySelectedFile ? currentlySelectedFile.name : 'No attachment'}
                                           </span>
                                           <span className="text-[10px] font-black text-slate-400">
                                              Supplemental file
                                           </span>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                        {!currentlySelectedFile ? (
                                           <>
                                              <input
                                                type="file"
                                                className="hidden"
                                                id={`file-upload-${currentFileKey}`}
                                                accept="*/*"
                                                onChange={(e) => handleFileUpload(e, currentFileKey)}
                                              />
                                              <label htmlFor={`file-upload-${currentFileKey}`}>
                                                <div className="h-9 px-4 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-colors hover:bg-slate-100 border border-slate-200 cursor-pointer text-slate-700 bg-white shadow-sm active:scale-95 transition-all">
                                                  <Upload className="h-4 w-4 mr-2 text-primary" />
                                                  Upload file
                                                </div>
                                              </label>
                                           </>
                                        ) : (
                                           <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm animate-in fade-in zoom-in duration-300">
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                              <span className="text-xs font-black">Locked</span>
                                           </div>
                                        )}
                                     </div>
                                  </div>
                                )
                             })()}
                          </div>
                        )}

                        {getTaskStatus(currentTask.id) !== 'completed' && (
                          <div className="flex justify-end mt-4 pt-4 border-t border-slate-50">
                            {isMultiQuestion && activeQuestionIndex !== null ? (
                              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <Button 
                                  variant="outline"
                                  onClick={() => setActiveQuestionIndex(null)}
                                  className="font-bold border-slate-200"
                                >
                                  Save & Return to List
                                </Button>
                                <Button 
                                  onClick={() => {
                                    const nextIdx = activeQuestionIndex + 1;
                                    if (nextIdx < (currentTask.question_details?.length || 0)) {
                                      setActiveQuestionIndex(nextIdx);
                                    } else {
                                      setActiveQuestionIndex(null); 
                                      toast({ title: 'Saved', description: 'All questions reached. You can now submit.' });
                                    }
                                  }}
                                  className="font-bold shadow-md hover:shadow-lg px-8"
                                >
                                  Save & Next Question
                                </Button>
                              </div>
                            ) : !isMultiQuestion && (
                              <Button onClick={handleSubmitTask} disabled={isSubmitting} size="lg" className="font-bold shadow-md w-full sm:w-auto px-8">
                                {isSubmitting ? (
                                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2" />
                                )}
                                Submit Work
                              </Button>
                            )}
                          </div>
                        )}
                        {getTaskStatus(currentTask.id) === 'completed' && !isMultiQuestion && (
                          <div className="flex justify-end mt-4">
                            <p className="text-sm text-emerald-600 font-bold flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg">
                              <CheckCircle2 className="h-5 w-5" />
                              Task fully submitted
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                 </CardContent>
               </Card>
             </div>

            {/* Right Side - Comments */}
            <div>
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    Discussion
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
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
                      className="min-h-[90px] bg-slate-50/50 focus:bg-white transition-colors border-slate-200 rounded-xl resize-none font-medium text-sm"
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => handleAddComment()} disabled={!newComment.trim()} className="font-bold shadow-sm rounded-xl px-6">
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

        {/* 3-Pane File Viewer Modal */}
        <TaskFileViewer 
          isOpen={isFileViewerOpen}
          onClose={() => setIsFileViewerOpen(false)}
          fileUrl={fileViewerUrl}
          comments={submissions[currentTask.id]?.comments || []}
          onAddComment={handleAddComment}
          initialHighlight={initialHighlight}
        />
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

                      <Badge
                        variant={getStatusBadgeVariant(task.id) as any}
                        className="shrink-0 font-bold px-3 py-1"
                      >
                        {getStatusLabelText(task.id)}
                      </Badge>
                    </div>

                    {task.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          Created : {format(new Date(task.created_at), 'MMM dd, yyyy')}
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