import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Plus, Edit, Trash2, School, CheckCircle2,
    XCircle, Search, Layers, AlertCircle
} from "lucide-react";
import { collegeService, College, CollegeCreateData } from "@/services/collegeService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

const COMMON_DEPARTMENTS = [
    { name: "Computer Science and Engineering", short: "CSE" },
    { name: "Electronics and Communication", short: "ECE" },
    { name: "Information Technology", short: "IT" },
    { name: "Mechanical Engineering", short: "ME" },
    { name: "Civil Engineering", short: "CE" },
    { name: "Electrical and Electronics", short: "EEE" },
    { name: "Artificial Intelligence & Data Science", short: "AI&DS" },
    { name: "Business Management", short: "MBA" },
];

const ALL_DEPARTMENT_NAMES = COMMON_DEPARTMENTS.map(d => d.name);

const CollegeList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editCollegeId, setEditCollegeId] = useState<string | number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);

    // Form state
    const [formData, setFormData] = useState<CollegeCreateData>({
        name: "",
        short_form: "",
        location: "",
        website: "",
        college_type: "private",
        affiliated_university: "jntu",
        is_aicte_approved: false,
        is_ugc_approved: false,
        department_names: []
    });
    const [initialFormData, setInitialFormData] = useState<CollegeCreateData | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");


    useEffect(() => {
        loadColleges();
    }, []);

    const loadColleges = async () => {
        try {
            setLoading(true);
            const data = await collegeService.getColleges();
            setColleges(data);
        } catch (err) {
            console.error("Failed to load colleges", err);
            toast.error("Failed to load colleges");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast.error("College name is required");
            return;
        }
        try {
            setSaving(true);
            await collegeService.createCollege(formData);
            toast.success("College created successfully");
            setIsAddOpen(false);
            resetForm();
            loadColleges();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create college");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editCollegeId) return;
        if (!formData.name.trim()) {
            toast.error("College name is required");
            return;
        }

        // Check for department removal
        const removedDepts = initialFormData?.department_names.filter(d => !formData.department_names.includes(d)) || [];
        if (removedDepts.length > 0) {
            const confirmed = window.confirm(`Warning: You are removing ${removedDepts.length} department(s). This may affect existing data. Do you want to proceed?`);
            if (!confirmed) return;
        }

        try {
            setSaving(true);
            await collegeService.updateCollege(editCollegeId, formData);
            toast.success("College updated successfully");
            setIsEditOpen(false);
            setEditCollegeId(null);
            resetForm();
            loadColleges();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update college");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            setDeleting(true);
            await collegeService.deleteCollege(confirmDelete);
            toast.success("College deleted successfully");
            setConfirmDelete(null);
            loadColleges();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete college");
        } finally {
            setDeleting(false);
        }
    };

    const openEditModal = (college: College) => {
        setEditCollegeId(college.id);
        const data: CollegeCreateData = {
            name: college.name,
            short_form: college.short_form || "",
            location: college.location || "",
            website: college.website || "",
            college_type: college.college_type,
            affiliated_university: college.affiliated_university,
            is_aicte_approved: college.is_aicte_approved,
            is_ugc_approved: college.is_ugc_approved,
            department_names: college.departments.map(d => d.name)
        };
        setFormData(data);
        setInitialFormData(data);
        setIsEditOpen(true);
    };

    const resetForm = () => {
        const resetData: CollegeCreateData = {
            name: "",
            short_form: "",
            location: "",
            website: "",
            college_type: "private",
            affiliated_university: "jntu",
            is_aicte_approved: false,
            is_ugc_approved: false,
            department_names: []
        };
        setFormData(resetData);
        setInitialFormData(resetData);
    };

    const handleDeptToggle = (name: string) => {
        setFormData(prev => ({
            ...prev,
            department_names: prev.department_names.includes(name)
                ? prev.department_names.filter(n => n !== name)
                : [...prev.department_names, name]
        }));
    };

    const handleSelectAll = (names: string[]) => {
        setFormData(prev => {
            const others = prev.department_names.filter(n => !names.includes(n));
            return {
                ...prev,
                department_names: [...others, ...names]
            };
        });
    };

    const handleClearDepts = (names: string[]) => {
        setFormData(prev => ({
            ...prev,
            department_names: prev.department_names.filter(n => !names.includes(n))
        }));
    };

    const filteredColleges = colleges.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.short_form || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.location || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCollegeClick = (id: string | number) => {
        navigate(`/instructor/colleges/${id}`);
    };

    if (user?.role !== 'admin') {
        return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Admin role required</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="relative hidden md:block group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                        <Search className="h-4 w-4" />
                    </div>
                    <Input
                        placeholder="Scan colleges..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 pl-10 w-64 bg-slate-50 border-none rounded-xl text-[10px] font-bold tracking-widest uppercase focus-visible:ring-indigo-600 focus-visible:bg-white transition-all ring-1 ring-slate-100 shadow-inner"
                    />
                </div>
                <Button
                    onClick={() => {
                        resetForm();
                        setIsAddOpen(true);
                    }}
                    className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 font-bold px-6 h-11"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add College
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-500 animate-pulse">Loading colleges...</p>
                </div>
            ) : filteredColleges.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[40px] border-4 border-dashed border-slate-50 shadow-2xl shadow-indigo-50/20 max-w-2xl mx-auto flex flex-col items-center">
                    <div className="bg-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mb-8 relative">
                        <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-20" />
                        <School className="h-10 w-10 text-indigo-600 relative z-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic tracking-tight">No Entities Detected</h3>
                    <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-xs mb-10 tracking-widest uppercase text-center">
                        Our scanners found no educational institutions matching your criteria.
                    </p>
                    <Button onClick={() => { setSearchQuery(""); setIsAddOpen(true); }} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl h-14 px-10 text-[11px] font-black tracking-[0.2em] shadow-2xl shadow-indigo-100">
                        INITIALIZE FIRST NODE
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredColleges.map((college) => (
                        <Card
                            key={college.id}
                            className="bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => handleCollegeClick(college.id)}
                        >
                            <CardHeader className="p-5 pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                            <School className="h-6 w-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-slate-900 text-lg leading-tight lowercase">
                                                {college.name}
                                            </h3>
                                            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-tight">
                                                {college.short_form || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditModal(college); }} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setConfirmDelete(college.id); }} className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    <div className="items-center justify-between text-[11px] flex">
                                        <span className="font-medium text-slate-500">Type</span>
                                        <Badge variant="secondary" className={`text-[10px] font-bold px-2 py-0 h-5 lowercase ${college.college_type === 'private' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                                            }`}>
                                            {college.college_type}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-medium text-slate-500">University</span>
                                        <span className="font-bold text-slate-700 uppercase">{college.affiliated_university}</span>
                                    </div>
                                    <div className="flex items-center gap-4 pt-1">
                                        <div className="flex items-center gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
                                            {college.is_aicte_approved ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={3} />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-slate-300" strokeWidth={3} />
                                            )}
                                            <span className="text-[11px] font-bold text-slate-500">AICTE</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
                                            {college.is_ugc_approved ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={3} />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-slate-300" strokeWidth={3} />
                                            )}
                                            <span className="text-[11px] font-bold text-slate-500">UGC</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-5 pt-4">
                                <div className="flex items-end justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Active Departments</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {college.departments && college.departments.length > 0 ? (
                                                college.departments.slice(0, 4).map((dept) => (
                                                    <Badge key={dept.id} variant="secondary" className="bg-slate-100/50 text-slate-500 text-[10px] px-2 py-0 h-5 font-bold border-slate-200/50 shadow-none">
                                                        {dept.name}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-slate-300 italic font-bold">No Departments</span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={(e) => { e.stopPropagation(); handleCollegeClick(college.id); }}
                                        variant="outline"
                                        className="border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg h-9 px-4 text-[10px] font-black tracking-widest flex items-center gap-2"
                                    >
                                        <Layers className="h-3.5 w-3.5" />
                                        MANAGE
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddOpen(false);
                    setIsEditOpen(false);
                    setEditCollegeId(null);
                }
            }}>
                <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
                    <div className="bg-white rounded-3xl overflow-hidden p-8">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
                                <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                                    <School className="h-6 w-6 text-white" />
                                </div>
                                {isEditOpen ? "Update Institutional Profile" : "Onboard New College"}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col gap-6 py-6">
                            {/* Top Section: Institutional Details */}
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-50 rounded-lg shadow-inner">
                                        <Building2 className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Institutional Identity</h4>
                                        <p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">Core details and legal recognition</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">College Name</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Stanford University"
                                            className="h-11 border-slate-200 bg-slate-50/50 rounded-xl focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50/50 transition-all font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Short Code</Label>
                                        <Input
                                            value={formData.short_form}
                                            onChange={(e) => setFormData({ ...formData, short_form: e.target.value })}
                                            placeholder="e.g. SU"
                                            className="h-11 border-slate-200 bg-slate-50/50 rounded-xl focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50/50 transition-all font-semibold uppercase tracking-widest"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</Label>
                                        <Input
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="e.g. California, USA"
                                            className="h-11 border-slate-200 bg-slate-50/50 rounded-xl focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50/50 transition-all font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Website</Label>
                                        <Input
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="https://..."
                                            className="h-11 border-slate-200 bg-slate-50/50 rounded-xl focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50/50 transition-all font-semibold text-indigo-600"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institution Type</Label>
                                        <Select
                                            value={formData.college_type}
                                            onValueChange={(val: any) => setFormData({ ...formData, college_type: val })}
                                        >
                                            <SelectTrigger className="h-11 border-slate-200 bg-slate-50/50 rounded-xl focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="private" className="font-medium">Private Institution</SelectItem>
                                                <SelectItem value="government" className="font-medium">Government Institution</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">University Affiliation</Label>
                                        <Select
                                            value={formData.affiliated_university}
                                            onValueChange={(val: any) => setFormData({ ...formData, affiliated_university: val })}
                                        >
                                            <SelectTrigger className="h-11 border-slate-200 bg-slate-50/50 rounded-xl focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="jntu" className="font-medium">JNTU Hyderabad</SelectItem>
                                                <SelectItem value="ou" className="font-medium">Osmania University</SelectItem>
                                                <SelectItem value="au" className="font-medium">Andhra University</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex gap-8 pt-2">
                                    <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1">
                                        <Checkbox
                                            id="aicte"
                                            checked={formData.is_aicte_approved}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_aicte_approved: checked as boolean })}
                                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 w-5 h-5 rounded-md"
                                        />
                                        <div className="grid gap-0.5 leading-none">
                                            <label htmlFor="aicte" className="text-xs font-bold text-slate-700 uppercase cursor-pointer">AICTE Approved</label>
                                            <p className="text-[10px] text-slate-400 font-medium">Technical education recognition</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1">
                                        <Checkbox
                                            id="ugc"
                                            checked={formData.is_ugc_approved}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_ugc_approved: checked as boolean })}
                                            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-5 h-5 rounded-md"
                                        />
                                        <div className="grid gap-0.5 leading-none">
                                            <label htmlFor="ugc" className="text-xs font-bold text-slate-700 uppercase cursor-pointer">UGC Approved</label>
                                            <p className="text-[10px] text-slate-400 font-medium">University grants commission</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />

                            {/* Bottom Section: Departments */}
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-orange-50 rounded-lg shadow-inner">
                                            <Layers className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Academic Disciplines</h4>
                                            <p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">Select offerable departments</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => handleSelectAll(ALL_DEPARTMENT_NAMES)}
                                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 h-7 rounded-lg"
                                        >
                                            SELECT ALL
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => handleClearDepts(ALL_DEPARTMENT_NAMES)}
                                            className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 h-7 rounded-lg"
                                        >
                                            CLEAR
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {COMMON_DEPARTMENTS.map((dept) => {
                                        const isSelected = formData.department_names.includes(dept.name);
                                        return (
                                            <div
                                                key={dept.name}
                                                onClick={() => handleDeptToggle(dept.name)}
                                                className={`
                                                    cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 flex flex-col gap-1 relative overflow-hidden group
                                                    ${isSelected
                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200'
                                                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                                    }
                                                `}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-[10px] font-black tracking-widest ${isSelected ? 'text-slate-400' : 'text-slate-300'}`}>{dept.short}</span>
                                                    {isSelected && (
                                                        <div className="bg-emerald-500 rounded-full p-0.5 animate-in zoom-in spin-in-180 duration-300">
                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                                                    {dept.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 -mx-8 -mb-8 p-6 flex justify-between items-center border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 font-medium">
                                <span className="text-rose-500">*</span> Required fields
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                                    className="font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-xl"
                                >
                                    CANCEL
                                </Button>
                                <Button
                                    onClick={isEditOpen ? handleUpdate : handleCreate}
                                    disabled={saving}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 font-bold px-8"
                                >
                                    {saving ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            <span>SAVING...</span>
                                        </div>
                                    ) : (
                                        <span>{isEditOpen ? "UPDATE PROFILE" : "CREATE BOARD"}</span>
                                    )}
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <div className="p-8 pb-6 bg-white flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-500 shadow-inner">
                            <AlertCircle className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Delete Institution?</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                            This will permanently remove the college and all its associated data. This action cannot be undone.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-6 flex gap-3 border-t border-slate-100">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1 font-bold text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl h-11 border border-transparent hover:border-slate-200 hover:shadow-sm"
                        >
                            CANCEL
                        </Button>
                        <Button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold h-11 shadow-lg shadow-rose-100"
                        >
                            {deleting ? "DELETING..." : "CONFIRM DELETE"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default CollegeList;


