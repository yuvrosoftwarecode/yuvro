import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
    Users, BookOpen, Search, ArrowLeft, 
    Loader2, Plus, LayoutGrid, X, User,
    ChevronLeft, ChevronRight, Edit2, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Table, TableBody, TableCell, TableHead, 
    TableHeader, TableRow 
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentService, Student } from "@/services/studentService";
import subjectService, { SemesterSubject } from "@/services/subjectService";
import { Batch } from "@/services/batchService";
import { semesterService, Semester } from '@/services/semesterService';
import sectionService, { Section } from '@/services/sectionService';
import { AddStudentDialog } from './AddStudentDialog';
import AddSubjectToSemesterDialog from './AddSubjectToSemesterDialog';
import FacultyAssignmentDialog from './FacultyAssignmentDialog';
import { toast } from 'sonner';

interface BatchDetailSectionProps {
    batch: Batch;
    onBack: () => void;
}

const BatchDetailSection: React.FC<BatchDetailSectionProps> = ({ batch, onBack }) => {
    const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [subjects, setSubjects] = useState<SemesterSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("students");

    // Modal states
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [selectedSubjectForFaculty, setSelectedSubjectForFaculty] = useState<SemesterSubject | null>(null);

    const loadSections = async (semesterId: string) => {
        try {
            const sectionsData = await sectionService.getSections(semesterId);
            setSections(sectionsData);
            if (sectionsData.length > 0 && !selectedSection) {
                setSelectedSection(sectionsData[0]);
            }
        } catch (err) {
            console.error("Failed to load sections", err);
        }
    };

    useEffect(() => {
        const loadBatchData = async () => {
            try {
                setLoading(true);
                const semestersData = await semesterService.getSemesters(batch.id);
                const current = semestersData.find(s => s.is_current) || semestersData[0];

                if (current) {
                    setCurrentSemester(current);
                    await loadSections(current.id);
                }
            } catch (err) {
                console.error("Failed to load batch data", err);
            } finally {
                setLoading(false);
            }
        };
        loadBatchData();
    }, [batch.id]);

    useEffect(() => {
        if (selectedSection) {
            loadStudentsList(1);
        }
    }, [selectedSection, searchQuery]);

    useEffect(() => {
        if (currentSemester) {
            loadSubjects();
        }
    }, [currentSemester]);

    const loadStudentsList = async (page: number = currentPage) => {
        if (!selectedSection) return;
        try {
            setStudentsLoading(true);
            const params: any = {
                section__name: selectedSection.name, // Use exact backend filter field
                batch: batch.id,
                page: page,
                search: searchQuery
            };
            const response = await studentService.getStudents(params);
            setStudents(response.results);
            setTotalCount(response.count);
            setCurrentPage(page);
        } catch (err) {
            console.error("Failed to load students", err);
        } finally {
            setStudentsLoading(false);
        }
    };

    const loadSubjects = async () => {
        if (!currentSemester) return;
        try {
            setSubjectsLoading(true);
            const subjectsData = await subjectService.getSubjectsForSemester(currentSemester.id);
            setSubjects(subjectsData);
        } catch (err) {
            console.error("Failed to load subjects", err);
        } finally {
            setSubjectsLoading(false);
        }
    };

    const handleDeleteStudent = async (student: Student) => {
        if (!window.confirm(`Are you sure you want to delete ${student.user_details.first_name} ${student.user_details.last_name}?`)) {
            return;
        }
        try {
            await studentService.deleteStudent(student.id);
            toast.success("Student deleted successfully");
            loadStudentsList();
            if (currentSemester) loadSections(currentSemester.id);
        } catch (err) {
            console.error("Failed to delete student", err);
            toast.error("Failed to delete student");
        }
    };

    if (loading || !currentSemester) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">Initializing batch environment...</p>
            </div>
        );
    }

    const filteredSubjects = subjects.filter(sub =>
        (sub.subject_details?.subject_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.subject_details?.short_code || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(totalCount / 25);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-muted text-foreground rounded-xl">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-900">{batch.name}</h2>
                            <Badge variant="secondary" className="bg-muted text-muted-foreground border-none px-2 rounded-lg font-bold">
                                Semester {currentSemester.number}
                            </Badge>
                        </div>
                        <p className="text-sm font-bold text-muted-foreground">{batch.department_name}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Fixed Left Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 border border-gray-100 rounded-xl">
                            <TabsTrigger
                                value="students"
                                className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
                            >
                                <Users className="h-3 w-3 mr-1.5" />
                                Students
                            </TabsTrigger>
                            <TabsTrigger
                                value="subjects"
                                className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
                            >
                                <BookOpen className="h-3 w-3 mr-1.5" />
                                Subjects
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {activeTab === "students" && (
                        <Card className="border-gray-100 overflow-hidden shadow-none rounded-2xl">
                            <div className="p-4 bg-muted/10 border-b border-gray-100">
                                <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4 text-foreground/50" />
                                    Current sections
                                </h4>
                            </div>
                            <div className="p-2 space-y-1">
                                {sections.length > 0 ? (
                                    sections.map((section) => (
                                        <Button
                                            key={section.id}
                                            variant={selectedSection?.id === section.id ? "secondary" : "ghost"}
                                            className={`w-full justify-start h-12 rounded-xl transition-all ${
                                                selectedSection?.id === section.id 
                                                    ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm" 
                                                    : "hover:bg-muted text-muted-foreground"
                                            }`}
                                            onClick={() => setSelectedSection(section)}
                                        >
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="font-bold text-sm">Section {section.name}</span>
                                                <span className="text-[10px] opacity-70 font-semibold">
                                                    {selectedSection?.id === section.id ? totalCount : (section.student_count || 0)} Students
                                                </span>
                                            </div>
                                        </Button>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground italic bg-muted/5 rounded-xl border border-dashed m-2">
                                        <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-10" />
                                        <p className="text-[10px]">No sections initialized</p>
                                    </div>
                                )}
                                
                                <div className="p-2 mt-2 pt-4 border-t border-gray-50 flex flex-col gap-2">
                                    <Button
                                        className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold text-xs rounded-xl h-10 shadow-sm"
                                        onClick={() => setIsStudentModalOpen(true)}
                                        disabled={!selectedSection}
                                    >
                                        <Plus className="h-3 w-3 mr-2" />
                                        Add student
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === "subjects" && (
                        <Card className="border-gray-100 p-5 bg-muted/5 rounded-2xl shadow-none">
                            <div className="space-y-4 text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-foreground">
                                    <BookOpen className="h-4 w-4" />
                                    Academic review
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic">
                                    Assign faculty and track curriculum coverage for this semester's subjects.
                                </p>
                                <Button
                                    className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold text-xs rounded-xl h-10 shadow-sm"
                                    onClick={() => setIsSubjectModalOpen(true)}
                                >
                                    <Plus className="h-3 w-3 mr-2" />
                                    Add subject
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-4 space-y-4">
                    <Card className="border-gray-100 shadow-none rounded-2xl overflow-hidden bg-muted/5">
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={`Search ${activeTab === 'students' ? 'students' : 'subjects'}...`}
                                    className="pl-10 h-10 border-none bg-white rounded-xl shadow-sm ring-1 ring-gray-100"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-gray-900 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground bg-white px-4 h-10 rounded-xl shadow-sm ring-1 ring-gray-100">
                                {activeTab === 'students' ? (
                                    <>
                                        <Users className="h-4 w-4 text-foreground/50" />
                                        <span>{totalCount} Enrolled</span>
                                    </>
                                ) : (
                                    <>
                                        <BookOpen className="h-4 w-4 text-foreground/50" />
                                        <span>{filteredSubjects.length} Subjects</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    {activeTab === 'students' && (
                        <div className="space-y-4">
                            {studentsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                                    <p className="text-xs text-muted-foreground font-bold">Synchronizing roster...</p>
                                </div>
                            ) : students.length === 0 ? (
                                <Card className="border-dashed border-2 border-gray-200 shadow-none rounded-2xl bg-muted/5">
                                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm ring-1 ring-gray-100">
                                            <User className="h-10 w-10 text-gray-200" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">No students listed</h3>
                                        <p className="text-muted-foreground font-medium text-sm max-w-xs mt-1">
                                            There are currently no students assigned to {selectedSection?.name || 'this segment'}.
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            className="mt-6 rounded-xl font-bold h-10 border-gray-200 text-foreground hover:bg-muted"
                                            onClick={() => setIsStudentModalOpen(true)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Enroll first student
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-muted/10">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[60px] text-center font-bold text-xs italic">sl</TableHead>
                                                <TableHead className="font-bold text-xs">Student name</TableHead>
                                                <TableHead className="font-bold text-xs">Email address</TableHead>
                                                <TableHead className="font-bold text-xs">Phone</TableHead>
                                                <TableHead className="font-bold text-xs">Roll number</TableHead>
                                                <TableHead className="font-bold text-xs">Type</TableHead>
                                                <TableHead className="font-bold text-xs">Section</TableHead>
                                                <TableHead className="font-bold text-xs">Status</TableHead>
                                                <TableHead className="text-right px-6 font-bold text-xs">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map((student, index) => (
                                                <TableRow
                                                    key={student.id}
                                                    className="group hover:bg-muted/5 transition-colors border-gray-50"
                                                >
                                                    <TableCell className="text-center font-bold text-muted-foreground/50 text-xs">
                                                        {(currentPage - 1) * 25 + index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-bold text-gray-900 block truncate max-w-[150px]">
                                                            {student.user_details.first_name} {student.user_details.last_name}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-muted-foreground">{student.user_details.email}</TableCell>
                                                    <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">{student.phone_number}</TableCell>
                                                    <TableCell>
                                                        <code className="text-[11px] bg-muted/50 px-2 py-0.5 rounded-lg border border-gray-100 font-bold text-foreground tracking-tight">
                                                            {student.roll_number}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell className="text-[11px] font-bold text-muted-foreground">Sec {selectedSection?.name || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        {student.is_detained ? (
                                                            <Badge variant="destructive" className="text-[10px] bg-red-50 text-red-600 border-red-100 font-bold px-1.5 py-0 rounded-md">
                                                                Detained
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold px-1.5 py-0 rounded-md italic">
                                                                Active
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right px-6">
                                                        <div className="flex items-center justify-end gap-1 transition-all">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                onClick={() => handleDeleteStudent(student)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-6 py-4 bg-muted/5 border-t border-gray-100">
                                            <p className="text-xs font-bold text-muted-foreground">
                                                Page {currentPage} of {totalPages}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    onClick={() => loadStudentsList(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg font-bold text-xs"
                                                >
                                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                                    Previous
                                                </Button>
                                                <Button
                                                    onClick={() => loadStudentsList(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg font-bold text-xs"
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'subjects' && (
                        <div className="space-y-4">
                            {subjectsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                                    <p className="text-xs text-muted-foreground font-bold">Assembling curriculum...</p>
                                </div>
                            ) : filteredSubjects.length === 0 ? (
                                <Card className="border-dashed border-2 border-gray-200 shadow-none rounded-2xl bg-muted/5">
                                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm ring-1 ring-gray-100">
                                            <BookOpen className="h-10 w-10 text-gray-200" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">No subjects mapped</h3>
                                        <p className="text-muted-foreground font-medium text-sm max-w-xs mt-1">
                                            Academic structure for this semester has not been established yet.
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="mt-6 rounded-xl font-bold h-10 border-gray-200 text-foreground hover:bg-muted"
                                            onClick={() => setIsSubjectModalOpen(true)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Define curriculum
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filteredSubjects.map((subject) => (
                                        <Card 
                                            key={subject.id} 
                                            className="group hover:shadow-xl transition-all border-gray-100 hover:border-gray-200 rounded-2xl relative overflow-hidden flex flex-col h-full bg-white ring-1 ring-gray-100"
                                        >
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    onClick={async () => {
                                                        if (window.confirm("Remove this subject from catalog?")) {
                                                            try {
                                                                await subjectService.removeSubjectFromSemester(subject.assignment_id || subject.id);
                                                                toast.success("Subject removed");
                                                                loadSubjects();
                                                            } catch (err) {
                                                                toast.error("Failed to remove subject");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <CardContent className="p-5 flex flex-col flex-1">
                                                <div className="flex items-start justify-between mb-5">
                                                    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground ring-1 ring-gray-100 shadow-inner">
                                                        <BookOpen className="h-6 w-6" />
                                                    </div>
                                                    <Badge className={`${subject.is_lab ? "bg-emerald-50 text-emerald-700" : subject.is_elective ? "bg-indigo-50 text-indigo-700" : "bg-muted text-muted-foreground"} text-[10px] font-bold px-2 py-0.5 rounded-lg border-none`}>
                                                        {subject.is_lab ? "lab" : subject.is_elective ? "elective" : "core"}
                                                    </Badge>
                                                </div>

                                                <div className="mb-6 flex-1">
                                                    <h4 className="font-bold text-gray-900 leading-tight text-base line-clamp-2">
                                                        {subject.subject_details?.subject_name}
                                                    </h4>
                                                    <code className="text-[10px] text-muted-foreground mt-2 font-mono block tracking-tight">
                                                        ID: {subject.subject_details?.short_code || subject.subject_details?.yuvro_id || 'n/a'}
                                                    </code>
                                                </div>

                                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex -space-x-2">
                                                            {subject.section_faculties?.slice(0, 3).map((assignment: any, i: number) => (
                                                                <div 
                                                                    key={i} 
                                                                    className="h-7 w-7 rounded-full bg-white border-2 border-white flex items-center justify-center shadow-sm text-[10px] font-bold text-muted-foreground bg-muted ring-1 ring-gray-100"
                                                                    title={assignment.faculty_details?.user_details?.first_name}
                                                                >
                                                                    {assignment.faculty_details?.user_details?.first_name?.charAt(0)}
                                                                </div>
                                                            ))}
                                                            {(!subject.section_faculties || subject.section_faculties.length === 0) && (
                                                                <span className="text-[10px] text-muted-foreground font-bold italic opacity-40">No staff</span>
                                                            )}
                                                        </div>
                                                        {subject.section_faculties && subject.section_faculties.length > 3 && (
                                                            <span className="text-[10px] text-muted-foreground font-bold">
                                                                +{subject.section_faculties.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <Button 
                                                        className="h-8 px-4 text-xs font-bold bg-muted/50 text-gray-700 hover:bg-foreground hover:text-background transition-all rounded-xl shadow-none"
                                                        onClick={() => setSelectedSubjectForFaculty(subject)}
                                                    >
                                                        Manage
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {isStudentModalOpen && (
                <AddStudentDialog 
                    open={isStudentModalOpen}
                    onOpenChange={setIsStudentModalOpen}
                    onSuccess={() => {
                        loadStudentsList();
                        if (currentSemester) loadSections(currentSemester.id);
                    }}
                    initialData={{
                        department_id: batch.department,
                        batch_id: batch.id,
                        semester_id: currentSemester?.id,
                        section_id: selectedSection?.id
                    }}
                />
            )}

            {currentSemester && (
                <AddSubjectToSemesterDialog 
                    isOpen={isSubjectModalOpen}
                    onClose={() => setIsSubjectModalOpen(false)}
                    semesterId={currentSemester.id}
                    collegeId={batch.college || ''} 
                    existingSubjectIds={subjects.map(s => s.subject_details?.id || s.id)}
                    onSubjectAdded={loadSubjects}
                />
            )}

            {currentSemester && (
                <FacultyAssignmentDialog 
                    isOpen={!!selectedSubjectForFaculty}
                    onClose={() => setSelectedSubjectForFaculty(null)}
                    semesterSubject={selectedSubjectForFaculty}
                    sections={sections}
                    collegeId={batch.college || ''}
                    onAssignmentChanged={loadSubjects}
                />
            )}
        </div>
    );
};

export default BatchDetailSection;
