import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDepartments } from '@/hooks/useDepartments';
import { useProfiles, Profile } from '@/hooks/useProfiles';

interface EditStudentDialogProps {
  student: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStudentDialog({ student, open, onOpenChange }: EditStudentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { departments } = useDepartments();
  const { updateProfile } = useProfiles();
  const [formData, setFormData] = useState<{
    email: string;
    full_name: string;
    department_id?: string;
    semester?: string;
    section?: string;
  }>({
    email: '',
    full_name: '',
    department_id: undefined,
    semester: undefined,
    section: undefined
  });

  useEffect(() => {
    if (student) {
      setFormData({
        email: student.email,
        full_name: student.full_name,
        department_id: student.department_id || undefined,
        semester: student.semester || undefined,
        section: student.section || undefined
      });
    }
  }, [student]);

  const selectedDepartment = departments?.find(d => d.id === formData.department_id);
  const availableSemesters = selectedDepartment?.semesters || [];
  const selectedSemester = availableSemesters.find(s => s.number.toString() === formData.semester);
  const availableSections = selectedSemester?.sections || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    
    setLoading(true);
    try {
      updateProfile({
        id: student.id,
        updates: {
          email: formData.email,
          full_name: formData.full_name,
          department_id: formData.department_id,
          semester: formData.semester,
          section: formData.section
        }
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name*</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email*</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="department">Department*</Label>
            <Select 
              value={formData.department_id} 
              onValueChange={(value) => setFormData({ ...formData, department_id: value, semester: undefined, section: undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formData.department_id && (
            <div>
              <Label htmlFor="semester">Semester*</Label>
              <Select 
                value={formData.semester} 
                onValueChange={(value) => setFormData({ ...formData, semester: value, section: undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {availableSemesters.map((sem) => (
                    <SelectItem key={sem.id} value={sem.number.toString()}>
                      Semester {sem.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {formData.semester && (
            <div>
              <Label htmlFor="section">Section*</Label>
              <Select value={formData.section} onValueChange={(value) => setFormData({ ...formData, section: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.name}>
                      Section {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
