import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { DepartmentForm } from '@/components/college-admin/DepartmentForm';

const Departments = () => {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = (data: Omit<Department, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingDept) {
      updateDepartment({ id: editingDept.id, updates: data });
    } else {
      createDepartment(data);
    }
    setDialogOpen(false);
    setEditingDept(null);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteDepartment(id);
    setDeleteId(null);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Departments</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel - Form */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingDept ? 'Edit Department' : 'Add New Department'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DepartmentForm 
                    onSubmit={handleSubmit}
                    initialData={editingDept || undefined}
                  />
                  {editingDept && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => setEditingDept(null)}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Right Panel - Data List */}
              <Card>
                <CardHeader>
                  <CardTitle>Departments List</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : departments && departments.length > 0 ? (
                    <div className="space-y-4">
                      {departments.map((dept) => (
                        <Card key={dept.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base">{dept.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">Code: {dept.code}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(dept)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteId(dept.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm mb-2">
                              <strong>Semesters:</strong> {dept.semesters.length}
                            </p>
                            <div className="space-y-1">
                              {dept.semesters.map((sem) => (
                                <div key={sem.id} className="text-sm">
                                  <span className="font-medium">Sem {sem.number}:</span>{' '}
                                  {sem.sections.length > 0 
                                    ? sem.sections.map(s => s.name).join(', ')
                                    : 'No sections'
                                  }
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No departments found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Departments;
