import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { facultyService, FacultyProfile } from '@/services/facultyService';
import { departmentService, Department } from '@/services/departmentService';

interface EditFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculty: FacultyProfile | null;
  onSuccess?: () => void;
}

const DESIGNATION_OPTIONS = [
  "Professor",
  "Assistant Professor",
  "Associate Professor",
  "Senior Professor",
  "Lecturer",
  "Head of Department (HOD)"
];

export function EditFacultyDialog({ open, onOpenChange, faculty, onSuccess }: EditFacultyDialogProps) {
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    department: '',
    designation: ''
  });

  useEffect(() => {
    if (open) {
      loadDepartments();
      if (faculty) {
        setFormData({
          email: faculty.user_details.email || '',
          username: faculty.user_details.username || '',
          first_name: faculty.user_details.first_name || '',
          last_name: faculty.user_details.last_name || '',
          department: faculty.department?.toString() || '',
          designation: faculty.designation || ''
        });
      }
    }
  }, [open, faculty]);

  const loadDepartments = async () => {
    try {
      const collegeId = (currentUser as any)?.college_id;
      if (collegeId) {
        const data = await departmentService.getDepartments(collegeId);
        setDepartments(data);
      }
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faculty) return;
    setLoading(true);

    try {
      const payload = {
        user: {
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
        },
        college: (currentUser as any)?.college_id,
        department: formData.department,
        linked_departments: [], 
        designation: formData.designation
      };

      await facultyService.updateFaculty(faculty.id, payload as any);
      toast.success('Faculty member updated successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Failed to update faculty", error);
      const message = error.response?.data?.error || error.message || "An error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Faculty Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit_first_name">First Name *</Label>
            <Input
              id="edit_first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit_last_name">Last Name *</Label>
            <Input
              id="edit_last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="edit_email">Email *</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit_username">Username *</Label>
            <Input
              id="edit_username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Primary Department *</Label>
            <Select onValueChange={(val) => setFormData({ ...formData, department: val })} value={formData.department}>
              <SelectTrigger>
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Designation *</Label>
            <Select onValueChange={(val) => setFormData({ ...formData, designation: val })} value={formData.designation}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {DESIGNATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Update Faculty'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
