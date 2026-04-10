import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { facultyService } from '@/services/facultyService';
import { departmentService, Department } from '@/services/departmentService';

interface AddFacultyDialogNewProps {
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

const DEFAULT_PASSWORD = "ChangeMe@123";

export function AddFacultyDialogNew({ onSuccess }: AddFacultyDialogNewProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: DEFAULT_PASSWORD,
    department: '',
    designation: ''
  });

  useEffect(() => {
    if (open) {
      loadDepartments();
    }
  }, [open]);

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

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      first_name: '',
      last_name: '',
      password: DEFAULT_PASSWORD,
      department: '',
      designation: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        user: {
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password
        },
        college: (currentUser as any)?.college_id,
        department: formData.department,
        linked_departments: [], 
        designation: formData.designation
      };

      await facultyService.createFaculty(payload as any);
      toast.success('Faculty member onboarded successfully');
      setOpen(false);
      resetForm();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Failed to create faculty", error);
      const message = error.response?.data?.error || error.message || "An error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Faculty
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Faculty</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              placeholder="e.g. Robert"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              placeholder="e.g. Oppenheimer"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@college.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="robert_phys"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Initial Password *</Label>
            <Input
              id="password"
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            {loading ? 'Adding...' : 'Add Faculty'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}