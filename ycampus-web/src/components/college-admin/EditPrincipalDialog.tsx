import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PrincipalWithDepartments } from '@/hooks/usePrincipals';
import { useDepartments } from '@/hooks/useDepartments';
import { useSubjects } from '@/hooks/useSubjects';
import { MultiSelect, Option } from '@/components/ui/multi-select';

interface EditPrincipalDialogProps {
  principal: PrincipalWithDepartments | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: { full_name: string; email: string; department_ids: string[]; subject_ids: string[]; section_ids: string[] }) => void;
}

export function EditPrincipalDialog({ principal, open, onOpenChange, onUpdate }: EditPrincipalDialogProps) {
  const [loading, setLoading] = useState(false);
  const { departments } = useDepartments();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department_ids: [] as string[],
    subject_ids: [] as string[],
    section_ids: [] as string[]
  });

  const { subjects } = useSubjects(formData.department_ids[0]);

  useEffect(() => {
    if (principal) {
      setFormData({
        full_name: principal.full_name,
        email: principal.email,
        department_ids: principal.departments.map(d => d.id),
        subject_ids: [],
        section_ids: []
      });
    }
  }, [principal]);

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
    if (!principal) return;
    
    setLoading(true);
    try {
      onUpdate(principal.id, formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Principal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit_full_name">Full Name *</Label>
            <Input
              id="edit_full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Principal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
