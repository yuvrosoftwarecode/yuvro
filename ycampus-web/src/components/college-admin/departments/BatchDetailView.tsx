import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, GraduationCap, Calendar, LayoutGrid, Search, User, Info, BookOpen, Plus, Trash2, Edit2, X, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Batch, batchService } from "@/services/batchService";
import { semesterService, Semester } from "@/services/semesterService";
import { Section } from "@/services/sectionService";
import { studentService, Student } from "@/services/studentService";
import subjectService, { Subject, SemesterSubject } from "@/services/subjectService";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentDetailModal from './StudentDetailModal';
import SubjectAddModal from './SubjectAddModal';
import FacultySectionAssignModal from './FacultySectionAssignModal';
import { StudentAddModal } from '../students/StudentAddModal';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

interface BatchDetailViewProps {
    batchId: string | number;
    collegeId?: string | number;
    onBack: () => void;
}

const BatchDetailView: React.FC<BatchDetailViewProps> = ({ batchId, collegeId, onBack }) => {
    const [batch, setBatch] = useState<Batch | null>(null);
    const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [subjects, setSubjects] = useState<SemesterSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [selectedSubjectForFaculty, setSelectedSubjectForFaculty] = useState<SemesterSubject | null>(null);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [activeTab, setActiveTab] = useState<string>("students");

    useEffect(() => {
        const loadBatchData = async () => {
            try {
                setLoading(true);
                const batchData = await batchService.getBatch(batchId);
                setBatch(batchData);

                const semestersData = await semesterService.getSemesters(batchId);
                // Filter for current semester only
                const current = semestersData.find(s => s.is_current) || semestersData[0];

                if (current) {
                    setCurrentSemester(current);
                    if (current.sections && current.sections.length > 0) {
                        setSelectedSection(current.sections[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to load batch data", err);
            } finally {
                setLoading(false);
            }
        };
        loadBatchData();
    }, [batchId]);

    useEffect(() => {
        loadStudentsList(1);
    }, [selectedSection, searchQuery]);

    const loadStudentsList = async (page: number = currentPage) => {
        if (!selectedSection) return;
        try {
            setStudentsLoading(true);
            const params: any = {
                section: selectedSection.id,
                page: page,
                search: searchQuery
            };
            const response = await studentService.getStudents(params);
            setStudents(response.results);
            setTotalCount(response.count);
            setCurrentPage(page);
        } catch (err) {
            console.error("Failed to load students", err);
            toast.error("Failed to load students");
        } finally {
            setStudentsLoading(false);
        }
    };

    const handleDeleteStudent = async (student: Student) => {
        if (!window.confirm(`Are you sure you want to delete ${student.user_details.first_name} ${student.user_details.last_name}?`)) {
            return;
        }

        try {
            await studentService.deleteStudent(student.id);
            // toast.success("Student deleted successfully"); // toast is not imported here, I should import it if I want to use it
            loadStudentsList();
        } catch (err) {
            console.error("Failed to delete student", err);
        }
    };

    const handleEditStudent = (student: Student) => {
        setEditingStudent(student);
        setIsStudentModalOpen(true);
    };

    const handleCloseStudentModal = () => {
        setIsStudentModalOpen(false);
        setEditingStudent(null);
    };

    useEffect(() => {
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
        loadSubjects();
    }, [currentSemester]);

    if (loading || !batch) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    const totalPages = Math.ceil(totalCount / 25);

    const filteredSubjects = subjects.filter(sub =>
        (sub.subject_details?.subject_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.subject_details?.short_code || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-orange-50 hover:text-orange-600">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-900">{batch.name}</h2>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                Semester {currentSemester?.number || "N/A"}
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{batch.department_name}</p>
                    </div>
                </div>
            </div>

            {!currentSemester && (
                <Card className="bg-blue-50 border-blue-100">
                    <CardContent className="p-4 flex items-center gap-3 text-blue-700">
                        <Info className="h-5 w-5" />
                        <p className="text-sm font-medium">No current semester active for this batch.</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Sidebar: Sub-navigation/Filters */}
                <div className="lg:col-span-1 space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4 bg-orange-50/50 p-1 border border-orange-100 rounded-lg">
                            <TabsTrigger
                                value="students"
                                className="text-xs font-bold uppercase py-2 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
                            >
                                <Users className="h-3 w-3 mr-1.5" />
                                Students
                            </TabsTrigger>
                            <TabsTrigger
                                value="subjects"
                                className="text-xs font-bold uppercase py-2 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
                            >
                                <BookOpen className="h-3 w-3 mr-1.5" />
                                Subjects
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {activeTab === "students" && (
                        <Card className="border-orange-100 overflow-hidden">
                            <CardHeader className="bg-orange-50/50 pb-3 border-b border-orange-100">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800">
                                    <LayoutGrid className="h-4 w-4 text-orange-500" />
                                    Current Sections
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-2 space-y-1">
                                {currentSemester?.sections && currentSemester.sections.length > 0 ? (
                                    currentSemester.sections.map((section) => (
                                        <Button
                                            key={section.id}
                                            variant={selectedSection?.id === section.id ? "secondary" : "ghost"}
                                            className={`w - full justify - start h - 12 ${selectedSection?.id === section.id ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "hover:bg-orange-50 text-gray-600"} `}
                                            onClick={() => setSelectedSection(section)}
                                        >
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="font-semibold text-sm">Section {section.name}</span>
                                                <span className="text-[10px] opacity-70">{section.student_count || 0} Students</span>
                                            </div>
                                        </Button>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-xs italic">No sections initialized</p>
                                    </div>
                                )}
                                <div className="p-3 border-t border-orange-100 bg-orange-50/20">
                                    <Button
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase"
                                        onClick={() => {
                                            setEditingStudent(null);
                                            setIsStudentModalOpen(true);
                                        }}
                                        disabled={!selectedSection}
                                    >
                                        <Plus className="h-3 w-3 mr-2" />
                                        Add Student
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === "subjects" && (
                        <Card className="border-orange-100 p-4 bg-orange-50/30">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                    <BookOpen className="h-4 w-4 text-orange-500" />
                                    Subject Overview
                                </div>
                                <p className="text-[11px] text-gray-500 italic leading-relaxed">
                                    Manage educational material and instructors for the current semester here.
                                </p>
                                <Button
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase"
                                    onClick={() => setIsSubjectModalOpen(true)}
                                >
                                    <Plus className="h-3 w-3 mr-2" />
                                    Add Subject
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Main Content: List */}
                <div className="lg:col-span-4 space-y-4">
                    <Card className="border-gray-100 shadow-none">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder={`Search ${activeTab === 'students' ? 'students' : 'subjects'}...`}
                                        className="pl-10 pr-10 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                                        {activeTab === 'students' ? (
                                            <>
                                                <Users className="h-4 w-4 text-orange-500" />
                                                <span>{totalCount} Students</span>
                                            </>
                                        ) : (
                                            <>
                                                <BookOpen className="h-4 w-4 text-orange-500" />
                                                <span>{filteredSubjects.length} Subjects</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {activeTab === 'students' && (
                        <>
                            {studentsLoading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                                </div>
                            ) : students.length === 0 ? (
                                <Card className="border-dashed border-2 border-gray-100 shadow-none">
                                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <GraduationCap className="h-10 w-10 text-gray-200" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-700">No students listed</h3>
                                        <p className="text-gray-400 text-sm max-w-xs">There are currently no students assigned to this section.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-gray-50/50">
                                            <TableRow>
                                                <TableHead className="w-[60px] text-center">Sl. No</TableHead>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead>Email Address</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Roll Number</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Batch</TableHead>
                                                <TableHead>Section</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right px-4">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map((student, index) => (
                                                <TableRow
                                                    key={student.id}
                                                    className="group hover:bg-orange-50/30 transition-colors"
                                                >
                                                    <TableCell className="text-center font-medium text-gray-500">{(currentPage - 1) * 25 + index + 1}</TableCell>
                                                    <TableCell>
                                                        <span className="font-semibold text-gray-900">{student.user_details.first_name} {student.user_details.last_name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-gray-900 text-xs">{student.user_details.email}</TableCell>
                                                    <TableCell className="text-gray-900 text-xs whitespace-nowrap">{student.phone_number}</TableCell>
                                                    <TableCell>
                                                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700 tracking-tighter uppercase">{student.roll_number}</code>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`${student.admission_type === 'lateral_entry' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'} text-[11px] uppercase px-1.5 py-0 font-bold`}>
                                                            {student.admission_type === 'lateral_entry' ? 'LE' : 'Reg'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-700 text-xs truncate max-w-[120px]" title={batch.department_name}>{batch.department_name}</TableCell>
                                                    <TableCell className="text-gray-700 text-xs whitespace-nowrap">{batch.name}</TableCell>
                                                    <TableCell className="text-gray-700 text-xs whitespace-nowrap">Sec {selectedSection?.name || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        {student.is_detained ? (
                                                            <Badge variant="destructive" className="text-[11px] uppercase px-1.5 py-0 flex items-center gap-1 w-fit font-bold">
                                                                <AlertCircle className="h-3 w-3" />
                                                                Detained
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[11px] uppercase px-1.5 py-0 font-bold italic">
                                                                Active
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right px-4">
                                                        <div className="flex items-center justify-end gap-1 transition-all duration-300">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditStudent(student);
                                                                }}
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteStudent(student);
                                                                }}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
                                            <div className="flex flex-1 justify-between sm:hidden">
                                                <Button
                                                    onClick={() => loadStudentsList(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Previous
                                                </Button>
                                                <Button
                                                    onClick={() => loadStudentsList(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-700">
                                                        Showing <span className="font-medium">{(currentPage - 1) * 25 + 1}</span> to <span className="font-medium">{Math.min(currentPage * 25, totalCount)}</span> of{' '}
                                                        <span className="font-medium">{totalCount}</span> results
                                                    </p>
                                                </div>
                                                <div>
                                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                        <Button
                                                            onClick={() => loadStudentsList(currentPage - 1)}
                                                            disabled={currentPage === 1}
                                                            variant="outline"
                                                            className="rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                        >
                                                            <span className="sr-only">Previous</span>
                                                            <ChevronLeft className="h-5 w-5" />
                                                        </Button>

                                                        {[...Array(totalPages)].map((_, i) => {
                                                            const page = i + 1;
                                                            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                                                return (
                                                                    <Button
                                                                        key={page}
                                                                        onClick={() => loadStudentsList(page)}
                                                                        variant={currentPage === page ? "default" : "outline"}
                                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${currentPage === page ? 'bg-orange-600 text-white shadow-md' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}
                                                                    >
                                                                        {page}
                                                                    </Button>
                                                                );
                                                            }
                                                            if (page === currentPage - 2 || page === currentPage + 2) {
                                                                return <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>;
                                                            }
                                                            return null;
                                                        })}

                                                        <Button
                                                            onClick={() => loadStudentsList(currentPage + 1)}
                                                            disabled={currentPage === totalPages}
                                                            variant="outline"
                                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                        >
                                                            <span className="sr-only">Next</span>
                                                            <ChevronRight className="h-5 w-5" />
                                                        </Button>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'subjects' && (
                        <>
                            {subjectsLoading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                                </div>
                            ) : filteredSubjects.length === 0 ? (
                                <Card className="border-dashed border-2 border-gray-100 shadow-none">
                                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <BookOpen className="h-10 w-10 text-gray-200" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-700">No subjects listed</h3>
                                        <p className="text-gray-400 text-sm max-w-xs">There are currently no subjects assigned to this semester.</p>
                                        <Button
                                            variant="outline"
                                            className="mt-4 border-orange-200 text-orange-600 hover:bg-orange-50"
                                            onClick={() => setIsSubjectModalOpen(true)}
                                        >
                                            Add First Subject
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredSubjects.map((subject) => (
                                        <Card 
                                            key={subject.id} 
                                            className="hover:shadow-lg transition-all border-gray-100 hover:border-orange-200 group overflow-hidden relative flex flex-col h-full bg-white"
                                        >
                                            {/* Action Bar (Hover visible) */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-red-100"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm("Are you sure you want to remove this subject from the semester?")) {
                                                            try {
                                                                if ((subject as any).assignment_id) {
                                                                    await subjectService.removeSubjectFromSemester((subject as any).assignment_id);
                                                                    toast.success("Subject removed successfully");
                                                                    
                                                                    // Refresh subjects
                                                                    if (currentSemester) {
                                                                        const subjectsData = await subjectService.getSubjectsForSemester(currentSemester.id);
                                                                        setSubjects(subjectsData);
                                                                    }
                                                                } else {
                                                                    toast.error("Cannot remove this subject (missing assignment ID)");
                                                                }
                                                            } catch (err) {
                                                                console.error("Failed to remove subject", err);
                                                                toast.error("Failed to remove subject");
                                                            }
                                                        }
                                                    }}
                                                    title="Remove from Semester"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <CardContent className="p-5 flex flex-col flex-1">
                                                {/* Header: Icon & Badge */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-orange-600 shadow-inner border border-orange-100/50">
                                                        <BookOpen className="h-6 w-6" />
                                                    </div>
                                                    <Badge 
                                                        variant="secondary" 
                                                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm
                                                            ${(subject as any).is_lab ? "bg-blue-50 text-blue-700 border-blue-200" : 
                                                              (subject as any).is_elective ? "bg-purple-50 text-purple-700 border-purple-200" : 
                                                              "bg-slate-100 text-slate-700 border-slate-200"}`
                                                        }
                                                    >
                                                        {(subject as any).is_lab ? "Lab" : (subject as any).is_elective ? "Elective" : "Core"}
                                                    </Badge>
                                                </div>

                                                {/* Subject Info */}
                                                <div className="mb-4 flex-1">
                                                    <h4 className="font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2 text-base" title={subject.subject_details?.subject_name}>
                                                        {subject.subject_details?.subject_name}
                                                    </h4>
                                                    {(subject.assignment_id || subject.subject_details?.short_code) && (
                                                        <p className="text-xs text-gray-500 mt-1.5 font-mono bg-gray-50 inline-block px-1.5 py-0.5 rounded border border-gray-100">
                                                            {subject.assignment_id || subject.subject_details?.short_code}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Footer: Faculties & Action */}
                                                <div className="pt-3 border-t border-gray-100/80 flex items-center justify-between mt-auto">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex -space-x-2">
                                                            {(subject as any).section_faculties?.slice(0, 3).map((assignment: any, i: number) => (
                                                                <div 
                                                                    key={i} 
                                                                    className="h-7 w-7 rounded-full bg-white border-2 border-white flex items-center justify-center shadow-sm overflow-hidden z-10" 
                                                                    title={`${assignment.faculty_details?.user_details?.first_name} (Sec ${assignment.section_name})`}
                                                                >
                                                                    {assignment.faculty_details?.user_details?.profile_image ? (
                                                                        <img src={assignment.faculty_details.user_details.profile_image} alt="" className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <div className="h-full w-full bg-orange-100 flex items-center justify-center text-orange-700 text-[10px] font-bold">
                                                                            {assignment.faculty_details?.user_details?.first_name?.charAt(0) || <User className="h-3 w-3" />}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {(!((subject as any).section_faculties) || (subject as any).section_faculties.length === 0) ? (
                                                            <span className="text-[11px] text-gray-400 font-medium">Unassigned</span>
                                                        ) : (
                                                            (subject as any).section_faculties.length > 3 && (
                                                                <span className="text-[10px] text-gray-500 font-medium">
                                                                    +{(subject as any).section_faculties.length - 3}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                    
                                                    <Button 
                                                        className="h-8 px-3 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 shadow-sm transition-all rounded-lg"
                                                        onClick={() => setSelectedSubjectForFaculty(subject as any)}
                                                    >
                                                        Manage
                                                    </Button>
                                                </div>
                                            </CardContent>
                                            
                                            {/* Bottom Decorator border */}
                                            <div className="h-[3px] w-full bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0" />
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    isOpen={!!selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}

            {currentSemester && (
                <SubjectAddModal
                    semesterId={currentSemester.id}
                    collegeId={collegeId || ""} // Pass collegeId, handle undefined with empty string or check logic
                    existingSubjectIds={subjects.map(s => s.id)}
                    isOpen={isSubjectModalOpen}
                    onClose={() => setIsSubjectModalOpen(false)}
                    onSubjectAdded={async () => {
                        const subjectsData = await subjectService.getSubjectsForSemester(currentSemester.id);
                        setSubjects(subjectsData);
                    }}
                />
            )}

            {currentSemester && (
                <FacultySectionAssignModal
                    isOpen={!!selectedSubjectForFaculty}
                    onClose={() => setSelectedSubjectForFaculty(null)}
                    semesterSubject={selectedSubjectForFaculty}
                    sections={currentSemester.sections || []}
                    collegeId={collegeId || ""}
                    onAssignmentChanged={async () => {
                        // Refresh subjects to get updated faculties
                        const subjectsData = await subjectService.getSubjectsForSemester(currentSemester.id);
                        setSubjects(subjectsData);
                        // Also update the currently selected subject so the modal updates
                        if (selectedSubjectForFaculty) {
                            const updated = subjectsData.find(s => (s as any).assignment_id === selectedSubjectForFaculty.assignment_id);
                            if (updated) setSelectedSubjectForFaculty(updated as any);
                        }
                    }}
                />
            )}
            <StudentAddModal
                isOpen={isStudentModalOpen}
                onClose={handleCloseStudentModal}
                onSuccess={async () => {
                    loadStudentsList();
                }}
                student={editingStudent}
                initialData={{
                    department_id: batch.department,
                    batch_id: batch.id,
                    semester_id: currentSemester?.id,
                    section_id: selectedSection?.id
                }}
            />
        </div>
    );
};

export default BatchDetailView;
