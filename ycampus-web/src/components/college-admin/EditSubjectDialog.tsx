import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubjects, Subject } from '@/hooks/useSubjects';
import { useDepartments } from '@/hooks/useDepartments';

interface EditSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
}

export function EditSubjectDialog({ open, onOpenChange, subject }: EditSubjectDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');

  const { updateSubject } = useSubjects();
  const { departments } = useDepartments();

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setCode(subject.code);
      setDepartmentId(subject.department_id);
      setSemester(subject.semester?.toString() || '');
      setDescription(subject.description || '');
    }
  }, [subject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject) return;

    updateSubject({
      id: subject.id,
      name,
      code,
      department_id: departmentId,
      semester: semester ? parseInt(semester) : undefined,
      description: description || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Subject Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Data Structures"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-code">Subject Code *</Label>
            <Input
              id="edit-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., CS101"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-department">Department *</Label>
            <Select value={departmentId} onValueChange={setDepartmentId} required>
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

          <div className="space-y-2">
            <Label htmlFor="edit-semester">Semester</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the subject..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || !code || !departmentId}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}