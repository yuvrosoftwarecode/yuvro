import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Phone, Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { studentService } from '@/services/studentService';

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
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    roll_number: '',
    admission_type: 'regular',
    department_id: '',
    batch_id: '',
    semester_id: '',
    section_id: ''
  });

  useEffect(() => {
    if (open && initialData) {
        setFormData(prev => ({
            ...prev,
            department_id: initialData.department_id?.toString() || '',
            batch_id: initialData.batch_id?.toString() || '',
            semester_id: initialData.semester_id?.toString() || '',
            section_id: initialData.section_id?.toString() || ''
        }));
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        user: {
            email: formData.email,
            username: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            password: 'ChangeMe@123'
        },
        roll_number: formData.roll_number,
        phone_number: formData.phone_number,
        admission_type: formData.admission_type,
        department: formData.department_id,
        batch: formData.batch_id,
        semester: formData.semester_id,
        section: formData.section_id,
      };

      await studentService.createStudent(payload);

      toast.success('Student enrolled successfully');
      onOpenChange(false);
      resetForm();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to enroll student');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        roll_number: '',
        admission_type: 'regular',
        department_id: initialData?.department_id?.toString() || '',
        batch_id: initialData?.batch_id?.toString() || '',
        semester_id: initialData?.semester_id?.toString() || '',
        section_id: initialData?.section_id?.toString() || ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
        <DialogHeader className="p-6 bg-white border-b relative">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-foreground" />
            Add New Student
          </DialogTitle>
          <button 
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
              <span className="sr-only">Close</span>
          </button>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-8">
          <div className="space-y-8">
            {/* Personal Details Area */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-px bg-muted flex-1" />
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Personal Details</span>
                    <div className="h-px bg-muted flex-1" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="first_name" className="text-xs font-bold text-foreground">First Name *</Label>
                        <Input
                            id="first_name"
                            placeholder="John"
                            className="h-11 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last_name" className="text-xs font-bold text-foreground">Last Name *</Label>
                        <Input
                            id="last_name"
                            placeholder="Doe"
                            className="h-11 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold text-foreground">Email Address *</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="john.doe@example.com"
                            className="pl-10 h-11 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic px-1">Used for login and notifications.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-bold text-foreground">Phone Number *</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                id="phone"
                                placeholder="123-456-7890"
                                className="pl-10 h-11 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="roll" className="text-xs font-bold text-foreground">Roll Number *</Label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                id="roll"
                                placeholder="21XXXX0001"
                                className="pl-10 h-11 border-gray-100 bg-muted/20 rounded-xl font-mono focus:ring-foreground"
                                value={formData.roll_number}
                                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="admission_type" className="text-xs font-bold text-foreground">Admission Type</Label>
                    <Select 
                        value={formData.admission_type} 
                        onValueChange={(value) => setFormData({ ...formData, admission_type: value })}
                    >
                        <SelectTrigger className="h-11 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground">
                            <SelectValue placeholder="Admission type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                            <SelectItem value="regular" className="rounded-lg">Regular</SelectItem>
                            <SelectItem value="lateral_entry" className="rounded-lg">Lateral Entry</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-gray-200 mt-6 flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-gray-100 mt-0.5">
                        <span className="text-[10px] font-bold text-foreground">!</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                        <span className="font-bold text-foreground">Note:</span> The student will be automatically enrolled in the active semester for the current section. Their default password is <span className="font-bold text-foreground">ChangeMe@123</span> which they can update after logging in.
                    </p>
                </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-gray-100">
             <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="font-bold text-xs h-11 px-8 rounded-xl"
             >
                Cancel
             </Button>
             <Button 
                type="submit" 
                disabled={loading} 
                className="bg-foreground text-background hover:bg-foreground/90 font-bold text-xs h-11 px-8 rounded-xl shadow-sm min-w-[140px]"
             >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add Student'}
             </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
