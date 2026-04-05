import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Trash2, Pencil } from 'lucide-react';
import { facultyService, FacultyProfile } from '@/services/facultyService';
import { AddFacultyDialogNew } from '@/components/college-admin/AddFacultyDialogNew';
import { BulkUploadFacultyDialog } from '@/components/college-admin/BulkUploadFacultyDialog';
import { EditFacultyDialog } from '@/components/college-admin/EditFacultyDialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';
import { toast } from 'sonner';

const Faculty = () => {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { departments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editFaculty, setEditFaculty] = useState<FacultyProfile | null>(null);

  useEffect(() => {
    loadFaculties();
  }, []);

  const loadFaculties = async () => {
    try {
      setIsLoading(true);
      const collegeId = (user as any)?.college_id;
      const data = await facultyService.getFaculties(collegeId);
      setFaculties(data);
    } catch (err) {
      console.error("Failed to load faculties", err);
      toast.error("Failed to load faculties");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await facultyService.deleteFaculty(deleteId);
      toast.success("Faculty member removed successfully");
      loadFaculties();
    } catch (err) {
      console.error("Failed to delete faculty", err);
      toast.error("Failed to remove faculty member");
    } finally {
      setDeleteId(null);
    }
  };

  const getDeptShortcut = (name: string) => {
    if (!name) return '-';
    // Handle cases like "Computer Science and Engineering" -> "CSE"
    // Remove "and", "&", "of" etc if needed, but simple split/map is fine for starters
    return name
      .split(' ')
      .filter(word => !['and', '&', 'of', 'the'].includes(word.toLowerCase()))
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  };

  const filteredFaculty = faculties?.filter(f => {
    const fullName = `${f.user_details.first_name} ${f.user_details.last_name}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.user_details.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || 
      f.department.toString() === departmentFilter ||
      f.linked_departments.some(id => id.toString() === departmentFilter);
    
    return matchesSearch && matchesDepartment;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Faculty Management</h1>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Faculty Directory</CardTitle>
                <div className="flex gap-2">
                  <AddFacultyDialogNew onSuccess={loadFaculties} />
                  <BulkUploadFacultyDialog />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
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
                </div>

                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filteredFaculty && filteredFaculty.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>PD</TableHead>
                        <TableHead>ADs</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFaculty.map((f) => (
                        <TableRow key={f.id} className="group">
                          <TableCell className="font-medium">
                            {f.user_details.first_name} {f.user_details.last_name}
                          </TableCell>
                          <TableCell>{f.user_details.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 uppercase text-[10px] font-bold">
                                {getDeptShortcut(f.department_name)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {f.linked_departments_data && f.linked_departments_data.length > 0 ? (
                                f.linked_departments_data.map((dept, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] uppercase font-medium">
                                    {getDeptShortcut(dept.name)}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-xs italic">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{f.designation || 'Faculty'}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Academic Staff</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditFaculty(f)}
                                title="Edit Faculty"
                                className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(f.id)}
                                title="Delete Faculty"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No faculty found</p>
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
              This will permanently delete this faculty member and all their assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditFacultyDialog
        open={!!editFaculty}
        onOpenChange={(open) => !open && setEditFaculty(null)}
        faculty={editFaculty}
        onSuccess={loadFaculties}
      />
    </SidebarProvider>
  );
};

export default Faculty;
