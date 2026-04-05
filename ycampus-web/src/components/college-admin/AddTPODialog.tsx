import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { placementOfficerService } from '@/services/placementOfficerService';
import { useAuth } from '@/contexts/AuthContext';

interface AddTPODialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddTPODialog({ onSuccess, open: propOpen, onOpenChange: propOnOpenChange }: AddTPODialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

  const open = propOpen !== undefined ? propOpen : internalOpen;
  const setOpen = propOnOpenChange !== undefined ? propOnOpenChange : setInternalOpen;

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.username || !formData.first_name || !formData.last_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const collegeId = (currentUser as any)?.college_id;
      
      await placementOfficerService.createPlacementOfficer({
        user: {
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password || undefined
        },
        college: collegeId
      });

      toast.success('TPO onboarded successfully');
      setOpen(false);
      setFormData({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        password: ''
      });
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to create TPO', error);
      toast.error(error.message || 'Failed to onboard TPO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {propOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-black text-white hover:bg-black/90">
            <Plus className="h-4 w-4" />
            Add TPO
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Onboard New TPO
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.doe@college.edu"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="johndoe_tpo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white hover:bg-black/90"
            >
              {loading ? 'Onboarding...' : 'Onboard TPO'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
