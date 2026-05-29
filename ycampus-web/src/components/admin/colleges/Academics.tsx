import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    ChevronRight, Building2, Calendar, Clock, Hash,
    Plus, Trash2, Layers, AlertCircle, Loader2, Search,
    Check, Zap, Edit2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collegeService, College } from "@/services/collegeService";
import departmentService, { Department } from "@/services/departmentService";
import { batchService } from "@/services/batchService";
import semesterService from "@/services/semesterService";
import sectionService from "@/services/sectionService";

interface AcademicsProps {
    college: College;
}

const DEPARTMENT_CATEGORIES = [
    {
        name: "Computer & Core Tech",
        icon: "💻",
        departments: [
            { name: "Computer Science and Engineering", short_form: "CSE" },
            { name: "Information Technology", short_form: "IT" },
            { name: "Artificial Intelligence & Machine Learning", short_form: "AIML" },
            { name: "Artificial Intelligence & Data Science", short_form: "AIDS" },
            { name: "Data Science", short_form: "DS" },
            { name: "Cyber Security", short_form: "CS" },
            { name: "Computer Science & Engineering – Data Science", short_form: "CSE-DS" },
            { name: "Computer Science & Engineering – AI", short_form: "CSE-AI" },
        ]
    },
    {
        name: "Electrical & Electronics",
        icon: "⚡",
        departments: [
            { name: "Electrical and Electronics Engineering", short_form: "EEE" },
            { name: "Electronics and Communication Engineering", short_form: "ECE" },
        ]
    },
    {
        name: "Core Engineering",
        icon: "🏗️",
        departments: [
            { name: "Civil Engineering", short_form: "CE" },
            { name: "Mechanical Engineering", short_form: "ME" },
        ]
    }
];

