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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddSemesterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchName: string;
  existingSemesters: number[];
  onSubmit: (data: { semester_number: number; name?: string }) => void;
  isSubmitting: boolean;
}

export function AddSemesterDialog({
  open,
  onOpenChange,
  batchName,
  existingSemesters,
  onSubmit,
  isSubmitting,
}: AddSemesterDialogProps) {
  const [formData, setFormData] = useState({
    semester_number: '',
    name: '',
  });

  const availableSemesters = Array.from({ length: 8 }, (_, i) => i + 1)
    .filter(num => !existingSemesters.includes(num));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.semester_number) return;
    onSubmit({
      semester_number: parseInt(formData.semester_number),
      name: formData.name || undefined,
    });
    setFormData({ semester_number: '', name: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Semester</DialogTitle>
          <DialogDescription>
            Add a new semester to batch "{batchName}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="semester_number">Semester Number *</Label>
              <Select
                value={formData.semester_number}
                onValueChange={(value) => setFormData({ ...formData, semester_number: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {availableSemesters.length > 0 ? (
                    availableSemesters.map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        Semester {num}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      All semesters added
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Custom Name (Optional)</Label>
              <Input
                id="name"
                placeholder="e.g., Fall 2024, Spring 2025"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.semester_number || availableSemesters.length === 0}
            >
              {isSubmitting ? 'Adding...' : 'Add Semester'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
