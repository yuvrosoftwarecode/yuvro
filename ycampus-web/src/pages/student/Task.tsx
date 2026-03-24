import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { taskService, Task, TaskSubmission } from '@/services/taskService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Calendar, Clock, CheckCircle2, AlertCircle,
    Search, Paperclip, Download, PlayCircle,
    FileText, Code, Send, LayoutGrid, MessageSquare,
    Eye, Trash2, X, FolderOpen
} from 'lucide-react';
import { format } from 'date-fns';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import RoleSidebar from '@/components/common/RoleSidebar';

import { CodeEditorWithAI } from '@/components/code-editor';
import type { Subject as EditorSubject, Unit as EditorUnit, CodingProblem } from './CodePractice';

const StudentTask: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [submissions, setSubmissions] = useState<Record<string, TaskSubmission>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Submission form state
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [answerText, setAnswerText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isClearingChat, setIsClearingChat] = useState(false);

    // File viewer modal
    const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
    const [fileViewerUrl, setFileViewerUrl] = useState<string | null>(null);
    const [fileViewerContent, setFileViewerContent] = useState<string | null>(null);
    const [fileViewerLanguage, setFileViewerLanguage] = useState('plaintext');
    const [fileViewerLoading, setFileViewerLoading] = useState(false);

    const [commentText, setCommentText] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);

    // ZIP preview state
    const [zipFiles, setZipFiles] = useState<{ name: string; content: string; type: 'text' | 'image' | 'other' }[]>([]);
    const [selectedZipFile, setSelectedZipFile] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);
    const pendingNavRef = useRef<{ filename: string, lineNumber: number } | null>(null);



    // Auto-resize for descriptive textarea up to max-height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = scrollHeight > 400 ? '400px' : `${scrollHeight}px`;
        }
    }, [answerText, activeTask]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [submissions, isDialogOpen]);

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
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isDialogOpen, activeTask]);

    // Silent background refresh — does NOT reset isLoading to avoid UI flicker
    const silentRefresh = async () => {
        try {
            const data = await taskService.getTasks();
            setTasks(data);
            const submissionMap: Record<string, TaskSubmission> = {};
            await Promise.all(data.map(async (task) => {
                const subs = await taskService.getTaskSubmissions(task.id);
                if (subs.length > 0) submissionMap[task.id] = subs[0];
            }));
            setSubmissions(submissionMap);
        } catch {
            // silently ignore background refresh errors
        }
    };

    // Polling for task list updates (background) — silent, no loader flash
    useEffect(() => {
        const interval = setInterval(silentRefresh, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadTasks = async () => {
        try {
            setIsLoading(true);
            const data = await taskService.getTasks();
            setTasks(data);

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
            formData.append('task', activeTask.id);

            // Only include file on first submission (no re-upload)
            if (selectedFile && !sub?.file) {
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

    /* 
    const handleClearChat = async () => {
        if (!activeTask) return;
        const sub = submissions[activeTask.id];
        if (!sub) return;
        try {
            setIsClearingChat(true);
            await taskService.clearSubmissionChat(sub.id);
            setSubmissions(prev => ({
                ...prev,
                [activeTask.id]: { ...sub, comments: [] }
            }));
            toast.success('Chat cleared successfully');
        } catch {
            toast.error('Failed to clear chat');
        } finally {
            setIsClearingChat(false);
        }
    };
    */

    const getLanguageFromExtension = (filename: string): string => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const map: Record<string, string> = {
            js: 'javascript', ts: 'typescript', py: 'python', java: 'java',
            cpp: 'cpp', c: 'c', html: 'html', css: 'css', json: 'json',
            xml: 'xml', md: 'markdown', txt: 'plaintext', sh: 'shell',
        };
        return map[ext] || 'plaintext';
    };

    const openFileViewer = (url: string) => {
        setFileViewerUrl(url);
        setIsFileViewerOpen(true);
    };

    const isTextFile = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const textExtensions = [
            'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'cs',
            'html', 'css', 'json', 'md', 'txt', 'sql', 'sh',
            'xml', 'yaml', 'yml', 'csv', 'env', 'log', 'dockerfile', 'makefile', 'gitignore'
        ];
        return textExtensions.includes(ext) || filename.toLowerCase().includes('makefile') || filename.toLowerCase().includes('dockerfile');
    };

    const getAccessibleUrl = (url: string | null | undefined) => {
        if (!url) return '';
        let accessibleUrl = url;
        if (accessibleUrl.includes('://ycampus-backend') || accessibleUrl.includes('://localhost:8001')) {
            try {
                const urlObj = new URL(accessibleUrl);
                return `http://localhost:8001${urlObj.pathname}${urlObj.search}`;
            } catch (e) {}
        }
        return accessibleUrl;
    };

    const isImageFile = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '');
    };

    useEffect(() => {
        const processFile = async () => {
            const closeFileViewer = () => {
                setIsFileViewerOpen(false);
                setFileViewerUrl(null);
                setFileViewerContent(null);
                setSelectedZipFile(null);
                setZipFiles([]);
                if (editorRef.current) {
                    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
                }
            };

            if (!fileViewerUrl || !isFileViewerOpen) {
                closeFileViewer();
                return;
            }

            setFileViewerLoading(true);
            try {
                // Use relative URL to leverage Vite proxy and avoid CORS issues
                const relativeUrl = fileViewerUrl.includes('://') 
                    ? new URL(fileViewerUrl).pathname + new URL(fileViewerUrl).search 
                    : fileViewerUrl;
                const filename = fileViewerUrl.split('/').pop()?.split('?')[0] || '';

                if (filename.toLowerCase().endsWith('.zip')) {
                    try {
                        const headResp = await axios.head(relativeUrl);
                        const contentLength = headResp.headers['content-length'];
                        if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) {
                            toast.info(`ZIP file is too large (${(parseInt(contentLength, 10) / 1024 / 1024).toFixed(1)}MB) for in-browser preview. Please download to review.`);
                            setFileViewerContent("");
                            setZipFiles([]);
                            setFileViewerLoading(false);
                            return;
                        }
                    } catch (e) {
                         // Silently ignore HEAD errors, will try to fetch anyway
                    }
                }
                
                console.log("Attempting to preview file (via proxy):", relativeUrl);
                const axiosResp = await axios.get(relativeUrl, { responseType: 'blob' });
                const blob = axiosResp.data;

                if (filename.toLowerCase().endsWith('.zip')) {
                    // @ts-expect-error Types for remote CDN are not locally configured
                    const jszipModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
                    const JSZip = jszipModule.default || jszipModule;
                    const zip = new JSZip();
                    const contents = await zip.loadAsync(blob);
                    const files: { name: string; content: string; type: 'text' | 'image' | 'other' }[] = [];

                    for (const [name, file] of Object.entries(contents.files)) {
                        const anyFile = file as any;
                        if (!anyFile.dir) {
                            if (isImageFile(name)) {
                                const base64 = await anyFile.async('base64');
                                const ext = name.split('.').pop()?.toLowerCase();
                                files.push({ name, content: `data:image/${ext};base64,${base64}`, type: 'image' });
                            } else {
                                // Default all other files to text preview
                                const content = await anyFile.async('string');
                                files.push({ name, content, type: 'text' });
                            }
                        }
                    }
                    
                    setZipFiles(files);
                    if (files.length > 0) {
                        const pendingNav = pendingNavRef.current;
                        if (pendingNav) {
                            const targetFile = files.find(f => f.name === pendingNav.filename);
                            if (targetFile) {
                                setSelectedZipFile(targetFile.name);
                                setFileViewerContent(targetFile.content);
                                setFileViewerLanguage(getLanguageFromExtension(targetFile.name));
                                
                                setTimeout(() => {
                                    if (editorRef.current) {
                                        editorRef.current.revealLineInCenter(pendingNav.lineNumber);
                                        editorRef.current.setPosition({ lineNumber: pendingNav.lineNumber, column: 1 });
                                        editorRef.current.focus();
                                        try {
                                            decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
                                                {
                                                    range: new (window as any).monaco.Range(pendingNav.lineNumber, 1, pendingNav.lineNumber, 1),
                                                    options: { isWholeLine: true, className: 'bg-orange-100/50 block w-full border-l-[3px] border-orange-500' }
                                                }
                                            ]);
                                        } catch (e) {}
                                    }
                                }, 300);
                            }
                            pendingNavRef.current = null;
                        } else {
                            const firstPreviewable = files[0];
                            setSelectedZipFile(firstPreviewable.name);
                            setFileViewerContent(firstPreviewable.content);
                            setFileViewerLanguage(getLanguageFromExtension(firstPreviewable.name));
                        }
                    } else {
                        toast.info("ZIP is empty or contains no previewable files.");
                        setFileViewerContent("");
                    }
                } else if (isTextFile(filename)) {
                    const text = await blob.text();
                    setFileViewerContent(text);
                    setFileViewerLanguage(getLanguageFromExtension(filename));
                    setZipFiles([]);
                    setSelectedZipFile(null);
                } else if (isImageFile(filename)) {
                    setFileViewerContent(null);
                    setZipFiles([]);
                    setSelectedZipFile(null);
                } else if (filename.toLowerCase().endsWith('.pdf')) {
                    setFileViewerContent(null);
                    setZipFiles([]);
                    setSelectedZipFile(null);
                } else {
                    // Universal fallback to text preview
                    const text = await blob.text();
                    setFileViewerContent(text);
                    setFileViewerLanguage(getLanguageFromExtension(filename));
                    setZipFiles([]);
                    setSelectedZipFile(null);
                }
            } catch (error) {
                console.error("Error loading file:", error);
                toast.error("Failed to load file contents");
            } finally {
                setFileViewerLoading(false);
            }
        };

        processFile();
    }, [fileViewerUrl, isFileViewerOpen]);

    // Helper: extract subject name from task regardless of backend field shape
    const getSubjectName = (t: Task): string => {
        const sd = t.subject_details;
        if (!sd) return '';
        // Try multiple possible field names the backend may return
        return sd.name || sd.subject_name || sd.subject || sd.title || String(t.subject) || '';
    };

    // Unique subjects derived from task list
    const uniqueSubjects = Array.from(
        new Set(tasks.map(getSubjectName).filter(Boolean))
    ) as string[];

    const getTaskStatus = (taskId: string): 'pending' | 'in_progress' | 'completed' => {
        const sub = submissions[taskId];
        if (!sub) return 'pending';             // no submission record at all
        if (sub.is_submitted) return 'completed'; // student submitted — done from their perspective
        return 'in_progress';                   // draft exists but not yet submitted
    };

    const filteredTasks = tasks.filter(t => {
        const subjectName = getSubjectName(t);
        const matchesSearch =
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = subjectFilter === 'all' || subjectName === subjectFilter;
        const matchesStatus = statusFilter === 'all' || getTaskStatus(t.id) === statusFilter;
        return matchesSearch && matchesSubject && matchesStatus;
    });

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

    // Current active submission
    const activeSub = activeTask ? submissions[activeTask.id] : null;
    const hasFilePreviouslySubmitted = !!(activeSub?.file);
    const fileAlreadyUploaded = hasFilePreviouslySubmitted;

    // Handler for clicking an annotation to jump to that line
    const handleAnnotationClick = (comment: string) => {
        const bracketEndIndex = comment.indexOf(']');
        if (bracketEndIndex === -1) return;

        const tag = comment.substring(1, bracketEndIndex);
        let filename = '';
        let lineNumber = 0;

        if (tag.includes('|')) {
            const parts = tag.split('|');
            filename = parts[0].trim();
            const linePart = parts[1].trim();
            if (linePart.startsWith('Line:')) {
                lineNumber = parseInt(linePart.replace('Line:', '').trim());
            }
        } else if (tag.startsWith('Line:')) {
            lineNumber = parseInt(tag.replace('Line:', '').trim());
        }

        if (lineNumber > 0) {
            // First, ensure file viewer is open
            if (!isFileViewerOpen) {
                const url = activeSub?.file;
                if (url) {
                    pendingNavRef.current = { filename, lineNumber };
                    openFileViewer(url);
                    return; // The useEffect will handle the rest once loaded
                }
            }

            // If it's a file inside a ZIP, switch to it
            if (filename && zipFiles.length > 0) {
                const targetFile = zipFiles.find(f => f.name === filename);
                if (targetFile) {
                    setSelectedZipFile(targetFile.name);
                    setFileViewerContent(targetFile.content);
                    setFileViewerLanguage(getLanguageFromExtension(targetFile.name));
                }
            }

            // Scroll the editor to the line
            setTimeout(() => {
                if (editorRef.current) {
                    editorRef.current.revealLineInCenter(lineNumber);
                    editorRef.current.setPosition({ lineNumber, column: 1 });
                    editorRef.current.focus();

                    try {
                        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
                            {
                                range: new (window as any).monaco.Range(lineNumber, 1, lineNumber, 1),
                                options: { isWholeLine: true, className: 'bg-orange-100/50 block w-full border-l-[3px] border-orange-500' }
                            }
                        ]);
                    } catch (e) {}
                }
            }, 300);
        }
    };


    // Filter inline comments (from faculty file review)
    const inlineComments = (activeSub?.comments || []).filter(c => {
        const bracketEnd = c.comment.indexOf(']');
        if (bracketEnd === -1 || !c.comment.startsWith('[')) return false;
        const tag = c.comment.substring(1, bracketEnd);
        
        if (selectedZipFile) {
            // We are viewing a file inside a ZIP
            return tag.startsWith(`${selectedZipFile} |`);
        } else {
            // We are viewing a standalone file
            return tag.startsWith('Line:') || tag === 'File Review';
        }
    });

    return (
        <div className="flex h-screen bg-white font-sans overflow-hidden">
            <RoleSidebar />
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                Tasks
                            </h1>
                            <p className="text-slate-500 font-medium mt-1">View and complete your assigned tasks</p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none transition-all placeholder:text-gray-400 focus:border-slate-800 focus:ring-4 focus:ring-slate-800/10 shadow-sm"
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    {/* Filters — single outer card, two inner select boxes */}
                    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 mb-4 shadow-sm">
                        <div className="flex gap-6">
                            {/* Subjects */}
                            <div className="flex-1 space-y-2">
                                <span className="text-[13px] font-bold text-gray-900">Subjects</span>
                                <div className="relative">
                                    <select
                                        value={subjectFilter}
                                        onChange={e => setSubjectFilter(e.target.value)}
                                        className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none cursor-pointer pr-8"
                                    >
                                        <option value="all">All Subjects</option>
                                        {uniqueSubjects.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex-1 space-y-2">
                                <span className="text-[13px] font-bold text-gray-900">Status</span>
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none cursor-pointer pr-8"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Tasks List */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 rounded-2xl bg-slate-50 animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : filteredTasks.length > 0 ? (
                    <div className="space-y-4 pb-12">
                        {filteredTasks.map((task) => {
                            const status = getStatusInfo(task.id);
                            
                            // Determine status label and strict layout styling
                            const taskStatus = getTaskStatus(task.id);
                            const statusText = taskStatus === 'completed' ? 'Completed' : taskStatus === 'in_progress' ? 'In Progress' : 'Pending';
                            const badgeStyle = taskStatus === 'pending'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-[#0F172A] text-white border-none shadow-sm';
                            
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleStartTask(task)}
                                    className="bg-white rounded-2xl border border-gray-300 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer shadow-sm transition-shadow hover:shadow-lg group"
                                >
                                    {/* Left: info */}
                                    <div className="flex-1 space-y-2 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-white text-slate-700`}>
                                                {task.task_type === 'coding' ? <Code className="w-3 h-3 mr-1 inline text-slate-500" /> : <FileText className="w-3 h-3 mr-1 inline text-slate-500" />}
                                                {task.task_type || 'Task'}
                                            </Badge>
                                            {getSubjectName(task) && (
                                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{getSubjectName(task)}</span>
                                            )}
                                        </div>
                                        <h3 className="text-[16px] font-bold text-[#0F172A] group-hover:text-slate-700 transition-colors truncate pr-4">
                                            {task.title}
                                        </h3>
                                        <p className="text-[13px] text-slate-500 line-clamp-1 leading-relaxed font-medium pr-4">
                                            {task.description || 'No description provided.'}
                                        </p>
                                        <div className="flex items-center gap-4 text-[12px] text-slate-400 font-medium pt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Created {format(new Date(task.created_at), 'M/d/yyyy')}
                                            </span>
                                            {task.due_date && (
                                                <span className="flex items-center gap-1 text-orange-500 font-semibold">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Due {format(new Date(task.due_date), 'M/d/yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: status badge */}
                                    <div className="shrink-0">
                                        <Badge variant="outline" className={`rounded-full px-4 py-1.5 text-[12px] font-bold shadow-none ${badgeStyle}`}>
                                            {statusText}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <LayoutGrid className="w-12 h-12 text-slate-200" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Tasks Found</h2>
                        <p className="text-slate-400 font-medium max-w-sm">There are no tasks available for your section at this moment. Check back later!</p>
                    </div>
                )}
                </div>
            </div>

            {/* Submission Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-7xl max-h-[85vh] w-[95vw] rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col bg-white [&>button.absolute.right-4]:hidden">
                    <DialogTitle className="sr-only">Task Submission</DialogTitle>
                    <DialogDescription className="sr-only">View and submit your task details</DialogDescription>
                    {/* Custom close button */}
                    <button
                        onClick={() => setIsDialogOpen(false)}
                        className="absolute top-6 right-6 z-10 h-9 w-9 flex items-center justify-center rounded-xl bg-white/80 text-gray-500 shadow-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col md:flex-row flex-1 min-h-0">
                        {/* Main Submission Area */}
                        <div className="w-full md:w-[75%] border-r border-slate-50 p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar min-h-0">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Badge className="bg-orange-50 hover:bg-orange-50 text-orange-600 border-none px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-[10px]">
                                        {activeTask?.task_type as any} Task
                                    </Badge>
                                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                            Due: {activeTask?.due_date ? format(new Date(activeTask?.due_date), 'MMM dd, yyyy') : 'No Deadline'}
                                        </span>
                                    </div>
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{activeTask?.title}</h2>
                                <p className="text-slate-500 text-base leading-relaxed max-w-2xl font-medium">
                                    {activeTask?.description || "No specific instructions provided. Please ensure all requirements are met."}
                                </p>
                            </div>

                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                            {activeTask?.task_type === 'coding' ? 'Source Code Editor' : 'Your Answer Content'}
                                        </Label>
                                        {activeSub?.is_submitted && (
                                            <Badge className={`border-none px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${activeSub?.status === 'accepted'
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : activeSub?.status === 'rejected'
                                                    ? 'bg-rose-50 text-rose-600'
                                                    : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {activeSub?.status === 'accepted' ? <CheckCircle2 className="w-3 h-3" /> : activeSub?.status === 'rejected' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                                {activeSub?.status}
                                            </Badge>
                                        )}
                                    </div>

                                    {activeTask?.task_type === 'coding' ? (
                                        <div className="h-[380px] border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                            <CodeEditorWithAI
                                                problem={{
                                                    id: activeTask.id,
                                                    title: activeTask.title,
                                                    difficulty: 'Medium',
                                                    score: 0,
                                                    description: activeTask.description || '',
                                                    test_cases_basic: activeTask.question_details?.flatMap((q: any) => q.test_cases_basic || []) || [],
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
                                                initialCode={answerText || activeSub?.answer || ''}
                                                onCodeChange={(newCode: string) => setAnswerText(newCode)}
                                                hideSubmitButton={true}
                                            />
                                        </div>
                                    ) : (
                                        <Textarea
                                            ref={textareaRef}
                                            value={answerText}
                                            onChange={(e: any) => setAnswerText(e.target.value)}
                                            placeholder="Explain your answer in detail..."
                                            className="min-h-[120px] max-h-[400px] overflow-y-auto bg-slate-50/50 border border-gray-300 rounded-2xl p-6 focus:ring-4 focus:ring-orange-100 transition-all text-base font-medium resize-none leading-relaxed"
                                            disabled={activeSub?.status === 'accepted'}
                                        />
                                    )}
                                </div>

                                {activeTask?.task_type === 'descriptive' && (
                                    <div className="space-y-4">
                                        <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Supporting Documents</Label>
                                        {/* File upload only shown if student never uploaded a file before */}
                                        {!fileAlreadyUploaded ? (
                                            <div className="flex items-center gap-4">
                                                <div className="relative flex-1">
                                                        <input
                                                            type="file"
                                                            id="file-upload"
                                                            className="hidden"
                                                            accept=".pdf,.jpg,.jpeg,.png,.zip,.rar,.txt,.py,.js,.ts,.java,.cpp,.c,.cs,.html,.css,.json,.xml,.sh"
                                                            disabled={activeSub?.status === 'accepted'}
                                                            onChange={(e: any) => setSelectedFile(e.target.files?.[0] || null)}
                                                        />
                                                    <label
                                                        htmlFor="file-upload"
                                                        className={`flex items-center gap-4 w-full p-6 rounded-3xl cursor-pointer border-2 border-dashed transition-all font-bold ${activeSub?.status === 'accepted'
                                                            ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
                                                            : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                                    >
                                                        <Paperclip className="w-5 h-5 text-orange-500" />
                                                        {selectedFile ? (
                                                            <span className="text-slate-900 truncate">{selectedFile.name}</span>
                                                        ) : (
                                                            'Add Attachment (PDF / Image / ZIP / RAR / Code Files)'
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4 bg-slate-50 border-2 border-slate-100 rounded-3xl p-5">
                                                <Paperclip className="w-5 h-5 text-orange-400 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-700 truncate">
                                                        {activeSub?.file?.split('/').pop()?.split('?')[0] || 'Uploaded File'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-medium">File already submitted — cannot change</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openFileViewer(activeSub!.file!)}
                                                    className="text-orange-600 rounded-xl font-bold gap-1.5 flex-shrink-0"
                                                >
                                                    <Eye className="w-4 h-4" /> View
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || activeSub?.status === 'accepted' || (activeSub?.is_submitted && activeSub?.status !== 'rejected' && !selectedFile && activeSub?.answer === answerText)}
                                    className="w-full h-14 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-100 gap-4 transition-all"
                                >
                                    {isSubmitting ? 'Processing...' : (
                                        <>
                                            <Send className="w-6 h-6" />
                                            {activeSub?.status === 'rejected' ? 'Resubmit My Work' : activeSub?.is_submitted ? 'Update Submission' : 'Submit My Work'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Feedback & Chat Side */}
                        <div className="w-full md:w-[25%] bg-[#F8FAFC] p-8 flex flex-col h-full max-h-[700px]">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Discussion</h3>
                                    <p className="text-slate-400 text-sm font-medium mt-1">Comments and feedback from faculty</p>
                                </div>
                                {/* 
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearChat}
                                    disabled={isClearingChat}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-9 px-3 font-bold gap-1.5 flex-shrink-0"
                                >
                                    <Trash2 className="h-4 w-4" /> Clear
                                </Button>
                                */}
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4 pr-1 custom-scrollbar">
                                {activeSub?.comments && activeSub.comments.length > 0 ? (
                                    activeSub.comments.map((comment: any, idx: number) => {
                                        const isInline = comment.comment.startsWith('[') && comment.comment.includes(']');
                                        return (
                                            <div key={comment.id || idx} className={`flex flex-col ${comment.faculty ? 'items-start' : 'items-end'}`}>
                                                <div 
                                                    onClick={() => isInline && handleAnnotationClick(comment.comment)}
                                                    className={`p-4 rounded-2xl max-w-[90%] text-sm leading-relaxed shadow-none ${isInline
                                                        ? 'bg-orange-50 border border-orange-100 text-slate-900 rounded-bl-none shadow-sm w-full cursor-pointer hover:bg-orange-100/50 transition-colors'
                                                        : comment.faculty
                                                            ? 'bg-blue-50/50 text-blue-900 self-start rounded-bl-none'
                                                            : 'bg-orange-50/50 text-orange-900 self-end rounded-br-none'
                                                        }`}
                                                >
                                                    {isInline && (
                                                        <Badge className="bg-orange-100 text-orange-700 border-none text-[9px] font-black uppercase tracking-normal mb-2 rounded-md px-2 py-0.5 shadow-none whitespace-normal text-left leading-normal">
                                                            {comment.comment.substring(1, comment.comment.indexOf(']'))}
                                                        </Badge>
                                                    )}
                                                    <div className={`flex items-center ${isInline ? 'justify-end' : 'justify-between'} gap-x-4 mb-1`}>
                                                        {!isInline && (
                                                            <span className={`text-[11px] font-bold tracking-wide ${comment.faculty ? 'text-blue-600' : 'text-orange-600'}`}>
                                                                {comment.faculty ? 'Faculty' : 'You'}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 font-semibold">
                                                            {format(new Date(comment.created_at), 'M/dd, hh:mm a')}
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap font-medium text-slate-700">
                                                        {isInline
                                                            ? comment.comment.substring(comment.comment.indexOf(']') + 1).trim()
                                                            : comment.comment
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center py-12 opacity-30">
                                        <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                                        <p className="text-xs font-bold uppercase tracking-[0.2em]">No conversation started</p>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="pt-4 mt-auto">
                                <div className="relative group">
                                    <Textarea
                                        value={commentText}
                                        onChange={(e: any) => setCommentText(e.target.value)}
                                        onKeyDown={(e: any) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                        placeholder="Type your message here..."
                                        className="min-h-[80px] bg-white border-slate-200 rounded-[2rem] p-5 pr-16 focus:ring-0 focus:border-orange-500 hover:border-orange-400 transition-all text-sm font-medium resize-none shadow-sm"
                                    />
                                    <Button
                                        onClick={handleAddComment}
                                        disabled={isSendingComment || !commentText.trim()}
                                        size="icon"
                                        className="absolute bottom-4 right-4 h-10 w-10 rounded-2xl bg-orange-500  shadow-xl shadow-orange-100 transition-all active:scale-90"
                                    >
                                        <Send className="w-5 h-5 text-white" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* File Viewer Modal */}
            <Dialog open={isFileViewerOpen} onOpenChange={setIsFileViewerOpen}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col [&>button.absolute.right-4]:hidden">
                    <DialogHeader className="p-6 bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between shrink-0">
                        <div>
                            <DialogTitle className="text-xl font-black text-gray-900">Submitted File</DialogTitle>
                            <DialogDescription className="font-bold text-gray-400">
                                {fileViewerUrl?.split('/').pop()?.split('?')[0]}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            {inlineComments.length > 0 && (
                                <Badge className="bg-orange-50 text-orange-600 border-none font-bold rounded-full px-3">
                                    {inlineComments.length} Annotation{inlineComments.length > 1 ? 's' : ''}
                                </Badge>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsFileViewerOpen(false)}
                                className="h-10 w-10 rounded-xl hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#F8FAFC]">
                        {/* File Explorer Sidebar (for ZIP) */}
                        {zipFiles.length > 0 && (
                            <div className="w-full md:w-64 border-r border-gray-200 bg-white overflow-y-auto shrink-0 custom-scrollbar">
                                <div className="p-4 border-b border-gray-100/50 bg-white">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2">
                                        <FolderOpen className="h-3 w-3" />
                                        Files in ZIP
                                    </h4>
                                </div>
                                <div className="p-3 space-y-1.5">
                                    {zipFiles.map((file: any) => (
                                        <button
                                            key={file.name}
                                            onClick={() => {
                                                setSelectedZipFile(file.name);
                                                setFileViewerContent(file.content);
                                                setFileViewerLanguage(getLanguageFromExtension(file.name));
                                                // Clear highlights when switching files
                                                if (editorRef.current) {
                                                    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
                                                }
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${selectedZipFile === file.name
                                                ? 'bg-orange-50 text-orange-600 font-bold shadow-sm ring-1 ring-orange-100/50'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-bold'
                                                }`}
                                        >
                                            <Paperclip className={`h-4 w-4 shrink-0 ${selectedZipFile === file.name ? 'text-orange-500' : 'text-gray-300'}`} />
                                            <span className="text-[13px] truncate leading-tight">{file.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* File Preview */}
                        <div className="flex-1 overflow-auto p-6">
                            {fileViewerLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">Loading file...</p>
                                    </div>
                                </div>
                            ) : fileViewerContent ? (
                                <div className="h-full min-h-[60vh] bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    <Editor
                                        height="100%"
                                        language={fileViewerLanguage}
                                        value={fileViewerContent}
                                        theme="vs-light"
                                        onMount={(editor: any) => {
                                            editorRef.current = editor;
                                        }}
                                        options={{
                                            readOnly: true,
                                            fontSize: 14,
                                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            padding: { top: 16, bottom: 16 },
                                            lineNumbers: 'on',
                                        }}
                                    />
                                </div>
                            ) : zipFiles.find(f => f.name === selectedZipFile)?.type === 'image' ? (
                                <div className="h-full flex items-center justify-center">
                                    <img src={zipFiles.find(f => f.name === selectedZipFile)?.content} alt="Submitted" className="max-w-full h-auto rounded-2xl shadow-md border border-gray-100" />
                                </div>
                            ) : !zipFiles.length && fileViewerUrl?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <div className="h-full flex items-center justify-center">
                                    <img src={fileViewerUrl} alt="Submitted" className="max-w-full h-auto rounded-2xl shadow-md border border-gray-100" />
                                </div>
                            ) : !zipFiles.length && fileViewerUrl?.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={`${fileViewerUrl}#toolbar=0`} className="w-full h-full min-h-[60vh] rounded-2xl" title="PDF Viewer" />                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                        <Paperclip className="h-12 w-12 text-gray-200 mb-4" />
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">Preview Not Available</h4>
                                        <p className="text-gray-500 max-w-sm font-medium leading-relaxed">
                                            This file type (.{fileViewerUrl?.split('.').pop()?.split('?')[0]}) cannot be previewed directly. You can download it to review locally.
                                        </p>
                                        <div className="flex items-center gap-3 mt-6">
                                            <Button
                                                onClick={() => fileViewerUrl && window.open(getAccessibleUrl(fileViewerUrl))}
                                                className="bg-orange-500 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-orange-100"
                                            >
                                                <Download className="h-4 w-4 mr-2" /> Download
                                            </Button>
                                        </div>
                                    </div>
                                )}


                        </div>

                        {/* Inline Annotations Panel */}
                        {inlineComments.length > 0 && (
                            <div className="w-full md:w-[320px] border-l border-gray-100 bg-white flex flex-col shrink-0">
                                <div className="p-5 border-b border-gray-50">
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Faculty Annotations</h4>
                                    <p className="text-xs text-gray-400 font-medium mt-1">Inline feedback from your faculty</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {inlineComments.map((c, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => handleAnnotationClick(c.comment)}
                                            className="p-4 bg-orange-50/60 border border-orange-100 rounded-2xl cursor-pointer hover:bg-orange-100/80 transition-all "
                                        >
                                            <Badge className="bg-orange-100 text-orange-700 border-none text-[9px] font-black uppercase tracking-normal mb-2 rounded-md px-2 py-0.5 shadow-none whitespace-normal text-left leading-normal">
                                                {c.comment.substring(1, c.comment.indexOf(']'))}
                                            </Badge>
                                            <p className="text-sm font-medium text-gray-800 leading-relaxed">
                                                {c.comment.substring(c.comment.indexOf(']') + 1).trim()}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-2">
                                                {format(new Date(c.created_at), 'hh:mm a, MMM dd')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <style>{`
                .line-highlight {
                    background: rgba(255, 165, 0, 0.25) !important;
                    border-left: 4px solid #f97316 !important;
                    width: 100% !important;
                }
                .line-highlight-margin {
                    background: rgba(255, 165, 0, 0.4) !important;
                    border-right: 2px solid #f97316 !important;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};

export default StudentTask;
