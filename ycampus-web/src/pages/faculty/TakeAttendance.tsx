import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Search,
    Calendar as CalendarIcon,
    Loader2,
    Users,
    CheckSquare,
    Square,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, isSameDay } from 'date-fns';
import subjectService, { SectionSubjectFaculty, AttendanceRecord, AttendanceSession } from '../../services/subjectService';
import studentService from '../../services/studentService';
import { cn } from '@/lib/utils';

const TakeAttendance: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [fetchingAttendance, setFetchingAttendance] = useState(false);
    const [saving, setSaving] = useState(false);
    const [assignment, setAssignment] = useState<SectionSubjectFaculty | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, boolean | null>>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [remarks, setRemarks] = useState('');
    const [date, setDate] = useState<Date>(new Date());

    // Split initialization into two: assignment info and student/attendance data
    useEffect(() => {
        if (assignmentId) {
            loadAssignmentInfo();
        }
    }, [assignmentId]);

    useEffect(() => {
        if (assignmentId && assignment) {
            loadStudentAndAttendance();
        }
    }, [assignmentId, date, assignment]);

    const loadAssignmentInfo = async () => {
        try {
            const assignmentDetails = await subjectService.getAssignmentDetails(assignmentId!);
            setAssignment(assignmentDetails);
        } catch (error) {
            console.error('Error loading assignment info:', error);
            toast.error('Failed to load assignment details');
        }
    };

    const loadStudentAndAttendance = async () => {
        try {
            setFetchingAttendance(true);

            // 1. Load Students if not loaded
            let studentList = students;
            if (students.length === 0 && assignment?.section) {
                const response = await studentService.getStudents({ section: assignment.section, limit: 1000 });
                studentList = (response as any).results || response || [];
                setStudents(studentList);
            }

            // 2. Load Attendance Session for the specific date
            const formattedDate = format(date, 'yyyy-MM-dd');
            const sessions = await subjectService.getAttendanceSessions({
                section_subject_faculty: assignmentId!,
                date: formattedDate
            } as any);

            const session = (sessions as any).find((s: any) => s.date === formattedDate);

            const newAttendance: Record<string, boolean | null> = {};

            if (session && session.records) {
                setRemarks(session.remarks || '');
                session.records.forEach((record: any) => {
                    newAttendance[record.student] = record.is_present;
                });
            } else {
                setRemarks('');
                studentList.forEach((student: any) => {
                    newAttendance[student.id] = null;
                });
            }

            setAttendance(newAttendance);
        } catch (error) {
            console.error('Error loading attendance:', error);
            // Don't toast error on change date if it's just "not found" (404/empty)
        } finally {
            setFetchingAttendance(false);
            setLoading(false);
        }
    };

    const performSave = async (updatedAttendance: Record<string, boolean | null>) => {
        if (!assignmentId) return;

        // Filter out nulls for the payload (though business logic says we should mark all)
        const records: AttendanceRecord[] = students
            .filter(s => updatedAttendance[s.id] !== null)
            .map(student => ({
                student: student.id,
                is_present: updatedAttendance[student.id] === true
            }));

        if (records.length === 0) return;

        try {
            setSaving(true);
            const payload: AttendanceSession = {
                section_subject_faculty: assignmentId,
                date: format(date, 'yyyy-MM-dd'),
                remarks,
                records
            };

            await subjectService.saveAttendance(payload);
            toast.success('Attendance updated');
        } catch (error) {
            console.error('Error auto-saving:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const toggleSelection = (studentId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedIds(newSelected);
    };

    const markSelectedStatus = async (present: boolean) => {
        if (selectedIds.size === 0) {
            toast.error('Select students first');
            return;
        }

        const updated = { ...attendance };

        // Mark selected as requested
        selectedIds.forEach(id => {
            updated[id] = present;
        });

        // Special Logic: "if multiple roll nums got selected and 1-2 students are unselected 
        // and clicked on present mark the unselected students as absent."
        if (present) {
            filteredStudents.forEach(student => {
                if (!selectedIds.has(student.id)) {
                    updated[student.id] = false;
                }
            });
        }

        setAttendance(updated);
        setSelectedIds(new Set()); // Clear selection after action

        // Automatic Save
        await performSave(updated);
    };

    const markAll = async (present: boolean) => {
        const updated: Record<string, boolean | null> = {};
        students.forEach(s => {
            updated[s.id] = present;
        });
        setAttendance(updated);
        toast.success(`Marked all as ${present ? 'Present' : 'Absent'}`);
        await performSave(updated);
    };

    const toggleSelectAll = () => {
        const visibleIds = filteredStudents.map(s => s.id);
        const allVisibleSelected = visibleIds.every(id => selectedIds.has(id));

        if (allVisibleSelected) {
            const newSelected = new Set(selectedIds);
            visibleIds.forEach(id => newSelected.delete(id));
            setSelectedIds(newSelected);
        } else {
            const newSelected = new Set(selectedIds);
            visibleIds.forEach(id => newSelected.add(id));
            setSelectedIds(newSelected);
        }
    };

    const filteredStudents = students.filter(student => {
        const rollNumber = (student.roll_number || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return rollNumber.includes(search);
    }).sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || ''));

    const presentCount = Object.values(attendance).filter(v => v === true).length;
    const absentCount = Object.values(attendance).filter(v => v === false).length;

    if (loading && !assignment) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!assignment) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold">Assignment not found</h2>
                <Button onClick={() => navigate('/faculty/attendance')} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/faculty/attendance')}
                        className="hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Manager</h1>
                        <p className="text-gray-500 text-sm font-medium">
                            {assignment.semester_subject_details?.subject_details?.subject_name} — {assignment.section_name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Calendar Date Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full sm:w-auto justify-start text-left font-semibold border-gray-200 shadow-sm rounded-xl py-6 px-4 bg-white hover:bg-gray-50",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-5 w-5 text-orange-500" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto p-0 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 z-[100]"
                            align="end"
                            sideOffset={8}
                        >
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    {saving && (
                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-xl border border-orange-100 animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs font-bold">SAVING...</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Sidebar: Summary & Remarks */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="shadow-sm border-gray-200 border overflow-hidden">
                        <CardHeader className="pb-4 bg-gray-50/50 border-b border-gray-100">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-800">
                                <Users className="h-5 w-5 text-orange-500" />
                                Live Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4 text-center">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="text-2xl font-black text-gray-900">{students.length}</div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Total Students</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-green-50 rounded-2xl border border-green-100">
                                        <div className="text-xl font-black text-green-700">{presentCount}</div>
                                        <div className="text-[10px] font-bold text-green-600/70 uppercase">Present</div>
                                    </div>
                                    <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                                        <div className="text-xl font-black text-red-700">{absentCount}</div>
                                        <div className="text-[10px] font-bold text-red-600/70 uppercase">Absent</div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 text-left">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">Session Remarks</label>
                                <textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    onBlur={() => performSave(attendance)}
                                    placeholder="Notes (e.g. Unit 1 completed)"
                                    className="w-full min-h-[80px] text-sm p-3 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all resize-none bg-gray-50/30"
                                />
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full font-bold text-green-600 border-green-200 hover:bg-green-50 rounded-xl py-5"
                                    onClick={() => markAll(true)}
                                >
                                    Mark All Present
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full font-bold text-red-600 border-red-200 hover:bg-red-50 rounded-xl py-5"
                                    onClick={() => markAll(false)}
                                >
                                    Mark All Absent
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Content Area: Grid View */}
                <div className="lg:col-span-9">
                    <Card className="shadow-sm border-gray-200 border min-h-[600px] flex flex-col">
                        <CardHeader className="pb-4 sticky top-0 bg-white z-10 border-b border-gray-100">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search roll number..."
                                            className="pl-9 h-12 rounded-xl border-gray-200 focus:border-orange-500 shadow-sm"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleSelectAll}
                                        title={selectedIds.size > 0 ? "Deselect All" : "Select All"}
                                        className="shrink-0 h-12 w-12 rounded-xl hover:bg-gray-100"
                                    >
                                        {selectedIds.size > 0 ?
                                            <CheckSquare className="h-5 w-5 text-orange-500" /> :
                                            <Square className="h-5 w-5 text-gray-400" />
                                        }
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {selectedIds.size > 0 && (
                                        <Badge className="mr-2 py-2 px-4 rounded-xl text-xs font-black bg-orange-500 text-white shadow-lg animate-in fade-in zoom-in-95">
                                            {selectedIds.size} SELECTED
                                        </Badge>
                                    )}
                                    <div className="flex gap-2 flex-1 sm:flex-initial">
                                        <Button
                                            size="sm"
                                            onClick={() => markSelectedStatus(true)}
                                            disabled={selectedIds.size === 0 || saving}
                                            className="bg-green-600 hover:bg-green-700 text-white font-black rounded-xl h-12 px-6 shadow-md flex-1 sm:flex-initial"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Present
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => markSelectedStatus(false)}
                                            disabled={selectedIds.size === 0 || saving}
                                            className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl h-12 px-6 shadow-md flex-1 sm:flex-initial"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Absent
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-6 flex-1 bg-gray-50/40 relative">
                            {fetchingAttendance && (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                                        <span className="text-xs font-black text-gray-400 uppercase">Fetching Date History...</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student) => {
                                        const isSelected = selectedIds.has(student.id);
                                        const status = attendance[student.id];

                                        return (
                                            <button
                                                key={student.id}
                                                disabled={fetchingAttendance}
                                                onClick={() => toggleSelection(student.id)}
                                                className={cn(
                                                    "relative group flex flex-col items-center justify-center p-5 rounded-[2rem] border-2 transition-all duration-300 outline-none",
                                                    // Status Colors
                                                    status === true
                                                        ? "bg-green-50 border-green-300 text-green-700 shadow-sm"
                                                        : status === false
                                                            ? "bg-red-50 border-red-300 text-red-700 shadow-sm"
                                                            : "bg-white border-gray-200 text-gray-600",
                                                    // Selection States
                                                    isSelected
                                                        ? "ring-8 ring-orange-500/10 border-orange-500 shadow-xl -translate-y-2"
                                                        : "hover:shadow-lg hover:border-gray-300 hover:-translate-y-1",
                                                    fetchingAttendance && "opacity-50 pointer-events-none"
                                                )}
                                            >
                                                {/* Status Label */}
                                                <div className={cn(
                                                    "mb-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                                                    status === true ? "bg-green-100 text-green-700" :
                                                        status === false ? "bg-red-100 text-red-700" :
                                                            "bg-gray-100 text-gray-400"
                                                )}>
                                                    {status === true ? 'Present' : status === false ? 'Absent' : 'Unmarked'}
                                                </div>

                                                {/* Selection Indicator */}
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-orange-500 text-white p-1 rounded-full shadow-lg z-30 scale-110">
                                                        <CheckSquare className="h-3 w-3" />
                                                    </div>
                                                )}

                                                <span className="text-[10px] font-bold uppercase opacity-40 mb-1 leading-none">ID No.</span>
                                                <span className="text-sm font-black tracking-tight word-break-all text-center leading-none">
                                                    {student.roll_number || 'N/A'}
                                                </span>

                                                <div className="mt-3 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all truncate max-w-full text-gray-400 uppercase tracking-tighter">
                                                    {student.user?.first_name}
                                                </div>

                                                {/* Ripple Effect Background */}
                                                <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-active:opacity-100 transition-opacity rounded-[2rem]"></div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-40 text-center space-y-4">
                                        <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                                            <Search className="h-10 w-10 text-gray-200" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-gray-900 font-bold">No students found</p>
                                            <p className="text-gray-400 text-xs">Try searching for a different roll number</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TakeAttendance;
