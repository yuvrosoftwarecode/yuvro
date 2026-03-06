import React, { useState, useEffect } from 'react';
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
        return {
            label: 'Completed',
            color: 'bg-green-50 text-green-600 border-green-100',
            icon: <CheckCircle2 className="w-3.5 h-3.5" />
        };
    };

    return (
        <div className="p-4 md:p-8 min-h-screen bg-[#F8FAFC]">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <LayoutGrid className="w-8 h-8 text-indigo-600" />
                            Academic Tasks
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Submit your assignments and track your progress</p>
                    </div>
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within:text-indigo-600" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find a task or subject..."
                            className="pl-12 h-13 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
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
                                            <Badge variant="outline" className={`rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-wider border-none ${task.task_type === 'coding' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                {task.task_type === 'coding' ? <Code className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                                                {task.task_type}
                                            </Badge>
                                            <Badge variant="outline" className={`rounded-full px-4 py-1 font-bold border-none ${status.color}`}>
                                                <span className="mr-1">{status.icon}</span>
                                                {status.label}
                                            </Badge>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                {task.title}
                                            </h3>
                                            <p className="text-sm font-bold text-slate-400 mt-1">{task.subject_details?.name}</p>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                        <div className="space-y-4 mb-6">
                                            <div className="flex items-center gap-4 text-sm font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl ring-1 ring-slate-100">
                                                <Calendar className="w-4 h-4 text-indigo-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-slate-400">Created On</span>
                                                    <span className="text-slate-700">{format(new Date(task.created_at), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm font-bold text-slate-500 bg-orange-50 p-3 rounded-2xl ring-1 ring-orange-100">
                                                <Clock className="w-4 h-4 text-orange-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-orange-400">Due Date</span>
                                                    <span className="text-orange-900">{task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No Deadline'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handleStartTask(task)}
                                            className={`w-full h-14 rounded-3xl font-black text-lg gap-3 transition-all active:scale-[0.97] ${isSubmitted
                                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-none border border-emerald-100'
                                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20'
                                                }`}
                                        >
                                            {isSubmitted ? (
                                                <>
                                                    <CheckCircle2 className="w-6 h-6" />
                                                    View Submission
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
                        <h2 className="text-3xl font-black text-slate-900 mb-2">No Tasks Found</h2>
                        <p className="text-slate-400 font-bold max-w-sm">There are no tasks available for your section at this moment. Check back later!</p>
                    </div>
                )}
            </div>

            {/* Submission Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-6xl w-[95vw] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col h-[90vh]">
                    <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-white">
                        {/* Task Information Side */}
                        <div className="w-full md:w-[30%] bg-indigo-600 p-8 text-white flex flex-col overflow-y-auto">
                            <div className="mb-8">
                                <Badge className="bg-white/20 hover:bg-white/20 text-white border-none px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px]">
                                    {activeTask?.task_type} Task
                                </Badge>
                            </div>
                            <h2 className="text-3xl font-black leading-tight mb-4">{activeTask?.title}</h2>
                            <p className="text-indigo-100 font-bold text-sm mb-8 leading-relaxed">
                                {activeTask?.description || "No specific instructions provided. Please ensure all requirements are met."}
                            </p>

                            <div className="mt-auto space-y-4">
                                <div className="flex items-center gap-3 bg-white/10 p-4 rounded-3xl border border-white/10">
                                    <Clock className="w-6 h-6 text-indigo-200" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-indigo-300">Deadline</p>
                                        <p className="font-bold">{activeTask?.due_date ? format(new Date(activeTask?.due_date), 'MMM dd, yyyy') : 'No Deadline'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Middle: Submission Form Side */}
                        <div className="w-full md:w-[45%] border-r border-slate-100 p-8 flex flex-col overflow-y-auto bg-white">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-slate-900">Your Submission</DialogTitle>
                                <DialogDescription className="font-bold text-slate-400">
                                    Fill in your response below. You can update your submission until the deadline.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 space-y-6 mt-8">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400 flex justify-between">
                                        {activeTask?.task_type === 'coding' ? 'Source Code' : 'Answer Content'}
                                        {submissions[activeTask?.id || '']?.is_submitted && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Submitted</span>}
                                    </Label>

                                    {activeTask?.task_type === 'coding' ? (
                                        <div className="h-[500px] border border-slate-200 rounded-3xl overflow-hidden shadow-inner">
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
                                            />
                                        </div>
                                    ) : (
                                        <Textarea
                                            value={answerText}
                                            onChange={(e) => setAnswerText(e.target.value)}
                                            placeholder="Explain your answer in detail..."
                                            className="min-h-[300px] bg-slate-50 border-none rounded-3xl p-6 focus:ring-4 focus:ring-indigo-600/5 transition-all text-sm font-medium resize-none shadow-inner"
                                        />
                                    )}
                                </div>

                                {activeTask?.task_type === 'descriptive' && (
                                    <div className="space-y-3">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Supporting Documents</Label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <input
                                                    type="file"
                                                    id="file-upload"
                                                    className="hidden"
                                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                                />
                                                <label
                                                    htmlFor="file-upload"
                                                    className="flex items-center gap-3 w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer border-2 border-dashed border-slate-200 transition-all font-bold text-slate-500 text-sm"
                                                >
                                                    <Paperclip className="w-5 h-5 text-indigo-500" />
                                                    {selectedFile ? <span className="text-slate-900 truncate">{selectedFile.name}</span> : 'Add Attachment (PDF / Image)'}
                                                </label>
                                            </div>
                                            {submissions[activeTask?.id || '']?.file && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-14 w-14 rounded-2xl border-slate-200 hover:bg-slate-50"
                                                    onClick={() => window.open(submissions[activeTask?.id || ''].file)}
                                                >
                                                    <Download className="w-5 h-5 text-slate-600" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || (submissions[activeTask?.id || '']?.is_submitted && !selectedFile && submissions[activeTask?.id || '']?.answer === answerText)}
                                    className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-black text-lg shadow-xl shadow-slate-900/20 gap-3 transition-all active:scale-[0.98]"
                                >
                                    {isSubmitting ? 'Sending...' : (
                                        <>
                                            <Send className="w-6 h-6" />
                                            {submissions[activeTask?.id || '']?.is_submitted ? 'Update Submission' : 'Submit My Work'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Right: Feedback & Chat Side */}
                        <div className="w-full md:w-[25%] bg-[#F1F5F9] p-6 flex flex-col h-full overflow-hidden">
                            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-600" />
                                Feedback & Chat
                            </h3>

                            <ScrollArea className="flex-1 pr-4">
                                <div className="space-y-4 pb-4">
                                    {submissions[activeTask?.id || '']?.comments?.map((comment, idx) => (
                                        <div key={comment.id || idx} className={`flex flex-col ${comment.faculty ? 'items-start' : 'items-end'}`}>
                                            <div className={`p-4 rounded-2xl max-w-[90%] text-xs font-bold leading-relaxed ${comment.faculty
                                                ? 'bg-white text-slate-900 rounded-bl-none shadow-sm border border-slate-200'
                                                : 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/10'
                                                }`}>
                                                <p>{comment.comment}</p>
                                                <span className={`text-[8px] mt-1.5 block font-black uppercase tracking-widest opacity-50`}>
                                                    {comment.faculty ? 'Faculty' : 'You'} • {format(new Date(comment.created_at), 'HH:mm')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {(!submissions[activeTask?.id || '']?.comments || submissions[activeTask?.id || '']?.comments.length === 0) && (
                                        <div className="text-center py-20 opacity-30 flex flex-col items-center">
                                            <MessageSquare className="w-12 h-12 mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No conversation yet</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="pt-4 mt-auto">
                                <div className="relative">
                                    <Textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                        placeholder="Ask for feedback..."
                                        className="min-h-[100px] bg-white border-slate-200 rounded-[1.5rem] p-4 pr-12 focus:ring-4 focus:ring-indigo-600/5 transition-all text-xs font-bold resize-none shadow-sm"
                                    />
                                    <Button
                                        onClick={handleAddComment}
                                        disabled={isSendingComment || !commentText.trim()}
                                        size="icon"
                                        className="absolute bottom-3 right-3 h-8 w-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                                    >
                                        <Send className="w-4 h-4" />
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
