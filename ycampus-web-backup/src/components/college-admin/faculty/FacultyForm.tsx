import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { FacultyProfile } from "@/services/facultyService";
import { departmentService, Department } from "@/services/departmentService";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Shield, Briefcase, GraduationCap, Key } from "lucide-react";

interface FacultyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  faculty?: FacultyProfile | null;
  loading?: boolean;
}

const DEFAULT_PASSWORD = "ChangeMe@123";

const FacultyForm: React.FC<FacultyFormProps> = ({ isOpen, onClose, onSubmit, faculty, loading }) => {
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: DEFAULT_PASSWORD,
    department: '',
    linked_departments: [] as string[],
    designation: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      if (faculty) {
        setFormData({
          email: faculty.user_details.email,
          username: faculty.user_details.username,
          first_name: faculty.user_details.first_name,
          last_name: faculty.user_details.last_name,
          password: '', 
          department: faculty.department.toString(),
          linked_departments: faculty.linked_departments ? faculty.linked_departments.map(id => id.toString()) : [],
          designation: faculty.designation || ''
        });
      } else {
        setFormData({
          email: '',
          username: '',
          first_name: '',
          last_name: '',
          password: DEFAULT_PASSWORD,
          department: '',
          linked_departments: [],
          designation: ''
        });
      }
    }
  }, [isOpen, faculty]);

  const loadDepartments = async () => {
    try {
      const collegeId = (currentUser as any)?.college_id;
      if (collegeId) {
        const data = await departmentService.getDepartments(collegeId);
        setDepartments(data);
      }
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, department: value });
  };

  const handleMultiSelectChange = (values: string[]) => {
    setFormData({ ...formData, linked_departments: values });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      user: {
        email: formData.email,
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
      },
      college: (currentUser as any)?.college_id,
      department: formData.department,
      linked_departments: formData.linked_departments,
      designation: formData.designation
    };

    if (!faculty && formData.password) {
      payload.user.password = formData.password;
    }

    onSubmit(payload);
  };

  const deptOptions = departments.map(d => ({
    label: d.name,
    value: d.id.toString()
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <div className="bg-indigo-600 p-8 text-white relative h-32 flex flex-col justify-end">
          <div className="absolute top-8 right-8 h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <GraduationCap className="h-6 w-6 text-indigo-100" />
          </div>
          <DialogTitle className="text-3xl font-bold tracking-tight">
            {faculty ? 'Edit Faculty' : 'Onboard Faculty'}
          </DialogTitle>
          <DialogDescription className="text-indigo-100 mt-1 mb-0 font-medium">
            {faculty ? 'Update existing faculty member details' : 'Create a new faculty account and profile'}
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white max-h-[70vh] overflow-y-auto custom-scrollbar uppercase-none">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                <User className="h-3 w-3" />
                Personal Information
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">First Name</Label>
                <Input 
                  id="first_name" 
                  placeholder="e.g. Robert" 
                  className="rounded-xl border-slate-200 bg-white focus:bg-white focus:ring-indigo-600 transition-all font-medium"
                  value={formData.first_name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Last Name</Label>
                <Input 
                  id="last_name" 
                  placeholder="e.g. Oppenheimer" 
                  className="rounded-xl border-slate-200 bg-white focus:bg-white focus:ring-indigo-600 transition-all font-medium"
                  value={formData.last_name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Email Address</Label>
              <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@college.edu" 
                    className="pl-10 rounded-xl border-slate-200 bg-white focus:bg-white focus:ring-indigo-600 transition-all font-medium"
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                  />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                <Shield className="h-3 w-3" />
                Account Setup
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Username</Label>
                <Input 
                  id="username" 
                  placeholder="robert_phys" 
                  className="rounded-xl border-slate-200 bg-white focus:bg-white focus:ring-indigo-600 transition-all font-medium"
                  value={formData.username} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              {!faculty ? (
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Default Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400" />
                    <Input 
                        id="password" 
                        type="text"
                        placeholder="••••••••" 
                        className="pl-10 rounded-xl border-slate-200 bg-white focus:bg-white focus:ring-indigo-600 transition-all font-bold text-indigo-600"
                        value={formData.password} 
                        onChange={handleChange} 
                        required 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 flex flex-col pt-7">
                    <span className="text-[10px] text-slate-400 font-medium italic">Password restricted.</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                <Briefcase className="h-3 w-3" />
                Academic Position
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="designation" className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Professional Designation</Label>
              <Input 
                id="designation" 
                placeholder="e.g. Senior Professor & Academic Head" 
                className="rounded-xl border-slate-200 bg-white focus:bg-white focus:ring-indigo-600 transition-all font-medium"
                value={formData.designation} 
                onChange={handleChange} 
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Primary Department</Label>
                <Select onValueChange={handleSelectChange} value={formData.department}>
                  <SelectTrigger id="department" className="h-11 rounded-xl border-slate-200 bg-white focus:ring-indigo-600 transition-all font-semibold text-slate-700 shadow-none">
                    <SelectValue placeholder="Assign Primary Department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()} className="font-medium focus:bg-indigo-50 focus:text-indigo-700">
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-slate-600 font-bold text-[11px] uppercase tracking-wider">Linked Departments (Secondary)</Label>
                <MultiSelect
                  options={deptOptions}
                  selected={formData.linked_departments}
                  onChange={handleMultiSelectChange}
                  placeholder="Link other departments..."
                  className="rounded-xl border-slate-200 bg-white focus:ring-indigo-600 shadow-none font-medium"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-8 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white text-slate-500 font-bold rounded-xl px-6 h-12 uppercase text-[10px] tracking-widest">Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 h-12 rounded-xl shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95 uppercase text-[10px] tracking-widest" disabled={loading}>
              {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </div>
              ) : (faculty ? 'Update Faculty' : 'Complete Onboarding')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FacultyForm;
