import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { getFacultyAssignments, SectionSubjectFaculty, fetchUnitsBySubject, UnitBasic, fetchSubUnitsByUnit, SubUnit } from '../../services/subjectService';
import { taskService, Task } from '../../services/taskService';
import { BookOpen, Users, Calendar, ArrowRight, Loader2, Plus, List, Send, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';

const FacultyTask: React.FC = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedDepartment, setSelectedDepartment] = useState<string>("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<string>("");
    const [selectedSubUnit, setSelectedSubUnit] = useState<string>("");
    const [units, setUnits] = useState<UnitBasic[]>([]);
    const [subUnits, setSubUnits] = useState<SubUnit[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");

    const [view, setView] = useState<'list' | 'create'>('list');

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [assignmentsData, tasksData] = await Promise.all([
                getFacultyAssignments(),
                taskService.getTasks()
            ]);
            setAssignments(assignmentsData);
            setTasks(tasksData);
        } catch (err) {
            console.error("Failed to fetch data", err);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Filter unique departments from assignments
    const uniqueDepartments = assignments.reduce((acc: any[], curr) => {
        const deptId = curr.semester_subject_details?.department_id;
        const deptName = curr.semester_subject_details?.department_name;
        if (deptId && !acc.find(d => d.id === deptId)) {
            acc.push({ id: deptId, name: deptName });
        }
        return acc;
    }, []);

    // Filter assignments based on selected department
    const filteredAssignmentsByDept = selectedDepartment
        ? assignments.filter(a => String(a.semester_subject_details?.department_id) === selectedDepartment)
        : assignments;

    // Filter unique subjects from dept-filtered assignments
    const uniqueSubjects = filteredAssignmentsByDept.reduce((acc: any[], curr) => {
        const subjectId = String(curr.semester_subject_details?.subject_details?.id);
        if (!acc.find(s => s.id === subjectId)) {
            acc.push({
                id: subjectId,
                name: curr.semester_subject_details?.subject_details?.subject_name
            });
        }
        return acc;
    }, []);

    // Filter sections for the selected subject and department
    const availableSections = filteredAssignmentsByDept.filter(a =>
        String(a.semester_subject_details?.subject_details?.id) === selectedSubject
    );

    useEffect(() => {
        setSelectedSubject(""); // Reset subject when department changes
        setSelectedSections([]);
        setSelectedUnit("");
        setSelectedSubUnit("");
    }, [selectedDepartment]);

    useEffect(() => {
        if (selectedSubject) {
            fetchUnitsBySubject(selectedSubject).then(setUnits);
            setSelectedSections([]);
            setSelectedUnit("");
            setSelectedSubUnit("");
        }
    }, [selectedSubject]);

    useEffect(() => {
        if (selectedUnit) {
            fetchSubUnitsByUnit(selectedUnit).then(setSubUnits);
            setSelectedSubUnit("");
        }
    }, [selectedUnit]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubject || selectedSections.length === 0 || !title || !description) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                title,
                description,
                department: selectedDepartment,
                subject: selectedSubject,
                sections: selectedSections, // This is an array of section IDs
                unit: selectedUnit || null,
                sub_unit: selectedSubUnit || null,
                due_date: dueDate || null
            };

            await taskService.createTask(payload);
            toast.success("Task assigned successfully!");
            setView('list');
            fetchData();
            resetForm();
        } catch (err) {
            console.error("Failed to create task", err);
            toast.error("Failed to assign task");
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedDepartment("");
        setSelectedSubject("");
        setSelectedSections([]);
        setSelectedUnit("");
        setSelectedSubUnit("");
        setTitle("");
        setDescription("");
        setDueDate("");
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await taskService.deleteTask(id);
            toast.success("Task deleted");
            fetchData();
        } catch (err) {
            toast.error("Failed to delete task");
        }
    };

    const toggleSection = (sectionId: string) => {
        setSelectedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <RoleSidebar />
            <div className="flex-1">
                <RoleHeader
                    title="Task Management"
                    subtitle="Assign and track tasks for your sections"
                />

                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                            <button
                                onClick={() => setView('list')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${view === 'list' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <List className="h-4 w-4" />
                                Assigned Tasks
                            </button>
                            <button
                                onClick={() => setView('create')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${view === 'create' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Plus className="h-4 w-4" />
                                New Task
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                            <p className="text-gray-500 font-medium">Loading...</p>
                        </div>
                    ) : view === 'create' ? (
                        <Card className="bg-white border-none shadow-sm overflow-hidden">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                                <CardTitle className="text-xl font-bold text-gray-900">Assign New Task</CardTitle>
                                <CardDescription>Select topic and sections to assign a task</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <form onSubmit={handleCreateTask} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold text-gray-700">Select Department *</Label>
                                                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                                    <SelectTrigger className="bg-white border-gray-200 focus:ring-orange-500 rounded-lg">
                                                        <SelectValue placeholder="Select Department" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {uniqueDepartments.map(d => (
                                                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold text-gray-700">Select Subject *</Label>
                                                <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedDepartment}>
                                                    <SelectTrigger className="bg-white border-gray-200 focus:ring-orange-500 rounded-lg">
                                                        <SelectValue placeholder={selectedDepartment ? "Select Subject" : "First select department"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {uniqueSubjects.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {selectedSubject && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-semibold text-gray-700">Sections *</Label>
                                                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                            {availableSections.map(a => (
                                                                <div key={a.section} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                                                                    <Checkbox
                                                                        id={`section-${a.section}`}
                                                                        checked={selectedSections.includes(String(a.section))}
                                                                        onCheckedChange={() => toggleSection(String(a.section))}
                                                                        className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                                                    />
                                                                    <label htmlFor={`section-${a.section}`} className="text-sm font-medium text-gray-600 cursor-pointer">{a.section_name}</label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-sm font-semibold text-gray-700">Topic (Unit)</Label>
                                                            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                                                                <SelectTrigger className="bg-white border-gray-200 focus:ring-orange-500 rounded-lg">
                                                                    <SelectValue placeholder="Select Unit" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {units.map(u => (
                                                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-sm font-semibold text-gray-700">Sub-topic</Label>
                                                            <Select value={selectedSubUnit} onValueChange={setSelectedSubUnit} disabled={!selectedUnit}>
                                                                <SelectTrigger className="bg-white border-gray-200 focus:ring-orange-500 rounded-lg">
                                                                    <SelectValue placeholder="Select Sub-topic" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {subUnits.map(su => (
                                                                        <SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold text-gray-700">Task Title *</Label>
                                                <Input
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    placeholder="Assignment 1: Database Design"
                                                    className="border-gray-200 focus:ring-orange-500 rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold text-gray-700">Due Date</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className="border-gray-200 focus:ring-orange-500 rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold text-gray-700">Description *</Label>
                                                <Textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="Explain the task objectives and requirements..."
                                                    className="h-36 border-gray-200 focus:ring-orange-500 rounded-lg resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setView('list')}
                                            className="px-6 rounded-lg text-gray-600 border-gray-200 hover:bg-gray-50 font-medium"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="bg-orange-500 hover:bg-orange-600 text-white px-8 rounded-lg shadow-md font-semibold flex items-center gap-2"
                                        >
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            Assign Task
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {tasks.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {tasks.map(task => (
                                        <Card key={task.id} className="bg-white border-gray-100 hover:border-orange-200 transition-all shadow-sm group">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                                    <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100 group-hover:scale-105 transition-transform">
                                                        <Clock className="h-7 w-7" />
                                                    </div>

                                                    <div className="flex-1 space-y-4">
                                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                                            <div>
                                                                <h3 className="text-xl font-bold text-gray-900 mb-1">{task.title}</h3>
                                                                <p className="text-sm text-gray-500 line-clamp-2 max-w-2xl">{task.description}</p>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2">
                                                                {task.due_date ? (
                                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 font-medium flex items-center gap-1.5">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        Due: {format(new Date(task.due_date), 'MMM dd, yyyy HH:mm')}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-gray-400 border-gray-100">No deadline</Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Department</p>
                                                                <p className="text-sm font-semibold text-gray-700">{task.department_name || "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Subject</p>
                                                                <p className="text-sm font-semibold text-gray-700">{task.subject_details?.subject_name}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Sections</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {task.section_details?.map(sec => (
                                                                        <Badge key={sec.id} variant="secondary" className="bg-gray-50 text-gray-600 border-gray-100 text-[10px] py-0 px-2">
                                                                            {sec.name}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Topic</p>
                                                                <p className="text-sm font-medium text-gray-600 truncate">
                                                                    {task.unit_name || "General"} {task.sub_unit_name ? `> ${task.sub_unit_name}` : ''}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-end">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteTask(task.id)}
                                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full h-10 w-10 transition-colors"
                                                                >
                                                                    <Trash2 className="h-5 w-5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 text-center max-w-2xl mx-auto shadow-sm">
                                    <div className="h-24 w-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce transition-all duration-1000">
                                        <BookOpen className="h-12 w-12 text-orange-300" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">No tasks assigned yet</h3>
                                    <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                                        You haven't assigned any tasks to your sections.
                                        Click on "New Task" to start assigning work to your students.
                                    </p>
                                    <Button
                                        onClick={() => setView('create')}
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 h-12 rounded-xl shadow-lg border-b-4 border-orange-700 font-bold tracking-wide transform active:translate-y-1 active:border-b-0 transition-all"
                                    >
                                        Create Your First Task
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FacultyTask;
