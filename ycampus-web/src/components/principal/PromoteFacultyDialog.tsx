import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { useProfiles } from '@/hooks/useProfiles';
import { useDepartments } from '@/hooks/useDepartments';

export function PromoteFacultyDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { profiles: faculty, updateProfile } = useProfiles('faculty');
  const { departments } = useDepartments();
  const [formData, setFormData] = useState({
    faculty_id: '',
    department_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.faculty_id) {
        throw new Error('Please select a faculty member');
      }

      updateProfile({
        id: formData.faculty_id,
        updates: { role: 'hod' }
      });

      setOpen(false);
      setFormData({ faculty_id: '', department_id: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowUp className="mr-2 h-4 w-4" />
          Promote Faculty to HOD
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Faculty to HOD</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="faculty">Select Faculty</Label>
            <Select value={formData.faculty_id} onValueChange={(value) => setFormData({ ...formData, faculty_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select faculty member" />
              </SelectTrigger>
              <SelectContent>
                {faculty?.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.full_name} ({f.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="department">Assign Department</Label>
            <Select value={formData.department_id} onValueChange={(value) => setFormData({ ...formData, department_id: value })}>
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
          <Button type="submit" disabled={loading || !formData.faculty_id || !formData.department_id} className="w-full">
            {loading ? 'Promoting...' : 'Promote to HOD'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
