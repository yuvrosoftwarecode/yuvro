import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { departmentService, Department } from "@/services/departmentService";
import { batchService, Batch } from "@/services/batchService";
import { semesterService, Semester } from "@/services/semesterService";
import sectionService, { Section } from "@/services/sectionService";
import { studentService } from "@/services/studentService";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";
import { Loader2, Plus, Search, Filter, Mail, Phone, Hash, Building2, GraduationCap, Layers } from "lucide-react";

interface StudentAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    student?: any; // If provided, modal is in Edit mode
    initialData?: {
        department_id?: string | number;
        batch_id?: string | number;
        semester_id?: string | number;
        section_id?: string | number;
    };
}

export const StudentAddModal: React.FC<StudentAddModalProps> = ({ isOpen, onClose, onSuccess, student, initialData }) => {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    const [departments, setDepartments] = useState<Department[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [formData, setFormData] = useState({
        first_name: student?.user_details?.first_name || '',
        last_name: student?.user_details?.last_name || '',
        email: student?.user_details?.email || '',
        username: student?.user_details?.username || '',
        roll_number: student?.roll_number || '',
        phone_number: student?.phone_number || '',
        department_id: student?.department?.toString() || initialData?.department_id?.toString() || '',
        batch_id: student?.batch?.toString() || initialData?.batch_id?.toString() || '',
        semester_id: student?.semester?.toString() || initialData?.semester_id?.toString() || '',
        section_id: student?.section?.toString() || initialData?.section_id?.toString() || '',
        admission_type: student?.admission_type || 'regular',
        is_detained: student?.is_detained || false
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const validateField = (name: string, value: any) => {
        let error = '';
        switch (name) {
            case 'first_name':
            case 'last_name':
                if (!value) error = 'Required';
                break;
            case 'email':
                if (!value) error = 'Required';
                else if (!/\S+@\S+\.\S+/.test(value)) error = 'Invalid email';
                break;
            case 'roll_number':
                if (!value) error = 'Required';
                break;
            case 'batch_id':
                if (!value) error = 'Batch is required';
                break;
            case 'department_id':
                if (!value) error = 'Department is required';
                break;
            case 'phone_number':
                if (!value) error = 'Required';
                else if (value.replace(/\D/g, '').length !== 10) error = 'Must be exactly 10 digits';
                break;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const formatPhoneNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 10);
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        return cleaned;
    };

    useEffect(() => {
        if (isOpen) {
            if (student) {
                setFormData({
                    first_name: student.user_details?.first_name || '',
                    last_name: student.user_details?.last_name || '',
                    email: student.user_details?.email || '',
                    username: student.user_details?.username || '',
                    roll_number: student.roll_number || '',
                    phone_number: student.phone_number || '',
                    department_id: student.department?.toString() || '',
                    batch_id: student.batch?.toString() || '',
                    semester_id: student.semester?.toString() || '',
                    section_id: student.section?.toString() || '',
                    admission_type: student.admission_type || 'regular',
                    is_detained: student.is_detained || false
                });
            } else {
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    username: '',
                    roll_number: '',
                    phone_number: '',
                    department_id: initialData?.department_id?.toString() || '',
                    batch_id: initialData?.batch_id?.toString() || '',
                    semester_id: initialData?.semester_id?.toString() || '',
                    section_id: initialData?.section_id?.toString() || '',
                    admission_type: 'regular',
                    is_detained: false
                });
            }
            loadInitialData();
        }
    }, [isOpen, student]);

    const loadInitialData = async () => {
        try {
            setLoadingData(true);
            const collegeId = (user as any)?.college_id;

            // Revert: Start with Departments for the college
            const depts = await departmentService.getDepartments(collegeId);
            setDepartments(depts);

            if (formData.department_id) {
                const bts = await batchService.getBatches(formData.department_id);
                setBatches(bts);

                if (formData.batch_id) {
                    const sems = await semesterService.getSemesters(formData.batch_id);
                    setSemesters(sems);

                    // Flatten all sections from all semesters
                    const allSections = sems.flatMap(s => (s.sections || []).map(sec => ({
                        ...sec,
                        semester_id: s.id
                    })));

                    // Deduplicate sections by name (prioritize initialData.semester_id or is_current)
                    const targetSemId = initialData?.semester_id?.toString() || sems.find(s => s.is_current)?.id?.toString();
                    const sectionMap = new Map();
                    allSections.forEach(sec => {
                        const existing = sectionMap.get(sec.name);
                        // Overwrite if no entry yet, or if this section belongs to the target semester
                        if (!existing || sec.semester_id?.toString() === targetSemId) {
                            sectionMap.set(sec.name, sec);
                        }
                    });

                    const uniqueSections = Array.from(sectionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
                    setSections(uniqueSections);
                }
            }
        } catch (err) {
            console.error("Failed to load initial data", err);
        } finally {
            setLoadingData(false);
        }
    };

    const handleDepartmentChange = async (val: string) => {
        setFormData(prev => ({ ...prev, department_id: val, batch_id: '', semester_id: '', section_id: '' }));
        setBatches([]);
        setSemesters([]);
        setSections([]);
        validateField('department_id', val);
        if (val) {
            const bts = await batchService.getBatches(val);
            setBatches(bts);
        }
    };

    const handleBatchChange = async (val: string) => {
        setFormData(prev => ({ ...prev, batch_id: val, semester_id: '', section_id: '' }));
        setSemesters([]);
        setSections([]);
        validateField('batch_id', val);
        if (val) {
            try {
                setLoadingData(true);
                const sems = await semesterService.getSemesters(val);
                setSemesters(sems);

                // Flatten all sections from all semesters
                const allSections = sems.flatMap(s => (s.sections || []).map(sec => ({
                    ...sec,
                    semester_id: s.id
                })));

                // Deduplicate sections by name (prioritize initialData.semester_id or is_current)
                const targetSemId = initialData?.semester_id?.toString() || sems.find(s => s.is_current)?.id?.toString();
                const sectionMap = new Map();
                allSections.forEach(sec => {
                    const existing = sectionMap.get(sec.name);
                    if (!existing || sec.semester_id?.toString() === targetSemId) {
                        sectionMap.set(sec.name, sec);
                    }
                });

                const uniqueSections = Array.from(sectionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
                setSections(uniqueSections);
            } catch (error) {
                console.error("Error loading batch details:", error);
                toast.error("Failed to load sections");
            } finally {
                setLoadingData(false);
            }
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.department_id || !formData.batch_id) {
            toast.error("Please fill all required fields (Department, Batch)");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                user: {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    email: formData.email,
                    username: formData.username || formData.email
                },
                roll_number: formData.roll_number,
                phone_number: formData.phone_number,
                department: formData.department_id,
                batch: formData.batch_id,
                semester: formData.semester_id || null,
                section: formData.section_id || null,
                admission_type: formData.admission_type,
                is_detained: formData.is_detained,
                college: (user as any)?.college_id
            };

            if (student) {
                await studentService.updateStudent(student.id, payload);
                toast.success("Student updated successfully");
            } else {
                await studentService.createStudent(payload);
                toast.success("Student added successfully");
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to add student. Check if email/roll number already exists.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-visible flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-2 border-b">
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        {student ? 'Edit Student Details' : 'Add New Student'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Personal Details */}
                        <div className="space-y-4 bg-white p-1">
                            <h4 className="font-semibold text-xs text-orange-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <span className="w-8 h-px bg-orange-200"></span>
                                Personal Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name" className="text-gray-700 font-medium">First Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="first_name"
                                        required
                                        placeholder="John"
                                        value={formData.first_name}
                                        onBlur={() => setTouched(prev => ({ ...prev, first_name: true }))}
                                        onChange={(e) => {
                                            setFormData({ ...formData, first_name: e.target.value });
                                            validateField('first_name', e.target.value);
                                        }}
                                        className={touched.first_name && errors.first_name ? "border-red-500" : ""}
                                    />
                                    {touched.first_name && errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name" className="text-gray-700 font-medium">Last Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="last_name"
                                        required
                                        placeholder="Doe"
                                        value={formData.last_name}
                                        onBlur={() => setTouched(prev => ({ ...prev, last_name: true }))}
                                        onChange={(e) => {
                                            setFormData({ ...formData, last_name: e.target.value });
                                            validateField('last_name', e.target.value);
                                        }}
                                        className={touched.last_name && errors.last_name ? "border-red-500" : ""}
                                    />
                                    {touched.last_name && errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address <span className="text-red-500">*</span></Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="john.doe@example.com"
                                    value={formData.email}
                                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        validateField('email', e.target.value);
                                    }}
                                    className={touched.email && errors.email ? "border-red-500" : ""}
                                />
                                {touched.email && errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                                <p className="text-[11px] text-gray-400">Used for login and notifications.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone_number" className="text-gray-700 font-medium">Phone Number <span className="text-red-500">*</span></Label>
                                <Input
                                    id="phone_number"
                                    required
                                    placeholder="123-456-7890"
                                    value={formData.phone_number}
                                    onBlur={() => setTouched(prev => ({ ...prev, phone_number: true }))}
                                    onChange={(e) => {
                                        const formatted = formatPhoneNumber(e.target.value);
                                        setFormData({ ...formData, phone_number: formatted });
                                        validateField('phone_number', formatted);
                                    }}
                                    className={touched.phone_number && errors.phone_number ? "border-red-500" : ""}
                                />
                                {touched.phone_number && errors.phone_number && <p className="text-xs text-red-500">{errors.phone_number}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="roll_number" className="text-gray-700 font-medium">Roll Number <span className="text-red-500">*</span></Label>
                                <Input
                                    id="roll_number"
                                    required
                                    placeholder="21XXXX0001"
                                    value={formData.roll_number}
                                    onBlur={() => setTouched(prev => ({ ...prev, roll_number: true }))}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setFormData({ ...formData, roll_number: val });
                                        validateField('roll_number', val);
                                    }}
                                    className={touched.roll_number && errors.roll_number ? "border-red-500" : "uppercase"}
                                />
                                {touched.roll_number && errors.roll_number && <p className="text-xs text-red-500">{errors.roll_number}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Admission Type</Label>
                                <Select
                                    value={formData.admission_type}
                                    onValueChange={(val: any) => setFormData({ ...formData, admission_type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Admission Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="regular">Regular</SelectItem>
                                        <SelectItem value="lateral_entry">Lateral Entry</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {student && (
                                <div className="flex items-center space-x-2 pt-2 gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_detained"
                                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                                        checked={formData.is_detained}
                                        onChange={(e) => setFormData({ ...formData, is_detained: e.target.checked })}
                                    />
                                    <Label htmlFor="is_detained" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        Mark as Detained
                                    </Label>
                                </div>
                            )}
                        </div>

                        {/* Academic Details */}
                        <div className="space-y-4 bg-gray-50/50 p-5 rounded-xl border border-gray-100">
                            <h4 className="font-semibold text-xs text-orange-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <span className="w-8 h-px bg-orange-200"></span>
                                Academic Details
                            </h4>
                            {/* Reverted Hierarchy: Department -> Batch -> Section */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Department <span className="text-red-500">*</span></Label>
                                <Select
                                    value={formData.department_id}
                                    onValueChange={handleDepartmentChange}
                                >
                                    <SelectTrigger className={cn(
                                        "bg-white h-11 transition-all duration-200 focus:ring-2 focus:ring-orange-500/20 px-4",
                                        touched.department_id && errors.department_id ? "border-red-500" : "border-gray-200 hover:border-orange-300"
                                    )}>
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {departments.map((d) => (
                                            <SelectItem
                                                key={d.id}
                                                value={d.id.toString()}
                                                className="cursor-pointer font-medium"
                                                icon={<Building2 className="h-4 w-4 text-orange-500 shrink-0" />}
                                            >
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {touched.department_id && errors.department_id && <p className="text-xs text-red-500">{errors.department_id}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Batch <span className="text-red-500">*</span></Label>
                                <Select
                                    value={formData.batch_id}
                                    onValueChange={handleBatchChange}
                                    disabled={!formData.department_id}
                                >
                                    <SelectTrigger className={cn(
                                        "bg-white h-11 transition-all duration-200 focus:ring-2 focus:ring-orange-500/20 px-4",
                                        touched.batch_id && errors.batch_id ? "border-red-500" : "border-gray-200 hover:border-orange-300 hover:bg-white disabled:bg-gray-50"
                                    )}>
                                        <SelectValue placeholder="Select Batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {batches.map((b) => (
                                            <SelectItem
                                                key={b.id}
                                                value={b.id.toString()}
                                                className="cursor-pointer font-medium"
                                                icon={<GraduationCap className="h-4 w-4 text-orange-500 shrink-0" />}
                                            >
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {touched.batch_id && errors.batch_id && <p className="text-xs text-red-500">{errors.batch_id}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Section</Label>
                                <Select
                                    value={formData.section_id}
                                    onValueChange={(val) => {
                                        const selectedSec = sections.find(s => s.id.toString() === val);
                                        setFormData({
                                            ...formData,
                                            section_id: val,
                                            semester_id: selectedSec ? selectedSec.semester_id.toString() : formData.semester_id
                                        });
                                    }}
                                    disabled={!formData.batch_id}
                                >
                                    <SelectTrigger className="bg-white h-11 border-gray-200 hover:border-orange-300 transition-all duration-200 focus:ring-2 focus:ring-orange-500/20 px-4">
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sections.map((sec) => (
                                            <SelectItem
                                                key={sec.id}
                                                value={sec.id.toString()}
                                                className="cursor-pointer font-medium"
                                                icon={<Layers className="h-4 w-4 text-orange-500 shrink-0" />}
                                            >
                                                Section {sec.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-4 leading-relaxed italic">
                                Note: Selecting a section automatically assigns the correct semester.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="mt-8 border-t px-6 py-4 bg-gray-50/80 rounded-b-2xl">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={submitting}
                            className="border-gray-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-orange-600 hover:bg-orange-700 shadow-md transform active:scale-[0.98] transition-all px-8 min-w-[140px]"
                            disabled={submitting || loadingData || Object.values(errors).some(e => e !== '') || !formData.email || !formData.roll_number || !formData.phone_number || !formData.batch_id || !formData.department_id}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Please wait...
                                </>
                            ) : (
                                student ? 'Update Student' : 'Add Student'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default StudentAddModal;
