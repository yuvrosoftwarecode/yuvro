import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Plus, Edit, Trash2, School, CheckCircle2,
    XCircle, Search, Building2, Info, Eraser,
    CheckSquare, AlertCircle, Layers, Calendar,
    ChevronRight, Hash, ArrowLeft, MoreVertical,
    MapPin, Globe, ExternalLink, GraduationCap,
    Clock, PlusCircle, LayoutGrid
} from "lucide-react";
import { collegeService, College, CollegeCreateData, Batch } from "@/services/collegeService";
import { batchService } from "@/services/batchService";
import departmentService, { Department } from "@/services/departmentService";
import semesterService, { Semester } from "@/services/semesterService";
import sectionService, { Section } from "@/services/sectionService";
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

    // View state
    const [activeView, setActiveView] = useState<'list' | 'hierarchy'>('list');

    // Hierarchy management state
    const [selectedManageCollege, setSelectedManageCollege] = useState<College | null>(null);
    const [manageView, setManageView] = useState<'departments' | 'batches' | 'semesters' | 'sections'>('departments');
    const [hierarchyPath, setHierarchyPath] = useState<{ id: string | number, name: string, view: any }[]>([]);
    const [activeParent, setActiveParent] = useState<{ id: string | number, name: string } | null>(null);
    const [hierarchyData, setHierarchyData] = useState<any[]>([]);
    const [manageLoading, setManageLoading] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [startYear, setStartYear] = useState("");
    const [endYear, setEndYear] = useState("");
    const [isAdding, setIsAdding] = useState(false);

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

    const openManageHierarchy = async (college: College) => {
        setSelectedManageCollege(college);
        setActiveView('hierarchy');
        setManageView('departments');
        setActiveParent({ id: college.id, name: college.name });
        setHierarchyData(college.departments || []);
        setHierarchyPath([{ id: college.id, name: college.name, view: 'departments' }]);
    };

    const handleHierarchyBack = () => {
        if (hierarchyPath.length <= 1) return;

        const newPath = [...hierarchyPath];
        newPath.pop(); // Remove current
        const previous = newPath[newPath.length - 1];
        setHierarchyPath(newPath);

        if (previous.view === 'departments') {
            openManageHierarchy(selectedManageCollege!);
        } else if (previous.view === 'batches') {
            loadBatchesForManage(previous.id, false);
        } else if (previous.view === 'semesters') {
            loadSemestersForManage(previous.id, false);
        }
    };

    const loadDepartmentsForManage = async (collegeId: string | number, pushPath = true) => {
        setManageLoading(true);
        try {
            const data = await departmentService.getDepartments(collegeId);
            setHierarchyData(data);
            setManageView('departments');
            const newActiveParent = { id: collegeId, name: selectedManageCollege?.name || 'College' };
            setActiveParent(newActiveParent);
            if (pushPath) {
                setHierarchyPath(prev => [...prev, { ...newActiveParent, view: 'departments' }]);
            }
        } catch (err) {
            toast.error("Failed to load departments");
        } finally {
            setManageLoading(false);
        }
    };

    const loadBatchesForManage = async (deptId: string | number, pushPath = true) => {
        setManageLoading(true);
        try {
            const data = await batchService.getBatches(deptId);
            const dept = hierarchyData.find(d => d.id === deptId) || (pushPath ? null : hierarchyPath[hierarchyPath.length - 1]);
            setHierarchyData(data);
            setManageView('batches');
            const newActiveParent = { id: deptId, name: dept?.name || 'Department' };
            setActiveParent(newActiveParent);
            if (pushPath) {
                setHierarchyPath(prev => [...prev, { ...newActiveParent, view: 'batches' }]);
            }
        } catch (err) {
            toast.error("Failed to load batches");
        } finally {
            setManageLoading(false);
        }
    };

    const loadSemestersForManage = async (batchId: string | number, pushPath = true) => {
        setManageLoading(true);
        try {
            const data = await semesterService.getSemesters(batchId);
            const batch = hierarchyData.find(b => b.id === batchId) || (pushPath ? null : hierarchyPath[hierarchyPath.length - 1]);
            setHierarchyData(data);
            setManageView('semesters');
            const newActiveParent = { id: batchId, name: batch?.name || 'Batch' };
            setActiveParent(newActiveParent);
            if (pushPath) {
                setHierarchyPath(prev => [...prev, { ...newActiveParent, view: 'semesters' }]);
            }
        } catch (err) {
            toast.error("Failed to load semesters");
        } finally {
            setManageLoading(false);
        }
    };

    const loadSectionsForManage = async (semId: string | number, pushPath = true) => {
        setManageLoading(true);
        try {
            const data = await sectionService.getSections(semId);
            const sem = hierarchyData.find(s => s.id === semId);
            setHierarchyData(data);
            setManageView('sections');
            const newActiveParent = { id: semId, name: `Semester ${sem?.number || semId}` };
            setActiveParent(newActiveParent);
            if (pushPath) {
                setHierarchyPath(prev => [...prev, { ...newActiveParent, view: 'sections' }]);
            }
        } catch (err) {
            toast.error("Failed to load sections");
        } finally {
            setManageLoading(false);
        }
    };

    const handleDeleteHierarchyItem = async (id: string | number) => {
        if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;
        try {
            if (manageView === 'departments') {
                await departmentService.deleteDepartment(id);
                const college = await collegeService.getCollege(selectedManageCollege!.id);
                setHierarchyData(college.departments || []);
                loadColleges(); // Refresh main list too
            } else if (manageView === 'batches') {
                await batchService.deleteBatch(id);
                loadBatchesForManage(activeParent!.id, false);
            } else if (manageView === 'semesters') {
                await semesterService.deleteSemester(id);
                loadSemestersForManage(activeParent!.id, false);
            } else if (manageView === 'sections') {
                await sectionService.deleteSection(id);
                loadSectionsForManage(activeParent!.id, false);
            }
            toast.success("Item deleted");
        } catch (err) {
            toast.error("Failed to delete item");
        }
    };

    const handleAutoGenerateSemesters = async () => {
        if (!activeParent || manageView !== 'semesters') return;
        setManageLoading(true);
        try {
            for (let i = 1; i <= 8; i++) {
                await semesterService.createSemester({ batch: activeParent.id, number: i });
            }
            toast.success("8 Semesters initialized");
            loadSemestersForManage(activeParent.id);
        } catch (err) {
            toast.error("Failed to generate semesters");
        } finally {
            setManageLoading(false);
        }
    };

    const handleAddItem = async () => {
        let nameToAdd = newItemName.trim();
        if (manageView === 'batches') {
            if (!startYear || !endYear) {
                toast.error("Start and End years are required");
                return;
            }
            nameToAdd = `${startYear}-${endYear}`;
        }

        if (!nameToAdd && manageView !== 'batches') return;

        setIsAdding(true);
        try {
            if (manageView === 'departments') {
                await departmentService.createDepartment({ college: selectedManageCollege!.id, name: nameToAdd });
                const college = await collegeService.getCollege(selectedManageCollege!.id);
                setHierarchyData(college.departments || []);
                loadColleges();
            } else if (manageView === 'batches') {
                await batchService.createBatch({ department: activeParent!.id, name: nameToAdd });
                loadBatchesForManage(activeParent!.id, false);
            } else if (manageView === 'semesters') {
                const number = parseInt(nameToAdd);
                if (isNaN(number)) throw new Error("Invalid semester number");
                await semesterService.createSemester({ batch: activeParent!.id, number });
                loadSemestersForManage(activeParent!.id, false);
            } else if (manageView === 'sections') {
                await sectionService.createSection({ semester: activeParent!.id, name: nameToAdd });
                loadSectionsForManage(activeParent!.id, false);
            }
            setNewItemName("");
            setStartYear("");
            setEndYear("");
            toast.success(`${manageView.slice(0, -1)} added successfully`);
        } catch (err: any) {
            toast.error(err.message || "Failed to add item");
        } finally {
            setIsAdding(false);
        }
    };

    const filteredColleges = colleges.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.short_form || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.location || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const headerActions = (
        <div className="flex items-center gap-4">
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
                        title={activeView === 'list' ? "Colleges" : (selectedManageCollege?.name || "College")}
                        subtitle={activeView === 'list' ? "Manage institutional profiles and their departments" : "Institutional Hierarchy Management"}
                        actions={activeView === 'list' ? headerActions : (
                            <Button
                                variant="outline"
                                onClick={() => setActiveView('list')}
                                className="h-10 px-4 border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 rounded-lg hover:bg-slate-50"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Colleges
                            </Button>
                        )}
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {activeView === 'list' ? (
                            loading ? (
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
                                            onClick={() => openManageHierarchy(college)}
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
                                                        onClick={(e) => { e.stopPropagation(); openManageHierarchy(college); }}
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
                            )
                        ) : (
                            <div className="space-y-8">
                                {/* Breadcrumbs Section */}
                                <div className="bg-white p-3 px-6 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                            <Globe className="h-4 w-4 text-indigo-500" />
                                        </div>
                                        <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">COLLEGE</span>
                                    </div>
                                    {hierarchyPath.slice(1).map((crumb, idx) => (
                                        <React.Fragment key={idx}>
                                            <ChevronRight className="h-4 w-4 text-slate-300 mx-1" />
                                            <button
                                                onClick={() => {
                                                    if (crumb.view === 'departments') loadDepartmentsForManage(crumb.id, false);
                                                    else if (crumb.view === 'batches') loadBatchesForManage(crumb.id, false);
                                                    else if (crumb.view === 'semesters') loadSemestersForManage(crumb.id, false);
                                                    setHierarchyPath(hierarchyPath.slice(0, idx + 2));
                                                }}
                                                className="text-[10px] font-black tracking-widest text-slate-400 hover:text-indigo-500 uppercase transition-colors cursor-pointer"
                                            >
                                                {crumb.name}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </div>

                                {/* Main Content Area */}
                                <div className="space-y-6">
                                    <div className="flex items-end justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-3xl font-bold text-slate-900">
                                                {manageView.charAt(0).toUpperCase() + manageView.slice(1)}
                                            </h3>
                                            <p className="text-slate-500 text-sm font-medium">
                                                Select a {manageView.slice(0, -1)} to manage {
                                                    manageView === 'departments' ? 'batches' :
                                                        manageView === 'batches' ? 'semesters' :
                                                            manageView === 'semesters' ? 'sections' : 'content'
                                                }
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Inline Add Toggle/Form */}
                                            <div className="flex items-center gap-2">
                                                {manageView === 'batches' ? (
                                                    <div className="flex items-center gap-2 mr-2">
                                                        <Input
                                                            placeholder="Start Year"
                                                            value={startYear}
                                                            onChange={(e) => setStartYear(e.target.value)}
                                                            className="w-24 h-11 text-xs font-bold border-slate-200 rounded-lg focus:ring-indigo-500"
                                                        />
                                                        <Input
                                                            placeholder="End Year"
                                                            value={endYear}
                                                            onChange={(e) => setEndYear(e.target.value)}
                                                            className="w-24 h-11 text-xs font-bold border-slate-200 rounded-lg focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <Input
                                                        placeholder={`Enter ${manageView.slice(0, -1)} name...`}
                                                        value={newItemName}
                                                        onChange={(e) => setNewItemName(e.target.value)}
                                                        className="w-64 h-11 text-xs font-bold border-slate-200 rounded-lg focus:ring-indigo-500 mr-2"
                                                    />
                                                )}
                                                <Button
                                                    onClick={handleAddItem}
                                                    disabled={isAdding}
                                                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 h-11 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-100 uppercase tracking-wide"
                                                >
                                                    {isAdding ? <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> : <Plus className="h-4 w-4" />}
                                                    ADD {manageView.slice(0, -1).toUpperCase()}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {manageLoading ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-12">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl border border-slate-200 shadow-sm" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {hierarchyData.map((item: any) => (
                                                <Card
                                                    key={item.id}
                                                    className="bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group cursor-pointer"
                                                    onClick={() => {
                                                        if (manageView === 'departments') loadBatchesForManage(item.id);
                                                        else if (manageView === 'batches') loadSemestersForManage(item.id);
                                                        else if (manageView === 'semesters') loadSectionsForManage(item.id);
                                                    }}
                                                >
                                                    <CardHeader className="p-6 pb-2">
                                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 mb-6 font-bold group-hover:scale-110 transition-transform">
                                                            {manageView === 'departments' ? <Building2 className="h-6 w-6" /> :
                                                                manageView === 'batches' ? <Calendar className="h-6 w-6" /> :
                                                                    manageView === 'semesters' ? <Clock className="h-6 w-6" /> :
                                                                        <Hash className="h-6 w-6" />}
                                                        </div>
                                                        <h4 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">
                                                            {manageView === 'batches' ? `BATCH ${item.name}` :
                                                                manageView === 'semesters' ? `SEMESTER ${item.number}` : item.name}
                                                        </h4>
                                                    </CardHeader>
                                                    <CardContent className="p-6 pt-8 space-y-6">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {item.id}</span>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] font-medium text-slate-300 italic max-w-[150px] truncate">
                                                                    {item.id.toString().substring(0, 18)}...
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (manageView === 'departments') loadBatchesForManage(item.id);
                                                                        else if (manageView === 'batches') loadSemestersForManage(item.id);
                                                                        else if (manageView === 'semesters') loadSectionsForManage(item.id);
                                                                    }}
                                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tighter flex items-center gap-1 group/btn cursor-pointer"
                                                                >
                                                                    MANAGE {manageView.slice(0, -1).toUpperCase()}
                                                                    <ChevronRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Absolute buttons for Edit/Delete that appear on hover */}
                                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteHierarchyItem(item.id);
                                                                }}
                                                                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}

                                            {hierarchyData.length === 0 && (
                                                <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                                                    <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mb-4">
                                                        <Layers className="h-8 w-8 text-slate-200" />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Items Initialized</h3>
                                                    {manageView === 'semesters' && (
                                                        <Button
                                                            onClick={handleAutoGenerateSemesters}
                                                            className="mt-6 bg-indigo-600 text-white rounded-lg px-6 h-11 font-bold text-xs"
                                                        >
                                                            AUTO-GENERATE 8 SEMESTERS
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
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

                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Campus Location</Label>
                                                <div className="relative group">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                    </div>
                                                    <Input
                                                        value={formData.location}
                                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                        placeholder="e.g. Hyderabad, TS"
                                                        className="h-10 text-xs focus-visible:ring-indigo-500 border-slate-200 rounded-lg bg-slate-50/50 pl-9 pr-3 font-semibold text-slate-700 transition-all focus:bg-white focus:ring-1"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Website URL</Label>
                                                <div className="relative group">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                        <Globe className="h-3.5 w-3.5" />
                                                    </div>
                                                    <Input
                                                        value={formData.website}
                                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                        placeholder="e.g. https://oxford.it"
                                                        className="h-10 text-xs focus-visible:ring-indigo-500 border-slate-200 rounded-lg bg-slate-50/50 pl-9 pr-3 font-semibold text-slate-700 transition-all focus:bg-white focus:ring-1"
                                                    />
                                                </div>
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

                                    {/* Bottom Section: Batches */}
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 border-t border-slate-100 pt-7">
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="p-1.5 bg-amber-50 rounded-lg shadow-inner">
                                                    <CheckSquare className="h-4 w-4 text-amber-600" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">Departmental Architecture</h4>
                                                    <p className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">Infrastructure mapping for academic units</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-sm max-w-fit">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleSelectAll(ALL_DEPARTMENT_NAMES)}
                                                    className="h-8 text-[9px] font-bold uppercase text-indigo-600 hover:bg-white hover:shadow-sm px-3 rounded-lg transition-all"
                                                >
                                                    SELECT ALL
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleClearDepts(ALL_DEPARTMENT_NAMES)}
                                                    className="h-8 text-[9px] font-bold uppercase text-rose-500 hover:bg-white hover:shadow-sm px-3 rounded-lg transition-all"
                                                >
                                                    CLEAR ALL
                                                </Button>
                                                <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold shadow-md flex items-center gap-2 ml-1">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                    {formData.department_names.length} ACTIVE DEPARTMENTS
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {COMMON_DEPARTMENTS.map((dept) => {
                                                const isSelected = formData.department_names.includes(dept.name);
                                                return (
                                                    <div
                                                        key={dept.name}
                                                        className={`group/dept flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                                                            ? "bg-indigo-50/40 border-indigo-200 shadow-lg shadow-indigo-50/50"
                                                            : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                                                            }`}
                                                        onClick={() => handleDeptToggle(dept.name)}
                                                    >
                                                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"
                                                            }`}>
                                                            {isSelected && <CheckCircle2 className="h-3 w-3 text-white" strokeWidth={4} />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={`text-[13px] font-black tracking-tight ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                                                                {dept.name}
                                                            </span>
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>
                                                                {dept.short}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-4 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl group/info relative overflow-hidden">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                            <Info className="h-4 w-4 text-slate-400 shrink-0" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed tracking-wide">
                                            SYSTEM ARCHITECTURE: Departments represent the academic units of an institution. Selecting these will initialize the structural organization for batches and curriculum.
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
                                <p className="text-sm">This will remove the college profile and its association with departments. Batches linked to these departments might be affected.</p>
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
