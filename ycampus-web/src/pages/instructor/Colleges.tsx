import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, School, CheckCircle2, XCircle } from "lucide-react";
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

const AVAILABLE_DEPARTMENTS = [
    "Computer Science & Engineering",
    "Electronics & Communication Engineering",
    "Electrical & Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Information Technology",
    "Artificial Intelligence & Machine Learning",
    "Data Science",
    "MBA"
];

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
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
        setFormData({
            name: college.name,
            short_form: college.short_form || "",
            college_type: college.college_type,
            affiliated_university: college.affiliated_university,
            is_aicte_approved: college.is_aicte_approved,
            is_ugc_approved: college.is_ugc_approved,
            department_names: college.departments.map(d => d.name)
        });
        setIsEditOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: "",
            short_form: "",
            college_type: "private",
            affiliated_university: "jntu",
            is_aicte_approved: false,
            is_ugc_approved: false,
            department_names: []
        });
    };

    const handleDeptToggle = (deptName: string) => {
        setFormData(prev => ({
            ...prev,
            department_names: prev.department_names.includes(deptName)
                ? prev.department_names.filter(n => n !== deptName)
                : [...prev.department_names, deptName]
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
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <School className="h-5 w-5 text-indigo-600" />
                                    {isEditOpen ? "Edit College" : "Add New College"}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col md:flex-row gap-8 py-6">
                                {/* Left Side: Details */}
                                <div className="flex-1 space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-700">College Name</Label>
                                            <Input
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Oxford Institute of Technology"
                                                className="h-11 focus-visible:ring-indigo-500 border-gray-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-700">Short Form</Label>
                                            <Input
                                                value={formData.short_form}
                                                onChange={(e) => setFormData({ ...formData, short_form: e.target.value })}
                                                placeholder="e.g. OIT"
                                                className="h-11 focus-visible:ring-indigo-500 border-gray-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-700">College Type</Label>
                                            <Select
                                                value={formData.college_type}
                                                onValueChange={(val) => setFormData({ ...formData, college_type: val })}
                                            >
                                                <SelectTrigger className="h-11 focus:ring-indigo-500 border-gray-200">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="government">Government</SelectItem>
                                                    <SelectItem value="autonomous">Autonomous</SelectItem>
                                                    <SelectItem value="deemed">Deemed</SelectItem>
                                                    <SelectItem value="private">Private</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-700">Affiliated University</Label>
                                            <Select
                                                value={formData.affiliated_university}
                                                onValueChange={(val) => setFormData({ ...formData, affiliated_university: val })}
                                            >
                                                <SelectTrigger className="h-11 focus:ring-indigo-500 border-gray-200">
                                                    <SelectValue placeholder="Select university" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="jntu">JNTU</SelectItem>
                                                    <SelectItem value="anna">Anna University</SelectItem>
                                                    <SelectItem value="vtu">VTU</SelectItem>
                                                    <SelectItem value="ou">Osmania University</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <Label className="text-sm font-semibold text-gray-700">Approvals & Recognitions</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-100 transition-all cursor-pointer" onClick={() => setFormData({ ...formData, is_aicte_approved: !formData.is_aicte_approved })}>
                                                <Checkbox
                                                    id="aicte"
                                                    checked={formData.is_aicte_approved}
                                                    onCheckedChange={(val: boolean) => setFormData({ ...formData, is_aicte_approved: val })}
                                                    className="data-[state=checked]:bg-indigo-600 border-gray-300"
                                                />
                                                <Label htmlFor="aicte" className="text-sm font-medium leading-none cursor-pointer flex-1">AICTE Approved</Label>
                                            </div>
                                            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-100 transition-all cursor-pointer" onClick={() => setFormData({ ...formData, is_ugc_approved: !formData.is_ugc_approved })}>
                                                <Checkbox
                                                    id="ugc"
                                                    checked={formData.is_ugc_approved}
                                                    onCheckedChange={(val: boolean) => setFormData({ ...formData, is_ugc_approved: val })}
                                                    className="data-[state=checked]:bg-indigo-600 border-gray-300"
                                                />
                                                <Label htmlFor="ugc" className="text-sm font-medium leading-none cursor-pointer flex-1">UGC Approved</Label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Departments */}
                                <div className="w-full md:w-[280px] shrink-0 flex flex-col">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Departments</Label>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-indigo-100 bg-indigo-50 text-indigo-600">
                                            {formData.department_names.length} Selected
                                        </Badge>
                                    </div>
                                    <div className="bg-gray-100/50 p-3 rounded-2xl border border-gray-200/60 grid grid-cols-1 gap-2 flex-1 max-h-[400px] overflow-y-auto">
                                        {AVAILABLE_DEPARTMENTS.map((dept) => {
                                            const isSelected = formData.department_names.includes(dept);
                                            return (
                                                <div
                                                    key={dept}
                                                    className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${isSelected
                                                            ? "bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-50"
                                                            : "bg-transparent border-transparent hover:bg-white/50"
                                                        }`}
                                                    onClick={() => handleDeptToggle(dept)}
                                                >
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-300"
                                                        }`}>
                                                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                                    </div>
                                                    <span className={`text-[11px] font-semibold flex-1 leading-tight ${isSelected ? "text-indigo-900" : "text-gray-600"
                                                        }`}>
                                                        {dept}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 px-1">
                                        <p className="text-[10px] text-gray-400 italic leading-relaxed">
                                            Departments will be automatically initialized for this college.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="mt-6">
                                <Button variant="ghost" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} className="hover:bg-gray-100">Cancel</Button>
                                <Button
                                    disabled={saving}
                                    onClick={isEditOpen ? handleUpdate : handleCreate}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 min-w-[120px]"
                                >
                                    {saving ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Saving...
                                        </div>
                                    ) : (
                                        isEditOpen ? "Save Changes" : "Create College"
                                    )}
                                </Button>
                            </DialogFooter>
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
