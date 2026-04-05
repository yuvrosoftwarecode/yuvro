import { Edit, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { placementOfficerService, PlacementOfficerProfile } from '@/services/placementOfficerService';

interface EditTPODialogProps {
  tpo: PlacementOfficerProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTPODialog({ tpo, open, onOpenChange, onSuccess }: EditTPODialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: ''
  });

  useEffect(() => {
    if (tpo) {
      setFormData({
        email: tpo.user_details.email || '',
        username: tpo.user_details.username || '',
        first_name: tpo.user_details.first_name || '',
        last_name: tpo.user_details.last_name || ''
      });
    }
  }, [tpo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpo) return;

    if (!formData.email || !formData.username || !formData.first_name || !formData.last_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await placementOfficerService.updatePlacementOfficer(tpo.id, {
        user: {
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name
        }
      });

      toast.success('TPO profile updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to update TPO', error);
      toast.error(error.message || 'Failed to update TPO profile');
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
            Edit TPO Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">First Name *</Label>
              <Input
                id="edit_first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Last Name *</Label>
              <Input
                id="edit_last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">Email Address *</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.doe@college.edu"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_username">Username *</Label>
            <Input
              id="edit_username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="johndoe_tpo"
              required
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white hover:bg-black/90"
            >
              {loading ? 'Saving...' : 'Update TPO Profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
