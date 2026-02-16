import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, GraduationCap, Calendar, LayoutGrid, Search, User, Info, BookOpen, Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { Batch, batchService } from "@/services/batchService";
import { semesterService, Semester } from "@/services/semesterService";
import { Section } from "@/services/sectionService";
import { studentService, Student } from "@/services/studentService";
import subjectService, { Subject } from "@/services/subjectService";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentDetailModal from './StudentDetailModal';
import SubjectAddModal from './SubjectAddModal';
import { StudentAddModal } from '../students/StudentAddModal';

interface BatchDetailViewProps {
    batchId: string | number;
    onBack: () => void;
}

const BatchDetailView: React.FC<BatchDetailViewProps> = ({ batchId, onBack }) => {
    const [batch, setBatch] = useState<Batch | null>(null);
    const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
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
        const loadStudents = async () => {
            if (!selectedSection) return;
            try {
                setStudentsLoading(true);
                const studentsData = await studentService.getStudents({ section: selectedSection.id });
                setStudents(studentsData);
            } catch (err) {
                console.error("Failed to load students", err);
            } finally {
                setStudentsLoading(false);
            }
        };
        loadStudents();
    }, [selectedSection]);

    const loadStudentsList = async () => {
        if (!selectedSection) return;
        try {
            setStudentsLoading(true);
            const studentsData = await studentService.getStudents({ section: selectedSection.id });
            setStudents(studentsData);
        } catch (err) {
            console.error("Failed to load students", err);
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

    const filteredStudents = students.filter(s =>
        `${s.user_details.first_name} ${s.user_details.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredSubjects = subjects.filter(sub =>
        (sub.name || sub.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.short_code || "").toLowerCase().includes(searchQuery.toLowerCase())
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                                            className={`w-full justify-start h-12 ${selectedSection?.id === section.id ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "hover:bg-orange-50 text-gray-600"}`}
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
                <div className="lg:col-span-3 space-y-4">
                    <Card className="border-gray-100 shadow-none">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder={`Search ${activeTab === 'students' ? 'students' : 'subjects'}...`}
                                        className="pl-10 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                                        {activeTab === 'students' ? (
                                            <>
                                                <Users className="h-4 w-4 text-orange-500" />
                                                <span>{filteredStudents.length} Students</span>
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
                            ) : filteredStudents.length === 0 ? (
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredStudents.map((student) => (
                                        <Card
                                            key={student.id}
                                            className="hover:shadow-lg transition-all cursor-pointer border-gray-100 hover:border-orange-200 group overflow-hidden"
                                            onClick={() => setSelectedStudent(student)}
                                        >
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform overflow-hidden border">
                                                    {student.user_details.profile?.profile_image ? (
                                                        <img src={student.user_details.profile.profile_image} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-6 w-6" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <h4 className="font-bold text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                                                            {student.user_details.first_name} {student.user_details.last_name}
                                                        </h4>
                                                        <div className="flex items-center gap-1">
                                                            <Badge variant="outline" className={`${student.admission_type === 'lateral_entry' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'} text-[8px] uppercase px-1 py-0 scale-90`}>
                                                                {student.admission_type === 'lateral_entry' ? 'LE' : 'Reg'}
                                                            </Badge>
                                                            {student.is_detained && (
                                                                <Badge variant="destructive" className="text-[8px] uppercase px-1 py-0 scale-90 flex items-center gap-0.5">
                                                                    <AlertCircle className="h-2 w-2" />
                                                                    Detained
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 font-mono tracking-tighter uppercase">{student.roll_number}</p>
                                                </div>
                                                <div className="flex flex-col gap-1 ml-auto translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
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
                                            </CardContent>
                                            <div className="h-1 w-full bg-orange-50 group-hover:bg-orange-500 transition-colors" />
                                        </Card>
                                    ))}
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
                                            className="hover:shadow-lg transition-all border-gray-100 hover:border-orange-200 group overflow-hidden"
                                        >
                                            <CardContent className="p-4 flex flex-col gap-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                        <BookOpen className="h-5 w-5" />
                                                    </div>
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[9px] uppercase tracking-tighter">
                                                        {subject.category.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors">
                                                        {subject.name || subject.title}
                                                    </h4>
                                                    <p className="text-[11px] text-gray-500 mt-1 font-mono">{subject.short_code || "NO_CODE"}</p>
                                                </div>
                                                <div className="pt-2 border-t flex items-center justify-between">
                                                    <div className="flex -space-x-2">
                                                        {/* Placeholder for instructors if available */}
                                                        {[1, 2].map(i => (
                                                            <div key={i} className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                                                <User className="h-3 w-3 text-gray-400" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <Button variant="link" size="sm" className="h-auto p-0 text-orange-600 text-[11px] font-bold">
                                                        Details
                                                    </Button>
                                                </div>
                                            </CardContent>
                                            <div className="h-1 w-full bg-orange-50 group-hover:bg-orange-500 transition-colors" />
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
                    isOpen={isSubjectModalOpen}
                    onClose={() => setIsSubjectModalOpen(false)}
                    onSubjectAdded={async () => {
                        const subjectsData = await subjectService.getSubjectsForSemester(currentSemester.id);
                        setSubjects(subjectsData);
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
