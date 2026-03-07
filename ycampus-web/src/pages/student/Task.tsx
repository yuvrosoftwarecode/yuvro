import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { taskService, Task, TaskSubmission } from '@/services/taskService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Calendar, Clock, CheckCircle2, AlertCircle,
    Search, Paperclip, Download, PlayCircle,
    FileText, Code, Send, LayoutGrid, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

import { CodeEditorWithAI } from '@/components/code-editor';
import type { Subject as EditorSubject, Unit as EditorUnit, CodingProblem } from './CodePractice';

const StudentTask: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [submissions, setSubmissions] = useState<Record<string, TaskSubmission>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Submission form state
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [answerText, setAnswerText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Chat state
    const [commentText, setCommentText] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize for descriptive textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [answerText, activeTask]);

    useEffect(() => {
        loadTasks();
    }, []);

    // Polling for updates when dialog is open
    useEffect(() => {
        let interval: any;
        if (isDialogOpen && activeTask) {
            interval = setInterval(async () => {
                try {
                    const subs = await taskService.getTaskSubmissions(activeTask.id);
                    if (subs.length > 0) {
                        setSubmissions(prev => ({ ...prev, [activeTask.id]: subs[0] }));
                    }
                } catch (err) {
                    console.error("Polling failed", err);
                }
            }, 4000); // Poll every 4 seconds
        }
        return () => clearInterval(interval);
    }, [isDialogOpen, activeTask]);

    const loadTasks = async () => {
        try {
            setIsLoading(true);
            const data = await taskService.getTasks();
            setTasks(data);

            // Load submissions for all tasks to check status
            const submissionMap: Record<string, TaskSubmission> = {};
            await Promise.all(data.map(async (task) => {
                const subs = await taskService.getTaskSubmissions(task.id);
                if (subs.length > 0) {
                    submissionMap[task.id] = subs[0];
                }
            }));
            setSubmissions(submissionMap);
        } catch (err) {
            toast.error('Failed to load tasks');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartTask = (task: Task) => {
        setActiveTask(task);
        const sub = submissions[task.id];
        setAnswerText(sub?.answer || '');
        setSelectedFile(null);
        setCommentText('');
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!activeTask) return;

        if (!answerText && activeTask.task_type === 'coding') {
            toast.error('Please provide your code');
            return;
        }

        try {
            setIsSubmitting(true);
            const sub = submissions[activeTask.id];

            const formData = new FormData();
            formData.append('answer', answerText);
            formData.append('is_submitted', 'true');
            formData.append('task', activeTask.id); // Include task ID for creation

            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            let updatedSub;
            if (sub) {
                updatedSub = await taskService.submitTask(sub.id, formData);
            } else {
                updatedSub = await taskService.createTaskSubmission(formData);
            }

            setSubmissions(prev => ({ ...prev, [activeTask.id]: updatedSub }));
            toast.success('Task submitted successfully!');
            setIsDialogOpen(false);
        } catch (err) {
            toast.error('Failed to submit task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddComment = async () => {
        if (!activeTask || !commentText.trim()) return;
        let sub = submissions[activeTask.id];

        try {
            setIsSendingComment(true);

            // If no submission exists, create one first (not submitted yet)
            if (!sub) {
                const formData = new FormData();
                formData.append('task', activeTask.id);
                formData.append('answer', '');
                formData.append('is_submitted', 'false');
                sub = await taskService.createTaskSubmission(formData);
                setSubmissions(prev => ({ ...prev, [activeTask.id]: sub }));
            }

            const newComment = await taskService.addCommentToSubmission(sub.id, commentText);
            setSubmissions(prev => ({
                ...prev,
                [activeTask.id]: {
                    ...sub,
                    comments: [...(sub.comments || []), newComment]
                }
            }));
            setCommentText('');
        } catch (err) {
            toast.error('Failed to send message');
        } finally {
            setIsSendingComment(false);
        }
    };

    const filteredTasks = tasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject_details?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusInfo = (taskId: string) => {
        const sub = submissions[taskId];
        if (!sub || !sub.is_submitted) {
            return {
                label: 'Pending',
                color: 'bg-orange-50 text-orange-600 border-orange-100',
                icon: <Clock className="w-3.5 h-3.5" />
            };
        }
        if (sub.status === 'accepted') {
            return {
                label: 'Accepted',
                color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                icon: <CheckCircle2 className="w-3.5 h-3.5" />
            };
        }
        if (sub.status === 'rejected') {
            return {
                label: 'Rejected',
                color: 'bg-rose-50 text-rose-600 border-rose-100',
                icon: <AlertCircle className="w-3.5 h-3.5" />
            };
        }
        return {
            label: 'Submitted',
            color: 'bg-blue-50 text-blue-600 border-blue-100',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />
        };
    };

    return (
        <div className="p-4 md:p-8 min-h-screen bg-[#F8FAFC]">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-normal text-slate-900 tracking-tight flex items-center gap-3">
                            <LayoutGrid className="w-8 h-8 text-orange-500" />
                            Academic Tasks
                        </h1>
                        <p className="text-slate-500 font-normal mt-1">Submit your assignments and track your progress</p>
                    </div>
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within:text-indigo-600" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find a task or subject..."
                            className="pl-12 h-13 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Tasks Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-[2.5rem] bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : filteredTasks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                        {filteredTasks.map((task) => {
                            const status = getStatusInfo(task.id);
                            const isSubmitted = submissions[task.id]?.is_submitted;

                            return (
                                <Card key={task.id} className="group rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-300 overflow-hidden flex flex-col">
                                    <CardHeader className="p-6 pb-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline" className={`rounded-full px-4 py-1 text-[10px] font-normal uppercase tracking-wider border-none ${task.task_type === 'coding' ? 'bg-orange-50 text-orange-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                {task.task_type === 'coding' ? <Code className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                                                {task.task_type}
                                            </Badge>
                                            <Badge variant="outline" className={`rounded-full px-4 py-1 font-normal border-none ${status.color}`}>
                                                <span className="mr-1">{status.icon}</span>
                                                {status.label}
                                            </Badge>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-normal text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                                                {task.title}
                                            </h3>
                                            <p className="text-sm font-normal text-slate-400 mt-1">{task.subject_details?.name}</p>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                        <div className="space-y-4 mb-6">
                                            <div className="flex items-center gap-4 text-sm font-normal text-slate-500 bg-slate-50 p-3 rounded-2xl ring-1 ring-slate-100">
                                                <Calendar className="w-4 h-4 text-orange-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-slate-400">Created On</span>
                                                    <span className="text-slate-700">{format(new Date(task.created_at), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm font-normal text-slate-500 bg-orange-50 p-3 rounded-2xl ring-1 ring-orange-100">
                                                <Clock className="w-4 h-4 text-orange-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-orange-400">Due Date</span>
                                                    <span className="text-orange-900">{task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No Deadline'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handleStartTask(task)}
                                            className={`w-full h-14 rounded-3xl font-normal text-lg gap-3 transition-all active:scale-[0.97] ${isSubmitted
                                                ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 shadow-none border border-orange-100'
                                                : 'bg-orange-500 text-white hover:bg-orange-500 shadow-xl shadow-orange-100'
                                                }`}
                                        >
                                            {isSubmitted ? (
                                                <>
                                                    {submissions[task.id]?.status === 'accepted' ? (
                                                        <CheckCircle2 className="w-6 h-6" />
                                                    ) : submissions[task.id]?.status === 'rejected' ? (
                                                        <AlertCircle className="w-6 h-6" />
                                                    ) : (
                                                        <CheckCircle2 className="w-6 h-6" />
                                                    )}
                                                    {(!submissions[task.id]?.status || submissions[task.id]?.status === 'pending')
                                                        ? 'View Submission'
                                                        : submissions[task.id]?.status.charAt(0).toUpperCase() + submissions[task.id]?.status.slice(1)}
                                                </>
                                            ) : (
                                                <>
                                                    <PlayCircle className="w-6 h-6" />
                                                    Start Task
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
                        <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <LayoutGrid className="w-16 h-16 text-slate-200" />
                        </div>
                        <h2 className="text-3xl font-normal text-slate-900 mb-2">No Tasks Found</h2>
                        <p className="text-slate-400 font-normal max-w-sm">There are no tasks available for your section at this moment. Check back later!</p>
                    </div>
                )}
            </div>

            {/* Submission Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-7xl w-[95vw] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col h-[90vh] bg-white">
                    <div className="flex flex-col md:flex-row flex-1 min-h-0">
                        {/* Main Submission Area */}
                        <div className="w-full md:w-[68%] border-r border-slate-50 p-10 flex flex-col overflow-y-auto custom-scrollbar">
                            <div className="mb-10 flex justify-between items-start gap-4">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-orange-50 hover:bg-orange-50 text-orange-600 border-none px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px]">
                                            {activeTask?.task_type} Task
                                        </Badge>
                                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                                Due: {activeTask?.due_date ? format(new Date(activeTask?.due_date), 'MMM dd, yyyy') : 'No Deadline'}
                                            </span>
                                        </div>
                                    </div>
                                    <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{activeTask?.title}</h2>
                                    <p className="text-slate-500 text-lg leading-relaxed max-w-2xl font-medium">
                                        {activeTask?.description || "No specific instructions provided. Please ensure all requirements are met."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 space-y-10">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                            {activeTask?.task_type === 'coding' ? 'Source Code Editor' : 'Your Answer Content'}
                                        </Label>
                                        {submissions[activeTask?.id || '']?.is_submitted && (
                                            <Badge className={`border-none px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${submissions[activeTask?.id || '']?.status === 'accepted'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : submissions[activeTask?.id || '']?.status === 'rejected'
                                                    ? 'bg-rose-50 text-rose-600'
                                                    : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {submissions[activeTask?.id || '']?.status === 'accepted' ? <CheckCircle2 className="w-3 h-3" /> : submissions[activeTask?.id || '']?.status === 'rejected' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                                {submissions[activeTask?.id || '']?.status}
                                            </Badge>
                                        )}
                                    </div>

                                    {activeTask?.task_type === 'coding' ? (
                                        <div className="h-[450px] border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                            <CodeEditorWithAI
                                                problem={{
                                                    id: activeTask.id,
                                                    title: activeTask.title,
                                                    difficulty: 'Medium',
                                                    score: 0,
                                                    description: activeTask.description || '',
                                                    test_cases_basic: activeTask.question_details?.flatMap(q => q.test_cases_basic || []) || [],
                                                    test_cases_advanced: []
                                                } as CodingProblem}
                                                subject={{
                                                    id: String(activeTask.subject),
                                                    name: activeTask.subject_details?.name || 'Subject',
                                                    category: 'programming_languages'
                                                } as any}
                                                unit={{
                                                    id: activeTask.unit || '1',
                                                    name: activeTask.unit_name || 'Unit'
                                                } as any}
                                                onBack={() => setIsDialogOpen(false)}
                                                isEmbedded={true}
                                                showBreadcrumb={false}
                                                showProblemDescription={false}
                                                codeSubmissionType="practice"
                                                initialEditorOpen={true}
                                                initialCode={answerText || submissions[activeTask.id]?.answer || ''}
                                                onCodeChange={(newCode) => setAnswerText(newCode)}
                                                hideSubmitButton={true}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {(!answerText && submissions[activeTask?.id || '']?.file) ? (
                                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-4">
                                                    <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                        <FileText className="h-10 w-10 text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-slate-900">Document Submitted</h4>
                                                        <p className="text-slate-500 font-medium">You have uploaded a file as your response.</p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => window.open(submissions[activeTask?.id || ''].file)}
                                                        className="rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-white"
                                                    >
                                                        <Download className="h-4 w-4 mr-2" /> View Submitted File
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Textarea
                                                    ref={textareaRef}
                                                    value={answerText}
                                                    onChange={(e) => setAnswerText(e.target.value)}
                                                    placeholder="Explain your answer in detail..."
                                                    className="min-h-[150px] bg-slate-50 border-none rounded-[2.5rem] p-8 focus:ring-0 hover:border-orange-500 focus:border-orange-500 border-2 border-transparent transition-all text-lg font-medium resize-none shadow-inner leading-relaxed overflow-hidden"
                                                    disabled={submissions[activeTask?.id || '']?.status === 'accepted'}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>

                                {activeTask?.task_type === 'descriptive' && (
                                    <div className="space-y-4">
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Supporting Documents</Label>
                                        <div className="flex items-center gap-4">
                                            <div className="relative flex-1">
                                                <input
                                                    type="file"
                                                    id="file-upload"
                                                    className="hidden"
                                                    accept=".pdf,.jpg,.jpeg,.png,.zip,.rar"
                                                    disabled={submissions[activeTask?.id || '']?.status === 'accepted'}
                                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                />
                                                <label
                                                    htmlFor="file-upload"
                                                    className={`flex items-center gap-4 w-full p-6 rounded-3xl cursor-pointer border-2 border-dashed transition-all font-bold ${submissions[activeTask?.id || '']?.status === 'accepted'
                                                        ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
                                                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'}`}
                                                >
                                                    <Paperclip className={`w-5 h-5 ${submissions[activeTask?.id || '']?.file ? 'text-slate-300' : 'text-orange-500'}`} />
                                                    {selectedFile ? (
                                                        <span className="text-slate-900 truncate">{selectedFile.name}</span>
                                                    ) : submissions[activeTask?.id || '']?.file ? (
                                                        <span className="text-orange-600">Change Attachment ({submissions[activeTask?.id || '']?.file?.split('/').pop()})</span>
                                                    ) : (
                                                        'Add Attachment (PDF / Image / ZIP / RAR)'
                                                    )}
                                                </label>
                                            </div>
                                            {submissions[activeTask?.id || '']?.file && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-20 w-20 rounded-3xl border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-orange-500 transition-colors"
                                                    onClick={() => window.open(submissions[activeTask?.id || ''].file)}
                                                >
                                                    <Download className="w-6 h-6" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || submissions[activeTask?.id || '']?.status === 'accepted' || (submissions[activeTask?.id || '']?.is_submitted && submissions[activeTask?.id || '']?.status !== 'rejected' && !selectedFile && submissions[activeTask?.id || '']?.answer === answerText)}
                                    className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-100 gap-4 transition-all active:scale-[0.98]"
                                >
                                    {isSubmitting ? 'Processing...' : (
                                        <>
                                            <Send className="w-6 h-6" />
                                            {submissions[activeTask?.id || '']?.status === 'rejected' ? 'Resubmit My Work' : submissions[activeTask?.id || '']?.is_submitted ? 'Update Submission' : 'Submit My Work'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Feedback & Chat Side */}
                        <div className="w-full md:w-[32%] bg-[#F8FAFC] p-8 flex flex-col h-full overflow-hidden">
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Discussion</h3>
                                <p className="text-slate-400 text-sm font-medium mt-1">Comments and feedback from faculty</p>
                            </div>

                            <ScrollArea className="flex-1 pr-4">
                                <div className="space-y-6 pb-6 mt-2">
                                    {submissions[activeTask?.id || '']?.comments && submissions[activeTask?.id || '']?.comments.length > 0 ? (
                                        submissions[activeTask?.id || '']?.comments.map((comment, idx) => (
                                            <div key={comment.id || idx} className={`flex flex-col ${comment.faculty ? 'items-start' : 'items-end'}`}>
                                                <div className={`p-4 rounded-xl max-w-[90%] text-sm leading-relaxed border-l-4 ${comment.faculty
                                                    ? 'bg-white border-blue-500 text-slate-900 rounded-bl-none shadow-sm'
                                                    : 'bg-orange-50 border-orange-500 text-slate-900 rounded-br-none shadow-sm'
                                                    }`}>
                                                    <div className="flex items-center justify-between gap-x-4 mb-1">
                                                        <span className={`text-[11px] font-bold tracking-wide ${comment.faculty ? 'text-blue-600' : 'text-orange-600'}`}>
                                                            {comment.faculty ? 'Faculty' : 'You'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold">
                                                            {format(new Date(comment.created_at), 'M/dd, hh:mm a')}
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap font-medium text-slate-700">{comment.comment}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center py-32 opacity-20">
                                            <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
                                            <p className="text-xs font-bold uppercase tracking-[0.2em]">No conversation started</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="pt-6 mt-auto">
                                <div className="relative group">
                                    <Textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                        placeholder="Type your message here..."
                                        className="min-h-[120px] bg-white border-slate-200 rounded-[2rem] p-6 pr-16 focus:ring-0 focus:border-orange-500 hover:border-orange-400 transition-all text-sm font-medium resize-none shadow-sm"
                                    />
                                    <Button
                                        onClick={handleAddComment}
                                        disabled={isSendingComment || !commentText.trim()}
                                        size="icon"
                                        className="absolute bottom-4 right-4 h-10 w-10 rounded-2xl bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-100 transition-all active:scale-90"
                                    >
                                        <Send className="w-5 h-5 text-white" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StudentTask;
