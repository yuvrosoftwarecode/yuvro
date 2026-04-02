import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Building } from 'lucide-react';
import { useDepartments, Department } from '@/hooks/useDepartments';

const Departments = () => {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const openAdd = () => {
    setEditingDept(null);
    setForm({ name: '', code: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return;
    if (editingDept) {
      updateDepartment({ id: editingDept.id, updates: { ...editingDept, ...form, semesters: editingDept.semesters } });
    } else {
      createDepartment({ name: form.name, code: form.code, description: form.description || undefined });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteDepartment(id);
    setDeleteId(null);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">

          <main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Department Management</h1>
            {isLoading ? (
              <p className="text-muted-foreground">Loading departments...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments && departments.length > 0 ? departments.map((dept) => (
                  <Card key={dept.id} className="overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5 text-white">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-80 mb-1">
                        <Building className="h-3.5 w-3.5" /> Department
                      </div>
                      <h3 className="font-bold text-lg leading-tight">{dept.name}</h3>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-black/20 rounded text-xs font-semibold">{dept.code}</span>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        {dept.semesters.length} Semester{dept.semesters.length !== 1 ? 's' : ''}
                      </p>
                      {dept.semesters.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {dept.semesters.map(sem => (
                            <span key={sem.id} className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium">
                              Sem {sem.number} ({sem.sections.length}s)
                            </span>
                          ))}
                        </div>
                      )}
                      {dept.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{dept.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <Button size="sm" variant="default" className="bg-foreground text-background hover:bg-foreground/90 text-xs">
                          Manage
                        </Button>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(dept)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(dept.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <p className="text-muted-foreground col-span-full">No departments found. Click "Add New Department" to create one.</p>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Department Code *</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingDept ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this department and all associated data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Departments;
