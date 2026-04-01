import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useDepartments } from '@/hooks/useDepartments';
import { useSubjects } from '@/hooks/useSubjects';
import { useProfiles } from '@/hooks/useProfiles';
import { MultiSelect, Option } from '@/components/ui/multi-select';

export function AddPrincipalDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { departments } = useDepartments();
  const { addProfile } = useProfiles();
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    department_ids: [] as string[],
    subject_ids: [] as string[],
    section_ids: [] as string[]
  });

  const { subjects } = useSubjects(formData.department_ids[0]);

  const departmentOptions: Option[] = departments?.map(d => ({ label: d.name, value: d.id })) || [];
  const subjectOptions: Option[] = subjects?.map(s => ({ label: s.name, value: s.id })) || [];
  
  const sectionOptions: Option[] = [];
  if (formData.department_ids.length > 0) {
    const dept = departments?.find(d => d.id === formData.department_ids[0]);
    if (dept) {
      dept.semesters.forEach(sem => {
        sem.sections.forEach(sec => {
          sectionOptions.push({ 
            label: `Sem ${sem.number} - Section ${sec.name}`, 
            value: sec.id 
          });
        });
      });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.email || !formData.full_name || formData.department_ids.length === 0) {
        throw new Error('Please fill in all required fields');
      }

      addProfile({
        email: formData.email,
        full_name: formData.full_name,
        role: 'principal'
      });

      setOpen(false);
      setFormData({ 
        email: '', 
        full_name: '', 
        department_ids: [], 
        subject_ids: [], 
        section_ids: [] 
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Principal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Principal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>Department *</Label>
            <MultiSelect
              options={departmentOptions}
              selected={formData.department_ids}
              onChange={(vals) => setFormData({ ...formData, department_ids: vals, subject_ids: [], section_ids: [] })}
              placeholder="Select departments..."
            />
          </div>

          {formData.department_ids.length > 0 && (
            <div>
              <Label>Subject (Optional)</Label>
              <MultiSelect
                options={subjectOptions}
                selected={formData.subject_ids}
                onChange={(vals) => setFormData({ ...formData, subject_ids: vals })}
                placeholder="Select subjects..."
              />
            </div>
          )}

          {formData.subject_ids.length > 0 && (
            <div>
              <Label>Section (Optional)</Label>
              <MultiSelect
                options={sectionOptions}
                selected={formData.section_ids}
                onChange={(vals) => setFormData({ ...formData, section_ids: vals })}
                placeholder="Select sections..."
              />
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Adding...' : 'Add Principal'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
