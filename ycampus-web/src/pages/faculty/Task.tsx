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
    User, Filter, Download, ExternalLink, SendHorizonal, Paperclip, Check, X, Eye, FileText, FolderOpen
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Editor from '@monaco-editor/react';
import { useRef } from 'react';

const FacultyTask: React.FC = () => {
    const { user } = useAuth();

    // Core Data State
    const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Screening/View State
    const [view, setView] = useState<'cards' | 'taskList' | 'responses' | 'studentDetail'>('cards');
    const [selectedAssignment, setSelectedAssignment] = useState<SectionSubjectFaculty | null>(null);
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
    const [draftComment, setDraftComment] = useState("");

    // File Viewer State
    const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
    const [reviewingFile, setReviewingFile] = useState<string | null>(null);
    const [zipFiles, setZipFiles] = useState<{ name: string; content: string; type: 'text' | 'image' | 'other' }[]>([]);
    const [selectedZipFile, setSelectedZipFile] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<any[]>([]);

    // Scroll chat to bottom
    useEffect(() => {
        if (view === 'studentDetail') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedSubmission?.comments, view]);
    const [previewContent, setPreviewContent] = useState<string>("");
    const [previewType, setPreviewType] = useState<'text' | 'image' | 'other' | null>(null);
    const [previewLanguage, setPreviewLanguage] = useState<string>("plaintext");
    const [loadingFile, setLoadingFile] = useState(false);
    const [selectedLineNumber, setSelectedLineNumber] = useState<number | null>(null);

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
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const textExtensions = [
            'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'cs', 
            'html', 'css', 'json', 'md', 'txt', 'sql', 'sh', 
            'xml', 'yaml', 'yml', 'csv', 'env', 'log', 'dockerfile', 'makefile', 'gitignore'
        ];
        return textExtensions.includes(ext) || filename.toLowerCase().includes('makefile') || filename.toLowerCase().includes('dockerfile');
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
                // Use relative URL to leverage Vite proxy and avoid CORS issues
                const relativeUrl = reviewingFile.includes('://') 
                    ? new URL(reviewingFile).pathname + new URL(reviewingFile).search 
                    : reviewingFile;

                console.log("Attempting to preview file (via proxy):", relativeUrl);
                const response = await fetch(relativeUrl);

                if (!response.ok) {
                    throw new Error(`Server returned ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();
                const filename = reviewingFile.split('/').pop()?.split('?')[0] || '';

                if (filename.toLowerCase().endsWith('.zip')) {
                    const fileSize = blob.size;
                    const fiftyMB = 50 * 1024 * 1024;
                    
                    if (fileSize > fiftyMB) {
                        toast.info("ZIP file is too large for in-browser preview (>50MB). Please download to review.");
                        setPreviewContent("");
                        setPreviewType(null);
                        setZipFiles([]);
                        return;
                    }

                    const jszipModule = await import(/* @vite-ignore */ 'https://esm.run/jszip');
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const JSZip = (jszipModule as any).default || jszipModule;
                    const zip = new JSZip();
                    const contents = await zip.loadAsync(blob);
                    const files: { name: string; content: string; type: 'text' | 'image' | 'other' }[] = [];

                    for (const [name, file] of Object.entries(contents.files)) {
                        if (!file.dir) {
                            if (isImageFile(name)) {
                                const base64 = await file.async('base64');
                                const ext = name.split('.').pop()?.toLowerCase();
                                files.push({ name, content: `data:image/${ext};base64,${base64}`, type: 'image' });
                            } else {
                                // Default all other files to text preview
                                const content = await file.async('string');
                                files.push({ name, content, type: 'text' });
                            }
                        }
                    }
                    setZipFiles(files);
                    if (files.length > 0) {
                        const firstPreviewable = files[0];
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
                    setSelectedLineNumber(null);
                } else if (isImageFile(filename)) {
                    setPreviewContent(reviewingFile);
                    setPreviewType('image');
                    setZipFiles([]);
                    setSelectedZipFile(null);
                    setSelectedLineNumber(null);
                } else if (filename.toLowerCase().endsWith('.pdf')) {
                    setPreviewContent(reviewingFile);
                    setPreviewType('pdf');
                    setZipFiles([]);
                    setSelectedZipFile(null);
                    setSelectedLineNumber(null);
                } else {
                    // Universal fallback to text preview
                    const text = await blob.text();
                    setPreviewContent(text);
                    setPreviewType('text');
                    setPreviewLanguage(getLanguageFromExtension(filename));
                    setZipFiles([]);
                    setSelectedZipFile(null);
                    setSelectedLineNumber(null);
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
            
            // Update local state immediately
            setTasks(prev => prev.map(t => 
                t.id === taskToSend.id ? { ...t, is_sent: true } : t
            ));
            
            toast.success("Task sent successfully!");
            setIsSendConfirmDialogOpen(false);
            setNewComment("");
        } catch (err) {
            toast.error("Failed to send task");
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

            const commentText = newComment.trim();
            const segments: string[] = [];
            const regex = /(?:^|\n)(\[(?:Line: \d+|File Review)\])/g;
            const matches = Array.from(commentText.matchAll(regex));

            if (matches.length > 0) {
                if ((matches[0].index ?? 0) > 0) {
                    const textBefore = commentText.substring(0, matches[0].index).trim();
                    if (textBefore) segments.push(textBefore);
                }
                for (let i = 0; i < matches.length; i++) {
                    const marker = matches[i][1];
                    const startPos = (matches[i].index ?? 0) + matches[i][0].length;
                    const endPos = i + 1 < matches.length ? (matches[i + 1].index ?? 0) : commentText.length;
                    const content = commentText.substring(startPos, endPos).trim();
                    if (content) {
                        segments.push(`${marker} ${content}`);
                    } else {
                        segments.push(marker);
                    }
                }
            } else {
                segments.push(commentText);
            }

            let updatedComments = [...selectedSubmission.comments];
            for (const segment of segments) {
                const comment = await taskService.addCommentToSubmission(selectedSubmission.id, segment);
                updatedComments.push(comment);
            }

            setSelectedSubmission(prev => prev ? {
                ...prev,
                comments: updatedComments
            } : null);

            setNewComment("");
            toast.success("Feedback added successfully");
        } catch (err) {
            toast.error("Failed to add comment");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadReport = () => {
        if (!selectedTask || submissions.length === 0) {
            toast.error("No data available to download.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const today = format(new Date(), 'MMMM dd, yyyy');

        // Header
        doc.setFillColor(249, 115, 22); // orange-500
        doc.rect(0, 0, pageWidth, 36, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Task Performance Report', 14, 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedTask.title, 14, 24);
        doc.text(today, pageWidth - 14, 24, { align: 'right' });

        // Stats summary
        const totalStudents = selectedTask?.section_details?.reduce((acc, curr) => acc + (curr.student_count || 0), 0) || submissions.length;
        const completed = submissions.filter(s => s.is_submitted).length;
        const inProgress = submissions.filter(s => !s.is_submitted && (s.answer || s.answers_data || s.file)).length;
        const pending = Math.max(0, totalStudents - completed - inProgress);

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, 48);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Students: ${totalStudents}   |   Completed: ${completed}   |   In Progress: ${inProgress}   |   Pending: ${pending}`, 14, 56);

        // Table
        const tableData = submissions.map(sub => {
            const rollNo = sub.student_details?.roll_number || 'N/A';
            const name = `${sub.student_details?.user_details?.first_name || ''} ${sub.student_details?.user_details?.last_name || ''}`.trim() || 'Unknown';
            const status = sub.is_submitted ? 'Completed' : (sub.answer || sub.answers_data || sub.file) ? 'In Progress' : 'Pending';
            const submittedAt = sub.submitted_at ? format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm') : 'Not Submitted';
            const comments = sub.comments?.length || 0;
            return [rollNo, name, status, submittedAt, String(comments)];
        });

        autoTable(doc, {
            startY: 64,
            head: [['Roll No', 'Student Name', 'Status', 'Submitted At', 'Comments']],
            body: tableData,
            styles: { fontSize: 9, cellPadding: 5 },
            headStyles: {
                fillColor: [249, 115, 22],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'left'
            },
            alternateRowStyles: { fillColor: [253, 251, 249] },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 55 },
                2: { cellWidth: 30 },
                3: { cellWidth: 45 },
                4: { cellWidth: 20, halign: 'center' }
            },
            margin: { left: 14, right: 14 }
        });

        // Footer
        const pageCount = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(180, 180, 180);
            doc.text(`Page ${i} of ${pageCount}   |   Generated by yCampus`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        }

        const fileName = `${selectedTask.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`;
        doc.save(fileName);

        toast.success('Report downloaded successfully!');
    };

    const handleClearChat = async () => {
        if (!selectedSubmission?.id) return;
        try {
            setSubmitting(true);
            await taskService.clearSubmissionChat(selectedSubmission.id);
            setSelectedSubmission(prev => prev ? { ...prev, comments: [] } : null);
            toast.success("Chat cleared successfully");
        } catch (err) {
            toast.error("Failed to clear chat");
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
                sections: selectedSections,
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

    // Card click handler – sets all filter state from assignment and goes to task list
    const handleCardClick = (assignment: SectionSubjectFaculty) => {
        setSelectedAssignment(assignment);
        const deptId = String(assignment.semester_subject_details?.department_id || '');
        const subjectId = String(assignment.semester_subject_details?.subject_details?.id || '');
        const sectionId = String(assignment.section || '');
        setSelectedDepartment(deptId);
        setSelectedSubject(subjectId);
        setSelectedSections([sectionId]);
        setView('taskList');
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
    const renderCards = () => (
        <div className="space-y-6">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Loading your assignments...</p>
                </div>
            ) : assignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.map((assignment) => (
                        <Card
                            key={assignment.id}
                            className="border-gray-100 group overflow-hidden relative flex flex-col h-full bg-white cursor-pointer"
                            onClick={() => handleCardClick(assignment)}
                        >
                            <CardContent className="p-6 flex flex-col flex-1">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100/50">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                        {assignment.section_name || 'Section'}
                                    </Badge>
                                </div>

                                {/* Subject Info */}
                                <div className="mb-6 flex-1">
                                    <h3 className="font-bold text-gray-900 leading-tight text-lg line-clamp-2">
                                        {assignment.semester_subject_details?.subject_details?.subject_name || 'Unknown Subject'}
                                    </h3>
                                    <div className="space-y-1 mt-3">
                                        <p className="text-xs text-gray-500 flex items-center gap-1.5 capitalize">
                                            <span className="font-semibold text-gray-700">Branch:</span>
                                            {assignment.semester_subject_details?.department_name || 'N/A'}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                <span className="font-semibold text-gray-700">Batch:</span>
                                                {assignment.semester_subject_details?.batch_name || 'N/A'}
                                            </p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                <span className="font-semibold text-gray-700">Sem:</span>
                                                {assignment.semester_subject_details?.semester_number || 'N/A'}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-3 pt-2 flex items-center gap-1.5 border-t border-gray-50">
                                            <Users className="h-4 w-4 text-orange-400" />
                                            <span className="font-medium">{assignment.student_count || 0}</span>
                                            <span>Students enrolled</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                                    <div className="text-xs text-gray-400 flex items-center gap-1">
                                        <List className="h-3.5 w-3.5" />
                                        <span>View Tasks</span>
                                    </div>
                                    <Button
                                        className="bg-orange-500 text-white shadow-sm rounded-lg h-9 px-4 text-sm font-semibold group/btn border-none"
                                        onClick={(e) => { e.stopPropagation(); handleCardClick(assignment); }}
                                    >
                                        Open Tasks
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>

                            {/* Bottom decorator */}
                            <div className="h-1 w-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0" />
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center max-w-2xl mx-auto">
                    <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Assignments Found</h3>
                    <p className="text-gray-500">
                        You don't have any subjects or sections assigned to you yet.
                        Please contact your HOD for assignments.
                    </p>
                </div>
            )}
        </div>
    );

    // Render Components
    const renderTaskList = () => (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <h2 className="text-2xl font-semibold text-foreground">Tasks</h2>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search tasks by title..."
                        className="pl-10 h-11 bg-white border-gray-300 focus:ring-2 focus:ring-gray-100 rounded-xl"
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
                        <Card key={task.id} className="flex flex-col h-full border-gray-300">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-lg leading-tight capitalize">{task.title}</CardTitle>
                                    <Badge variant={task.is_sent ? 'default' : 'secondary'}>
                                        {task.is_sent ? 'Sent' : 'Draft'}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="flex flex-1 flex-col">
                                <div className="flex-1 space-y-3">
                                    <div className="flex gap-2 mb-2">
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {task.task_type === 'coding' ? 'Coding' : 'Descriptive'}
                                        </Badge>
                                        {task.question_source === 'bank' && (
                                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 border-emerald-200 bg-emerald-50">
                                                Question Bank
                                            </Badge>
                                        )}
                                    </div>

                                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                                        {task.question_source === 'bank' ? `${task.questions?.length || 0} Questions attached` : task.description}
                                    </p>

                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Created: {format(new Date(task.created_at), 'MMM dd, yyyy')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Due Date: {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No Due Date'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4">
                                    {!task.is_sent && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 border-orange-200 text-orange-600"
                                                onClick={() => openCreateDialog(task)}
                                            >
                                                <Edit2 className="mr-1 h-3 w-3" /> Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 border-red-200 text-red-600"
                                                onClick={() => handleDeleteRequest(task)}
                                            >
                                                <Trash2 className="mr-1 h-3 w-3" /> Delete
                                            </Button>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full bg-orange-500  text-white"
                                        size="sm"
                                        onClick={() => task.is_sent ? fetchSubmissions(task) : handleSendTaskRequest(task)}
                                        disabled={submitting}
                                    >
                                        {task.is_sent ? (
                                            <><Eye className="mr-1 h-3 w-3" /> View Responses</>
                                        ) : (
                                            <><Send className="mr-1 h-3 w-3" /> Send Task</>
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
                    <Button
                        onClick={handleDownloadReport}
                        className="bg-orange-500  text-white ml-auto"
                    >
                        <Download className="mr-2 h-4 w-4" /> Download Report
                    </Button>
                </div>

                {/* Task Description Card */}
                <Card className="border-gray-300">
                    <CardHeader>
                        <CardTitle className="text-lg">Task Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="leading-relaxed text-sm text-muted-foreground">{selectedTask?.description || "No description provided."}</p>
                    </CardContent>
                </Card>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card className="border-gray-300">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">Total Students</div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-300">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
                            <div className="text-sm text-muted-foreground">Completed</div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-300">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                            <div className="text-sm text-muted-foreground">In Progress</div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-300">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                            <div className="text-sm text-muted-foreground">Pending</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Responses Table Area */}
                    <Card className="border-gray-300">
                        <CardHeader>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <CardTitle className="text-lg">Student Responses</CardTitle>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by roll no or name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 border-gray-300"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Roll No</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSubmissions.map((sub) => (
                                        <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/50" onClick={() => fetchSubmissionDetail(sub.id)}>
                                            <TableCell className="font-medium">{sub.student_details?.roll_number || 'CS001'}</TableCell>
                                            <TableCell>{sub.student_details?.user_details?.first_name} {sub.student_details?.user_details?.last_name || sub.student}</TableCell>
                                            <TableCell>
                                                <Badge className="rounded-full bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100 px-3">
                                                    {sub.is_submitted ? 'Completed' : sub.answer ? 'In Progress' : 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchSubmissionDetail(sub.id);
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {filteredSubmissions.length === 0 && (
                                <div className="py-20 text-center">
                                    <Users className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-muted-foreground">No responses yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
            </div>
        );
    };

    const renderStudentDetail = () => (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setView('responses')}
                        className="h-10 w-10 rounded-xl border-gray-300"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-orange-50 text-orange-600 font-bold">
                                {selectedSubmission?.student_details?.user_details?.first_name?.[0]}
                                {selectedSubmission?.student_details?.user_details?.last_name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {selectedSubmission?.student_details?.user_details?.first_name} {selectedSubmission?.student_details?.user_details?.last_name}
                                </h2>
                                <Badge className="rounded-full bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100 px-3 py-1 text-xs font-bold">
                                    {selectedSubmission?.is_submitted ? 'Completed' : 'In Progress'}
                                </Badge>
                            </div>
                            <p className="text-sm font-medium text-gray-400">Roll No: {selectedSubmission?.student_details?.roll_number || 'CS001'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Student Info & Answer */}
                <div className="lg:col-span-2 flex flex-col">

                    <Card className="border border-gray-300 shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Student Answer</CardTitle>
                            <CardDescription className="text-gray-400 font-medium whitespace-nowrap">Select text to add contextual comments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedSubmission?.answer ? (
                                <div className="space-y-4">
                                    <ScrollArea className="h-[400px]">
                                        <div
                                            className="cursor-text select-text rounded-2xl border border-gray-300 bg-gray-50/10 p-6 whitespace-pre-wrap leading-relaxed text-sm font-medium text-slate-700 min-h-[150px]"
                                            onMouseUp={handleTextSelection}
                                        >
                                            {selectedSubmission.answer}
                                        </div>
                                    </ScrollArea>
                                    {selectedSubmission?.file && (
                                        <div className="flex justify-end pt-4">
                                            <Button
                                                onClick={() => {
                                                    setReviewingFile(selectedSubmission.file || null);
                                                    setIsFileViewerOpen(true);
                                                }}
                                                size="sm"
                                                className="bg-orange-500  text-white"
                                            >
                                                <Eye className="mr-2 h-4 w-4" /> Review Attached File
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : selectedSubmission?.file ? (
                                <div className="py-12 text-center">
                                    <Button
                                        onClick={() => {
                                            setReviewingFile(selectedSubmission.file || null);
                                            setIsFileViewerOpen(true);
                                        }}
                                        className="h-12 px-6 bg-orange-500  text-white"
                                    >
                                        <Eye className="mr-2 h-5 w-5" /> Review Attached File
                                    </Button>
                                    <p className="mt-4 text-xs font-medium text-muted-foreground uppercase tracking-widest">No text content provided.</p>
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">No submission provided.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Chat / Discussion */}
                <div className="flex flex-col">
                    <Card className="border border-gray-300 shadow-sm flex flex-col h-[520px]">
                        <CardHeader>
                            <CardTitle>Discussion</CardTitle>
                            <CardDescription>Comments and feedback</CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
                            <ScrollArea className="flex-1 pr-4 h-full">
                                <div className="space-y-4">
                                    {selectedSubmission?.comments && selectedSubmission.comments.length > 0 ? (
                                        selectedSubmission.comments.map((c, i) => (
                                            <div
                                                key={c.id || i}
                                                className={`rounded-2xl p-4 shadow-none ${
                                                    c.faculty
                                                        ? 'bg-blue-50/50 text-blue-900 self-start rounded-bl-none'
                                                        : 'bg-green-50/50 text-green-900 self-end rounded-br-none'
                                                }`}
                                            >
                                                <div className="mb-2 flex items-start justify-between gap-3">
                                                    <span className="text-sm font-medium">
                                                        {c.faculty ? 'Faculty' : 'Student'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(c.created_at), 'MMM dd, h:mm a')}
                                                    </span>
                                                </div>
                                                <p className="text-sm whitespace-pre-wrap text-foreground font-medium">
                                                    {c.comment}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 text-center">
                                            <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No conversation yet</p>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>
                            </ScrollArea>

                            <Separator className="my-4" />

                            <div className="relative mt-2">
                                <Textarea
                                    placeholder="Add a comment..."
                                    className="min-h-[100px] text-sm border-gray-300 rounded-2xl bg-gray-50/50 focus:bg-white transition-colors pr-12 pb-12"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment();
                                        }
                                    }}
                                />
                                <div className="absolute bottom-3 right-3">
                                    <Button
                                        disabled={submitting || !newComment.trim()}
                                        onClick={handleAddComment}
                                        size="sm"
                                        className="bg-orange-500  text-white rounded-xl px-4 py-2 h-9 flex items-center gap-2"
                                    >
                                        <SendHorizonal className="h-4 w-4" /> 
                                        <span>Add Comment</span>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
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

                    {/* Cards view — default landing */}
                    {view === 'cards' && renderCards()}

                    {/* Task list view — shown after picking a card */}
                    {view === 'taskList' && (
                        <>
                            {/* Top bar: back + section info + create button */}
                            <div className="flex items-center gap-4 flex-wrap">
                                <Button
                                    variant="outline"
                                    onClick={() => { setView('cards'); setSelectedAssignment(null); }}
                                    className="rounded-xl bg-white border-gray-200 h-10 px-4 text-gray-900 font-bold hover:bg-white gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" /> All Sections
                                </Button>

                                {selectedAssignment && (
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                            <BookOpen className="h-4 w-4 text-orange-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-none">
                                                {selectedAssignment.semester_subject_details?.subject_details?.subject_name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {selectedAssignment.semester_subject_details?.department_name} · {selectedAssignment.section_name}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={() => openCreateDialog()}
                                    className="bg-orange-500 text-white ml-auto border-none shadow-none"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Create New Task
                                </Button>
                            </div>

                            {/* Task list content */}
                            {renderTaskList()}
                        </>
                    )}

                    {/* Responses & student detail views */}
                    {view === 'responses' && renderResponses()}
                    {view === 'studentDetail' && renderStudentDetail()}
                </div>
            </div>

            {/* Create / Edit Task Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className={`${formState.question_source === 'bank' ? 'max-w-5xl' : 'max-w-2xl'} p-0 overflow-hidden`}>
                    <Card className="border-gray-300 shadow-none">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">{editingTask ? 'Edit Task' : 'Create New Task'}</CardTitle>
                                <DialogDescription className="sr-only">Fill in the details to {editingTask ? 'update' : 'broadcast'} the task.</DialogDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Task Title *</Label>
                                        <Input
                                            value={formState.title}
                                            onChange={e => setFormState(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Enter task title"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Due Date</Label>
                                        <Input
                                            type="datetime-local"
                                            value={formState.due_date}
                                            onChange={e => setFormState(prev => ({ ...prev, due_date: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Unit *</Label>
                                            <Select value={formState.unit} onValueChange={v => setFormState(prev => ({ ...prev, unit: v, sub_unit: "" }))}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Sub Unit {formState.question_source === 'manual' ? '*' : ''}</Label>
                                            <Select value={formState.sub_unit} onValueChange={v => setFormState(prev => ({ ...prev, sub_unit: v }))} disabled={!formState.unit}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {subUnits.map(su => <SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Task Type</Label>
                                            <Select value={formState.task_type} onValueChange={(v: 'descriptive' | 'coding') => setFormState(prev => ({ ...prev, task_type: v, questions: [] }))}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="descriptive">Descriptive</SelectItem>
                                                    <SelectItem value="coding">Coding</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Source</Label>
                                            <Select value={formState.question_source} onValueChange={(v: 'manual' | 'bank') => setFormState(prev => ({ ...prev, question_source: v, questions: [] }))}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Source" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="manual">Manual Entry</SelectItem>
                                                    <SelectItem value="bank">Question Bank</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {formState.question_source === 'manual' ? (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Task Description *</Label>
                                            <div className="relative">
                                                <Textarea
                                                    value={formState.description}
                                                    onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Enter detailed task description..."
                                                    className="h-[150px] resize-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Select Questions *</Label>
                                            {loadingQuestions ? (
                                                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                            ) : !selectedSubject ? (
                                                <div className="bg-muted p-4 rounded-lg text-center text-sm text-muted-foreground">
                                                    Please select a Subject first.
                                                </div>
                                            ) : bankQuestions.length > 0 ? (
                                                <ScrollArea className="h-[170px] rounded-md border p-2">
                                                    <div className="space-y-2">
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
                                                                className={`cursor-pointer p-3 rounded-lg border transition-all flex items-start gap-3 ${formState.questions.includes(String(q.id)) ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted'}`}
                                                            >
                                                                <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${formState.questions.includes(String(q.id)) ? 'text-primary' : 'text-muted-foreground/30'}`} />
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-semibold leading-tight line-clamp-1">{q.title}</p>
                                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{q.content.replace(/<[^>]*>?/gm, '')}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            ) : (
                                                <div className="bg-muted p-4 rounded-lg text-center text-sm text-muted-foreground">
                                                    No questions found.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </CardContent>
                        <DialogFooter className="p-6 border-t gap-3">
                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 border-gray-300">Cancel</Button>
                            <Button type="button" onClick={handleSaveTask} disabled={submitting} className="flex-1 bg-orange-500  text-white">
                                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                {editingTask ? 'Save Task' : 'Create Task'}
                            </Button>
                        </DialogFooter>
                    </Card>
                </DialogContent>
            </Dialog>

            {/* File Review Modal */}
            <Dialog open={isFileViewerOpen} onOpenChange={setIsFileViewerOpen}>
                <DialogContent className="max-w-6xl w-[95vw] h-[90vh] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col [&>button.absolute.right-4]:hidden">
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
                                <div className="p-4 border-b border-gray-100/50 bg-white">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2">
                                        <FolderOpen className="h-3 w-3" />
                                        FILES IN ZIP
                                    </h4>
                                </div>
                                <div className="p-3 space-y-1.5">
                                    {zipFiles.map((file: any) => (
                                        <button
                                            key={file.name}
                                            onClick={() => {
                                                setSelectedZipFile(file.name);
                                                setPreviewContent(file.content);
                                                setPreviewType(file.type);
                                                setPreviewLanguage(getLanguageFromExtension(file.name));
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
                                                onMount={(editor: any) => {
                                                    editor.onDidChangeCursorSelection((e: any) => {
                                                        setSelectedLineNumber(e.selection.startLineNumber);
                                                    });
                                                }}
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
                                                <p className="text-sm font-bold text-gray-400 mb-4">Preview Not Available for this file type</p>
                                                <Button
                                                    onClick={async () => {
                                                        const file = zipFiles.find(f => f.name === selectedZipFile);
                                                        if (file) {
                                                            try {
                                                                setLoadingFile(true);
                                                                // Since we don't have the binary content stored for 'other' files in the state,
                                                                // we need to re-extract it if we want to show it.
                                                                // But wait, in processFile, for 'other' files, content is ''.
                                                                // I should update processFile to store the file or at least try to get text.

                                                                // For now, let's just show a toast or message.
                                                                // Better yet, I'll update processFile to always try to get string for 'other' files 
                                                                // but only set previewType to 'text' if it's a known text file.
                                                                toast.info("Try downloading this file from the ZIP locally.");
                                                            } finally {
                                                                setLoadingFile(false);
                                                            }
                                                        }
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-gray-200"
                                                >
                                                    Unsupported Preview
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 min-h-[50vh] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8 ring-1 ring-gray-950/[0.02]">
                                    {reviewingFile ? (
                                        <div className="h-full">
                                            {previewType === 'pdf' ? (
                                                <iframe 
                                                    src={`${reviewingFile}#toolbar=0`} 
                                                    className="w-full h-full min-h-[50vh]" 
                                                    title="PDF Viewer" 
                                                />
                                            ) : previewType === 'image' ? (
                                                <div className="flex items-center justify-center p-8 h-full min-h-[40vh]">
                                                    <img src={reviewingFile} alt="Attached" className="max-w-full h-auto rounded-2xl shadow-lg border border-gray-100" />
                                                </div>
                                            ) : previewType === 'text' ? (
                                                <div className="h-full min-h-[50vh] bg-white rounded-3xl overflow-hidden">
                                                    <Editor
                                                        height="100%"
                                                        language={previewLanguage}
                                                        value={previewContent}
                                                        theme="vs-light"
                                                        onMount={(editor) => {
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
                                                            renderLineHighlight: 'all',
                                                            scrollbar: {
                                                                vertical: 'visible',
                                                                horizontal: 'visible'
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="p-12 h-full flex flex-col items-center justify-center text-center">
                                                    <div className="h-24 w-24 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                                                        <Paperclip className="h-10 w-10 text-orange-500" />
                                                    </div>
                                                    <h4 className="text-2xl font-black text-gray-900 mb-2">Preview Not Available</h4>
                                                    <p className="text-gray-500 max-w-sm font-medium leading-relaxed">
                                                        This file type (.{reviewingFile.split('.').pop()?.split('?')[0]}) cannot be previewed directly. You can download it to review locally.
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-8">
                                                        <Button
                                                            onClick={() => window.open(reviewingFile)}
                                                            className="bg-orange-500 text-white font-bold h-12 px-8 rounded-2xl shadow-xl shadow-orange-100 transition-all flex items-center gap-2"
                                                        >
                                                            <Download className="h-4 w-4" /> Download File
                                                        </Button>
                                                    </div>
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
                        </div>

                        {/* Right Sidebar: In-line Feedback Area */}
                        <div className="w-full md:w-[400px] border-l border-gray-200 bg-white flex flex-col shrink-0 custom-scrollbar z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                            <div className="p-8 border-b border-gray-50 flex-none">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-black text-gray-900">Annotations</h3>
                                    <Badge variant="outline" className="rounded-full bg-gray-50 text-gray-400 border-gray-100 font-bold px-3 py-0.5">
                                        {selectedSubmission?.comments.filter(c => c.comment.startsWith('[') && c.comment.includes(']')).length}
                                    </Badge>
                                </div>
                                <p className="text-xs font-semibold text-gray-400 leading-relaxed">Click any line in the code editor to attach your comment to that specific line.</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {selectedSubmission?.comments.filter(c => {
                                    const bracketEnd = c.comment.indexOf(']');
                                    if (bracketEnd === -1 || !c.comment.startsWith('[')) return false;
                                    const tag = c.comment.substring(1, bracketEnd);
                                    
                                    if (selectedZipFile) {
                                        return tag.startsWith(`${selectedZipFile} |`);
                                    } else {
                                        // Standalone file or general review
                                        return tag.startsWith('Line:') || tag === 'File Review';
                                    }
                                }).map((c, i) => (
                                    <div key={i} className="p-5 bg-gray-50/50 border border-gray-100 rounded-3xl hover:bg-white hover:shadow-md transition-all flex flex-col items-start w-full">
                                        {c.comment.includes(']') ? (
                                            <>
                                                <Badge className="bg-orange-50 text-orange-600 font-black tracking-normal text-[9px] mb-3 border-none hover:bg-orange-100 rounded-md px-2 py-0.5 shadow-none whitespace-normal text-left leading-normal">
                                                    {c.comment.substring(1, c.comment.indexOf(']'))}
                                                </Badge>
                                                <p className="text-[14px] font-semibold text-gray-800 leading-relaxed">{c.comment.substring(c.comment.indexOf(']') + 1).trim()}</p>
                                            </>
                                        ) : (
                                            <p className="text-[14px] font-semibold text-gray-800 leading-relaxed">{c.comment.replace('[File Review] ', '')}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/5 w-full">
                                            <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{format(new Date(c.created_at), 'hh:mm a, MMM dd')}</p>
                                        </div>
                                    </div>
                                ))}
                                {selectedSubmission?.comments.filter(c => {
                                    const bracketEnd = c.comment.indexOf(']');
                                    if (bracketEnd === -1 || !c.comment.startsWith('[')) return false;
                                    const tag = c.comment.substring(1, bracketEnd);
                                    if (selectedZipFile) return tag.startsWith(`${selectedZipFile} |`);
                                    return tag.startsWith('Line:') || tag === 'File Review';
                                }).length === 0 && (
                                    <div className="flex flex-col items-center justify-center p-10 text-center opacity-70 mt-10">
                                        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 border-dashed">
                                            <MessageSquare className="h-6 w-6 text-gray-300" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No annotations</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-50 bg-white flex-none relative group">
                                {selectedLineNumber !== null && previewType === 'text' && (
                                    <div className="absolute -top-10 left-6 right-6">
                                        <Badge className="bg-white border-gray-200 text-gray-500 shadow-sm px-3 py-1 text-xs">
                                            Drafting for Line {selectedLineNumber}
                                        </Badge>
                                    </div>
                                )}
                                <Textarea
                                    placeholder="Add feedback..."
                                    className="min-h-[60px] bg-[#FDFDFD] border-gray-200 rounded-3xl p-4 pr-14 focus:ring-0 focus-visible:ring-0 hover:border-orange-500 focus:border-orange-500 text-[14px] font-semibold resize-none shadow-none transition-all placeholder:text-gray-300 ring-1 ring-gray-950/[0.01]"
                                    value={draftComment}
                                    onChange={(e) => setDraftComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (!draftComment.trim() && !newComment.trim()) {
                                                setIsFileViewerOpen(false);
                                                return;
                                            }
                                            if (draftComment.trim()) {
                                                const originalComment = draftComment;
                                                let prefix = "";
                                                if (selectedLineNumber && previewType === 'text') {
                                                    prefix = selectedZipFile ? `[${selectedZipFile} | Line: ${selectedLineNumber}]\n` : `[Line: ${selectedLineNumber}]\n`;
                                                } else {
                                                    prefix = selectedZipFile ? `[${selectedZipFile} | File Review]\n` : `[File Review]\n`;
                                                }
                                                setNewComment(prev => prev + (prev ? '\n\n' : '') + `${prefix}${originalComment.trim()}`);
                                                setDraftComment("");
                                            }
                                            setIsFileViewerOpen(false);
                                        }
                                    }}
                                />
                                <Button
                                    onClick={() => {
                                        if (!draftComment.trim()) return;
                                        const originalComment = draftComment;
                                        let prefix = "";
                                        if (selectedLineNumber && previewType === 'text') {
                                            prefix = selectedZipFile ? `[${selectedZipFile} | Line: ${selectedLineNumber}]\n` : `[Line: ${selectedLineNumber}]\n`;
                                        } else {
                                            prefix = selectedZipFile ? `[${selectedZipFile} | File Review]\n` : `[File Review]\n`;
                                        }
                                        setNewComment(prev => prev + (prev ? '\n\n' : '') + `${prefix}${originalComment.trim()}`);
                                        setDraftComment("");
                                        toast.success("Added to draft");
                                    }}
                                    disabled={submitting || !draftComment.trim()}
                                    size="icon"
                                    className="absolute bottom-8 right-8 h-10 w-10 rounded-xl bg-orange-500  shadow-xl shadow-orange-100 transition-all group-hover:scale-105"
                                >
                                    <Plus className="h-5 w-5 text-white" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pr-8 border-t border-gray-100 bg-white shrink-0 flex items-center justify-end rounded-b-[2.5rem]">
                        <div className="flex items-center gap-3 w-full justify-end">
                            {selectedSubmission?.status === 'accepted' && (
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(selectedSubmission.file)}
                                    className="rounded-xl h-11 px-6 font-bold border-orange-100 text-orange-600 bg-orange-50 hover:bg-orange-100"
                                >
                                    <Download className="h-4 w-4 mr-2" /> Download Approved File
                                </Button>
                            )}
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
                            className="bg-orange-500  text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-orange-100 transition-all"
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
                            className="bg-orange-500  text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-orange-100 transition-all"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Send Task
                        </Button>
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
            `}</style>
        </div>
    );
};

export default FacultyTask;
