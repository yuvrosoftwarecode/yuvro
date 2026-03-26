import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDepartments } from '@/hooks/useDepartments';
import { useProfiles } from '@/hooks/useProfiles';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ClassAssignment {
  id?: string;
  course_id: string;
  course_name: string;
  department_id: string;
  department_name: string;
  semester: number;
  sections: string[];
}

interface FacultyData {
  id: string;
  full_name: string;
  email: string;
  department_id: string;
  reporting_to: string;
  assignments: ClassAssignment[];
}

interface EditFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facultyData: FacultyData | null;
}

export function EditFacultyDialog({ open, onOpenChange, facultyData }: EditFacultyDialogProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { departments } = useDepartments();
  const { profiles: hods } = useProfiles('hod');
  const { profiles: principals } = useProfiles('principal');
  const { updateProfile } = useProfiles();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department_id: '',
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

  const reportingOptions = [
    ...(hods?.map(h => ({ id: h.id, name: `${h.full_name} (HOD)` })) || []),
    ...(principals?.map(p => ({ id: p.id, name: `${p.full_name} (Principal)` })) || [])
  ];

  // Load faculty data when dialog opens
  useEffect(() => {
    if (open && facultyData) {
      setFormData({
        full_name: facultyData.full_name,
        email: facultyData.email,
        department_id: facultyData.department_id || '',
        reporting_to: facultyData.reporting_to || ''
      });
      setAssignments(facultyData.assignments || []);
      setStep(1);
    }
  }, [open, facultyData]);

  const loadCourses = async (deptId: string, semester: string) => {
    if (!deptId || !semester) return;
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('department_id', deptId)
      .eq('semester', parseInt(semester));

    if (!error && data) {
      setCourses(data);
    } else {
      setCourses([]);
      toast.error('No courses found for this department and semester');
    }
  };

  const handleAddAssignment = () => {
    if (!currentAssignment.course_id || !currentAssignment.department_id || 
        !currentAssignment.semester || currentAssignment.sections.length === 0) {
      toast.error('Please fill all assignment fields including sections');
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

      setCurrentAssignment({
        course_id: '',
        department_id: '',
        semester: '',
        sections: []
      });
      setCourses([]);
    }
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      if (!formData.full_name || !formData.email || !facultyData) {
        throw new Error('Please fill in all required fields');
      }

      // Update faculty profile
      await updateProfile({
        id: facultyData.id,
        updates: {
          full_name: formData.full_name,
          email: formData.email
        }
      });

      // Delete all existing assignments
      await supabase
        .from('faculty_subject_mapping')
        .delete()
        .eq('faculty_id', facultyData.id);

      // Add new assignments
      const currentYear = new Date().getFullYear();
      for (const assignment of assignments) {
        for (const section of assignment.sections) {
          await supabase
            .from('faculty_subject_mapping')
            .insert({
              faculty_id: facultyData.id,
              course_id: assignment.course_id,
              department_id: assignment.department_id,
              semester: assignment.semester,
              section: section,
              academic_year: `${currentYear}-${currentYear + 1}`,
              is_active: true
            });
        }
      }

      toast.success('Faculty updated successfully');
      onOpenChange(false);
      setStep(1);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Faculty - Step {step} of 3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Faculty Information</h3>
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department_id} onValueChange={(value) => setFormData({ ...formData, department_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reporting_to">Reporting Manager</Label>
              <Select value={formData.reporting_to} onValueChange={(value) => setFormData({ ...formData, reporting_to: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select HOD/Principal" />
                </SelectTrigger>
                <SelectContent>
                  {reportingOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setStep(2)} className="w-full">
              Next: Classes / Teaching Assignments
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Classes / Teaching Assignments</h3>
            
            {assignments.length > 0 && (
              <div className="space-y-2">
                <Label>Added Assignments:</Label>
                <div className="flex flex-wrap gap-2">
                  {assignments.map((assignment, index) => (
                    <Badge key={index} variant="secondary" className="text-sm py-1">
                      {assignment.course_name} | {assignment.department_name} | Sem {assignment.semester} | {assignment.sections.join(', ')}
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignment(index)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">Add Assignment</h4>
              
              <div>
                <Label>Department *</Label>
                <Select
                  value={currentAssignment.department_id}
                  onValueChange={(value) => {
                    setCurrentAssignment({ ...currentAssignment, department_id: value, course_id: '', sections: [] });
                    setCourses([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Semester *</Label>
                <Select
                  value={currentAssignment.semester}
                  onValueChange={(value) => {
                    setCurrentAssignment({ ...currentAssignment, semester: value, course_id: '', sections: [] });
                    loadCourses(currentAssignment.department_id, value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentAssignment.department_id && currentAssignment.semester && (
                <div>
                  <Label>Subject *</Label>
                  <Select
                    value={currentAssignment.course_id}
                    onValueChange={(value) => setCurrentAssignment({ ...currentAssignment, course_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name} ({course.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {currentAssignment.course_id && (
                <div>
                  <Label>Sections * (Multiple selection)</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                    {['A', 'B', 'C', 'D', 'E', 'F'].map((section) => (
                      <label key={section} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentAssignment.sections.includes(section)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCurrentAssignment({
                                ...currentAssignment,
                                sections: [...currentAssignment.sections, section]
                              });
                            } else {
                              setCurrentAssignment({
                                ...currentAssignment,
                                sections: currentAssignment.sections.filter(s => s !== section)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">Section {section}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button type="button" onClick={handleAddAssignment} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Assignment
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Next: Review
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Review & Confirm</h3>
            
            <div className="space-y-3 border rounded-lg p-4">
              <div>
                <Label className="text-muted-foreground">Full Name</Label>
                <p className="font-medium">{formData.full_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{formData.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Department</Label>
                <p className="font-medium">{departments?.find(d => d.id === formData.department_id)?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Reporting Manager</Label>
                <p className="font-medium">{reportingOptions.find(r => r.id === formData.reporting_to)?.name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Assignments ({assignments.length})</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {assignments.map((assignment, index) => (
                    <Badge key={index} variant="secondary">
                      {assignment.course_name} | {assignment.department_name} | Sem {assignment.semester} | {assignment.sections.join(', ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? 'Saving...' : 'Update Faculty'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
