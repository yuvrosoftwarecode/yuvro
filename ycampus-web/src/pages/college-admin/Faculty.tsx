import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Trash2, Pencil } from 'lucide-react';
import { useProfiles } from '@/hooks/useProfiles';
import { AddFacultyDialogNew } from '@/components/college-admin/AddFacultyDialogNew';
import { BulkUploadFacultyDialog } from '@/components/college-admin/BulkUploadFacultyDialog';
import { EditFacultyDialog } from '@/components/college-admin/EditFacultyDialog';
import { Badge } from '@/components/ui/badge';
import { useFacultyAssignments } from '@/hooks/useFacultyAssignments';
import { useDepartments } from '@/hooks/useDepartments';

const Faculty = () => {
  const { deleteProfile } = useProfiles('faculty');
  const { facultyWithAssignments, isLoading } = useFacultyAssignments();
  const { departments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editFaculty, setEditFaculty] = useState<any>(null);

  const filteredFaculty = facultyWithAssignments?.filter(f => {
    const matchesSearch = f.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || 
      f.department_ids.includes(departmentFilter);
    
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
                <CardTitle>Faculty Members</CardTitle>
                <div className="flex gap-2">
                  <AddFacultyDialogNew />
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
                        <TableHead>Department</TableHead>
                        <TableHead>Reporting Manager</TableHead>
                        <TableHead>Classes Assigned</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFaculty.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.full_name}</TableCell>
                          <TableCell>{f.email}</TableCell>
                          <TableCell>
                            {f.department_ids.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Array.from(new Set(f.assignments.map(a => a.department_name))).map((deptName, idx) => {
                                  // Create department shortcut
                                  const shortcut = deptName
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase())
                                    .join('');
                                  return (
                                    <Badge key={idx} variant="outline" className="text-xs font-medium">
                                      {shortcut}
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {f.reporting_to ? (
                              <span className="text-sm">{f.reporting_to}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {f.assignments.length > 0 ? (
                                f.assignments.map((assignment, idx) => {
                                  // Create department shortcut
                                  const deptShortcut = assignment.department_name
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase())
                                    .join('');
                                  
                                  return (
                                    <div key={idx} className="flex items-center gap-2 py-1">
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium block truncate">
                                          {assignment.course_name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <Badge variant="secondary" className="text-xs">
                                          {deptShortcut}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          Sem {assignment.semester}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {assignment.section || 'N/A'}
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="text-muted-foreground text-sm">No assignments</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditFaculty({
                                  id: f.id,
                                  full_name: f.full_name,
                                  email: f.email,
                                  department_id: f.department_ids[0] || '',
                                  reporting_to: f.reporting_to || '',
                                  assignments: f.assignments.reduce((acc: any[], curr) => {
                                    const existing = acc.find(a => 
                                      a.course_id === curr.course_id && 
                                      a.department_id === curr.department_id && 
                                      a.semester === curr.semester
                                    );
                                    if (existing && curr.section) {
                                      existing.sections.push(curr.section);
                                    } else if (curr.section) {
                                      acc.push({
                                        course_id: curr.course_id,
                                        course_name: curr.course_name,
                                        department_id: curr.department_id,
                                        department_name: curr.department_name,
                                        semester: curr.semester,
                                        sections: [curr.section]
                                      });
                                    }
                                    return acc;
                                  }, [])
                                })}
                                title="Edit Faculty"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(f.id)}
                                title="Delete Faculty"
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
            <AlertDialogAction onClick={() => {
              if (deleteId) deleteProfile(deleteId);
              setDeleteId(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditFacultyDialog
        open={!!editFaculty}
        onOpenChange={(open) => !open && setEditFaculty(null)}
        facultyData={editFaculty}
      />
    </SidebarProvider>
  );
};

export default Faculty;
