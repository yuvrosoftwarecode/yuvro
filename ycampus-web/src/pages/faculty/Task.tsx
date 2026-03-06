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
    User, Filter, Download, ExternalLink, SendHorizonal, Paperclip
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
            fetchTasks();
        } catch (err) {
            toast.error("Failed to send task");
        } finally {
            setSubmitting(false);
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
        const stats = {
            total: submissions.length, // Fallback if no full student list
            completed: submissions.filter(s => s.is_submitted).length,
            inProgress: submissions.filter(s => !s.is_submitted && (s.answer || s.answers_data)).length,
            pending: 0 // Will calculate if total > submissions.length
        };
        stats.pending = Math.max(0, stats.total - stats.completed - stats.inProgress);

        return (
            <div className="space-y-8 pb-10">
                {/* Header Sub-row */}
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" onClick={() => setView('taskList')} className="rounded-full bg-white hover:bg-white shadow-xl border border-gray-100 h-12 w-12">
                        <ChevronLeft className="h-6 w-6 text-gray-900" />
                    </Button>
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">{selectedTask?.title}</h2>
                        <p className="text-gray-500 font-bold flex items-center gap-2">
                            View student responses
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <Button className="bg-[#1e1e2d] hover:bg-[#2d2d3d] text-white px-6 h-12 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-gray-200">
                            <Download className="h-5 w-5" /> Download Report
                        </Button>
                    </div>
                </div>

                {/* Task Description Card */}
                <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 bg-white overflow-hidden p-8">
                    <h3 className="text-xl font-black text-gray-900 mb-4">Task Description</h3>
                    <p className="text-gray-500 font-bold leading-relaxed">{selectedTask?.description || "No description provided."}</p>
                </Card>

                {/* Stats row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Students', value: stats.total, color: 'text-gray-900' },
                        { label: 'Completed', value: stats.completed, color: 'text-emerald-500' },
                        { label: 'In Progress', value: stats.inProgress, color: 'text-blue-500' },
                        { label: 'Pending', value: stats.pending, color: 'text-orange-500' }
                    ].map((s, i) => (
                        <Card key={i} className="rounded-[2.5rem] border-none shadow-xl shadow-gray-200/50 bg-white p-6 text-center">
                            <p className="text-4xl font-black mb-1" style={{ color: 'inherit' }}>{s.value}</p>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                        </Card>
                    ))}
                </div>

                {/* Responses Table Card */}
                <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 bg-white overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-2xl font-black text-gray-900">Student Responses</CardTitle>
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 transition-colors group-focus-within:text-gray-900" />
                            <Input
                                placeholder="Search by roll no or name"
                                className="pl-12 h-12 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-gray-100 transition-all font-bold outline-none"
                            />
                        </div>
                    </div>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-50">
                                    <tr>
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Roll No</th>
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Name</th>
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {submissions.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-gray-50/50 transition-all">
                                            <td className="p-6 font-black text-gray-900">{sub.student_details?.roll_number || '--'}</td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={sub.student_details?.user_details?.profile?.avatar} />
                                                        <AvatarFallback className="bg-gray-100 text-gray-400 font-black">
                                                            {sub.student_details?.user_details?.first_name?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-bold text-gray-900">
                                                        {sub.student_details?.user_details?.first_name} {sub.student_details?.user_details?.last_name || sub.student}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <Badge className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase border-none ${sub.is_submitted
                                                    ? 'bg-[#1e1e2d] text-white'
                                                    : sub.answer ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {sub.is_submitted ? 'Completed' : sub.answer ? 'In Progress' : 'Pending'}
                                                </Badge>
                                            </td>
                                            <td className="p-6 text-right">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => fetchSubmissionDetail(sub.id)}
                                                    className="rounded-xl h-10 border-gray-100 text-gray-900 font-black hover:bg-white shadow-sm"
                                                >
                                                    View Details
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {submissions.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center">
                                    <Users className="h-16 w-16 text-gray-100 mb-4" />
                                    <p className="text-gray-400 font-black uppercase tracking-widest">No responses yet</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderStudentDetail = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-180px)] pb-10">
            <div className="lg:col-span-2 flex flex-col gap-6 h-full min-h-0">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" onClick={() => setView('responses')} className="rounded-full bg-white hover:bg-white shadow-xl border border-gray-100 h-12 w-12">
                        <ChevronLeft className="h-6 w-6 text-gray-900" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 capitalize">
                            {selectedSubmission?.student_details?.user_details?.first_name} {selectedSubmission?.student_details?.user_details?.last_name}
                        </h2>
                        <p className="text-gray-500 font-bold">{selectedTask?.title}</p>
                    </div>
                </div>

                <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 bg-white overflow-hidden flex flex-col flex-1">
                    <CardHeader className="bg-white border-b border-gray-50 p-8 flex flex-row items-center justify-between">
                        <CardTitle className="text-2xl font-black text-gray-900">Answer Content</CardTitle>
                        {selectedSubmission?.file && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(selectedSubmission.file)}
                                className="rounded-2xl h-10 border-emerald-100 text-emerald-600 bg-emerald-50 font-black hover:bg-emerald-100 gap-2"
                            >
                                <Download className="h-4 w-4" /> View Attached File
                            </Button>
                        )}
                    </CardHeader>
                    <ScrollArea className="flex-1 p-8">
                        <div className="prose prose-neutral max-w-none">
                            <p className="text-gray-900 leading-relaxed font-bold whitespace-pre-wrap bg-gray-50 p-8 rounded-[2rem] border border-gray-100 text-lg">
                                {selectedSubmission?.answer || "No text content provided."}
                            </p>
                        </div>
                    </ScrollArea>
                </Card>
            </div>

            <div className="flex flex-col h-full min-h-0">
                <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 bg-white overflow-hidden flex flex-col h-full">
                    <CardHeader className="border-b border-gray-50 bg-white p-8">
                        <CardTitle className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <MessageSquare className="h-6 w-6 text-orange-500" />
                            Feedbacks & Chat
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full px-8 py-6">
                            <div className="space-y-6">
                                {selectedSubmission?.comments && selectedSubmission.comments.length > 0 ? (
                                    selectedSubmission.comments.map((c, i) => (
                                        <div key={c.id || i} className={`flex flex-col ${c.faculty ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-4 rounded-3xl max-w-[90%] ${c.faculty
                                                ? 'bg-[#1e1e2d] text-white rounded-br-none shadow-xl shadow-gray-900/10'
                                                : 'bg-gray-100 text-gray-900 rounded-bl-none'
                                                }`}>
                                                <p className="text-sm font-bold leading-normal">{c.comment}</p>
                                                <span className={`text-[10px] mt-2 block font-black uppercase tracking-widest opacity-50`}>
                                                    {c.faculty ? 'You' : 'Student'} • {format(new Date(c.created_at), 'hh:mm a')}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                                        <Clock className="h-12 w-12 text-gray-200 mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">No conversation yet</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <div className="p-8 bg-gray-50 border-t border-gray-100">
                        <div className="relative group">
                            <Textarea
                                placeholder="Write a comment..."
                                className="min-h-[120px] bg-white border-none focus:ring-4 focus:ring-gray-200 rounded-[1.5rem] resize-none pr-14 p-6 shadow-sm font-bold text-gray-900 outline-none"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <Button
                                size="icon"
                                disabled={submitting || !newComment.trim()}
                                onClick={handleAddComment}
                                className="absolute right-4 bottom-4 bg-[#1e1e2d] hover:bg-gray-800 h-10 w-10 rounded-xl shadow-xl transition-all text-white"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </Card>
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
                    {selectedDepartment && selectedSubject && selectedSections.length > 0 && (
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