const Academics: React.FC<AcademicsProps> = ({ college }) => {
    // Hierarchy management state
    const [activeCollege, setActiveCollege] = useState<College>(college);
    const [manageView, setManageView] = useState<'batches' | 'departments' | 'semesters' | 'sections'>('batches');
    const [hierarchyPath, setHierarchyPath] = useState<{ id: string | number, name: string, view: any }[]>([]);
    const [activeParent, setActiveParent] = useState<{ id: string | number, name: string } | null>(null);
    const [hierarchyData, setHierarchyData] = useState<any[]>([]);
    const [manageLoading, setManageLoading] = useState(false);
    const [selectedBatchName, setSelectedBatchName] = useState<string | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog & Form State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemShortForm, setNewItemShortForm] = useState("");
    const [startYear, setStartYear] = useState("");
    const [endYear, setEndYear] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Multi-select for departments
    const [selectedPresets, setSelectedPresets] = useState<{ name: string, short_form: string }[]>([]);
    const [addMode, setAddMode] = useState<'manual' | 'preset'>('preset');

    // Edit Department State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [editDeptName, setEditDeptName] = useState("");
    const [editDeptShortForm, setEditDeptShortForm] = useState("");

    // Bulk Section State
    const [isBulkSectionsDialogOpen, setIsBulkSectionsDialogOpen] = useState(false);
    const [selectedSectionLimit, setSelectedSectionLimit] = useState<number>(0);

    useEffect(() => {
        loadUniqueBatches(true);
    }, [college]);

    useEffect(() => {
        setSearchQuery("");
    }, [manageView, activeParent]);

    const loadUniqueBatches = async (pushPath = true) => {
        setManageLoading(true);
        try {
            const data = await collegeService.getUniqueBatches(college.id);
            setHierarchyData(data.map(name => ({ id: name, name: name })));
            setManageView('batches');
            setSelectedBatchName(null);
            const newActiveParent = { id: college.id, name: college.name };
            setActiveParent(newActiveParent);
            if (pushPath) {
                setHierarchyPath([{ id: college.id, name: college.name, view: 'batches' }]);
            }
        } catch (err) {
            toast.error("Failed to load batches");
        } finally {
            setManageLoading(false);
        }
    };

    const loadDepartmentsForBatch = async (batchName: string, pushPath = true) => {
        setManageLoading(true);
        try {
            const [batches, allDepartments] = await Promise.all([
                batchService.getBatchesByCollegeAndName(college.id, batchName),
                departmentService.getDepartments(college.id)
            ]);
            
            const data = batches.filter(b => b.department).map(b => {
                const deptDetails = allDepartments.find(d => d.id === b.department);
                return {
                    id: b.department,
                    name: b.department_name || deptDetails?.name,
                    short_form: deptDetails?.short_form || '',
                    batchId: b.id,
                    semesters: b.semesters || []
                };
            });

            setHierarchyData(data);
            setManageView('departments');
            setSelectedBatchName(batchName);
            const newActiveParent = { id: batchName, name: `Batch ${batchName}` };
            setActiveParent(newActiveParent);
            if (pushPath) {
                setHierarchyPath(prev => [...prev, { ...newActiveParent, view: 'departments' }]);
            }
        } catch (err) {
            toast.error("Failed to load departments for batch");
        } finally {
            setManageLoading(false);
        }
    };

    const loadSemestersForManager = async (deptId: string | number, pushPath = true) => {
        if (!selectedBatchName) return;
        setManageLoading(true);
        try {
            const batches = await batchService.getBatches(deptId);
            const targetBatch = batches.find(b => b.name === selectedBatchName);

            let deptName = "Department";
            const dept = hierarchyData.find(d => d.id === deptId);
            if (dept) deptName = dept.name;

            if (!targetBatch) {
                setHierarchyData([]);
                setManageView('semesters');
                const newActiveParent = { id: deptId, name: deptName };
                setActiveParent(newActiveParent);
                if (pushPath) {
                    setHierarchyPath(prev => [...prev, { ...newActiveParent, view: 'semesters' }]);
                }
                return;
            }

            const data = await semesterService.getSemesters(targetBatch.id);
            setHierarchyData(data);
            setManageView('semesters');
            const newActiveParent = { id: deptId, name: deptName, batchId: targetBatch.id };
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
            let semName = "Semester";
            const sem = hierarchyData.find(s => s.id === semId);
            if (sem) semName = `Semester ${sem.number}`;

            setHierarchyData(data);
            setManageView('sections');
            const newActiveParent = { id: semId, name: semName };
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
            if (manageView === 'batches') {
                toast.error("Cannot delete batch from grouped view. Delete from department level.");
                return;
            } else if (manageView === 'departments') {
                await departmentService.deleteDepartment(id);
                loadDepartmentsForBatch(selectedBatchName!, false);
            } else if (manageView === 'semesters') {
                await semesterService.deleteSemester(id);
                loadSemestersForManager(activeParent!.id, false);
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

        const currentPath = hierarchyPath[hierarchyPath.length - 1] as any;
        let batchId = currentPath.batchId;

        if (!batchId) {
            setManageLoading(true);
            try {
                const batch = await batchService.createBatch({
                    department: activeParent.id,
                    college: college.id,
                    name: selectedBatchName!
                });
                batchId = batch.id;
            } catch (err) {
                toast.error("Failed to create batch for department");
                setManageLoading(false);
                return;
            }
        }

        setManageLoading(true);
        try {
            for (let i = 1; i <= 8; i++) {
                await semesterService.createSemester({
                    batch: batchId,
                    number: i,
                    is_current: i === 1
                });
            }
            toast.success("8 Semesters initialized");
            loadSemestersForManager(activeParent.id, false);
        } catch (err) {
            toast.error("Failed to generate semesters");
        } finally {
            setManageLoading(false);
        }
    };

    const handleBulkInitializeSemesters = async () => {
        if (manageView !== 'departments' || !selectedBatchName) return;

        const confirmBulk = confirm(`Are you sure you want to initialize 8 semesters for all empty departments in Batch ${selectedBatchName}?`);
        if (!confirmBulk) return;

        setManageLoading(true);
        try {
            const response = await collegeService.bulkInitializeSemesters(college.id, selectedBatchName);
            if (response.departments_processed_count > 0) {
                toast.success(response.message || `Successfully initialized semesters for ${response.departments_processed_count} departments`);
                loadDepartmentsForBatch(selectedBatchName, false);
            } else {
                toast.info("No empty departments found to initialize.");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed during bulk initialization");
        } finally {
            setManageLoading(false);
        }
    };

    const handleBulkInitializeSections = async () => {
        if (manageView !== 'semesters' || !activeParent || selectedSectionLimit === 0) return;

        setIsAdding(true);
        try {
            const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            const targetSections = sections.slice(0, selectedSectionLimit);
            const sectionsToDelete = sections.slice(selectedSectionLimit);

            let initializedCount = 0;
            let deletedCount = 0;

            for (const sem of hierarchyData) {
                const existingSections = await sectionService.getSections(sem.id);
                for (const sectionName of targetSections) {
                    if (!existingSections.find(s => s.name.toUpperCase() === sectionName)) {
                        await sectionService.createSection({ semester: sem.id, name: sectionName });
                        initializedCount++;
                    }
                }
                for (const sectionName of sectionsToDelete) {
                    const extraSection = existingSections.find(s => s.name.toUpperCase() === sectionName);
                    if (extraSection) {
                        await sectionService.deleteSection(extraSection.id);
                        deletedCount++;
                    }
                }
            }

            toast.success(`Synched sections. Added ${initializedCount}, removed ${deletedCount}.`);
            setIsBulkSectionsDialogOpen(false);
            if (activeParent) loadSemestersForManager(activeParent.id, false);
        } catch (err) {
            toast.error("Failed during bulk section synchronization");
        } finally {
            setIsAdding(false);
        }
    };

    const handleAddItem = async () => {
        let nameToAdd = newItemName.trim();
        if (manageView === 'batches') {
            if (!startYear || !endYear) {
                toast.error("Start and End years are required");
                return;
            }
            if (parseInt(endYear) <= parseInt(startYear)) {
                toast.error("End year must be after start year");
                return;
            }
            nameToAdd = `${startYear}-${endYear}`;
        }

        if (!nameToAdd && manageView !== 'batches' && (manageView !== 'departments' || addMode === 'manual')) {
            toast.error("Name is required");
            return;
        }

        setIsAdding(true);
        try {
            if (manageView === 'batches') {
                await batchService.createBatch({
                    college: college.id,
                    name: nameToAdd
                });
                loadUniqueBatches(false);
            } else if (manageView === 'departments') {
                const departmentsToCreate = addMode === 'preset' ? selectedPresets : [{ name: nameToAdd, short_form: newItemShortForm }];

                if (departmentsToCreate.length === 0) {
                    toast.error("Please select at least one department");
                    setIsAdding(false);
                    return;
                }

                const existingDepts = await departmentService.getDepartments(college.id);

                if (addMode === 'manual') {
                    const isDuplicate = existingDepts.some(d => 
                        d.name.toLowerCase() === nameToAdd.toLowerCase() || 
                        d.short_form?.toLowerCase() === newItemShortForm.toLowerCase()
                    );
                    if (isDuplicate) {
                        toast.error("Department with this code already exists");
                        setIsAdding(false);
                        return;
                    }
                }

                for (const deptData of departmentsToCreate) {
                    let dept = existingDepts.find(d => d.name.toLowerCase() === deptData.name.toLowerCase());

                    if (!dept) {
                        dept = await departmentService.createDepartment({
                            college: college.id,
                            name: deptData.name,
                            short_form: deptData.short_form
                        });
                    }
                    await batchService.createBatch({
                        college: college.id,
                        department: dept.id,
                        name: selectedBatchName!
                    });
                }

                loadDepartmentsForBatch(selectedBatchName!, false);
            } else if (manageView === 'semesters') {
                const currentPath = hierarchyPath[hierarchyPath.length - 1] as any;
                let batchId = currentPath.batchId;
                if (!batchId) {
                    const batch = await batchService.createBatch({
                        department: activeParent!.id,
                        college: college.id,
                        name: selectedBatchName!
                    });
                    batchId = batch.id;
                }
                const number = parseInt(nameToAdd);
                if (isNaN(number)) throw new Error("Invalid semester number");
                await semesterService.createSemester({ batch: batchId, number });
                loadSemestersForManager(activeParent!.id, false);
            } else if (manageView === 'sections') {
                await sectionService.createSection({ semester: activeParent!.id, name: nameToAdd });
                loadSectionsForManage(activeParent!.id, false);
            }

            setNewItemName("");
            setNewItemShortForm("");
            setSelectedPresets([]);
            setStartYear("");
            setEndYear("");
            setIsAddDialogOpen(false);
            toast.success(`${manageView.slice(0, -1)} added successfully`);
        } catch (err: any) {
            toast.error(err.message || "Failed to add item");
        } finally {
            setIsAdding(false);
        }
    };

    const handleEditDepartment = async () => {
        if (!editDeptName.trim() || !editDeptShortForm.trim()) {
            toast.error("Name and short form are required");
            return;
        }
        setIsAdding(true);
        try {
            const existingDepts = await departmentService.getDepartments(college.id);
            const isDuplicate = existingDepts.some(d => 
                d.id !== editingDept.id && (
                d.name.toLowerCase() === editDeptName.trim().toLowerCase() || 
                d.short_form?.toLowerCase() === editDeptShortForm.trim().toLowerCase()
                )
            );
            if (isDuplicate) {
                toast.error("Department with this code or name already exists");
                setIsAdding(false);
                return;
            }

            await departmentService.updateDepartment(editingDept.id, {
                name: editDeptName.trim(),
                short_form: editDeptShortForm.trim()
            });
            toast.success("Department updated successfully");
            setIsEditDialogOpen(false);
            loadDepartmentsForBatch(selectedBatchName!, false);
        } catch (err: any) {
            toast.error(err.message || "Failed to update department");
        } finally {
            setIsAdding(false);
        }
    };

    const getFilteredData = () => {
        if (!searchQuery) return hierarchyData;
        return hierarchyData.filter((item: any) => {
            const name = item.name ? item.name.toString().toLowerCase() : '';
            const number = item.number ? item.number.toString() : '';
            const query = searchQuery.toLowerCase();
            return name.includes(query) || number.includes(query);
        });
    };

    const getDialogTitle = () => {
        switch (manageView) {
            case 'batches': return "Add New Batch Period";
            case 'departments': return "Add New Department";
            case 'semesters': return "Add New Semester";
            case 'sections': return "Add New Section";
            default: return "Add Item";
        }
    };

    const filteredData = getFilteredData();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            {/* Breadcrumbs Section */}
            <div className="bg-card p-3 px-6 rounded-xl border border-border shadow-sm flex items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Layers className="h-4 w-4 text-primary" />
                    </div>
                </div>
                {hierarchyPath.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />}
                        <button
                            onClick={() => {
                                if (idx === hierarchyPath.length - 1) return;
                                if (idx === 0) loadUniqueBatches(false);
                                else if (crumb.view === 'departments') loadDepartmentsForBatch(crumb.id.toString(), false);
                                else if (crumb.view === 'semesters') loadSemestersForManager(crumb.id, false);
                                setHierarchyPath(hierarchyPath.slice(0, idx + 1));
                            }}
                            className={`text-[10px] whitespace-nowrap font-bold tracking-widest   transition-colors cursor-pointer ${idx === hierarchyPath.length - 1 ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                                }`}
                        >
                            {crumb.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <h3 className="text-3xl font-bold text-foreground">
                            {manageView.charAt(0).toUpperCase() + manageView.slice(1)}
                        </h3>
                        <p className="text-muted-foreground text-sm font-medium">
                            Select a {manageView.slice(0, -1)} to manage {
                                manageView === 'batches' ? 'departments' :
                                    manageView === 'departments' ? 'semesters' :
                                        manageView === 'semesters' ? 'sections' : 'content'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1">
                        <div className="relative flex-grow md:flex-grow-0 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`Search ${manageView}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-11 w-[200px] md:w-64 border-border bg-card"
                            />
                        </div>

                        {manageView === 'departments' && hierarchyData.length > 0 && (
                            <Button
                                onClick={handleBulkInitializeSemesters}
                                variant="outline"
                                className="border-primary text-primary hover:bg-primary/10 px-6 h-11 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm   tracking-wide whitespace-nowrap shrink-0"
                            >
                                <Zap className="h-4 w-4 fill-primary/20" />
                                BULK INITIALIZE SEMESTERS
                            </Button>
                        )}

                        {manageView === 'semesters' && hierarchyData.length > 0 && (
                            <Button
                                onClick={() => setIsBulkSectionsDialogOpen(true)}
                                variant="outline"
                                className="border-primary text-primary hover:bg-primary/10 px-6 h-11 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm   tracking-wide whitespace-nowrap shrink-0"
                            >
                                <Zap className="h-4 w-4 fill-primary/20" />
                                BULK INITIALIZE SECTIONS
                            </Button>
                        )}

                        <Button
                            onClick={() => setIsAddDialogOpen(true)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-11 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg   tracking-wide whitespace-nowrap shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            ADD {manageView.slice(0, -1)}
                        </Button>
                    </div>
                </div>

                {manageLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-12">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-48 bg-card animate-pulse rounded-2xl border border-border shadow-sm" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredData.map((item: any) => (
                            <Card
                                key={item.id}
                                className="bg-card border border-border shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300 rounded-2xl overflow-hidden group cursor-pointer relative"
                                onClick={() => {
                                    if (manageView === 'batches') loadDepartmentsForBatch(item.name);
                                    else if (manageView === 'departments') loadSemestersForManager(item.id);
                                    else if (manageView === 'semesters') loadSectionsForManage(item.id);
                                }}
                            >
                                <CardHeader className="p-6 pb-2">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 font-bold group-hover:scale-110 transition-transform">
                                        {manageView === 'batches' ? <Calendar className="h-6 w-6" /> :
                                            manageView === 'departments' ? <Building2 className="h-6 w-6" /> :
                                                manageView === 'semesters' ? <Clock className="h-6 w-6" /> :
                                                    <Hash className="h-6 w-6" />}
                                    </div>
                                    <h4 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors   truncate">
                                        {manageView === 'batches' ? `BATCH ${item.name}` :
                                            manageView === 'semesters' ? `SEMESTER ${item.number}` : item.name}
                                    </h4>
                                </CardHeader>
                                <CardContent className="p-6 pt-4 space-y-6 flex-grow flex flex-col justify-between">
                                    <div className="flex flex-col gap-2">
                                        {manageView === 'departments' && (
                                            <div className="flex gap-1.5 flex-wrap">
                                                {item.semesters?.length > 0 ? (
                                                    // Map sorted semesters
                                                    [...item.semesters].sort((a: any, b: any) => a.number - b.number).map((sem: any) => (
                                                        <span key={sem.id} className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-sm border border-primary/20">
                                                            SEM {sem.number}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs font-medium text-muted-foreground">0 Semesters</span>
                                                )}
                                            </div>
                                        )}

                                        {manageView === 'semesters' && (
                                            <div className="flex gap-1.5 flex-wrap">
                                                {item.sections?.length > 0 ? (
                                                    // Map sorted sections
                                                    [...item.sections].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((sec: any) => (
                                                        <span key={sec.id} className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-sm border border-primary/20">
                                                            {sec.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs font-medium text-muted-foreground">0 Sections</span>
                                                )}
                                            </div>
                                        )}

                                        {manageView === 'sections' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-foreground">
                                                    {item.student_count || 0} Students
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-end mt-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (manageView === 'batches') loadDepartmentsForBatch(item.name);
                                                else if (manageView === 'departments') loadSemestersForManager(item.id);
                                                else if (manageView === 'semesters') loadSectionsForManage(item.id);
                                            }}
                                            className="text-xs font-bold text-primary hover:underline   tracking-tighter flex items-center gap-1 group/btn cursor-pointer"
                                        >
                                            MANAGE
                                            <ChevronRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>

                                    {/* Absolute buttons for Edit/Delete that appear on hover */}
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {manageView === 'departments' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingDept(item);
                                                    setEditDeptName(item.name || "");
                                                    setEditDeptShortForm(item.short_form || "");
                                                    setIsEditDialogOpen(true);
                                                }}
                                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteHierarchyItem(item.id);
                                            }}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {filteredData.length === 0 && (
                            <div className="col-span-full py-24 flex flex-col items-center justify-center bg-card rounded-2xl border border-dashed border-border shadow-sm">
                                <div className="w-16 h-16 bg-muted flex items-center justify-center rounded-2xl mb-4">
                                    <Search className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-sm font-bold text-muted-foreground   tracking-widest">
                                    {searchQuery ? `No results for "${searchQuery}"` : "No Items Initialized"}
                                </h3>
                                {!searchQuery && manageView === 'semesters' && (
                                    <Button
                                        onClick={handleAutoGenerateSemesters}
                                        className="mt-6 bg-primary text-primary-foreground rounded-lg px-6 h-11 font-bold text-xs border-none"
                                    >
                                        AUTO-GENERATE 8 SEMESTERS
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Item Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                    setSelectedPresets([]);
                    setNewItemName("");
                    setNewItemShortForm("");
                }
            }}>
                <DialogContent className={manageView === 'departments' && addMode === 'preset' ? "sm:max-w-2xl max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
                    <DialogHeader>
                        <DialogTitle>{getDialogTitle()}</DialogTitle>
                        <DialogDescription>
                            {manageView === 'departments'
                                ? "Select existing departments or create a new one to link with this batch."
                                : `Enter the details below to add a new ${manageView.slice(0, -1)}.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {manageView === 'batches' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold   tracking-wider text-muted-foreground">Start Year</label>
                                    <Input
                                        placeholder="YYYY"
                                        value={startYear}
                                        onChange={(e) => setStartYear(e.target.value)}
                                        className="font-bold border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold   tracking-wider text-muted-foreground">End Year</label>
                                    <Input
                                        placeholder="YYYY"
                                        value={endYear}
                                        onChange={(e) => setEndYear(e.target.value)}
                                        className="font-bold border-border"
                                    />
                                </div>
                            </div>
                        ) : manageView === 'departments' ? (
                            <Tabs value={addMode} onValueChange={(v: any) => setAddMode(v)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="preset" className="text-xs font-bold  ">Standard List</TabsTrigger>
                                    <TabsTrigger value="manual" className="text-xs font-bold  ">Manual Entry</TabsTrigger>
                                </TabsList>

                                <TabsContent value="preset" className="space-y-6">
                                    {DEPARTMENT_CATEGORIES.map((cat, catIdx) => (
                                        <div key={catIdx} className="space-y-3">
                                            <div className="flex items-center gap-2 border-b border-border pb-2">
                                                <span className="text-lg">{cat.icon}</span>
                                                <h4 className="text-sm font-bold text-foreground   tracking-tight">{cat.name}</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {cat.departments.map((dept, deptIdx) => {
                                                    const isSelected = selectedPresets.some(p => p.name === dept.name);
                                                    return (
                                                        <div
                                                            key={deptIdx}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedPresets(prev => prev.filter(p => p.name !== dept.name));
                                                                } else {
                                                                    setSelectedPresets(prev => [...prev, dept]);
                                                                }
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${isSelected
                                                                    ? "bg-primary/5 border-primary shadow-sm"
                                                                    : "bg-card border-border hover:border-primary/50"
                                                                }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "bg-card border-border"
                                                                }`}>
                                                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-[11px] font-bold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                                                                    {dept.name}
                                                                </span>
                                                                <span className="text-[10px] font-medium text-muted-foreground">({dept.short_form})</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>

                                <TabsContent value="manual" className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold   tracking-wider text-muted-foreground">Department Name</label>
                                        <Input
                                            placeholder="Enter department name"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            className="font-bold border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold   tracking-wider text-muted-foreground">Short Form / Shortcut</label>
                                        <Input
                                            placeholder="e.g. CSE"
                                            value={newItemShortForm}
                                            onChange={(e) => setNewItemShortForm(e.target.value)}
                                            className="font-bold border-border  "
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold   tracking-wider text-muted-foreground">{manageView.slice(0, -1)} Name/Number</label>
                                <Input
                                    placeholder={manageView === 'semesters' ? "e.g. 1" : `Enter ${manageView.slice(0, -1)} name`}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    className="font-bold border-border  "
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddItem} disabled={isAdding}>
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Add {manageView.slice(0, -1)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Department Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                        <DialogDescription>
                            Update the department details below. Note that changing this will affect all linked batches.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold tracking-wider text-muted-foreground">Department Name</label>
                            <Input
                                placeholder="Enter department name"
                                value={editDeptName}
                                onChange={(e) => setEditDeptName(e.target.value)}
                                className="font-bold border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold tracking-wider text-muted-foreground">Short Form / Shortcut</label>
                            <Input
                                placeholder="e.g. CSE"
                                value={editDeptShortForm}
                                onChange={(e) => setEditDeptShortForm(e.target.value)}
                                className="font-bold border-border"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditDepartment} disabled={isAdding}>
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Sections Dialog */}
            <Dialog open={isBulkSectionsDialogOpen} onOpenChange={setIsBulkSectionsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Synchronize Sections (A-J)</DialogTitle>
                        <DialogDescription>
                            This will create the specified number of sections across <strong>all semesters</strong> in this department.
                            It will automatically delete any extra sections beyond your selection.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-5 gap-3 py-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                            const sectionLetter = String.fromCharCode(64 + num); // A, B, C...
                            const isSelected = selectedSectionLimit === num;
                            return (
                                <button
                                    key={num}
                                    onClick={() => setSelectedSectionLimit(num)}
                                    className={`h-12 rounded-lg font-bold border transition-all ${isSelected
                                            ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                            : "bg-card border-border text-muted-foreground hover:border-primary/50"
                                        }`}
                                >
                                    To {sectionLetter}
                                </button>
                            );
                        })}
                    </div>
                    {selectedSectionLimit > 0 && (
                        <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-primary">Applying up to Section {String.fromCharCode(64 + selectedSectionLimit)}</p>
                                <p className="text-primary/70 mt-1">
                                    All semesters will be synced to have sections {
                                        Array.from({ length: selectedSectionLimit }, (_, i) => String.fromCharCode(65 + i)).join(', ')
                                    }. Existing sections beyond this limit will be permanently deleted.
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsBulkSectionsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkInitializeSections} disabled={isAdding || selectedSectionLimit === 0}>
                            {isAdding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Synchronize Sections
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Academics;
