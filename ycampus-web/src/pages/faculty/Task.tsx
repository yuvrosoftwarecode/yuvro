import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { getFacultyAssignments, SectionSubjectFaculty, fetchUnitsBySubject, UnitBasic, fetchSubUnitsByUnit, SubUnit } from '../../services/subjectService';
import { taskService, Task, TaskSubmission, TaskComment } from '../../services/taskService';
import { fetchQuestions, Question } from '../../services/questionService';
import {
    BookOpen, Users, Calendar, ArrowRight, Loader2, Plus, List, Send, Trash2,
    CheckCircle, Clock, Search, MessageSquare, ChevronLeft, Edit2, MoreVertical,
    User, Filter, Download, ExternalLink, SendHorizonal, Paperclip, Check, X, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { format } from 'date-fns';
import Editor from '@monaco-editor/react';

const FacultyTask: React.FC = () => {
    const { user } = useAuth();

    // Core Data State
    const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Screening/View State
    const [view, setView] = useState<'taskList' | 'responses' | 'studentDetail'>('taskList');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);

    // Filter State
    const [selectedDepartment, setSelectedDepartment] = useState<string>("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Form / Popup State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [units, setUnits] = useState<UnitBasic[]>([]);
    const [subUnits, setSubUnits] = useState<SubUnit[]>([]);
    const [formState, setFormState] = useState({
        title: "",
        description: "",
        due_date: "",
        unit: "",
        sub_unit: "",
        sections: [] as string[],
        task_type: "descriptive" as 'descriptive' | 'coding',
        question_source: "manual" as 'manual' | 'bank',
        questions: [] as string[]
    });

    const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isSendConfirmDialogOpen, setIsSendConfirmDialogOpen] = useState(false);
    const [taskToSend, setTaskToSend] = useState<Task | null>(null);

    // Detail Screen State
    const [newComment, setNewComment] = useState("");

    // File Viewer State
    const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
    const [reviewingFile, setReviewingFile] = useState<string | null>(null);
    const [zipFiles, setZipFiles] = useState<{ name: string; content: string; type: 'text' | 'image' | 'other' }[]>([]);
    const [selectedZipFile, setSelectedZipFile] = useState<string | null>(null);
    const [previewContent, setPreviewContent] = useState<string>("");
    const [previewType, setPreviewType] = useState<'text' | 'image' | 'other' | null>(null);
    const [previewLanguage, setPreviewLanguage] = useState<string>("plaintext");
    const [loadingFile, setLoadingFile] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const assignmentsData = await getFacultyAssignments();
            setAssignments(assignmentsData);
        } catch (err) {
            console.error("Failed to fetch assignments", err);
            toast.error("Failed to load assignments");
        } finally {
            setLoading(false);
        }
    };

    const getLanguageFromExtension = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        const map: Record<string, string> = { 'js': 'javascript', 'ts': 'typescript', 'tsx': 'typescript', 'jsx': 'javascript', 'py': 'python', 'java': 'java', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp', 'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown', 'txt': 'plaintext', 'sql': 'sql', 'sh': 'shell' };
        return map[ext || ''] || 'plaintext';
    };

    const isTextFile = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'md', 'txt', 'sql', 'sh'].includes(ext || '');
    };

    const isImageFile = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '');
    };

    useEffect(() => {
        const processFile = async () => {
            if (!reviewingFile || !isFileViewerOpen) {
                setZipFiles([]);
                setPreviewContent("");
                setPreviewType(null);
                setSelectedZipFile(null);
                return;
            }

            setLoadingFile(true);
            try {
                const response = await fetch(reviewingFile);
                const blob = await response.blob();
                const filename = reviewingFile.split('/').pop()?.split('?')[0] || '';

                if (filename.toLowerCase().endsWith('.zip')) {
                    const jszipModule = await import(/* @vite-ignore */ 'https://esm.run/jszip');
                    const JSZip = jszipModule.default || jszipModule;
                    const zip = new JSZip();
                    const contents = await zip.loadAsync(blob);
                    const files: { name: string; content: string; type: 'text' | 'image' | 'other' }[] = [];

                    for (const [name, file] of Object.entries(contents.files)) {
                        if (!file.dir) {
                            if (isTextFile(name)) {
                                const content = await file.async('string');
                                files.push({ name, content, type: 'text' });
                            } else if (isImageFile(name)) {
                                const base64 = await file.async('base64');
                                const ext = name.split('.').pop()?.toLowerCase();
                                files.push({ name, content: `data:image/${ext};base64,${base64}`, type: 'image' });
                            } else {
                                files.push({ name, content: '', type: 'other' });
                            }
                        }
                    }
                    setZipFiles(files);
                    if (files.length > 0) {
                        const firstPreviewable = files.find(f => f.type !== 'other') || files[0];
                        setSelectedZipFile(firstPreviewable.name);
                        setPreviewContent(firstPreviewable.content);
                        setPreviewType(firstPreviewable.type);
                        setPreviewLanguage(getLanguageFromExtension(firstPreviewable.name));
                    }
                } else if (isTextFile(filename)) {
                    const text = await blob.text();
                    setPreviewContent(text);
                    setPreviewType('text');
                    setPreviewLanguage(getLanguageFromExtension(filename));
                    setZipFiles([]);
                    setSelectedZipFile(null);
                } else if (isImageFile(filename)) {
                    setPreviewContent(reviewingFile);
                    setPreviewType('image');
                    setZipFiles([]);
                    setSelectedZipFile(null);
                } else {
                    setZipFiles([]);
                    setPreviewContent("");
                    setPreviewType('other');
                    setSelectedZipFile(null);
                }
            } catch (error) {
                console.error("Error loading file:", error);
                toast.error("Failed to load file contents");
            } finally {
                setLoadingFile(false);
            }
        };

        processFile();
    }, [reviewingFile, isFileViewerOpen]);

    const handleUpdateStatus = async (status: 'accepted' | 'rejected') => {
        if (!selectedSubmission) return;
        try {
            setSubmitting(true);
            await taskService.updateSubmissionStatus(selectedSubmission.id, status);
            setSelectedSubmission(prev => prev ? { ...prev, status } : null);
            setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, status } : s));
            toast.success(`Task ${status} successfully`);
        } catch (error) {
            toast.error(`Failed to mark as ${status}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Effect to fetch tasks only after all main filters are selected
    useEffect(() => {
        if (selectedDepartment && selectedSubject && selectedSections.length > 0) {
            fetchTasks();
        } else {
            setTasks([]);
        }
    }, [selectedDepartment, selectedSubject, selectedSections]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getTasks({
                department: selectedDepartment,
                subject: selectedSubject,
            });
            const filteredTasks = data.filter(t =>
                t.sections.some(s => selectedSections.includes(String(s)))
            );
            setTasks(filteredTasks);
        } catch (err) {
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    const handleSendTaskRequest = (task: Task) => {
        setTaskToSend(task);
        setIsSendConfirmDialogOpen(true);
    };

    const confirmSend = async () => {
        if (!taskToSend) return;
        try {
            setSubmitting(true);
            await taskService.sendTask(taskToSend.id);
            toast.success("Task sent successfully!");
            setIsSendConfirmDialogOpen(false);
            setNewComment("");
        } catch (err) {
            toast.error("Failed to send message");
        } finally {
            setSubmitting(false);
        }
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (selectedText) {
            setNewComment(prev => `${prev}${prev ? '\n\n' : ''}> ${selectedText}\n\n`);
            // Clear selection so user can re-select if needed
            selection?.removeAllRanges();
            toast.info("Selected text added to chat");
        }
    };

    const fetchSubmissions = async (task: Task) => {
        try {
            setLoading(true);
            const data = await taskService.getTaskSubmissions(task.id);
            setSubmissions(data);
            setSelectedTask(task);
            setView('responses');
        } catch (err) {
            toast.error("Failed to load submissions");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissionDetail = async (submissionId: string) => {
        try {
            setLoading(true);
            const data = await taskService.getSubmissionDetail(submissionId);
            setSelectedSubmission(data);
            setView('studentDetail');
        } catch (err) {
            toast.error("Failed to load submission details");
        } finally {
            setLoading(false);
        }
    };

    // Polling for updates when viewing student detail
    useEffect(() => {
        let interval: any;
        if (view === 'studentDetail' && selectedSubmission) {
            interval = setInterval(async () => {
                try {
                    const data = await taskService.getSubmissionDetail(selectedSubmission.id);
                    // Only update if something changed (e.g. more comments)
                    if (JSON.stringify(data.comments) !== JSON.stringify(selectedSubmission.comments)) {
                        setSelectedSubmission(data);
                    }
                } catch (err) {
                    console.error("Polling failed", err);
                }
            }, 5000); // Poll every 5 seconds
        }
        return () => clearInterval(interval);
    }, [view, selectedSubmission?.id]);

    const handleAddComment = async () => {
        if (!selectedSubmission?.id || !newComment.trim()) return;
        try {
            setSubmitting(true);
            const comment = await taskService.addCommentToSubmission(selectedSubmission.id, newComment);
            setSelectedSubmission(prev => prev ? {
                ...prev,
                comments: [...prev.comments, comment]
            } : null);
            setNewComment("");
            toast.success("Comment added");
        } catch (err) {
            toast.error("Failed to add comment");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter Helpers
    const uniqueDepartments = useMemo(() => {
        const acc: { id: string, name: string }[] = [];
        assignments.forEach(curr => {
            const deptId = curr.semester_subject_details?.department_id;
            const deptName = curr.semester_subject_details?.department_name;
            if (deptId && deptName && !acc.find(d => d.id === String(deptId))) {
                acc.push({ id: String(deptId), name: deptName });
            }
        });
        return acc;
    }, [assignments]);

    const uniqueSubjects = useMemo(() => {
        if (!selectedDepartment) return [];
        const acc: { id: string, name: string }[] = [];
        assignments
            .filter(a => String(a.semester_subject_details?.department_id) === selectedDepartment)
            .forEach(curr => {
                const subjectId = String(curr.semester_subject_details?.subject_details?.id);
                if (!acc.find(s => s.id === subjectId)) {
                    acc.push({
                        id: subjectId,
                        name: curr.semester_subject_details?.subject_details?.subject_name || "Unknown Subject"
                    });
                }
            });
        return acc;
    }, [assignments, selectedDepartment]);

    const availableSections = useMemo(() => {
        if (!selectedDepartment || !selectedSubject) return [];
        return assignments.filter(a =>
            String(a.semester_subject_details?.department_id) === selectedDepartment &&
            String(a.semester_subject_details?.subject_details?.id) === selectedSubject
        );
    }, [assignments, selectedDepartment, selectedSubject]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [tasks, searchQuery]);

    // Form Helpers
    useEffect(() => {
        if (formState.unit) {
            fetchSubUnitsByUnit(formState.unit).then(setSubUnits);
        } else {
            setSubUnits([]);
        }
    }, [formState.unit]);

    useEffect(() => {
        if (selectedSubject) {
            fetchUnitsBySubject(selectedSubject).then(setUnits);
        }
    }, [selectedSubject]);

    // Fetch questions when source is bank
    useEffect(() => {
        if (formState.question_source === 'bank' && selectedSubject && isCreateDialogOpen && formState.unit) {
            const loadQuestions = async () => {
                try {
                    setLoadingQuestions(true);
                    const qType = formState.task_type === 'coding' ? 'coding' : undefined;
                    const res = await fetchQuestions({
                        subject: selectedSubject,
                        type: qType,
                        categories: 'task',
                        unit: formState.unit,
                        sub_unit: formState.sub_unit || undefined
                    });
                    setBankQuestions(res);
                } catch (err) {
                    toast.error('Failed to load question bank');
                } finally {
                    setLoadingQuestions(false);
                }
            };
            loadQuestions();
        } else {
            setBankQuestions([]);
        }
    }, [formState.question_source, formState.task_type, selectedSubject, isCreateDialogOpen, formState.unit, formState.sub_unit]);

    const openCreateDialog = (task: Task | null = null) => {
        if (task) {
            setEditingTask(task);
            setFormState({
                title: task.title,
                description: task.description,
                due_date: task.due_date ? task.due_date.slice(0, 16) : "",
                unit: task.unit || "",
                sub_unit: task.sub_unit || "",
                sections: task.sections.map(s => String(s)),
                task_type: task.task_type || 'descriptive',
                question_source: task.question_source || 'manual',
                questions: task.questions ? task.questions.map(String) : []
            });
        } else {
            setEditingTask(null);
            setFormState({
                title: "",
                description: "",
                due_date: "",
                unit: "",
                sub_unit: "",
                sections: [],
                task_type: "descriptive",
                question_source: "manual",
                questions: []
            });
        }
        setIsCreateDialogOpen(true);
    };

    const handleSaveTask = async () => {
        const isManual = formState.question_source === 'manual';
        const isBank = formState.question_source === 'bank';

        if (!formState.title || !formState.unit || formState.sections.length === 0) {
            toast.error("Title, Unit, and Sections are required");
            return;
        }

        if (isManual && (!formState.sub_unit || !formState.description)) {
            toast.error("Sub Unit and Description are required for manual tasks");
            return;
        }

        if (isBank && (formState.questions?.length === 0 || !formState.questions)) {
            toast.error("Please select at least one question from the bank");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                ...formState,
                department: selectedDepartment,
                subject: selectedSubject,
            };

            if (editingTask) {
                await taskService.updateTask(editingTask.id, payload);
                toast.success("Task updated");
            } else {
                await taskService.createTask(payload);
                toast.success("Task created");
            }
            setIsCreateDialogOpen(false);
            fetchTasks();
        } catch (err) {
            toast.error("Failed to save task");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRequest = (task: Task) => {
        setTaskToDelete(task);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!taskToDelete) return;
        try {
            await taskService.deleteTask(taskToDelete.id);
            toast.success("Task deleted");
            setIsDeleteDialogOpen(false);
            fetchTasks();
        } catch (err) {
            toast.error("Failed to delete task");
        }
    };

    // Render Components
    const renderTaskList = () => (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <h2 className="text-2xl font-semibold text-foreground">Tasks</h2>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search tasks by title..."
                        className="pl-10 h-11 bg-white border-gray-200 focus:ring-2 focus:ring-gray-100 rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-300" /></div>
            ) : filteredTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                        <Card key={task.id} className="flex flex-col h-full border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight pr-8 line-clamp-2 capitalize">{task.title}</h3>
                                    <Badge
                                        variant="secondary"
                                        className={task.is_sent ? "bg-orange-500 text-white border-none shadow-none font-bold" : "bg-blue-50 text-blue-600 border-none shadow-none font-bold"}
                                    >
                                        {task.is_sent ? 'Sent' : 'Draft'}
                                    </Badge>
                                </div>

                                <div className="flex gap-2 mb-2">
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                        {task.task_type === 'coding' ? 'Coding' : 'Descriptive'}
                                    </Badge>
                                    {task.question_source === 'bank' && (
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 border-emerald-200 bg-emerald-50">
                                            Question Bank
                                        </Badge>
                                    )}
                                </div>

                                <p className="text-[13px] text-gray-700 mb-2 line-clamp-2 font-medium">
                                    {task.question_source === 'bank' ? `${task.questions?.length || 0} Questions attached` : task.description}
                                </p>

                                <div className="mt-auto space-y-4">
                                    <div className="space-y-1">
                                        <div className="text-[11px] font-medium text-gray-600 tracking-wider">
                                            Created: {format(new Date(task.created_at), 'MMM dd, yyyy')}
                                        </div>
                                        <div className="text-[11px] font-medium text-gray-600 tracking-wider">
                                            Due Date: {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No Due Date'}
                                        </div>
                                    </div>

                                    {!task.is_sent && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl h-10 border-gray-200 font-semibold text-gray-900 gap-2 bg-white hover:bg-white"
                                                onClick={() => openCreateDialog(task)}
                                            >
                                                <Edit2 className="h-4 w-4" /> Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl h-10 border-gray-200 font-semibold text-gray-900 gap-2 bg-white hover:bg-white"
                                                onClick={() => handleDeleteRequest(task)}
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete
                                            </Button>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full bg-orange-500 hover:bg-orange-500 text-white font-bold h-12 rounded-xl gap-2 shadow-sm transition-colors"
                                        onClick={() => task.is_sent ? fetchSubmissions(task) : handleSendTaskRequest(task)}
                                        disabled={submitting}
                                    >
                                        {task.is_sent ? (
                                            <><Search className="h-4 w-4" /> View Responses</>
                                        ) : (
                                            <><Send className="h-4 w-4" /> Send Task</>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 text-center flex flex-col items-center shadow-sm">
                    <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <BookOpen className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No tasks found</h3>
                    <p className="text-gray-500 max-w-sm">Try adjusting your search or create a new task to get started.</p>
                </div>
            )}
        </div>
    );

    const renderResponses = () => {
        // Calculate total students from assigned sections
        const totalStudents = selectedTask?.section_details?.reduce((acc, curr) => acc + (curr.student_count || 0), 0) || 0;

        const stats = {
            total: totalStudents || submissions.length,
            completed: submissions.filter(s => s.is_submitted).length,
            inProgress: submissions.filter(s => !s.is_submitted && (s.answer || s.answers_data || s.file)).length,
            pending: 0
        };
        stats.pending = Math.max(0, stats.total - stats.completed - stats.inProgress);

        const filteredSubmissions = submissions.filter(sub => {
            const student = sub.student_details?.user_details;
            const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.toLowerCase();
            const rollNo = (sub.student_details?.roll_number || '').toLowerCase();
            const query = searchQuery.toLowerCase();
            return fullName.includes(query) || rollNo.includes(query);
        });

        return (
            <div className="space-y-8 pb-10">
                {/* Header Row */}
                <div className="flex items-center gap-6">
                    <Button
                        variant="outline"
                        onClick={() => setView('taskList')}
                        className="rounded-xl bg-white border-gray-200 h-10 px-4 text-gray-900 font-bold hover:bg-white gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" /> Back to Tasks
                    </Button>
                    <div className="space-y-0">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{selectedTask?.title}</h2>
                        <p className="text-gray-500 text-sm">
                            View student responses
                        </p>
                    </div>
                    <div className="ml-auto">
                        <Button className="bg-orange-500 hover:bg-orange-500 text-white px-6 h-11 rounded-xl font-bold flex items-center gap-2 shadow-sm">
                            <Download className="h-4 w-4" /> Download Report
                        </Button>
                    </div>
                </div>

                {/* Task Description Card */}
                <Card className="rounded-3xl border border-gray-100 shadow-none bg-white p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Task Description</h3>
                    <p className="text-gray-500 leading-relaxed">{selectedTask?.description || "No description provided."}</p>
                </Card>

                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Students', value: stats.total, color: 'text-gray-900' },
                        { label: 'Completed', value: stats.completed, color: 'text-emerald-500' },
                        { label: 'In Progress', value: stats.inProgress, color: 'text-blue-500' },
                        { label: 'Pending', value: stats.pending, color: 'text-[#F59E0B]' } // Saffron/Amber
                    ].map((s, i) => (
                        <Card key={i} className="rounded-3xl border border-gray-100 shadow-none bg-white p-8 text-center">
                            <p className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</p>
                            <p className="text-sm text-gray-400">{s.label}</p>
                        </Card>
                    ))}
                </div>

                {/* Responses Table Area */}
                <div className="space-y-6">
                    <div className="px-2 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Student Responses</h3>
                        <div className="relative w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search by roll no or name"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 h-11 bg-white border border-gray-900 rounded-xl focus:ring-0 font-normal outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-y border-gray-100">
                                <tr>
                                    <th className="p-6 text-sm text-gray-400">Roll No</th>
                                    <th className="p-6 text-sm text-gray-400">Name</th>
                                    <th className="p-6 text-sm text-gray-400">Status</th>
                                    <th className="p-6 text-sm text-gray-400">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSubmissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50/50 transition-all">
                                        <td className="p-6 text-gray-900 font-bold">{sub.student_details?.roll_number || 'CS001'}</td>
                                        <td className="p-6 text-gray-900">{sub.student_details?.user_details?.first_name} {sub.student_details?.user_details?.last_name || sub.student}</td>
                                        <td className="p-6">
                                            <Badge className={`px-4 py-1.5 rounded-full font-normal border-none shadow-none ${sub.is_submitted
                                                ? 'bg-slate-900 text-white'
                                                : sub.answer ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-[#F59E0B]'
                                                }`}>
                                                {sub.is_submitted ? 'Completed' : sub.answer ? 'In Progress' : 'Pending'}
                                            </Badge>
                                        </td>
                                        <td className="p-6">
                                            <Button
                                                variant="outline"
                                                onClick={() => fetchSubmissionDetail(sub.id)}
                                                className="rounded-lg h-9 border-gray-200 text-gray-900 font-normal hover:bg-white shadow-none"
                                            >
                                                View Details
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredSubmissions.length === 0 && (
                            <div className="py-20 text-center flex flex-col items-center">
                                <Users className="h-16 w-16 text-gray-100 mb-4" />
                                <p className="text-gray-400 font-normal uppercase tracking-widest">No responses yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderStudentDetail = () => (
        <div className="space-y-6 pb-10">
            {/* Header Area */}
            <div className="flex items-center gap-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setView('responses')}
                    className="rounded-xl bg-white hover:bg-white shadow-sm border border-gray-100 h-10 w-10"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-900" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Student Response Details</h2>
                    <p className="text-gray-400 text-sm font-medium tracking-widest mt-0.5">Review and provide feedback</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Student Info & Answer */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Student Info Card */}
                    <Card className="rounded-3xl border border-gray-100 shadow-none bg-white p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 tracking-wider">Student Information</h3>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 rounded-full border border-gray-100 shadow-sm">
                                <AvatarFallback className="bg-orange-50 text-orange-600 font-bold text-xl">
                                    {selectedSubmission?.student_details?.user_details?.first_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-xl font-bold text-gray-900 leading-tight">
                                        {selectedSubmission?.student_details?.user_details?.first_name} {selectedSubmission?.student_details?.user_details?.last_name}
                                    </h4>
                                    <Badge className={`px-4 py-1.5 rounded-full font-bold border-none shadow-none text-[10px] uppercase tracking-widest ${selectedSubmission?.is_submitted
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-orange-50 text-[#F59E0B]'
                                        }`}>
                                        {selectedSubmission?.is_submitted ? 'Completed' : 'In Progress'}
                                    </Badge>
                                </div>
                                <p className="text-gray-400 text-sm font-medium mt-1">Roll No: {selectedSubmission?.student_details?.roll_number || 'CS001'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Answer Card */}
                    <Card className="rounded-3xl border border-gray-100 shadow-none bg-white p-8">
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">Student Answer</h3>
                            <p className="text-gray-400 text-sm font-medium mt-1">Select text to add contextual comments</p>
                        </div>

                        <div
                            className="bg-[#F8FAFC] p-8 rounded-[2rem] border border-gray-100 min-h-[300px] cursor-text"
                            onMouseUp={handleTextSelection}
                        >
                            <div className="prose prose-neutral max-w-none pointer-events-auto">
                                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap text-lg font-medium">
                                    {selectedSubmission?.answer || "No text content provided."}
                                </p>
                            </div>
                        </div>

                        {selectedSubmission?.file && (
                            <div className="mt-8 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setReviewingFile(selectedSubmission.file || null);
                                        setIsFileViewerOpen(true);
                                    }}
                                    className="rounded-2xl h-11 border-orange-100 text-orange-600 bg-orange-50 font-bold hover:bg-orange-100 gap-2 px-6"
                                >
                                    <Eye className="h-4 w-4" /> Review Attached File
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Side: Chat / Discussion */}
                <div className="space-y-6 flex flex-col h-full min-h-[600px]">
                    <Card className="rounded-3xl border border-gray-100 shadow-none bg-white overflow-hidden flex flex-col flex-1">
                        <div className="p-8 border-b border-gray-50 flex flex-col gap-1">
                            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Discussion</h3>
                            <p className="text-gray-400 text-sm font-medium">Comments and feedback</p>
                        </div>

                        <ScrollArea className="flex-1 p-8">
                            <div className="space-y-6 pb-4">
                                {selectedSubmission?.comments && selectedSubmission.comments.length > 0 ? (
                                    selectedSubmission.comments.map((c, i) => (
                                        <div key={c.id || i} className={`flex flex-col ${c.faculty ? 'items-end' : 'items-start'}`}>
                                            <div
                                                className={`p-3.5 rounded-xl max-w-[80%] text-sm leading-relaxed border-l-4 ${c.faculty
                                                    ? 'bg-[#F0F7FF] border-[#3B82F6] text-black rounded-br-none'
                                                    : 'bg-[#F0FDF4] border-[#22C55E] text-black rounded-br-none'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-x-4 mb-1">
                                                    <span className="text-[14px] font-bold text-black tracking-wide">
                                                        {c.faculty ? 'Faculty' : 'Student'}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 font-semibold">
                                                        {format(new Date(c.created_at), 'M/d/yyyy, hh:mm:ss a')}
                                                    </span>
                                                </div>
                                                <p className="whitespace-pre-wrap text-[15px] font-medium text-gray-800">
                                                    {c.comment}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center py-20 opacity-30">
                                        <MessageSquare className="h-12 w-12 text-gray-200 mb-4" />
                                        <p className="text-xs font-bold uppercase tracking-widest">No conversation yet</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-8 border-t border-gray-50">
                            <div className="mb-4">
                                <Textarea
                                    placeholder="Add a comment or question..."
                                    className="min-h-[100px] bg-white border-gray-200 rounded-xl p-4 focus:ring-0 focus-visible:ring-0 hover:border-orange-500 focus:border-orange-500 transition-all text-sm font-medium resize-none shadow-none"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment();
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                disabled={submitting || !newComment.trim()}
                                onClick={handleAddComment}
                                className="w-full bg-orange-500 hover:bg-orange-500 h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                                <SendHorizonal className="h-4 w-4" /> Add Comment
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFDFD] flex font-sans">
            <RoleSidebar />
            <div className="flex-1">
                <RoleHeader
                    title="Task Management"
                    subtitle="Assign, manage, and review student tasks"
                />

                <div className="max-w-7xl mx-auto px-6 pt-6 pb-10 space-y-6">
                    {view === 'taskList' && selectedDepartment && selectedSubject && selectedSections.length > 0 && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => openCreateDialog()}
                                className="bg-orange-500 hover:bg-orange-500 text-white px-6 h-10 rounded-xl shadow-lg shadow-orange-100 transition-all flex items-center gap-2 font-bold"
                            >
                                <Plus className="h-4 w-4" />
                                Create New Task
                            </Button>
                        </div>
                    )}

                    {/* Header Selection Flow - Following the reference style */}
                    {view === 'taskList' && (
                        <Card className="border-gray-100 shadow-md rounded-[2rem] overflow-hidden bg-white">
                            <CardHeader className="border-b border-gray-50 px-8 py-4">
                                <CardTitle className="text-2xl font-semibold text-foreground">Select Subject & Sections</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Department</Label>
                                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                            <SelectTrigger className="h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-medium">
                                                <SelectValue placeholder="Choose Department" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
                                                {uniqueDepartments.map(d => (
                                                    <SelectItem key={d.id} value={d.id} className="rounded-xl font-medium">{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Subject</Label>
                                        <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedDepartment}>
                                            <SelectTrigger className="h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-medium">
                                                <SelectValue placeholder="Select Subject" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
                                                {uniqueSubjects.map(s => (
                                                    <SelectItem key={s.id} value={s.id} className="rounded-xl font-medium">{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Sections</Label>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {availableSections.length > 0 ? availableSections.map(a => (
                                                <Badge
                                                    key={a.section}
                                                    onClick={() => {
                                                        const id = String(a.section);
                                                        setSelectedSections(prev =>
                                                            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                                                        );
                                                    }}
                                                    variant={selectedSections.includes(String(a.section)) ? "default" : "outline"}
                                                    className={`cursor-pointer h-10 px-6 rounded-2xl font-bold transition-all border-none ${selectedSections.includes(String(a.section)) ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                                >
                                                    {a.section_name}
                                                </Badge>
                                            )) : <p className="text-xs font-bold text-gray-300 mt-2">Select a subject first</p>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Main Content Area */}
                    <div className="min-h-[400px]">
                        {(!selectedDepartment || !selectedSubject || selectedSections.length === 0) ? (
                            <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center flex flex-col items-center justify-center shadow-sm">
                                <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <Filter className="h-8 w-8 text-gray-200" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Please complete selection</h3>
                                <p className="text-gray-500 text-sm font-medium">Select department, subject, and at least one section to view tasks.</p>
                            </div>
                        ) : (
                            <>
                                {view === 'taskList' && renderTaskList()}
                                {view === 'responses' && renderResponses()}
                                {view === 'studentDetail' && renderStudentDetail()}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Create / Edit Task Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className={`${formState.question_source === 'bank' ? 'max-w-5xl' : 'max-w-2xl'} rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white`}>
                    <DialogHeader className="p-8 bg-gray-50 border-b border-gray-100">
                        <DialogTitle className="text-2xl font-black text-gray-900">{editingTask ? 'Edit Task' : 'New Assignment'}</DialogTitle>
                        <DialogDescription className="font-bold text-gray-400">Fill in the details to {editingTask ? 'update' : 'broadcast'} the task.</DialogDescription>
                    </DialogHeader>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">Task Title *</Label>
                                <Input
                                    value={formState.title}
                                    onChange={e => setFormState(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Project Phase 1"
                                    className="h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-900">Due Date</Label>
                                <Input
                                    type="datetime-local"
                                    value={formState.due_date}
                                    onChange={e => setFormState(prev => ({ ...prev, due_date: e.target.value }))}
                                    className="h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-semibold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">Unit *</Label>
                                    <Select value={formState.unit} onValueChange={v => setFormState(prev => ({ ...prev, unit: v, sub_unit: "" }))}>
                                        <SelectTrigger className="h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-semibold">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
                                            {units.map(u => <SelectItem key={u.id} value={u.id} className="rounded-xl">{u.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">Sub Unit {formState.question_source === 'manual' ? '*' : ''}</Label>
                                    <Select value={formState.sub_unit} onValueChange={v => setFormState(prev => ({ ...prev, sub_unit: v }))} disabled={!formState.unit}>
                                        <SelectTrigger className="h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-semibold">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
                                            {subUnits.map(su => <SelectItem key={su.id} value={su.id} className="rounded-xl">{su.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">Task Type</Label>
                                    <Select value={formState.task_type} onValueChange={(v: 'descriptive' | 'coding') => setFormState(prev => ({ ...prev, task_type: v, questions: [] }))}>
                                        <SelectTrigger className="h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-semibold">
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
                                            <SelectItem value="descriptive" className="rounded-xl">Descriptive</SelectItem>
                                            <SelectItem value="coding" className="rounded-xl">Coding</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">Source</Label>
                                    <Select value={formState.question_source} onValueChange={(v: 'manual' | 'bank') => setFormState(prev => ({ ...prev, question_source: v, questions: [] }))}>
                                        <SelectTrigger className="h-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-semibold">
                                            <SelectValue placeholder="Select Source" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
                                            <SelectItem value="manual" className="rounded-xl">Manual Entry</SelectItem>
                                            <SelectItem value="bank" className="rounded-xl">Question Bank</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {formState.question_source === 'manual' ? (
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">Description *</Label>
                                    <Textarea
                                        value={formState.description}
                                        onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="What should students do?"
                                        className="h-[150px] bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-semibold resize-none p-4"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">Select Questions *</Label>
                                    {loadingQuestions ? (
                                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
                                    ) : !selectedSubject ? (
                                        <div className="bg-orange-50/50 rounded-xl p-4 text-center text-sm font-bold text-orange-600">
                                            Please select a Subject first to browse questions.
                                        </div>
                                    ) : bankQuestions.length > 0 ? (
                                        <div className="flex flex-col gap-2 max-h-[170px] overflow-y-auto pr-2 custom-scrollbar">
                                            {bankQuestions.map(q => (
                                                <div
                                                    key={q.id}
                                                    onClick={() => {
                                                        const id = String(q.id);
                                                        setFormState(prev => ({
                                                            ...prev,
                                                            questions: prev.questions.includes(id) ? prev.questions.filter(x => x !== id) : [...prev.questions, id]
                                                        }));
                                                    }}
                                                    className={`cursor-pointer p-3 rounded-xl border-none transition-all flex items-start gap-3 ${formState.questions.includes(String(q.id)) ? 'bg-orange-50 text-orange-900 border border-orange-200' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                                                >
                                                    <CheckCircle className={`mt-0.5 h-4 w-4 flex-shrink-0 transition-colors ${formState.questions.includes(String(q.id)) ? 'text-orange-500' : 'text-gray-300'}`} />
                                                    <div>
                                                        <p className="text-sm font-bold leading-tight line-clamp-1">{q.title}</p>
                                                        <p className="text-xs font-semibold text-gray-400 line-clamp-1 mt-0.5">{q.content.replace(/<[^>]*>?/gm, '')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-xl p-4 text-center text-sm font-bold text-gray-400">
                                            No questions found for the selected unit/type.
                                        </div>
                                    )}
                                </div>
                            )}

                            {formState.question_source === 'bank' && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-900">Additional Instructions (Optional)</Label>
                                    <Textarea
                                        value={formState.description}
                                        onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Any extra instructions..."
                                        className="h-[60px] bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-100 transition-all font-semibold resize-none p-3 text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 space-y-3">
                            <Label className="text-sm font-bold text-gray-900">Confirm Sections *</Label>
                            <div className="flex flex-wrap gap-2">
                                {availableSections.map(a => (
                                    <div
                                        key={a.id}
                                        onClick={() => {
                                            const id = String(a.section);
                                            setFormState(prev => ({
                                                ...prev,
                                                sections: prev.sections.includes(id) ? prev.sections.filter(x => x !== id) : [...prev.sections, id]
                                            }));
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all border-none font-bold ${formState.sections.includes(String(a.section)) ? 'bg-gray-100 text-gray-900 border border-gray-200' : 'bg-gray-50 text-gray-300'}`}
                                    >
                                        <CheckCircle className={`h-4 w-4 ${formState.sections.includes(String(a.section)) ? 'text-gray-900' : 'text-gray-200'}`} />
                                        <span className="text-xs">{a.section_name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 border-t border-gray-100 bg-gray-50/50 flex flex-row items-center justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="rounded-2xl h-12 px-6 font-bold text-gray-400 hover:text-gray-900 hover:bg-transparent">Cancel</Button>
                        <Button
                            onClick={handleSaveTask}
                            disabled={submitting}
                            className="bg-orange-500 hover:bg-orange-500 text-white px-10 h-12 rounded-[1.25rem] font-bold shadow-xl shadow-orange-100 active:scale-95 transition-all"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editingTask ? 'Save Changes' : 'Publish Task'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* File Review Modal */}
            <Dialog open={isFileViewerOpen} onOpenChange={setIsFileViewerOpen}>
                <DialogContent className="max-w-6xl w-[95vw] h-[90vh] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col">
                    <DialogHeader className="p-8 bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between shrink-0">
                        <div>
                            <DialogTitle className="text-2xl font-black text-gray-900">Review Attached File</DialogTitle>
                            <DialogDescription className="font-bold text-gray-400">Review the student's submission and mark errors.</DialogDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsFileViewerOpen(false)}
                            className="h-10 w-10 rounded-xl hover:bg-gray-100"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#F8FAFC]">
                        {/* File Explorer Sidebar (for ZIP) */}
                        {zipFiles.length > 0 && (
                            <div className="w-full md:w-64 border-r border-gray-200 bg-white overflow-y-auto shrink-0 custom-scrollbar">
                                <div className="p-4 border-b border-gray-50 bg-gray-50/30">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Files in ZIP</h4>
                                </div>
                                <div className="p-2 space-y-1">
                                    {zipFiles.map((file) => (
                                        <button
                                            key={file.name}
                                            onClick={() => {
                                                setSelectedZipFile(file.name);
                                                setPreviewContent(file.content);
                                                setPreviewType(file.type);
                                                setPreviewLanguage(getLanguageFromExtension(file.name));
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${selectedZipFile === file.name
                                                ? 'bg-orange-50 text-orange-600 font-bold shadow-sm ring-1 ring-orange-100'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                                }`}
                                        >
                                            <Paperclip className={`h-4 w-4 shrink-0 ${selectedZipFile === file.name ? 'text-orange-500' : 'text-gray-400'}`} />
                                            <span className="text-sm truncate leading-tight">{file.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Main Content Area */}
                        <div className="flex-1 overflow-auto flex flex-col p-8 custom-scrollbar relative">
                            {loadingFile ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-20">
                                    <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
                                    <p className="text-lg font-bold text-gray-900">Processing Attachment...</p>
                                    <p className="text-sm text-gray-400 font-medium">Extracting and preparing preview</p>
                                </div>
                            ) : previewContent ? (
                                <div className="flex-1 flex flex-col min-h-[50vh] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8 ring-1 ring-gray-950/[0.02]">
                                    <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-sm font-bold text-gray-900 truncate">
                                                {selectedZipFile || (reviewingFile?.split('/').pop()?.split('?')[0])}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="rounded-lg font-bold text-[10px] uppercase tracking-tighter bg-white border-gray-100 text-gray-400 px-2 py-0.5">
                                            {previewLanguage}
                                        </Badge>
                                    </div>
                                    <div className="flex-1">
                                        {previewType === 'text' ? (
                                            <Editor
                                                height="100%"
                                                language={previewLanguage}
                                                value={previewContent}
                                                theme="vs-light"
                                                options={{
                                                    readOnly: true,
                                                    fontSize: 14,
                                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                    minimap: { enabled: true },
                                                    scrollBeyondLastLine: false,
                                                    automaticLayout: true,
                                                    padding: { top: 20, bottom: 20 },
                                                    lineNumbers: 'on',
                                                    renderLineHighlight: 'all',
                                                    scrollbar: {
                                                        vertical: 'visible',
                                                        horizontal: 'visible',
                                                        useShadows: false,
                                                        verticalScrollbarSize: 10,
                                                        horizontalScrollbarSize: 10
                                                    }
                                                }}
                                            />
                                        ) : previewType === 'image' ? (
                                            <div className="flex items-center justify-center p-8 h-full min-h-[40vh] bg-white">
                                                <img src={previewContent} alt="ZIP Internal" className="max-w-full h-auto rounded-xl shadow-md border border-gray-100" />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                                                <Paperclip className="h-12 w-12 text-gray-200 mb-4" />
                                                <p className="text-sm font-bold text-gray-400">Preview Not Available for this file type</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 min-h-[50vh] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8 ring-1 ring-gray-950/[0.02]">
                                    {reviewingFile ? (
                                        <div className="h-full">
                                            {reviewingFile.toLowerCase().endsWith('.pdf') ? (
                                                <iframe
                                                    src={`${reviewingFile}#toolbar=0`}
                                                    className="w-full h-full min-h-[50vh]"
                                                    title="PDF Viewer"
                                                />
                                            ) : reviewingFile.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                <div className="flex items-center justify-center p-8 h-full min-h-[40vh]">
                                                    <img src={reviewingFile} alt="Attached" className="max-w-full h-auto rounded-2xl shadow-lg border border-gray-100" />
                                                </div>
                                            ) : (
                                                <div className="p-12 h-full flex flex-col items-center justify-center text-center">
                                                    <div className="h-24 w-24 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                                                        <Paperclip className="h-10 w-10 text-orange-500" />
                                                    </div>
                                                    <h4 className="text-2xl font-black text-gray-900 mb-2">Detailed View Not Available</h4>
                                                    <p className="text-gray-500 max-w-sm font-medium leading-relaxed">
                                                        This file type ({reviewingFile.split('.').pop()}) cannot be previewed directly. You can download it to review locally.
                                                    </p>
                                                    <Button
                                                        onClick={() => window.open(reviewingFile)}
                                                        className="mt-8 bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 px-8 rounded-2xl shadow-xl shadow-orange-100 transition-all flex items-center gap-2"
                                                    >
                                                        <Download className="h-4 w-4" /> Download File to Review
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                                            <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center mb-6 border border-gray-100 border-dashed">
                                                <Eye className="h-8 w-8 text-gray-200" />
                                            </div>
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No file selected for preview</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* In-line Feedback Area */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 ring-1 ring-gray-950/[0.02]">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-gray-900">Annotation & Comments</h3>
                                    <Badge variant="outline" className="rounded-full bg-gray-50 text-gray-400 border-gray-100 font-bold px-4 py-1">
                                        {selectedSubmission?.comments.filter(c => c.comment.startsWith('[File Review]')).length} Comments
                                    </Badge>
                                </div>
                                <div className="space-y-4 mb-8">
                                    {selectedSubmission?.comments.filter(c => c.comment.startsWith('[File Review]')).map((c, i) => (
                                        <div key={i} className="p-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] hover:bg-white hover:shadow-md transition-all flex flex-col items-start min-w-[300px] w-max max-w-full">
                                            <p className="text-[15px] font-semibold text-gray-800 leading-relaxed text-wrap">{c.comment.replace('[File Review] ', '')}</p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <div className="h-1 w-1 rounded-full bg-gray-300" />
                                                <p className="text-[11px] text-gray-400 font-black uppercase tracking-wider">{format(new Date(c.created_at), 'hh:mm a, MMM dd')}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedSubmission?.comments.filter(c => c.comment.startsWith('[File Review]')).length === 0 && (
                                        <div className="p-12 text-center border-2 border-dashed border-gray-50 rounded-[2.5rem]">
                                            <MessageSquare className="h-10 w-10 text-gray-100 mx-auto mb-4" />
                                            <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">No annotations added yet</p>
                                        </div>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Textarea
                                        placeholder="Add an annotation or feedback about this file..."
                                        className="min-h-[140px] bg-[#FDFDFD] border-gray-100 rounded-[2.5rem] p-8 focus:ring-0 focus-visible:ring-0 hover:border-orange-500 focus:border-orange-500 text-[15px] font-semibold resize-none shadow-none transition-all placeholder:text-gray-300 ring-1 ring-gray-950/[0.01]"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (!newComment.trim()) return;
                                                const originalComment = newComment;
                                                setNewComment(`[File Review] ${originalComment}`);
                                                handleAddComment();
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={() => {
                                            if (!newComment.trim()) return;
                                            const originalComment = newComment;
                                            setNewComment(`[File Review] ${originalComment}`);
                                            handleAddComment();
                                        }}
                                        disabled={submitting || !newComment.trim()}
                                        size="icon"
                                        className="absolute bottom-6 right-6 h-12 w-12 rounded-2xl bg-orange-500 hover:bg-orange-600 shadow-2xl shadow-orange-100 transition-all active:scale-95 group-hover:scale-105"
                                    >
                                        <SendHorizonal className="h-6 w-6 text-white" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 border-t border-gray-100 bg-gray-50/50 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Badge className={`px-4 py-1.5 rounded-full font-bold border-none shadow-none text-[10px] uppercase tracking-widest ${selectedSubmission?.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : selectedSubmission?.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-900 text-white'}`}>
                                Current Status: {selectedSubmission?.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedSubmission?.status === 'accepted' && (
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(selectedSubmission.file)}
                                    className="rounded-xl h-11 px-6 font-bold border-orange-100 text-orange-600 bg-orange-50 hover:bg-orange-100"
                                >
                                    <Download className="h-4 w-4 mr-2" /> Download Approved File
                                </Button>
                            )}
                            {selectedSubmission?.status === 'pending' && (
                                <>
                                    <Button
                                        onClick={() => handleUpdateStatus('accepted')}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-2"
                                    >
                                        <Check className="h-4 w-4" /> Accept Work
                                    </Button>
                                    <Button
                                        onClick={() => handleUpdateStatus('rejected')}
                                        className="bg-rose-500 hover:bg-rose-600 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-rose-100 flex items-center gap-2"
                                    >
                                        <X className="h-4 w-4" /> Reject Work
                                    </Button>
                                </>
                            )}
                            <Button variant="ghost" onClick={() => setIsFileViewerOpen(false)} className="rounded-xl font-bold text-gray-400">Close Review</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl p-6 bg-white">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-xl font-bold text-gray-900">Delete Task</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-gray-500 leading-relaxed">
                            Are you sure you want to delete <span className="text-gray-900 font-bold">"{taskToDelete?.title}"</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="rounded-xl h-11 px-6 font-bold text-gray-400 border-gray-100 hover:bg-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDelete}
                            className="bg-orange-500 hover:bg-orange-500 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-orange-100 transition-all"
                        >
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Send Confirmation Dialog */}
            <Dialog open={isSendConfirmDialogOpen} onOpenChange={setIsSendConfirmDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl p-6 bg-white">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-xl font-bold text-gray-900">Send Task</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-gray-500 leading-relaxed">
                            Are you sure you want to send <span className="text-gray-900 font-bold">"{taskToSend?.title}"</span>? Once sent, it will be visible to all students in the selected sections.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button
                            variant="outline"
                            onClick={() => setIsSendConfirmDialogOpen(false)}
                            className="rounded-xl h-11 px-6 font-bold text-gray-400 border-gray-100 hover:bg-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmSend}
                            disabled={submitting}
                            className="bg-orange-500 hover:bg-orange-500 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-orange-100 transition-all"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Send Task
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FacultyTask;
