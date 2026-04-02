import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Users, BookOpen, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getFacultyAssignments, SectionSubjectFaculty } from '@/services/subjectService';

const Attendance = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter states
    const [selectedDept, setSelectedDept] = useState<string>('all');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [selectedBatch, setSelectedBatch] = useState<string>('all');
    const [selectedSection, setSelectedSection] = useState<string>('all');

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            setIsLoading(true);
            const data = await getFacultyAssignments();
            setAssignments(data);
        } catch (err) {
            console.error("Failed to fetch assignments", err);
            toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // Derived filter options (Matching faculty/task)
    const uniqueDepts = useMemo(() => {
        const depts = new Map();
        assignments.forEach(a => {
            const deptId = a.semester_subject_details?.department_id;
            const deptName = a.semester_subject_details?.department_name;
            if (deptId) depts.set(String(deptId), deptName || 'Unknown Department');
        });
        return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
    }, [assignments]);

    const availableSubjects = useMemo(() => {
        if (selectedDept === 'all') return [];
        const subs = new Map();
        assignments
            .filter(a => String(a.semester_subject_details?.department_id) === selectedDept)
            .forEach(a => {
                const sub = a.semester_subject_details?.subject_details;
                if (sub) subs.set(String(sub.id), sub.subject_name || sub.name);
            });
        return Array.from(subs.entries()).map(([id, name]) => ({ id, name }));
    }, [assignments, selectedDept]);

    const uniqueBatches = useMemo(() => {
        if (selectedDept === 'all' || selectedSubject === 'all') return [];
        const batches = new Set<string>();
        assignments
            .filter(a =>
                String(a.semester_subject_details?.department_id) === selectedDept &&
                String(a.semester_subject_details?.subject_details?.id) === selectedSubject
            )
            .forEach(a => {
                if (a.semester_subject_details?.batch_name) {
                    batches.add(a.semester_subject_details.batch_name);
                }
            });
        return Array.from(batches).map(name => ({ id: name, name }));
    }, [assignments, selectedDept, selectedSubject]);

    const availableSections = useMemo(() => {
        if (selectedDept === 'all' || selectedSubject === 'all') return [];
        return assignments
            .filter(a =>
                String(a.semester_subject_details?.department_id) === selectedDept &&
                String(a.semester_subject_details?.subject_details?.id) === selectedSubject &&
                (selectedBatch === 'all' || a.semester_subject_details?.batch_name === selectedBatch)
            )
            .map(a => ({ id: String(a.section), name: a.section_name || `Section ${a.section}` }));
    }, [assignments, selectedDept, selectedSubject, selectedBatch]);

    const filteredAssignments = assignments
        .filter(a => selectedDept === 'all' || String(a.semester_subject_details?.department_id) === selectedDept)
        .filter(a => selectedSubject === 'all' || String(a.semester_subject_details?.subject_details?.id) === selectedSubject)
        .filter(a => selectedBatch === 'all' || a.semester_subject_details?.batch_name === selectedBatch)
        .filter(a => selectedSection === 'all' || String(a.section) === selectedSection);

    return (
        <FacultyLayout>
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
                {/* Header Section */}
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Attendance Hub</h1>
                    <p className="text-muted-foreground font-medium mt-1">Record classroom presence and sync session history</p>
                </div>

                {/* Filters Bar (Task 1:1 replica) */}
                <Card className="border-slate-200 shadow-sm bg-slate-50/50 mb-6">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[#020817] mb-2 block font-sans">Department</label>
                                <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedSubject('all'); setSelectedBatch('all'); setSelectedSection('all'); }}>
                                    <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors shadow-none">
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {uniqueDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[#020817] mb-2 block font-sans">Subject</label>
                                <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedBatch('all'); setSelectedSection('all'); }} disabled={selectedDept === 'all'}>
                                    <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors shadow-none">
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Subjects</SelectItem>
                                        {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[#020817] mb-2 block font-sans">Batch</label>
                                <Select value={selectedBatch} onValueChange={(v) => { setSelectedBatch(v); setSelectedSection('all'); }} disabled={selectedSubject === 'all'}>
                                    <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors shadow-none">
                                        <SelectValue placeholder="All Batches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Batches</SelectItem>
                                        {uniqueBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[#020817] mb-2 block font-sans">Section (optional)</label>
                                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={selectedSubject === 'all'}>
                                    <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors shadow-none">
                                        <SelectValue placeholder="All Sections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {availableSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assignments Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed">
                        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Searching Roster...</p>
                    </div>
                ) : filteredAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredAssignments.map((assignment, index) => (
                            <Card key={assignment.id || index} className="cursor-pointer hover:shadow-lg transition-all border-slate-200 group bg-white shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4 gap-4">
                                        <div className="space-y-1 w-full overflow-hidden">
                                            <div className="flex items-center gap-2 text-slate-500/90 font-bold text-[11px] mb-4 uppercase tracking-tighter">
                                                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{assignment.semester_subject_details?.subject_details?.subject_code || 'SUB'}</span>
                                            </div>
                                            <h3 className="font-bold text-lg leading-tight text-slate-800 line-clamp-2" title={assignment.semester_subject_details?.subject_details?.subject_name}>
                                                {assignment.semester_subject_details?.subject_details?.subject_name || 'Subject Name'}
                                            </h3>
                                            <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-1 truncate" title={assignment.semester_subject_details?.department_name}>
                                                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{assignment.semester_subject_details?.department_name || 'Department'}</span>
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 shrink-0 font-bold px-3">
                                            {assignment.semester_subject_details?.batch_name || 'Batch'}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm font-semibold text-slate-700">
                                                {(assignment.section_name || assignment.section || '').toString().toLowerCase().startsWith('section') 
                                                    ? (assignment.section_name || assignment.section) 
                                                    : `Section ${assignment.section_name || assignment.section}`}
                                            </span>
                                        </div>

                                        <Button
                                            className="w-full sm:w-auto shadow-sm hover:shadow font-bold h-10 px-6 tracking-tight bg-primary text-white"
                                            onClick={() => navigate(`/faculty/attendance/${assignment.id}/take`)}
                                        >
                                            Take Attendance
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="col-span-full py-20 text-center bg-white border border-dashed rounded-2xl border-slate-200">
                        <div className="bg-slate-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">No sessions available</h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto mt-2 leading-relaxed">
                            Filter criteria did not match any assigned sections. Try adjusting your search parameters.
                        </p>
                    </div>
                )}
            </div>
        </FacultyLayout>
    );
};

export default Attendance;