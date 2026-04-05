import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { studentService, Student } from '@/services/studentService';
import { departmentService, Department } from '@/services/departmentService';
import { batchService, Batch } from '@/services/batchService';
import { semesterService } from '@/services/semesterService';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditStudentDialog({ student, open, onOpenChange, onSuccess }: EditStudentDialogProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    roll_number: '',
    admission_type: 'regular' as 'regular' | 'lateral_entry',
    department_id: '',
    batch_id: '',
    semester_id: '',
    section_id: '',
    is_detained: false
  });

  const loadInitialData = async () => {
    try {
      const collegeId = (currentUser as any)?.college_id;
      if (collegeId) {
        const depts = await departmentService.getDepartments(collegeId);
        setDepartments(depts);
      }
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  };

  useEffect(() => {
    if (open) {
      loadInitialData();
      if (student) {
        setFormData({
            first_name: student.user_details.first_name || '',
            last_name: student.user_details.last_name || '',
            email: student.user_details.email || '',
            phone_number: student.phone_number || '',
            roll_number: student.roll_number || '',
            admission_type: student.admission_type || 'regular',
            department_id: student.department?.toString() || '',
            batch_id: student.batch?.toString() || '',
            semester_id: student.semester?.toString() || '',
            section_id: student.section?.toString() || '',
            is_detained: student.is_detained || false
        });
        
        // Trigger loads for dependent data
        if (student.department) {
            batchService.getBatches(student.department).then(bts => {
                setBatches(bts);
                if (student.batch) {
                    loadSections(student.batch.toString());
                }
            });
        }
      }
    }
  }, [open, student]);

  const loadSections = async (batchId: string) => {
    try {
        setLoadingData(true);
        const sems = await semesterService.getSemesters(batchId);
        const allSections = sems.flatMap(s => (s.sections || []).map(sec => ({
            ...sec,
            semester_id: s.id // Inject semester_id for mapping
        })));
        const sectionMap = new Map();
        allSections.forEach(sec => {
            const existing = sectionMap.get(sec.name);
            if (!existing || sec.is_current) {
                sectionMap.set(sec.name, sec);
            }
        });
        setSections(Array.from(sectionMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
        console.error("Error loading sections", error);
    } finally {
        setLoadingData(false);
    }
  };

  const handleDepartmentChange = async (val: string) => {
    setFormData(prev => ({ ...prev, department_id: val, batch_id: '', semester_id: '', section_id: '' }));
    setBatches([]);
    setSections([]);
    if (val) {
      const bts = await batchService.getBatches(val);
      setBatches(bts);
    }
  };

  const handleBatchChange = async (val: string) => {
    setFormData(prev => ({ ...prev, batch_id: val, semester_id: '', section_id: '' }));
    setSections([]);
    if (val) {
      loadSections(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setLoading(true);

    try {
      const payload = {
        user: {
            email: formData.email,
            username: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
        },
        roll_number: formData.roll_number,
        phone_number: formData.phone_number,
        admission_type: formData.admission_type,
        department: formData.department_id || null,
        batch: formData.batch_id || null,
        semester: formData.semester_id || null,
        section: formData.section_id || null,
        is_detained: formData.is_detained,
        college: (currentUser as any)?.college_id
      };

      await studentService.updateStudent(student.id, payload);
      toast.success('Student details updated successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || 'Failed to update student';
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
            Edit Student Profile
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">First Name *</Label>
              <Input
                id="edit_first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Last Name *</Label>
              <Input
                id="edit_last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
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
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone Number *</Label>
              <Input
                id="edit_phone"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_roll">Roll Number *</Label>
              <Input
                id="edit_roll"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value.toUpperCase() })}
                required
                className="uppercase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Admission Type *</Label>
            <Select value={formData.admission_type} onValueChange={(val: any) => setFormData({ ...formData, admission_type: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="lateral_entry">Lateral Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={formData.department_id} onValueChange={handleDepartmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Dept" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch *</Label>
              <Select value={formData.batch_id} onValueChange={handleBatchChange} disabled={!formData.department_id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Section</Label>
            <Select 
                value={formData.section_id} 
                onValueChange={(val) => {
                    const selectedSec = sections.find(s => s.id.toString() === val);
                    setFormData({
                        ...formData,
                        section_id: val,
                        semester_id: selectedSec ? selectedSec.semester_id?.toString() : formData.semester_id
                    });
                }}
                disabled={!formData.batch_id || loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id.toString()}>Section {sec.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 py-2">
              <Checkbox 
                id="edit_is_detained" 
                checked={formData.is_detained} 
                onCheckedChange={(checked) => setFormData({ ...formData, is_detained: checked as boolean })}
              />
              <label htmlFor="edit_is_detained" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Mark as Detained
              </label>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? 'Updating...' : 'Update Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
