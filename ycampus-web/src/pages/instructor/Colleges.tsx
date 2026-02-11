import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, School, CheckCircle2, XCircle, Search, Building2, Info, Eraser, CheckSquare, AlertCircle } from "lucide-react";
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
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import { Badge } from "@/components/ui/badge";

const DEPARTMENT_GROUPS = [
    {
        name: "Computer & AI",
        departments: [
            { name: "Computer Science & Engineering", short: "CSE" },
            { name: "Information Technology", short: "IT" },
            { name: "Artificial Intelligence & Machine Learning", short: "AI & ML" },
            { name: "Data Science", short: "DS" },
        ]
    },
    {
        name: "Electronics",
        departments: [
            { name: "Electronics & Communication Engineering", short: "ECE" },
            { name: "Electrical & Electronics Engineering", short: "EEE" },
        ]
    },
    {
        name: "Core Engineering",
        departments: [
            { name: "Mechanical Engineering", short: "Mech" },
            { name: "Civil Engineering", short: "Civil" },
        ]
    },
    {
        name: "Management",
        departments: [
            { name: "MBA", short: "MBA" }
        ]
    }
];

const ALL_DEPT_NAMES = DEPARTMENT_GROUPS.flatMap(g => g.departments.map(d => d.name));

const Colleges: React.FC = () => {
    const { user } = useAuth();
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
        college_type: "private",
        affiliated_university: "jntu",
        is_aicte_approved: false,
        is_ugc_approved: false,
        department_names: []
    });
    const [initialFormData, setInitialFormData] = useState<CollegeCreateData | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

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
            const confirmed = window.confirm(`Warning: You are removing ${removedDepts.length} department(s). This may affect existing subjects and faculty mappings. Do you want to proceed?`);
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
        const data = {
            name: college.name,
            short_form: college.short_form || "",
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
        const resetData = {
            name: "",
            short_form: "",
            college_type: "private",
            affiliated_university: "jntu",
            is_aicte_approved: false,
            is_ugc_approved: false,
            department_names: []
        };
        setFormData(resetData);
        setInitialFormData(resetData);
        setSearchTerm("");
    };

    const handleDeptToggle = (deptName: string) => {
        setFormData(prev => ({
            ...prev,
            department_names: prev.department_names.includes(deptName)
                ? prev.department_names.filter(n => n !== deptName)
                : [...prev.department_names, deptName]
        }));
    };

    const handleSelectAll = (depts: string[]) => {
        setFormData(prev => {
            const otherDepts = prev.department_names.filter(n => !depts.includes(n));
            return {
                ...prev,
                department_names: [...otherDepts, ...depts]
            };
        });
    };

    const handleClearDepts = (depts: string[]) => {
        setFormData(prev => ({
            ...prev,
            department_names: prev.department_names.filter(n => !depts.includes(n))
        }));
    };

    const headerActions = (
        <Button
            onClick={() => {
                resetForm();
                setIsAddOpen(true);
            }}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
            <Plus className="h-4 w-4 mr-2" />
            Add College
        </Button>
    );

    if (user?.role !== 'admin') {
        return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Admin role required</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title="Colleges"
                        subtitle="Manage institutional profiles and their departments"
                        actions={headerActions}
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                                <p className="text-gray-500 animate-pulse">Loading colleges...</p>
                            </div>
                        ) : colleges.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-gray-200 shadow-sm">
                                <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <School className="h-8 w-8 text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">No colleges found</h3>
                                <p className="text-gray-500 mb-6">Start by adding your first educational institution.</p>
                                <Button onClick={() => setIsAddOpen(true)} variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add your first College
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {colleges.map((college) => (
                                    <Card key={college.id} className="overflow-hidden hover:shadow-lg transition-all border-none bg-white shadow-sm ring-1 ring-gray-200">
                                        <div className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                                        <School className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{college.name}</h3>
                                                        <p className="text-sm font-medium text-emerald-600 uppercase tracking-wider mt-1">{college.short_form || '---'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditModal(college)} className="h-9 w-9 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(college.id)} className="h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="mt-6 space-y-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Type</span>
                                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 capitalize font-medium">{college.college_type}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">University</span>
                                                    <span className="font-semibold text-gray-700 uppercase">{college.affiliated_university}</span>
                                                </div>
                                                <div className="flex gap-4 pt-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                                                        {college.is_aicte_approved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-gray-300" />}
                                                        <span className={college.is_aicte_approved ? "text-gray-700" : "text-gray-400"}>AICTE</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                                                        {college.is_ugc_approved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-gray-300" />}
                                                        <span className={college.is_ugc_approved ? "text-gray-700" : "text-gray-400"}>UGC</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-gray-100">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Active Departments</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {college.departments.length > 0 ? (
                                                        college.departments.map(dept => (
                                                            <Badge key={dept.id} variant="outline" className="text-[10px] font-medium bg-gray-50">
                                                                {dept.name}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">No departments linked</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

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

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">College Name</Label>
                                                <Input
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="e.g. Oxford Institute of Technology"
                                                    className="h-10 text-xs focus-visible:ring-indigo-500 border-slate-200 rounded-lg bg-slate-50/50 px-3 font-semibold text-slate-700 transition-all focus:bg-white focus:ring-1"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">
                                                    Institutional Code
                                                </Label>
                                                <div className="relative group/code">
                                                    <Input
                                                        value={formData.short_form}
                                                        onChange={(e) => setFormData({ ...formData, short_form: e.target.value.toUpperCase().replace(/\s/g, '') })}
                                                        placeholder="e.g. OIT"
                                                        className="h-10 text-xs focus-visible:ring-indigo-500 border-slate-200 rounded-lg font-black tracking-widest uppercase bg-indigo-50/30 pl-3 pr-16 text-indigo-600 transition-all focus:bg-white focus:ring-1"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800 px-1.5 py-0.5 rounded text-[7px] text-white font-black tracking-tighter opacity-70 pointer-events-none">
                                                        UNIQUE
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Category Type</Label>
                                                <Select
                                                    value={formData.college_type}
                                                    onValueChange={(val) => setFormData({ ...formData, college_type: val })}
                                                >
                                                    <SelectTrigger className="h-10 text-xs focus:ring-indigo-500 border-slate-200 rounded-lg bg-white px-3 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 shadow-2xl p-1 bg-white">
                                                        <SelectItem value="government" className="text-xs font-semibold py-2 px-3 focus:bg-indigo-50 rounded-md cursor-pointer transition-colors">Government</SelectItem>
                                                        <SelectItem value="autonomous" className="text-xs font-semibold py-2 px-3 focus:bg-indigo-50 rounded-md cursor-pointer transition-colors">Autonomous</SelectItem>
                                                        <SelectItem value="deemed" className="text-xs font-semibold py-2 px-3 focus:bg-indigo-50 rounded-md cursor-pointer transition-colors">Deemed</SelectItem>
                                                        <SelectItem value="private" className="text-xs font-semibold py-2 px-3 focus:bg-indigo-50 rounded-md cursor-pointer transition-colors">Private</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Affiliated University</Label>
                                                <Select
                                                    value={formData.affiliated_university}
                                                    onValueChange={(val) => setFormData({ ...formData, affiliated_university: val })}
                                                >
                                                    <SelectTrigger className="h-10 text-xs focus:ring-indigo-500 border-slate-200 rounded-lg bg-white px-3 font-semibold text-slate-700 uppercase shadow-sm transition-all hover:bg-slate-50">
                                                        <SelectValue placeholder="Select university" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 shadow-2xl p-1 bg-white">
                                                        <SelectItem value="jntu" className="text-xs font-semibold py-2 px-3 focus:bg-indigo-50 rounded-md cursor-pointer transition-colors">JNTU</SelectItem>
                                                        <SelectItem value="anna" className="text-xs font-semibold py-2 px-3 focus:bg-indigo-50 rounded-md cursor-pointer transition-colors">Anna University</SelectItem>
                                                        <SelectItem value="vtu" className="text-xs font-semibold py-2 px-3 focus:bg-indigo-50 rounded-md cursor-pointer transition-colors">VTU</SelectItem>
                                                        <SelectItem value="ou" className="text-xs font-semibold py-2 px-3 focus:bg-indigo-50 rounded-md cursor-pointer transition-colors">Osmania University</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="lg:col-span-2 space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Institutional Accreditations</Label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        className={`flex flex-1 items-center justify-between px-3 h-10 rounded-lg border transition-all ${formData.is_aicte_approved ? 'bg-emerald-50/40 border-emerald-500/20 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                                        onClick={() => setFormData({ ...formData, is_aicte_approved: !formData.is_aicte_approved })}
                                                    >
                                                        <span className="text-[11px] font-bold">AICTE Certified</span>
                                                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${formData.is_aicte_approved ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-100 border-slate-200'}`}>
                                                            {formData.is_aicte_approved && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={5} />}
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`flex flex-1 items-center justify-between px-3 h-10 rounded-lg border transition-all ${formData.is_ugc_approved ? 'bg-indigo-50/40 border-indigo-500/20 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                                        onClick={() => setFormData({ ...formData, is_ugc_approved: !formData.is_ugc_approved })}
                                                    >
                                                        <span className="text-[11px] font-bold">UGC Recognized</span>
                                                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${formData.is_ugc_approved ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-100 border-slate-200'}`}>
                                                            {formData.is_ugc_approved && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={5} />}
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Section: Departments */}
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 border-t border-slate-100 pt-7">
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="p-1.5 bg-amber-50 rounded-lg shadow-inner">
                                                    <CheckSquare className="h-4 w-4 text-amber-600" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Departmental Architecture</h4>
                                                    <p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">Infrastructure mapping for curriculum</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-sm max-w-fit">
                                                <div className="relative group/search">
                                                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
                                                    <Input
                                                        placeholder="Quick Search Categories..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="h-8 pl-9 w-48 text-[11px] border-none bg-transparent focus-visible:ring-0 placeholder:text-slate-400 font-semibold"
                                                    />
                                                </div>
                                                <div className="w-px h-4 bg-slate-300 mx-0.5" />
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleSelectAll(ALL_DEPT_NAMES)}
                                                    className="h-8 text-[9px] font-bold uppercase text-indigo-600 hover:bg-white hover:shadow-sm px-3 rounded-lg transition-all"
                                                >
                                                    SELECT ALL
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleClearDepts(ALL_DEPT_NAMES)}
                                                    className="h-8 text-[9px] font-bold uppercase text-rose-500 hover:bg-white hover:shadow-sm px-3 rounded-lg transition-all"
                                                >
                                                    CLEAR ALL
                                                </Button>
                                                <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-md flex items-center gap-2 ml-1">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                    {formData.department_names.length} ACTIVE UNITS
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {DEPARTMENT_GROUPS.map((group) => {
                                                const filteredDepts = group.departments.filter(d =>
                                                    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    d.short.toLowerCase().includes(searchTerm.toLowerCase())
                                                );

                                                if (filteredDepts.length === 0) return null;

                                                const groupDeptNames = filteredDepts.map(d => d.name);
                                                const allInGroupSelected = groupDeptNames.every(name => formData.department_names.includes(name));

                                                return (
                                                    <div key={group.name} className="flex flex-col bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-all group/card">
                                                        <div className="flex items-center justify-between mb-3 px-1">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{group.name}</span>
                                                            <button
                                                                onClick={() => allInGroupSelected ? handleClearDepts(groupDeptNames) : handleSelectAll(groupDeptNames)}
                                                                className={`text-[8px] font-black px-1.5 py-0.5 rounded transition-all ${allInGroupSelected ? 'text-rose-600 bg-rose-50' : 'text-indigo-600 bg-indigo-50'}`}
                                                            >
                                                                {allInGroupSelected ? "NONE" : "ALL"}
                                                            </button>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {filteredDepts.map((dept) => {
                                                                const isSelected = formData.department_names.includes(dept.name);
                                                                return (
                                                                    <div
                                                                        key={dept.name}
                                                                        className={`group/dept flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${isSelected
                                                                            ? "bg-indigo-50/30 border-indigo-500/20 shadow-sm"
                                                                            : "bg-slate-50/20 border-transparent hover:border-slate-200 hover:bg-white"
                                                                            }`}
                                                                        onClick={() => handleDeptToggle(dept.name)}
                                                                    >
                                                                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"
                                                                            }`}>
                                                                            {isSelected && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={5} />}
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className={`text-[11px] font-bold truncate leading-tight ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                                                                                {dept.name}
                                                                            </span>
                                                                            <span className={`text-[9px] font-black tracking-wide ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>
                                                                                {dept.short}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {searchTerm && DEPARTMENT_GROUPS.every(g => !g.departments.some(d =>
                                        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        d.short.toLowerCase().includes(searchTerm.toLowerCase())
                                    )) && (
                                            <div className="py-24 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                                <Search className="h-8 w-8 text-slate-200 mx-auto mb-4" />
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">No Matches Identified</h3>
                                            </div>
                                        )}

                                    <div className="mt-4 flex items-center gap-4 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl group/info relative overflow-hidden">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                            <Info className="h-4 w-4 text-slate-400 shrink-0" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed tracking-wide">
                                            SYSTEM ARCHITECTURE: Selected departments will be automatically bridged to this college context. Sub-structures and faculty associations will be initialized instantly upon profile commitment.
                                        </p>
                                    </div>
                                </div>

                                <DialogFooter className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                                    <Button variant="ghost" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} className="h-10 px-6 text-[10px] font-black text-slate-400 hover:text-slate-600 tracking-widest rounded-lg">DISMISS</Button>
                                    <Button
                                        disabled={saving || !isDirty}
                                        onClick={isEditOpen ? handleUpdate : handleCreate}
                                        className={`h-11 px-10 rounded-lg transition-all font-black tracking-widest text-[12px] shadow-xl ${isDirty
                                            ? "bg-slate-900 text-white hover:bg-black hover:-translate-y-0.5"
                                            : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                                            }`}
                                    >
                                        {saving ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                COMMITTING...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <CheckSquare className="h-4 w-4" />
                                                {isEditOpen ? "UPDATE PROFILE" : "CONFIRM & ONBOARD"}
                                            </div>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation */}
                    <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-red-600 flex items-center gap-2">
                                    <Trash2 className="h-5 w-5" />
                                    Delete College
                                </DialogTitle>
                            </DialogHeader>
                            <div className="py-4 text-gray-600">
                                <p className="font-semibold text-gray-900 mb-2">Are you sure you want to delete this college?</p>
                                <p className="text-sm">This will remove the college profile and its association with departments. Subjects linked to these departments might be affected.</p>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                                <Button variant="destructive" disabled={deleting} onClick={handleDelete} className="min-w-[100px]">
                                    {deleting ? "Deleting..." : "Delete Permanently"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
};

export default Colleges;
