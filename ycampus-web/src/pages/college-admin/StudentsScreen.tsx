import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { studentService, Student } from '@/services/studentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, User, Filter, GraduationCap, Mail, Phone, Hash, Edit2, Trash2, AlertCircle, X } from 'lucide-react';
import { StudentAddModal } from '@/components/college-admin/students/StudentAddModal';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { departmentService, Department } from '@/services/departmentService';
import { batchService, Batch } from '@/services/batchService';

const StudentsScreen: React.FC = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'detained'>('all');
    const [filterDept, setFilterDept] = useState<string | 'all'>('all');
    const [filterBatch, setFilterBatch] = useState<string | 'all'>('all');
    const [filterAdmissionType, setFilterAdmissionType] = useState<'all' | 'regular' | 'lateral_entry'>('all');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);

    useEffect(() => {
        loadStudents();
        loadFilterOptions();
    }, []);

    const loadFilterOptions = async () => {
        try {
            const collegeId = (user as any)?.college_id;
            if (collegeId) {
                const depts = await departmentService.getDepartments(collegeId);
                setDepartments(depts);

                // Fetch all batches for the college (using getBatches without dept id if possible, 
                // or we'll fetch them per department)
                // For global filtering, we might need all batches. 
                // Let's fetch all batches for the college.
                const allBatches = await batchService.getBatches();
                setBatches(allBatches.filter(b => b.college === collegeId));
            }
        } catch (err) {
            console.error("Failed to load filter options", err);
        }
    };

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

    const filteredStudents = students.filter(s => {
        const matchesSearch = `${s.user_details.first_name} ${s.user_details.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.user_details.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = filterStatus === 'all' ? true :
            filterStatus === 'active' ? !s.is_detained :
                s.is_detained;

        const matchesDept = filterDept === 'all' ? true : String(s.department) === filterDept;
        const matchesBatch = filterBatch === 'all' ? true : s.batch_name === filterBatch;
        const matchesType = filterAdmissionType === 'all' ? true : s.admission_type === filterAdmissionType;

        return matchesSearch && matchesStatus && matchesDept && matchesBatch && matchesType;
    }).sort((a, b) => {
        const nameA = `${a.user_details.first_name} ${a.user_details.last_name}`.toLowerCase();
        const nameB = `${b.user_details.first_name} ${b.user_details.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });

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
                            <div className="flex items-center gap-3 relative">
                                <Button
                                    variant="outline"
                                    className={`text-gray-600 border-gray-200 ${filterStatus !== 'all' ? 'bg-orange-50 border-orange-200 text-orange-600' : ''}`}
                                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                >
                                    <Filter className="h-4 w-4 mr-2" />
                                    {filterStatus === 'all' ? 'Filter' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                                </Button>

                                {isFilterMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-100 rounded-lg shadow-xl z-50 p-4 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                                            <div className="flex flex-wrap gap-2">
                                                {(['all', 'active', 'detained'] as const).map((status) => (
                                                    <button
                                                        key={status}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterStatus === status ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
                                                        onClick={() => setFilterStatus(status)}
                                                    >
                                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admission Type</label>
                                            <div className="flex flex-wrap gap-2">
                                                {(['all', 'regular', 'lateral_entry'] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterAdmissionType === type ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
                                                        onClick={() => setFilterAdmissionType(type)}
                                                    >
                                                        {type === 'all' ? 'All' : type === 'regular' ? 'Reg' : 'LE'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</label>
                                            <select
                                                className="w-full text-sm border-gray-200 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                                value={filterDept}
                                                onChange={(e) => setFilterDept(e.target.value)}
                                            >
                                                <option value="all">All Departments</option>
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id.toString()}>{dept.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</label>
                                            <select
                                                className="w-full text-sm border-gray-200 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                                value={filterBatch}
                                                onChange={(e) => setFilterBatch(e.target.value)}
                                            >
                                                <option value="all">All Batches</option>
                                                {Array.from(new Set(batches
                                                    .filter((b: Batch) => filterDept === 'all' || String(b.department) === filterDept)
                                                    .map((b: Batch) => b.name)))
                                                    .sort((a, b) => b.localeCompare(a))
                                                    .map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        <div className="pt-2 border-t border-gray-50 flex justify-between">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                                onClick={() => {
                                                    setFilterStatus('all');
                                                    setFilterDept('all');
                                                    setFilterBatch('all');
                                                    setFilterAdmissionType('all');
                                                }}
                                            >
                                                Reset Filters
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
                                                onClick={() => setIsFilterMenuOpen(false)}
                                            >
                                                Apply
                                            </Button>
                                        </div>
                                    </div>
                                )}
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
                                        {filteredStudents.map((student, index) => (
                                            <TableRow
                                                key={student.id}
                                                className="group hover:bg-orange-50/30 transition-colors"
                                            >
                                                <TableCell className="text-center font-medium text-gray-500">{index + 1}</TableCell>
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
                                                <TableCell className="text-gray-700 text-xs truncate max-w-[120px]" title={student.department_name}>{student.department_name || "N/A"}</TableCell>
                                                <TableCell className="text-gray-700 text-xs whitespace-nowrap">{student.batch_name || "N/A"}</TableCell>
                                                <TableCell className="text-gray-700 text-xs whitespace-nowrap">{student.section_name ? `Sec ${student.section_name}` : "N/A"}</TableCell>
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
                                                                handleEdit(student);
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
                                                                handleDelete(student);
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
