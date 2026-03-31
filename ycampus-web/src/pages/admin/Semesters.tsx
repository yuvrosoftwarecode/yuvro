import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Calendar, BookOpen } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface SemesterRow {
  id: string;
  department_id: string;
  number: number;
  created_at: string;
  department_name?: string;
  department_code?: string;
  sections_count: number;
}

const Semesters = () => {
  const { departments } = useDepartments();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [form, setForm] = useState({ department_id: '', number: '' });

  const { data: semesters, isLoading } = useQuery({
    queryKey: ['admin-semesters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_semesters')
        .select(`
          id,
          department_id,
          number,
          created_at,
          department_sections (id)
        `)
        .order('number');
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        department_id: s.department_id,
        number: s.number,
        created_at: s.created_at,
        sections_count: s.department_sections?.length || 0,
      }));
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { department_id: string; number: number }) => {
      const { error } = await supabase.from('department_semesters').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-semesters'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Semester added successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('department_semesters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-semesters'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Semester deleted successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department_id || !form.number) return;
    addMutation.mutate({ department_id: form.department_id, number: parseInt(form.number) });
    setDialogOpen(false);
    setForm({ department_id: '', number: '' });
  };

  const getDeptInfo = (deptId: string) => departments?.find(d => d.id === deptId);

  const filtered = semesters?.filter(s => filterDept === 'all' || s.department_id === filterDept) || [];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">

          <main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Semester Management</h1>
            <div className="mb-6 flex items-center gap-4">
              <div className="w-64">
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments?.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary">{filtered.length} semester{filtered.length !== 1 ? 's' : ''}</Badge>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">Loading semesters...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.length > 0 ? filtered.map((sem) => {
                  const dept = getDeptInfo(sem.department_id);
                  return (
                    <Card key={sem.id} className="overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5 text-white">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-80 mb-1">
                          <Calendar className="h-3.5 w-3.5" /> {dept?.name || 'Unknown Dept'}
                        </div>
                        <h3 className="font-bold text-lg">Semester {sem.number}</h3>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-black/20 rounded text-xs font-semibold">
                          {dept?.code || '—'}
                        </span>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <BookOpen className="h-4 w-4" />
                          {sem.sections_count} Section{sem.sections_count !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <Button size="sm" variant="default" className="bg-foreground text-background hover:bg-foreground/90 text-xs">
                            Manage
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(sem.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }) : (
                  <p className="text-muted-foreground col-span-full">No semesters found. Click "Add Semester" to create one.</p>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Semester</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {departments?.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester Number *</Label>
              <Select value={form.number} onValueChange={v => setForm({ ...form, number: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <SelectItem key={n} value={n.toString()}>Semester {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Adding...' : 'Add Semester'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Semester?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the semester and its sections.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Semesters;
