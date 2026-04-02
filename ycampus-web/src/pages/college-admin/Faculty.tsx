import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Trash2, Pencil, Mail, User as UserIcon, Building2, Briefcase, GraduationCap, Users } from 'lucide-react';
import { AddFacultyDialogNew } from '@/components/college-admin/AddFacultyDialogNew';
import { BulkUploadFacultyDialog } from '@/components/college-admin/BulkUploadFacultyDialog';
import { EditFacultyDialog } from '@/components/college-admin/EditFacultyDialog';
import { Badge } from '@/components/ui/badge';
import { useDepartments } from '@/hooks/useDepartments';
import { facultyService, FacultyProfile } from '@/services/facultyService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Faculty = () => {
  const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { departments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editFaculty, setEditFaculty] = useState<FacultyProfile | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const facultyData = await facultyService.getFaculties();
      setFaculties(facultyData);

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('faculty_subject_mapping')
        .select(`
          id,
          faculty_id,
          course_id,
          department_id,
          semester,
          section,
          courses (name),
          departments (name)
        `)
        .eq('is_active', true);

      if (assignmentError) throw assignmentError;
      setAssignments(assignmentData || []);
    } catch (err) {
      console.error("Failed to load data", err);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await facultyService.deleteFaculty(id);
      toast.success("Faculty member removed");
      loadData();
    } catch (err) {
      toast.error("Failed to delete faculty member");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredFaculty = faculties.filter(f => {
    const fullName = `${f.user_details.first_name} ${f.user_details.last_name}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.user_details.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.designation && f.designation.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = departmentFilter === 'all' || 
      f.department === departmentFilter ||
      f.linked_departments?.some(id => id.toString() === departmentFilter);
    
    return matchesSearch && matchesDepartment;
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#FAFAFA]">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto space-y-8 pb-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-zinc-900 capitalize">Faculty Directory</h1>
                  <p className="text-zinc-500 text-sm font-medium mt-1">Manage academic staff, designations and teaching loads.</p>
                </div>
                <div className="flex items-center gap-3">
                  <BulkUploadFacultyDialog />
                  <AddFacultyDialogNew onSuccess={loadData} />
                </div>
              </div>

              <Card className="border-none shadow-xl shadow-zinc-200/50 rounded-3xl overflow-hidden ring-1 ring-zinc-100">
                <CardHeader className="bg-white border-b border-zinc-50 p-6">
                   <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                     <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input
                          placeholder="Search name, email or designation..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-11 pr-4 h-12 bg-zinc-50/50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-200 outline-none transition-all font-medium text-sm"
                        />
                     </div>
                     
                     <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Filter By</span>
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                          <SelectTrigger className="h-12 w-full md:w-[220px] bg-white border-zinc-100 rounded-2xl font-bold text-xs shadow-sm uppercase tracking-wider">
                            <SelectValue placeholder="All Departments" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                            <SelectItem value="all" className="font-bold text-xs uppercase tracking-wider">All Departments</SelectItem>
                            {departments?.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id.toString()} className="font-medium text-xs">
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="h-10 w-10 rounded-full border-4 border-zinc-100 border-t-zinc-900 animate-spin" />
                        <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">Loading Faculty Records...</p>
                    </div>
                  ) : filteredFaculty.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b-zinc-50 bg-zinc-50/30">
                            <TableHead className="py-5 pl-8 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400">Faculty Staff</TableHead>
                            <TableHead className="py-5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400 text-center">Departments</TableHead>
                            <TableHead className="py-5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400 text-center">Reporting To</TableHead>
                            <TableHead className="py-5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400">Teaching Load</TableHead>
                            <TableHead className="py-5 pr-8 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFaculty.map((f) => {
                            const facultyAssignments = assignments.filter(a => a.faculty_id === f.user);
                            
                            return (
                              <TableRow key={f.id} className="group border-b-zinc-50 hover:bg-zinc-50/20 transition-all">
                                <TableCell className="py-6 pl-8">
                                  <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-zinc-200 uppercase shrink-0">
                                      {f.user_details.first_name[0]}{f.user_details.last_name[0]}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-zinc-900 text-base tracking-tight capitalize truncate">
                                        {f.user_details.first_name} {f.user_details.last_name}
                                      </span>
                                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-bold mt-1 lowercase">
                                        <Mail className="h-3.5 w-3.5 text-zinc-300" />
                                        {f.user_details.email}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-black uppercase tracking-wider mt-1 opacity-60">
                                        <Briefcase className="h-3 w-3 text-zinc-300" />
                                        {f.designation || 'Academic Faculty'}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-6 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-zinc-900 text-white hover:bg-zinc-800 px-3 py-1 rounded-lg text-[10px] font-black border-none shadow-sm capitalize shrink-0">
                                                {f.department_name}
                                            </Badge>
                                        </div>
                                        {f.linked_departments_data && f.linked_departments_data.length > 0 && (
                                            <div className="flex flex-wrap gap-1 items-center justify-center max-w-[150px]">
                                                {f.linked_departments_data.map(dept => (
                                                    <Badge key={dept.id} variant="outline" className="border-zinc-100 bg-white text-zinc-500 px-2 py-0.5 rounded-md text-[9px] font-bold capitalize">
                                                        {dept.name.split(' ').map((w: string) => w[0].toUpperCase()).join('')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-6 text-center">
                                    <div className="flex flex-col items-center justify-center gap-1">
                                        <div className="h-8 w-8 rounded-full bg-zinc-50 flex items-center justify-center mb-1">
                                            <Users className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <span className="text-xs font-bold text-zinc-900 capitalize leading-none">—</span>
                                        <span className="text-[9px] text-zinc-400 font-black tracking-widest uppercase opacity-60">Manager</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-6">
                                  <div className="space-y-3 min-w-[280px]">
                                    {facultyAssignments.length > 0 ? (
                                      facultyAssignments.map((assignment, idx) => {
                                        const deptShortcut = assignment.departments?.name
                                          .split(' ')
                                          .map((word: string) => word.charAt(0).toUpperCase())
                                          .join('');
                                        
                                        return (
                                          <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-zinc-50 rounded-xl shadow-sm hover:border-zinc-200 transition-all">
                                            <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0">
                                                <GraduationCap className="h-4 w-4 text-zinc-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <span className="text-xs font-bold text-zinc-900 block truncate">
                                                {assignment.courses?.name}
                                              </span>
                                              <div className="flex items-center gap-1.5 mt-1">
                                                <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-none px-1.5 py-0 rounded text-[9px] font-black uppercase">
                                                  {deptShortcut}
                                                </Badge>
                                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Sem {assignment.semester}</span>
                                                <Badge variant="outline" className="border-zinc-100 text-zinc-400 px-1 py-0 rounded text-[9px] font-medium uppercase">
                                                  Sec {assignment.section || 'N/A'}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="flex items-center gap-2 text-zinc-300 italic py-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
                                        <span className="text-xs font-medium">Clear Load</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-6 pr-8 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => setEditFaculty(f)}
                                      className="h-10 w-10 rounded-xl border-zinc-100 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white transition-all shadow-sm"
                                      title="Edit Profile"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => setDeleteId(f.id)}
                                      className="h-10 w-10 rounded-xl border-zinc-100 hover:border-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                      title="Remove Member"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-zinc-50/10">
                        <div className="h-16 w-16 rounded-[2rem] bg-white border border-zinc-100 flex items-center justify-center text-zinc-200 mb-4 shadow-sm">
                          <UserIcon className="h-8 w-8" />
                        </div>
                        <p className="text-zinc-900 font-black text-xl">No Faculty Found</p>
                        <p className="text-zinc-400 max-w-[280px] text-center mt-2 text-sm font-medium leading-relaxed">
                            {searchTerm || departmentFilter !== 'all' 
                                ? "We couldn't find any faculty members matching your current filters."
                                : "Start building your academic team by onboarding your first faculty member."}
                        </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-none p-8 max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Remove Faculty?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 font-medium leading-relaxed">
              This action is permanent. It will delete the faculty profile and revoke all system access for <span className="font-bold text-zinc-900">
                {faculties.find(f => f.id === deleteId)?.user_details.first_name} {faculties.find(f => f.id === deleteId)?.user_details.last_name}
              </span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 border-zinc-100 rounded-2xl font-bold text-xs uppercase tracking-widest px-8 shadow-none hover:bg-zinc-50">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleDelete(deleteId)}
              className="h-12 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest px-10 shadow-lg shadow-red-100 border-none"
            >
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditFacultyDialog
        open={!!editFaculty}
        onOpenChange={(open) => !open && setEditFaculty(null)}
        facultyData={editFaculty}
        onSuccess={loadData}
      />
    </SidebarProvider>
  );
};

export default Faculty;
