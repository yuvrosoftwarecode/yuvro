import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Trash2, Edit, RefreshCw } from 'lucide-react';
import { useProfiles, Profile } from '@/hooks/useProfiles';
import { useDepartments } from '@/hooks/useDepartments';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddStudentDialog } from '@/components/college-admin/AddStudentDialog';
import { EditStudentDialog } from '@/components/college-admin/EditStudentDialog';
import { BulkUploadDialog } from '@/components/college-admin/BulkUploadDialog';
import { BulkChangeDialog } from '@/components/college-admin/BulkChangeDialog';

const Students = () => {
  const { profiles: students, isLoading, deleteProfile } = useProfiles('student');
  const { departments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<Profile | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkChange, setShowBulkChange] = useState(false);
  
  // Filters
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterBatchId, setFilterBatchId] = useState('');

  // Get unique batch IDs from students
  const uniqueBatchIds = [...new Set(students?.map(s => s.batch_id).filter(Boolean) || [])];

  const filteredStudents = students?.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || s.department_id === filterDepartment;
    const matchesSemester = !filterSemester || s.semester === filterSemester;
    const matchesSection = !filterSection || s.section === filterSection;
    const matchesBatchId = !filterBatchId || s.batch_id === filterBatchId;
    
    return matchesSearch && matchesDepartment && matchesSemester && matchesSection && matchesBatchId;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredStudents?.map(s => s.id) || []);
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

  const getDepartmentName = (deptId?: string) => {
    return departments?.find(d => d.id === deptId)?.name || 'N/A';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Students Management</h1>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Students</CardTitle>
                <div className="flex gap-2">
                  <BulkUploadDialog />
                  <AddStudentDialog />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Select value={filterDepartment} onValueChange={(value) => setFilterDepartment(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments?.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterSemester} onValueChange={(value) => setFilterSemester(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-[200px]">
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

                    <Select value={filterSection} onValueChange={(value) => setFilterSection(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {['A', 'B', 'C', 'D'].map((sec) => (
                          <SelectItem key={sec} value={sec}>
                            Section {sec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterBatchId} onValueChange={(value) => setFilterBatchId(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Batch IDs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batch IDs</SelectItem>
                        {uniqueBatchIds.map((batchId) => (
                          <SelectItem key={batchId} value={batchId as string}>
                            {batchId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">
                        {selectedIds.length} student(s) selected
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowBulkChange(true)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Change
                      </Button>
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filteredStudents && filteredStudents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedIds.length === filteredStudents.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Assigned Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(s.id)}
                              onCheckedChange={(checked) => handleSelectOne(s.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell>{s.email}</TableCell>
                          <TableCell>{s.batch_id || 'N/A'}</TableCell>
                          <TableCell>{getDepartmentName(s.department_id)}</TableCell>
                          <TableCell>{s.semester ? `Semester ${s.semester}` : 'N/A'}</TableCell>
                          <TableCell>{s.section ? `Section ${s.section}` : 'N/A'}</TableCell>
                          <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditStudent(s)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(s.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No students found</p>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteId) deleteProfile(deleteId);
              setDeleteId(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditStudentDialog 
        student={editStudent} 
        open={!!editStudent} 
        onOpenChange={(open) => !open && setEditStudent(null)} 
      />

      <BulkChangeDialog
        selectedStudentIds={selectedIds}
        open={showBulkChange}
        onOpenChange={setShowBulkChange}
        onSuccess={() => setSelectedIds([])}
      />
    </SidebarProvider>
  );
};

export default Students;
