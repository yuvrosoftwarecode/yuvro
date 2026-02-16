import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { studentService, Student } from '@/services/studentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, User, Filter, GraduationCap, Mail, Phone, Hash, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { StudentAddModal } from '@/components/college-admin/students/StudentAddModal';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const StudentsScreen: React.FC = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const collegeId = (user as any)?.college_id;
            const data = await studentService.getStudents({ college: collegeId });
            setStudents(data);
        } catch (err) {
            console.error("Failed to load students", err);
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (student: Student) => {
        if (!window.confirm(`Are you sure you want to delete ${student.user_details.first_name} ${student.user_details.last_name}?`)) {
            return;
        }

        try {
            await studentService.deleteStudent(student.id);
            toast.success("Student deleted successfully");
            loadStudents();
        } catch (err) {
            console.error("Failed to delete student", err);
            toast.error("Failed to delete student");
        }
    };

    const handleEdit = (student: Student) => {
        setSelectedStudent(student);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setSelectedStudent(null);
    };

    const filteredStudents = students.filter(s =>
        `${s.user_details.first_name} ${s.user_details.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.user_details.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title="Student Management"
                        subtitle="View and manage all students in your college"
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                        {/* Action Bar */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by name, roll no, or email..."
                                    className="pl-10 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" className="text-gray-600 border-gray-200">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Filter
                                </Button>
                                <Button
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                    onClick={() => {
                                        setSelectedStudent(null);
                                        setIsAddModalOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Student
                                </Button>
                            </div>
                        </div>

                        {/* Students List */}
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <Card className="border-dashed border-2 border-gray-100 shadow-none bg-transparent">
                                <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                                    <div className="h-20 w-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                                        <GraduationCap className="h-10 w-10 text-orange-200" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-700">No students found</h3>
                                    <p className="text-gray-400 text-sm max-w-sm mt-1">
                                        {searchQuery ? "No students match your current search criteria." : "Start by adding your first student to the system."}
                                    </p>
                                    {!searchQuery && (
                                        <Button
                                            className="mt-6 bg-orange-600 hover:bg-orange-700"
                                            onClick={() => setIsAddModalOpen(true)}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add First Student
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredStudents.map((student) => (
                                    <Card
                                        key={student.id}
                                        className="hover:shadow-lg transition-all border-gray-100 hover:border-orange-200 group relative overflow-hidden bg-white"
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                    {student.user_details.profile?.profile_image ? (
                                                        <img src={student.user_details.profile.profile_image} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-7 w-7" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                                                            {student.user_details.first_name} {student.user_details.last_name}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5">
                                                            <Badge variant="outline" className={`${student.admission_type === 'lateral_entry' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'} text-[9px] uppercase px-1.5 py-0`}>
                                                                {student.admission_type === 'lateral_entry' ? 'LE' : 'Regular'}
                                                            </Badge>
                                                            {student.is_detained && (
                                                                <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0 flex items-center gap-1">
                                                                    <AlertCircle className="h-2 w-2" />
                                                                    Detained
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Hash className="h-3 w-3 text-gray-400" />
                                                        <p className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-tighter">
                                                            {student.roll_number}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 space-y-3">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    <span className="text-xs truncate">{student.user_details.email}</span>
                                                </div>
                                                {student.phone_number && (
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        <span className="text-xs">{student.phone_number}</span>
                                                    </div>
                                                )}
                                                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-2">
                                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                                                        Department
                                                        <p className="text-xs text-gray-700 complement uppercase mt-0.5 truncate font-semibold">
                                                            {student.department_name || "N/A"}
                                                        </p>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest text-right">
                                                        Batch
                                                        <p className="text-xs text-gray-700 complement uppercase mt-0.5 truncate font-semibold">
                                                            {student.batch_name || "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-end gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[10px] text-gray-500 hover:text-orange-600 hover:border-orange-200"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(student);
                                                    }}
                                                >
                                                    <Edit2 className="h-3 w-3 mr-1.5" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[10px] text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(student);
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1.5" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </CardContent>
                                        <div className="h-1.5 w-full bg-orange-50 group-hover:bg-orange-500 transition-colors absolute bottom-0 left-0" />
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <StudentAddModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                onSuccess={loadStudents}
                student={selectedStudent}
            />
        </div >
    );
};

export default StudentsScreen;
