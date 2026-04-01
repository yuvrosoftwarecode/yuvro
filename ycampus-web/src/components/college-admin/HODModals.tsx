import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { departmentService } from "@/services/departmentService";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

interface FacultyProfile {
  id: string;
  user_details: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    profile?: {
      profile_image?: string;
    };
  };
}

interface AssignHODModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string | number;
  onSuccess: () => void;
}

export const AssignHODModal: React.FC<AssignHODModalProps> = ({ isOpen, onClose, departmentId, onSuccess }) => {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFaculties();
    }
  }, [isOpen]);

  const loadFaculties = async () => {
    try {
      setLoading(true);
      const collegeId = (user as any)?.college_id;
      // Fetching from faculty endpoint
      const data = await restApiAuthUtil.get<FacultyProfile[]>(`/course/faculties/?college=${collegeId}`);
      setFaculties(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load faculty members");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (facultyUserId: string) => {
    try {
      setSubmitting(true);
      const collegeId = (user as any)?.college_id;
      if (!collegeId) throw new Error("College ID not found");
      
      await departmentService.allocateHOD(collegeId, {
        user_id: facultyUserId,
        department_id: departmentId
      });
      toast.success("HOD assigned successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Failed to assign HOD");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaculties = faculties.filter(f => 
    f.user_details.first_name.toLowerCase().includes(search.toLowerCase()) ||
    f.user_details.last_name.toLowerCase().includes(search.toLowerCase()) ||
    f.user_details.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange-600" />
            Assign HOD
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search faculty name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                Loading faculty...
              </div>
            ) : filteredFaculties.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground italic border border-dashed rounded-lg">
                No faculty found matching search.
              </div>
            ) : (
              filteredFaculties.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-orange-200 hover:bg-orange-50/30 transition-all group">
                  <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs">
                        {f.user_details.first_name.charAt(0)}{f.user_details.last_name.charAt(0)}
                     </div>
                     <div>
                        <p className="font-semibold text-sm group-hover:text-orange-900">{f.user_details.first_name} {f.user_details.last_name}</p>
                        <p className="text-[11px] text-muted-foreground">{f.user_details.email}</p>
                     </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 border-orange-200 hover:bg-orange-600 hover:text-white transition-colors"
                    onClick={() => handleAssign(f.user_details.id)}
                    disabled={submitting}
                  >
                    Assign
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CreateHODModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string | number;
  onSuccess: () => void;
}

export const CreateHODModal: React.FC<CreateHODModalProps> = ({ isOpen, onClose, departmentId, onSuccess }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const collegeId = (user as any)?.college_id;
      if (!collegeId) throw new Error("College ID not found");
      
      await departmentService.createHOD(collegeId, {
        ...formData,
        department_id: departmentId
      });
      toast.success("HOD created and assigned successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create HOD");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-orange-600" />
            Create & Assign HOD
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="first_name" className="text-xs">First Name</Label>
              <Input
                id="first_name"
                required
                className="h-9"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name" className="text-xs">Last Name</Label>
              <Input
                id="last_name"
                required
                className="h-9"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              required
              className="h-9"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="username" className="text-xs">Username</Label>
            <Input
              id="username"
              required
              className="h-9"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input
              id="password"
              type="password"
              required
              className="h-9"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-200" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create HOD Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
