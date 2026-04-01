import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Trash2, Pencil, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSubjects, Subject } from '@/hooks/useSubjects';
import { useDepartments } from '@/hooks/useDepartments';
import { AddSubjectDialog } from '@/components/college-admin/AddSubjectDialog';
import { EditSubjectDialog } from '@/components/college-admin/EditSubjectDialog';

const Subjects = () => {
  const { subjects, isLoading, deleteSubject } = useSubjects();
  const { departments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  const getDepartmentName = (departmentId: string) => {
    const dept = departments?.find(d => d.id === departmentId);
    return dept?.name || '-';
  };

  const getDepartmentCode = (departmentId: string) => {
    const dept = departments?.find(d => d.id === departmentId);
    if (!dept) return '-';
    return dept.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  };

  const filteredSubjects = subjects?.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || 
      s.department_id === departmentFilter;
    
    const matchesSemester = semesterFilter === 'all' || 
      s.semester?.toString() === semesterFilter;
    
    return matchesSearch && matchesDepartment && matchesSemester;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
          
          <main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Subject Management</h1>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Subjects</CardTitle>
                <AddSubjectDialog />
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by Department" />
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
                  <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Semester" />
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
                </div>

                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filteredSubjects && filteredSubjects.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubjects.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{subject.code}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getDepartmentCode(subject.department_id)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {subject.semester ? `Sem ${subject.semester}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditSubject(subject)}
                                title="Edit Subject"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(subject.id)}
                                title="Delete Subject"
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
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subjects found</p>
                    <p className="text-sm">Add a new subject to get started</p>
                  </div>
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
              This will permanently delete this subject. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteId) deleteSubject(deleteId);
              setDeleteId(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSubjectDialog
        open={!!editSubject}
        onOpenChange={(open) => !open && setEditSubject(null)}
        subject={editSubject}
      />
    </SidebarProvider>
  );
};

export default Subjects;