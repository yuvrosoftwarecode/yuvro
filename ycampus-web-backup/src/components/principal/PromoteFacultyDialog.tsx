import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PromoteFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PromoteFacultyDialog({
  open,
  onOpenChange,
}: PromoteFacultyDialogProps) {
  const [formData, setFormData] = useState({
    facultyName: '',
    department: '',
    effectiveDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenChange(false);
    setFormData({ facultyName: '', department: '', effectiveDate: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Faculty as HOD</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="facultyName">Faculty Name</Label>
            <Input
              id="facultyName"
              value={formData.facultyName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, facultyName: e.target.value }))
              }
              placeholder="Enter faculty name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, department: e.target.value }))
              }
              placeholder="Enter department"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective Date</Label>
            <Input
              id="effectiveDate"
              type="date"
              value={formData.effectiveDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, effectiveDate: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Promote</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}