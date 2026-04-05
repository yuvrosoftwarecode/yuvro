import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import subjectService from '@/services/subjectService';
import { departmentService, Department } from '@/services/departmentService';
import { useAuth } from '@/contexts/AuthContext';

interface AddSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddSubjectDialog({ open, onOpenChange, onSuccess }: AddSubjectDialogProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [formData, setFormData] = useState({
    subject_name: '',
    short_code: '',
    department_id: '',
    semester: '',
    description: ''
  });

  useEffect(() => {
    if (open && currentUser) {
      const collegeId = (currentUser as any)?.college_id;
      if (collegeId) {
        departmentService.getDepartments(collegeId).then(setDepartments);
      }
    }
  }, [open, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const collegeId = (currentUser as any)?.college_id;
      if (!collegeId) throw new Error("College ID not found");

      // 1. Create the global subject record
      const subjectResponse = await subjectService.createSubject({
        subject_name: formData.subject_name,
        short_code: formData.short_code,
        description: formData.description,
        level: 'college' // Marking it as college level
      }) as any;

      // 2. Assign it to this college
      await subjectService.assignSubjectToCollege({
        college: collegeId,
        subject: subjectResponse.id,
        subject_code: formData.short_code
      });

      toast.success('Subject added and assigned successfully');
      onOpenChange(false);
      resetForm();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || 'Failed to add subject';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subject_name: '',
      short_code: '',
      department_id: '',
      semester: '',
      description: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Add New Subject
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject_name">Subject Name *</Label>
              <Input
                id="subject_name"
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                placeholder="e.g. Advanced Data Structures"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="short_code">Subject Code *</Label>
              <Input
                id="short_code"
                value={formData.short_code}
                onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toUpperCase() })}
                placeholder="e.g. CS301"
                required
                className="uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department (Optional)</Label>
              <Select value={formData.department_id} onValueChange={(val) => setFormData({ ...formData, department_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Semester (Optional)</Label>
              <Select value={formData.semester} onValueChange={(val) => setFormData({ ...formData, semester: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter subject overview..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={loading} className="w-full bg-black text-white hover:bg-black/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {loading ? 'Adding Subject...' : 'Add Subject'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}