import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface AddBatchIdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  selectedDepartmentId?: string;
  onSubmit: (data: { department_id: string; name: string; description?: string }) => void;
  isSubmitting: boolean;
}

export function AddBatchIdDialog({
  open,
  onOpenChange,
  departments,
  selectedDepartmentId,
  onSubmit,
  isSubmitting,
}: AddBatchIdDialogProps) {
  const [formData, setFormData] = useState({
    department_id: selectedDepartmentId || '',
    name: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department_id || !formData.name) return;
    onSubmit({
      department_id: formData.department_id,
      name: formData.name,
      description: formData.description || undefined,
    });
    setFormData({ department_id: selectedDepartmentId || '', name: '', description: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Batch ID</DialogTitle>
          <DialogDescription>
            Create a new Batch ID container for a department. Batches (year ranges) will be added inside.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => setFormData({ ...formData, department_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Batch ID Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Regular, Evening, Weekend"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.department_id || !formData.name}>
              {isSubmitting ? 'Creating...' : 'Create Batch ID'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
