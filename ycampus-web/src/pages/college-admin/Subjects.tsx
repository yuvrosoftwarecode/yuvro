import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Trash2, Edit, Plus, AlertCircle, FilterX } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddSubjectDialog } from '@/components/college-admin/AddSubjectDialog';
import { EditSubjectDialog } from '@/components/college-admin/EditSubjectDialog';
import { departmentService, Department } from '@/services/departmentService';
import subjectService, { CollegeSubject } from '@/services/subjectService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Subjects = () => {
  const { user: currentUser } = useAuth();
  const [subjects, setSubjects] = useState<CollegeSubject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<CollegeSubject | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const collegeId = (currentUser as any)?.college_id;
      if (!collegeId || collegeId === 'undefined') {
        setLoading(false);
        return;
      }

      // Fetch Departments for filter
      const depts = await departmentService.getDepartments(collegeId);
      setDepartments(depts);

      // Fetch College Subjects
      const collegeSubs = await subjectService.fetchCollegeSubjects(collegeId);
      setSubjects(collegeSubs);
    } catch (err) {
      console.error("Failed to load initial data", err);
      toast.error("Failed to load subjects list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await subjectService.removeSubjectFromCollege(deleteId);
      toast.success("Subject unassigned successfully");
      fetchInitialData();
    } catch (err) {
      console.error("Failed to unassign subject", err);
      toast.error("Failed to unassign subject");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const subject = s.subject_details;
    if (!subject) return false;

    const matchesSearch = 
      subject.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.subject_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.short_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // In CollegeSubject, we don't have direct department_id sometimes, 
    // but we can check subject_details.
    // For now, if your backend doesn't link Subject to Department directly in basic serializer, 
    // we might need more info. 
    // Following existing logic which might match by some field if available.
    return matchesSearch;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDepartment('all');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Subject Management</h1>
                
            </div>

            <Card className="border shadow-sm bg-white rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>All Subjects</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="mb-6 space-y-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 max-w-sm relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 border-muted-foreground/20 focus-visible:ring-black"
                        />
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-muted-foreground/10 overflow-hidden shadow-sm bg-white">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[60px] text-center text-muted-foreground text-[11px] uppercase tracking-wider font-bold">Sl. No</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Subject Name</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Subject Code</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Assigned On</TableHead>
                        <TableHead className="text-right pr-4 text-[11px] uppercase tracking-wider font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={5} className="py-4">
                              <div className="h-4 bg-muted animate-pulse rounded"></div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredSubjects.length > 0 ? (
                        filteredSubjects.map((s, index) => (
                          <TableRow key={s.id} className="group hover:bg-muted/20 transition-colors">
                            <TableCell className="text-center font-medium text-muted-foreground text-xs">
                                {(index + 1).toString().padStart(2, '0')}
                            </TableCell>
                            <TableCell className="py-3">
                                <div className="font-bold text-sm text-foreground">
                                    {s.subject_details?.subject_name}
                                </div>
                            </TableCell>
                            <TableCell>
                                <code className="text-[11px] bg-muted/50 px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter text-foreground">
                                    {s.subject_code || s.subject_details?.short_code}
                                </code>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex justify-end gap-1 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                  onClick={() => setEditSubject(s)}
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
                          <TableCell colSpan={5} className="h-40 text-center text-muted-foreground text-sm">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                                <p>No subjects found matching your criteria.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <EditSubjectDialog 
        collegeSubject={editSubject} 
        open={!!editSubject} 
        onOpenChange={(open) => !open && setEditSubject(null)} 
        onSuccess={fetchInitialData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Unassign Subject?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will remove this subject from your college. It will not delete the global subject record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 border-gray-100">Keep Assignment</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Subjects;