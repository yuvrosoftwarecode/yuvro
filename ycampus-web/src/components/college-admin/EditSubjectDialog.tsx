import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import subjectService, { CollegeSubject } from '@/services/subjectService';

interface EditSubjectDialogProps {
  collegeSubject: CollegeSubject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditSubjectDialog({ collegeSubject, open, onOpenChange, onSuccess }: EditSubjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject_name: '',
    short_code: '',
    description: ''
  });

  useEffect(() => {
    if (open && collegeSubject && collegeSubject.subject_details) {
      setFormData({
        subject_name: collegeSubject.subject_details.subject_name || '',
        short_code: collegeSubject.subject_code || collegeSubject.subject_details.short_code || '',
        description: collegeSubject.subject_details.description || ''
      });
    }
  }, [open, collegeSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeSubject?.subject) return;
    setLoading(true);

    try {
      // 1. Update global subject info
      await subjectService.updateSubject(collegeSubject.subject, {
        subject_name: formData.subject_name,
        short_code: formData.short_code,
        description: formData.description
      });

      // 2. If subject_code in CollegeSubject needs updating separately
      if (formData.short_code !== collegeSubject.subject_code) {
        await subjectService.updateCollegeSubject(collegeSubject.id, {
          subject_code: formData.short_code
        });
      }

      toast.success('Subject details updated successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || 'Failed to update subject';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Subject Details
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_subject_name">Subject Name *</Label>
              <Input
                id="edit_subject_name"
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_short_code">Subject Code *</Label>
              <Input
                id="edit_short_code"
                value={formData.short_code}
                onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toUpperCase() })}
                required
                className="uppercase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_description">Description</Label>
            <Textarea
              id="edit_description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={loading} className="w-full bg-black text-white hover:bg-black/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {loading ? 'Updating...' : 'Update Subject'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}