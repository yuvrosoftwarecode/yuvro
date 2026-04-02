import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDepartments } from '@/hooks/useDepartments';
import { useProfiles } from '@/hooks/useProfiles';

interface BulkChangeDialogProps {
  selectedStudentIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkChangeDialog({ selectedStudentIds, open, onOpenChange, onSuccess }: BulkChangeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { departments } = useDepartments();
  const { profiles, updateProfile } = useProfiles('student');
  const [formData, setFormData] = useState<{
    department_id?: string;
    semester?: string;
    section?: string;
  }>({
    department_id: undefined,
    semester: undefined,
    section: undefined
  });

  const selectedDepartment = departments?.find(d => d.id === formData.department_id);
  const availableSemesters = selectedDepartment?.semesters || [];
  const selectedSemester = availableSemesters.find(s => s.number.toString() === formData.semester);
  const availableSections = selectedSemester?.sections || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      selectedStudentIds.forEach(id => {
        updateProfile({
          id,
          updates: {
            ...(formData.department_id && { department_id: formData.department_id }),
            ...(formData.semester && { semester: formData.semester }),
            ...(formData.section && { section: formData.section })
          }
        });
      });
      
      setShowConfirm(false);
      onOpenChange(false);
      onSuccess();
      setFormData({ department_id: undefined, semester: undefined, section: undefined });
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Change Students ({selectedStudentIds.length} selected)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Select 
                value={formData.department_id} 
                onValueChange={(value) => setFormData({ ...formData, department_id: value, semester: undefined, section: undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
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
            {formData.department_id && (
              <div>
                <Label htmlFor="semester">Semester</Label>
                <Select 
                  value={formData.semester} 
                  onValueChange={(value) => setFormData({ ...formData, semester: value, section: undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSemesters.map((sem) => (
                      <SelectItem key={sem.id} value={sem.number.toString()}>
                        Semester {sem.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.semester && (
              <div>
                <Label htmlFor="section">Section</Label>
                <Select value={formData.section} onValueChange={(value) => setFormData({ ...formData, section: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.name}>
                        Section {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                Apply Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update {selectedStudentIds.length} student(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
