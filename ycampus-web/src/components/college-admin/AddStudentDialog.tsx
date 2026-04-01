import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Loader2 } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    department_id?: string | number;
    batch_id?: string | number;
    semester_id?: string | number;
    section_id?: string | number;
  };
  onSuccess?: () => void;
}

export function AddStudentDialog({ open, onOpenChange, initialData, onSuccess }: AddStudentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { departments } = useDepartments();
  const { addProfile } = useProfiles();
  const [formData, setFormData] = useState<{
    email: string;
    full_name: string;
    roll_number: string;
    department_id: string;
    semester_id: string;
    section_id: string;
  }>({
    email: '',
    full_name: '',
    roll_number: '',
    department_id: '',
    semester_id: '',
    section_id: ''
  });

  useEffect(() => {
    if (open && initialData) {
      setFormData(prev => ({
        ...prev,
        department_id: initialData.department_id?.toString() || '',
        semester_id: initialData.semester_id?.toString() || '',
        section_id: initialData.section_id?.toString() || ''
      }));
    }
  }, [open, initialData]);

  const selectedDepartment = departments?.find(d => d.id.toString() === formData.department_id);
  const availableSemesters = selectedDepartment?.semesters || [];
  const selectedSemester = availableSemesters.find(s => s.id.toString() === formData.semester_id);
  const availableSections = selectedSemester?.sections || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.email || !formData.full_name || !formData.department_id || !formData.semester_id || !formData.section_id) {
        throw new Error('Please fill in all required fields');
      }

      await addProfile({
        email: formData.email,
        full_name: formData.full_name,
        role: 'student',
        department_id: formData.department_id,
        semester: formData.semester_id,
        section: formData.section_id,
        // Since Profile doesn't have roll_number yet, we'll omit it or fix useProfiles if needed
        // For now, sticking to the existing Profile type in code to avoid deeper breaking changes
      });

      toast.success('Student added successfully');
      onOpenChange(false);
      setFormData({ email: '', full_name: '', roll_number: '', department_id: '', semester_id: '', section_id: '' });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-foreground" />
            Add new student
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Enroll a student into the academic system.</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-xs font-semibold text-muted-foreground">Full name *</Label>
                    <div className="relative">
                        <Input
                          id="full_name"
                          placeholder="John Doe"
                          className="pl-3 h-10 border-gray-100 bg-muted/20 rounded-xl"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          required
                        />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roll_number" className="text-xs font-semibold text-muted-foreground">Roll number</Label>
                    <Input
                      id="roll_number"
                      placeholder="2026CS101"
                      className="h-10 border-gray-100 bg-muted/20 rounded-xl font-mono"
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    />
                  </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email address *</Label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                   <Input
                      id="email"
                      type="email"
                      placeholder="student@college.edu"
                      className="pl-10 h-10 border-gray-100 bg-muted/20 rounded-xl"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                </div>
              </div>

              <div className="h-px bg-muted/50 my-2" />

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Academic placement *</Label>
                <div className="grid grid-cols-1 gap-3">
                    <Select 
                      value={formData.department_id} 
                      onValueChange={(value) => setFormData({ ...formData, department_id: value, semester_id: '', section_id: '' })}
                    >
                      <SelectTrigger className="h-10 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                        {departments?.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()} className="rounded-lg">
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-2 gap-3">
                        <Select 
                          value={formData.semester_id} 
                          disabled={!formData.department_id}
                          onValueChange={(value) => setFormData({ ...formData, semester_id: value, section_id: '' })}
                        >
                          <SelectTrigger className="h-10 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground">
                            <SelectValue placeholder="Semester" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                            {availableSemesters.map((sem) => (
                              <SelectItem key={sem.id} value={sem.id.toString()} className="rounded-lg">
                                Semester {sem.number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select 
                            value={formData.section_id} 
                            disabled={!formData.semester_id}
                            onValueChange={(value) => setFormData({ ...formData, section_id: value })}
                        >
                          <SelectTrigger className="h-10 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground">
                            <SelectValue placeholder="Section" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                            {availableSections.map((sec) => (
                              <SelectItem key={sec.id} value={sec.id.toString()} className="rounded-lg">
                                Section {sec.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </div>
              </div>
          </div>
          
          <Button type="submit" disabled={loading} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-bold rounded-xl transition-all shadow-sm">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enroll student'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
