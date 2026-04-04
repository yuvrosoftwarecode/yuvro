import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Trash2, Edit, RefreshCw, Plus, FilterX, AlertCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddStudentDialog } from '@/components/college-admin/AddStudentDialog';
import { EditStudentDialog } from '@/components/college-admin/EditStudentDialog';
import { BulkUploadDialog } from '@/components/college-admin/BulkUploadDialog';
import { BulkChangeDialog } from '@/components/college-admin/BulkChangeDialog';
import { studentService, Student } from '@/services/studentService';
import { departmentService, Department } from '@/services/departmentService';
import { batchService, Batch } from '@/services/batchService';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const Students = () => {
  const { user: currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkChange, setShowBulkChange] = useState(false);
  
  // Filters
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterBatchId, setFilterBatchId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Pagination
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    currentPage: 1,
    pageSize: 20,
    totalPages: 1
  });

  const fetchInitialData = async () => {
    try {
      const collegeId = (currentUser as any)?.college_id;
      if (collegeId && collegeId !== 'undefined') {
        const depts = await departmentService.getDepartments(collegeId);
        setDepartments(depts);
        const bts = await batchService.getBatches();
        setBatches(bts.filter(b => b.college === collegeId));
      }
    } catch (err) {
      console.error("Failed to load initial data", err);
    }
  };

  const fetchStudents = async (page: number = pagination.currentPage) => {
    try {
      setLoading(true);
      const collegeId = (currentUser as any)?.college_id;
      if (!collegeId || collegeId === 'undefined') {
        setLoading(false);
        return;
      }

      const params: any = {
        page,
        page_size: pagination.pageSize,
        college: collegeId
      };

      if (searchTerm) params.search = searchTerm;
      if (filterDepartment && filterDepartment !== 'all') params.department = filterDepartment;
      if (filterBatchId && filterBatchId !== 'all') params.batch__name = filterBatchId;
      if (filterSemester && filterSemester !== 'all') params.semester__number = filterSemester;
      if (filterSection && filterSection !== 'all') params.section__name = filterSection;
      
      if (filterStatus === 'detained') params.is_detained = true;
      if (filterStatus === 'active') params.is_detained = false;

      const response = await studentService.getStudents(params);
      setStudents(response.results);
      setPagination(prev => ({
        ...prev,
        count: response.count,
        next: response.next,
        previous: response.previous,
        currentPage: page,
        totalPages: Math.ceil(response.count / prev.pageSize)
      }));
    } catch (err) {
      console.error("Failed to fetch students", err);
      toast.error("Failed to load students list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (currentUser) fetchStudents(1);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterDepartment, filterBatchId, filterSemester, filterStatus]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await studentService.deleteStudent(deleteId);
      toast.success("Student deleted successfully");
      fetchStudents(pagination.currentPage);
    } catch (err) {
      console.error("Failed to delete student", err);
      toast.error("Failed to delete student");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(students.map(s => s.id.toString()));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDepartment('');
    setFilterBatchId('');
    setFilterSemester('');
    setFilterSection('');
    setFilterStatus('all');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Students Management</h1>
            
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold text-foreground">All Students</CardTitle>
                <div className="flex gap-2">
                  <BulkUploadDialog />
                  <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 h-10 px-4 bg-black text-white hover:bg-black/90">
                    <Plus className="h-4 w-4" />
                    Add Student
                  </Button>
                  <AddStudentDialog 
                    open={isAddDialogOpen} 
                    onOpenChange={setIsAddDialogOpen}
                    onSuccess={() => fetchStudents(1)} 
                  />
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="mb-6 space-y-4">
                  <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, roll no, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 border-muted-foreground/20 focus-visible:ring-black"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap items-center">
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="w-[180px] h-10 border-muted-foreground/20">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterSemester} onValueChange={setFilterSemester}>
                      <SelectTrigger className="w-[150px] h-10 border-muted-foreground/20">
                        <SelectValue placeholder="All Semesters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <SelectItem key={sem} value={sem.toString()}>
                            Semester {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterBatchId} onValueChange={setFilterBatchId}>
                      <SelectTrigger className="w-[180px] h-10 border-muted-foreground/20">
                        <SelectValue placeholder="All Batch IDs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batch IDs</SelectItem>
                        {Array.from(new Set(batches.map(b => b.name))).sort().map((batchName) => (
                          <SelectItem key={batchName} value={batchName}>
                            {batchName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[130px] h-10 border-muted-foreground/20">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="detained">Detained</SelectItem>
                        </SelectContent>
                    </Select>

                    {(searchTerm || filterDepartment || filterBatchId || filterSemester || filterStatus !== 'all') && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 text-muted-foreground hover:text-foreground">
                            <FilterX className="h-4 w-4 mr-2" />
                            Clear Filters
                        </Button>
                    )}
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md animate-in fade-in slide-in-from-top-1 duration-200">
                      <span className="text-sm font-medium">
                        {selectedIds.length} student(s) selected
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowBulkChange(true)}
                        className="h-8 border-muted-foreground/20 hover:bg-background"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Bulk Change
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-muted-foreground/10 overflow-hidden shadow-sm bg-white">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[50px] pl-4">
                          <Checkbox
                            checked={students.length > 0 && selectedIds.length === students.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-[60px] text-center text-muted-foreground text-[11px] uppercase tracking-wider font-bold">Sl. No</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Student Name</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Email Address</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Roll Number</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Batch ID</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Department</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Section</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Status</TableHead>
                        <TableHead className="text-right pr-4 text-[11px] uppercase tracking-wider font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell className="pl-4"><div className="h-4 w-4 bg-muted animate-pulse rounded"></div></TableCell>
                            {Array.from({ length: 9 }).map((_, j) => (
                              <TableCell key={j} className={j === 8 ? "pr-4" : ""}><div className="h-4 bg-muted animate-pulse rounded"></div></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : students.length > 0 ? (
                        students.map((s, index) => (
                          <TableRow key={s.id} className="group hover:bg-muted/20 transition-colors">
                            <TableCell className="pl-4">
                                <Checkbox
                                    checked={selectedIds.includes(s.id.toString())}
                                    onCheckedChange={(checked) => handleSelectOne(s.id.toString(), checked as boolean)}
                                />
                            </TableCell>
                            <TableCell className="text-center font-medium text-muted-foreground text-xs">
                                {(pagination.currentPage - 1) * pagination.pageSize + index + 1}
                            </TableCell>
                            <TableCell className="py-3">
                                <div className="font-medium">
                                    {s.user_details.first_name} {s.user_details.last_name}
                                </div>
                              </TableCell>
                            <TableCell>{s.user_details.email}</TableCell>
                            <TableCell>
                                <code className="text-[11px] bg-muted/50 px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter text-foreground">
                                    {s.roll_number}
                                </code>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-foreground">{s.batch_name || 'N/A'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={s.department_name}>
                                {s.department_name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs">{s.section_name ? s.section_name.replace('Section ', '') : 'N/A'}</TableCell>
                            <TableCell>
                                {s.is_detained ? (
                                    <Badge variant="destructive" className="text-[9px] uppercase font-bold px-1.5 py-0 flex items-center gap-1 w-fit bg-red-50 text-red-700 border-red-100">
                                        <AlertCircle className="h-3 w-3" />
                                        Detained
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 border-emerald-100 text-emerald-700 bg-emerald-50">
                                        Active
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex justify-end gap-1 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                  onClick={() => setEditStudent(s)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50"
                                  onClick={() => setDeleteId(s.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={10} className="h-40 text-center text-muted-foreground text-sm">
                            No students found matching your criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <div>
                      Showing <span className="font-medium text-foreground">{((pagination.currentPage - 1) * pagination.pageSize) + 1}</span> to <span className="font-medium text-foreground">{Math.min(pagination.currentPage * pagination.pageSize, pagination.count)}</span> of <span className="font-medium text-foreground">{pagination.count}</span> results
                    </div>
                    <div className="flex items-center space-x-2">
                        <select
                            value={pagination.pageSize}
                            onChange={(e) => {
                                setPagination(prev => ({ ...prev, pageSize: parseInt(e.target.value), currentPage: 1 }));
                                fetchStudents(1);
                            }}
                            className="border rounded px-2 py-1 bg-transparent text-foreground h-8 focus:outline-none focus:ring-1 focus:ring-primary border-muted-foreground/20"
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </select>
                        <div className="flex items-center gap-1 border border-muted-foreground/20 rounded-md bg-white">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-none rounded-l border-r border-muted-foreground/10 px-3 hover:bg-muted"
                                onClick={() => fetchStudents(pagination.currentPage - 1)}
                                disabled={!pagination.previous}
                            >
                                Prev
                            </Button>
                            <div className="px-4 font-medium text-foreground">
                                {pagination.currentPage} / {pagination.totalPages}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-none rounded-r border-l border-muted-foreground/10 px-3 hover:bg-muted"
                                onClick={() => fetchStudents(pagination.currentPage + 1)}
                                disabled={!pagination.next}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete Student Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action will permanently remove this student account and profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 border-gray-100">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditStudentDialog 
        student={editStudent} 
        open={!!editStudent} 
        onOpenChange={(open) => !open && setEditStudent(null)} 
        onSuccess={() => fetchStudents(pagination.currentPage)}
      />

      <BulkChangeDialog
        selectedStudentIds={selectedIds}
        open={showBulkChange}
        onOpenChange={setShowBulkChange}
        onSuccess={() => {
            setSelectedIds([]);
            fetchStudents(pagination.currentPage);
        }}
      />
    </SidebarProvider>
  );
};

export default Students;
