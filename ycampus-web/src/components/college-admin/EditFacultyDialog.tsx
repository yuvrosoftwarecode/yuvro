import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { X, Shield, BookOpen, Building2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { facultyService, FacultyProfile } from '@/services/facultyService';

interface ClassAssignment {
  id?: string;
  course_id: string;
  course_name: string;
  department_id: string;
  department_name: string;
  semester: number;
  sections: string[];
}

interface EditFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facultyData: FacultyProfile | null;
  onSuccess?: () => void;
}

export function EditFacultyDialog({ open, onOpenChange, facultyData, onSuccess }: EditFacultyDialogProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { departments } = useDepartments();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    designation: '',
    department_id: '',
    linked_departments: [] as string[],
    reporting_to: ''
  });

  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState({
    course_id: '',
    department_id: '',
    semester: '',
    sections: [] as string[]
  });

  const [courses, setCourses] = useState<any[]>([]);

  // Load faculty data when dialog opens
  useEffect(() => {
    if (open && facultyData) {
      setFormData({
        first_name: facultyData.user_details.first_name,
        last_name: facultyData.user_details.last_name,
        username: facultyData.user_details.username,
        email: facultyData.user_details.email,
        designation: facultyData.designation || '',
        department_id: facultyData.department || '',
        linked_departments: facultyData.linked_departments || [],
        reporting_to: '' // Needs to be fetched separately if needed
      });
      
      // Fetch assignments from Supabase
      loadExistingAssignments(facultyData.user);
      setStep(1);
    }
  }, [open, facultyData]);

  const loadExistingAssignments = async (userId: string) => {
    const { data, error } = await supabase
      .from('faculty_subject_mapping')
      .select(`
        id,
        course_id,
        department_id,
        semester,
        section,
        courses (name),
        departments (name)
      `)
      .eq('faculty_id', userId)
      .eq('is_active', true);

    if (!error && data) {
      // Group by course/dept/sem
      const grouped: ClassAssignment[] = [];
      data.forEach((item: any) => {
        const existing = grouped.find(g => 
          g.course_id === item.course_id && 
          g.department_id === item.department_id && 
          g.semester === item.semester
        );
        if (existing) {
          existing.sections.push(item.section);
        } else {
          grouped.push({
            id: item.id,
            course_id: item.course_id,
            course_name: item.courses?.name || 'Unknown Course',
            department_id: item.department_id,
            department_name: item.departments?.name || 'Unknown Dept',
            semester: item.semester,
            sections: [item.section]
          });
        }
      });
      setAssignments(grouped);
    }
  };

  const loadCourses = async (deptId: string, semester: string) => {
    if (!deptId || !semester) return;
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('department_id', deptId)
      .eq('semester', parseInt(semester));

    if (!error && data) setCourses(data);
    else setCourses([]);
  };

  const handleAddAssignment = () => {
    if (!currentAssignment.course_id || !currentAssignment.department_id || 
        !currentAssignment.semester || currentAssignment.sections.length === 0) {
      toast.error('Please fill all assignment fields');
      return;
    }

    const course = courses.find(c => c.id === currentAssignment.course_id);
    const dept = departments?.find(d => d.id === currentAssignment.department_id);

    if (course && dept) {
      setAssignments([...assignments, {
        course_id: currentAssignment.course_id,
        course_name: course.name,
        department_id: currentAssignment.department_id,
        department_name: dept.name,
        semester: parseInt(currentAssignment.semester),
        sections: currentAssignment.sections
      }]);

      setCurrentAssignment({ course_id: '', department_id: '', semester: '', sections: [] });
      setCourses([]);
    }
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!facultyData) return;
    setLoading(true);

    try {
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.department_id) {
        throw new Error('Please fill in all required fields');
      }

      // 1. Update Profile via REST Service
      await facultyService.updateFaculty(facultyData.id, {
        user: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          username: formData.username || formData.email
        },
        college: user?.college_id || '1',
        department: formData.department_id,
        linked_departments: formData.linked_departments,
        designation: formData.designation
      });

      // 2. Sync Assignments in Supabase
      // First delete existing mappings for this user
      await supabase
        .from('faculty_subject_mapping')
        .delete()
        .eq('faculty_id', facultyData.user);

      // Then insert new ones
      const currentYear = new Date().getFullYear();
      for (const assignment of assignments) {
        for (const section of assignment.sections) {
          await supabase
            .from('faculty_subject_mapping')
            .insert({
              faculty_id: facultyData.user,
              course_id: assignment.course_id,
              department_id: assignment.department_id,
              semester: assignment.semester,
              section: section,
              academic_year: `${currentYear}-${currentYear + 1}`,
              is_active: true
            });
        }
      }

      toast.success('Faculty profile updated successfully');
      onOpenChange(false);
      onSuccess?.();
      setStep(1);
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(error.message || 'An error occurred during update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setStep(1);
    }}>
      <DialogContent className="max-w-4xl p-0 border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="flex h-[85vh]">
          {/* Sidebar */}
          <div className="w-72 bg-zinc-900 p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 border border-white/10">
                <Pencil className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-3xl font-black leading-tight tracking-tight">Edit Profile</h2>
              <p className="mt-4 text-zinc-400 text-sm font-medium leading-relaxed">Update faculty credentials, designation, and teaching load.</p>
              
              <div className="mt-12 space-y-6">
                {[
                  { s: 1, label: 'Identity', icon: Shield },
                  { s: 2, label: 'Assignments', icon: BookOpen },
                  { s: 3, label: 'Review', icon: Building2 }
                ].map((item) => (
                  <div key={item.s} className={`flex items-center gap-4 transition-all duration-500 ${step === item.s ? 'opacity-100 translate-x-1' : 'opacity-30'}`}>
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs border ${step === item.s ? 'bg-white text-zinc-900 border-white' : 'border-white/20 text-white'}`}>
                      {item.s}
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white p-12 overflow-y-auto custom-scrollbar">
            {step === 1 && (
              <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-1">
                    <span className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em]">Step 01</span>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Profile Identity</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">First Name *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="h-12 bg-zinc-50 border-zinc-100 rounded-2xl focus:ring-zinc-200 font-bold text-sm px-5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Last Name *</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="h-12 bg-zinc-50 border-zinc-100 rounded-2xl focus:ring-zinc-200 font-bold text-sm px-5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Official Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 bg-zinc-50 border-zinc-100 rounded-2xl focus:ring-zinc-200 font-bold text-sm px-5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Username</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="h-12 bg-zinc-50 border-zinc-100 rounded-2xl focus:ring-zinc-200 font-bold text-sm px-5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Designation</Label>
                    <Input
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="h-12 bg-zinc-50 border-zinc-100 rounded-2xl focus:ring-zinc-200 font-bold text-sm px-5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Primary Department *</Label>
                  <Select value={formData.department_id} onValueChange={(val) => setFormData({ ...formData, department_id: val })}>
                    <SelectTrigger className="h-12 bg-zinc-50 border-zinc-100 rounded-2xl font-bold text-sm px-5">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-zinc-100">
                      {departments?.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()} className="font-bold text-xs">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Linked Departments</Label>
                  <MultiSelect
                    options={departments?.map(d => ({ label: d.name, value: d.id.toString() })) || []}
                    onChange={(val) => setFormData({ ...formData, linked_departments: val })}
                    selected={formData.linked_departments}
                    placeholder="Select secondary departments..."
                    className="rounded-2xl border-zinc-100 bg-zinc-50/50 min-h-12"
                  />
                </div>

                <Button onClick={() => setStep(2)} className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-zinc-200">
                  Update Teaching Load
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-1">
                    <span className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em]">Step 02</span>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Teaching Assignments</h3>
                </div>

                {assignments.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Assigned Courses</Label>
                    <div className="grid gap-3">
                      {assignments.map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between p-5 bg-zinc-50 border border-zinc-100 rounded-2xl">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-sm text-zinc-900 tracking-tight">{assignment.course_name}</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-white text-zinc-900 text-[9px] font-black uppercase border border-zinc-100 px-2 h-5">
                                    {assignment.department_name}
                                </Badge>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sem {assignment.semester} • {assignment.sections.join(', ')}</span>
                            </div>
                          </div>
                          <button onClick={() => handleRemoveAssignment(index)} className="p-2.5 rounded-xl bg-white border border-transparent hover:border-red-100 hover:bg-red-50 text-zinc-300 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-zinc-50/50 border border-zinc-100 rounded-[2rem] p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Dept</Label>
                        <Select
                        value={currentAssignment.department_id}
                        onValueChange={(val) => {
                            setCurrentAssignment({ ...currentAssignment, department_id: val, course_id: '' });
                            setCourses([]);
                        }}
                        >
                        <SelectTrigger className="h-11 bg-white border-zinc-100 rounded-xl font-bold text-xs px-4"><SelectValue placeholder="Dept" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {departments?.map((d) => (
                            <SelectItem key={d.id} value={d.id.toString()} className="font-bold text-xs">{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Semester</Label>
                        <Select
                        value={currentAssignment.semester}
                        onValueChange={(val) => {
                            setCurrentAssignment({ ...currentAssignment, semester: val, course_id: '' });
                            loadCourses(currentAssignment.department_id, val);
                        }}
                        >
                        <SelectTrigger className="h-11 bg-white border-zinc-100 rounded-xl font-bold text-xs px-4"><SelectValue placeholder="Sem" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                            <SelectItem key={sem} value={sem.toString()} className="font-bold text-xs">Sem {sem}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Course</Label>
                    <Select
                        value={currentAssignment.course_id}
                        onValueChange={(val) => setCurrentAssignment({ ...currentAssignment, course_id: val })}
                    >
                        <SelectTrigger className="h-11 bg-white border-zinc-100 rounded-xl font-bold text-xs px-4"><SelectValue placeholder="Select Course" /></SelectTrigger>
                        <SelectContent className="rounded-xl max-h-64">
                        {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id} className="font-bold text-xs whitespace-normal py-2">{course.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                  </div>

                  {currentAssignment.course_id && (
                    <div className="space-y-3">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Sections</Label>
                      <div className="flex flex-wrap gap-2 p-4 bg-white border border-zinc-100 rounded-2xl">
                        {['A', 'B', 'C', 'D', 'E', 'F'].map((section) => (
                          <label key={section} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border transition-all ${currentAssignment.sections.includes(section) ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' : 'bg-zinc-50 border-zinc-50 text-zinc-400 hover:border-zinc-200'}`}>
                            <input
                              type="checkbox"
                              checked={currentAssignment.sections.includes(section)}
                              onChange={(e) => {
                                if (e.target.checked) setCurrentAssignment({ ...currentAssignment, sections: [...currentAssignment.sections, section] });
                                else setCurrentAssignment({ ...currentAssignment, sections: currentAssignment.sections.filter(s => s !== section) });
                              }}
                              className="hidden"
                            />
                            <span className="text-[11px] font-black uppercase leading-none">Section {section}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button type="button" onClick={handleAddAssignment} variant="outline" className="w-full h-12 bg-white border-zinc-200 hover:bg-zinc-900 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em]">
                    Append Assignment
                  </Button>
                </div>

                <div className="flex gap-4">
                  <Button onClick={() => setStep(1)} variant="ghost" className="h-14 flex-1 rounded-[1.25rem] font-black text-xs uppercase tracking-widest text-zinc-400">Back</Button>
                  <Button onClick={() => setStep(3)} className="h-14 flex-[2] bg-zinc-900 hover:bg-zinc-800 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-zinc-200">Review Changes</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
                <div className="flex flex-col gap-1">
                    <span className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em]">Step 03</span>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Review Updates</h3>
                </div>
                
                <div className="space-y-8">
                    <div className="bg-zinc-900 p-8 rounded-[2rem] text-white space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all duration-700"><Shield className="h-32 w-32" /></div>
                        <div className="grid grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Identity</Label>
                                <p className="font-black text-lg tracking-tight capitalize leading-tight">{formData.first_name} {formData.last_name}</p>
                                <p className="text-[11px] font-bold text-white/50 lowercase italic">{formData.username}</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Designation</Label>
                                <p className="font-black text-lg tracking-tight capitalize leading-tight">{formData.designation}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5 relative z-10">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Primary Jurisdiction</Label>
                            <p className="font-black text-lg tracking-tight capitalize leading-tight">{departments?.find(d => d.id.toString() === formData.department_id)?.name}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button onClick={() => setStep(2)} variant="ghost" className="h-14 flex-1 rounded-[1.25rem] font-black text-xs uppercase tracking-widest text-zinc-400">Modify</Button>
                  <Button onClick={handleSubmit} disabled={loading} className="h-14 flex-[2] bg-zinc-900 hover:bg-zinc-800 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-zinc-200">
                    {loading ? 'Processing...' : 'Commit Changes'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
