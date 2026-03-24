import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import PageHeader from '@/components/common/PageHeader';
import { studentService, Student } from '@/services/studentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, User, Filter, GraduationCap, Mail, Phone, Hash, Edit2, Trash2, AlertCircle, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { StudentAddModal } from '@/components/college-admin/students/StudentAddModal';
import { StudentBulkImportModal } from '@/components/college-admin/students/StudentBulkImportModal';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { departmentService, Department } from '@/services/departmentService';
import { batchService, Batch } from '@/services/batchService';

const StudentsScreen: React.FC = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'detained'>('all');
    const [filterDept, setFilterDept] = useState<string | 'all'>('all');
    const [filterBatch, setFilterBatch] = useState<string | 'all'>('all');
    const [filterAdmissionType, setFilterAdmissionType] = useState<'all' | 'regular' | 'lateral_entry'>('all');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);

    useEffect(() => {
        loadFilterOptions();
    }, []);

    useEffect(() => {
        loadStudents(1);
    }, [searchQuery, filterStatus, filterDept, filterBatch, filterAdmissionType]);

    const loadFilterOptions = async () => {
        try {
            const collegeId = (user as any)?.college_id;
            if (collegeId) {
                const depts = await departmentService.getDepartments(collegeId);
                setDepartments(depts);
                const allBatches = await batchService.getBatches();
                setBatches(allBatches.filter(b => b.college === collegeId));
            }
        } catch (err) {
            console.error("Failed to load filter options", err);
        }
    };

    const loadStudents = async (page: number = currentPage) => {
        try {
            setLoading(true);
            const collegeId = (user as any)?.college_id;
            const params: any = {
                college: collegeId,
                page: page,
                search: searchQuery
            };

            if (filterStatus === 'active') params.is_detained = false;
            if (filterStatus === 'detained') params.is_detained = true;
            if (filterDept !== 'all') params.department = filterDept;
            if (filterBatch !== 'all') params.batch_name = filterBatch;
            if (filterAdmissionType !== 'all') params.admission_type = filterAdmissionType;

            const response = await studentService.getStudents(params);
            setStudents(response.results);
            setTotalCount(response.count);
            setCurrentPage(page);
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
            loadStudents(currentPage);
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

    const totalPages = Math.ceil(totalCount / 25);

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                        <PageHeader
                            title="Student Management"
                            subtitle="View and manage all students in your college"
                        />
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
                                    variant="outline"
                                    className="border-gray-200 text-gray-600 hover:bg-gray-50"
                                    onClick={() => setIsImportModalOpen(true)}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Import
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

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                            </div>
                        ) : students.length === 0 ? (
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

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
                                        <div className="flex flex-1 justify-between sm:hidden">
                                            <Button
                                                onClick={() => loadStudents(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                onClick={() => loadStudents(currentPage + 1)}
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
                                                        onClick={() => loadStudents(currentPage - 1)}
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
                                                                    onClick={() => loadStudents(page)}
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
                                                        onClick={() => loadStudents(currentPage + 1)}
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
                    </div>
                </div>
            </div>

            <StudentAddModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                onSuccess={loadStudents}
                student={selectedStudent}
            />
            <StudentBulkImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={loadStudents}
            />
        </div>
    );
};

export default StudentsScreen;
