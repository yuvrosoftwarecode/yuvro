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
    Check, Zap
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
            { name: "Computer Science & Business Systems", short_form: "CSBS" },
            { name: "Computer Science & Engineering – Data Science", short_form: "CSE-DS" },
            { name: "Computer Science & Engineering – AI", short_form: "CSE-AI" },
            { name: "Computer Science & Engineering – IoT", short_form: "CSE-IoT" },
        ]
    },
    {
        name: "Electrical & Electronics",
        icon: "⚡",
        departments: [
            { name: "Electrical and Electronics Engineering", short_form: "EEE" },
            { name: "Electronics and Communication Engineering", short_form: "ECE" },
            { name: "Electronics and Instrumentation Engineering", short_form: "EIE" },
            { name: "Electronics and Computer Engineering", short_form: "ECmE" },
        ]
    },
    {
        name: "Core Engineering",
        icon: "🏗️",
        departments: [
            { name: "Civil Engineering", short_form: "CE" },
            { name: "Mechanical Engineering", short_form: "ME" },
            { name: "Chemical Engineering", short_form: "CHE" },
            { name: "Metallurgical Engineering", short_form: "MET" },
            { name: "Mining Engineering", short_form: "MIN" },
            { name: "Production Engineering", short_form: "PE" },
        ]
    },
    {
        name: "Emerging & Specialized",
        icon: "🧪",
        departments: [
            { name: "Biomedical Engineering", short_form: "BME" },
            { name: "Biotechnology Engineering", short_form: "BT" },
            { name: "Aeronautical Engineering", short_form: "AE" },
            { name: "Automobile Engineering", short_form: "AUTO" },
            { name: "Mechatronics Engineering", short_form: "MTR" },
            { name: "Agricultural Engineering", short_form: "AGRI" },
            { name: "Petroleum Engineering", short_form: "PET" },
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

    // Bulk Section State
    const [isBulkSectionsDialogOpen, setIsBulkSectionsDialogOpen] = useState(false);
    const [selectedSectionLimit, setSelectedSectionLimit] = useState<number>(0); // 1 = A, 2 = B, etc.

    useEffect(() => {
        // Initialize with unique batches
        loadUniqueBatches(true);
    }, [college]);

    // Clear search when view changes
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
            // Load all batches for this college with this name that have departments
            const batches = await batchService.getBatchesByCollegeAndName(college.id, batchName);
            // Map batches to a format the UI expects (which looks like departments)
            const data = batches.filter(b => b.department).map(b => ({
                id: b.department,
                name: b.department_name,
                batchId: b.id
            }));

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
            // 1. Get batches for this department
            const batches = await batchService.getBatches(deptId);
            const targetBatch = batches.find(b => b.name === selectedBatchName);
            
            let deptName = "Department";
            const dept = hierarchyData.find(d => d.id === deptId);
            if(dept) deptName = dept.name;

            if (!targetBatch) {
                // If batch doesn't exist for this department, we can't show semesters yet
                // The user needs to initialize it or add it
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
             if(sem) semName = `Semester ${sem.number}`;

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
                // Batch deletion is complex here because id is name. 
                // Maybe we don't allow delete from this view or we delete all batches with this name?
                // For now, let's just toast that it's a grouped view.
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
        
        // We need the batch ID. If it's not in activeParent, we need to find/create it.
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
                await semesterService.createSemester({ batch: batchId, number: i });
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
            let initializedCount = 0;
            for (const dept of hierarchyData) {
                // Check if semesters exist for this department-batch combo
                // 1. Get batches for this department
                const batches = await batchService.getBatches(dept.id);
                const targetBatch = batches.find(b => b.name === selectedBatchName);
                
                if (targetBatch) {
                    const existingSemesters = await semesterService.getSemesters(targetBatch.id);
                    if (existingSemesters.length === 0) {
                        // Initialize 8 semesters
                        for (let i = 1; i <= 8; i++) {
                            await semesterService.createSemester({ batch: targetBatch.id, number: i });
                        }
                        initializedCount++;
                    }
                }
            }
            
            if (initializedCount > 0) {
                toast.success(`Successfully initialized 8 semesters for ${initializedCount} departments`);
            } else {
                toast.info("All departments already have semesters initialized");
            }
        } catch (err) {
            toast.error("Failed during bulk initialization");
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

            // hierarchyData contains semesters for the current department
            for (const sem of hierarchyData) {
                // Get existing sections to avoid duplicates and handle deletions
                const existingSections = await sectionService.getSections(sem.id);
                
                // 1. Add missing target sections
                for (const sectionName of targetSections) {
                    if (!existingSections.find(s => s.name.toUpperCase() === sectionName)) {
                        await sectionService.createSection({ semester: sem.id, name: sectionName });
                        initializedCount++;
                    }
                }

                // 2. Delete sections that are in A-J but not in targetRange
                for (const sectionName of sectionsToDelete) {
                    const extraSection = existingSections.find(s => s.name.toUpperCase() === sectionName);
                    if (extraSection) {
                        await sectionService.deleteSection(extraSection.id);
                        deletedCount++;
                    }
                }
            }

            let msg = `Successfully synchronized sections.`;
            if (initializedCount > 0) msg += ` Added ${initializedCount} sections.`;
            if (deletedCount > 0) msg += ` Removed ${deletedCount} extra sections.`;
            
            toast.success(msg);
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
            nameToAdd = `${startYear}-${endYear}`;
        }

        if (!nameToAdd && manageView !== 'batches' && (manageView !== 'departments' || addMode === 'manual')) {
             toast.error("Name is required");
             return;
        }

        setIsAdding(true);
        try {
            if (manageView === 'batches') {
                // Create a global batch at the college level
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

                // Get existing departments once
                const existingDepts = await departmentService.getDepartments(college.id);

                for (const deptData of departmentsToCreate) {
                    let dept = existingDepts.find(d => d.name.toLowerCase() === deptData.name.toLowerCase());
                    
                    if (!dept) {
                        dept = await departmentService.createDepartment({ 
                            college: college.id, 
                            name: deptData.name,
                            short_form: deptData.short_form
                        });
                    }

                    // Now link this department to the batch
                    await batchService.createBatch({ 
                        college: college.id, 
                        department: dept.id,
                        name: selectedBatchName! 
                    });
                }
                
                loadDepartmentsForBatch(selectedBatchName!, false);
            } else if (manageView === 'semesters') {
                // Find or create batch first
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
            
            // Clean up
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
        switch(manageView) {
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
            <div className="bg-white p-3 px-6 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Layers className="h-4 w-4 text-indigo-500" />
                    </div>
                </div>
                {hierarchyPath.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                         {idx > 0 && <ChevronRight className="h-4 w-4 text-slate-300 mx-1" />}
                        <button
                            onClick={() => {
                                if (idx === hierarchyPath.length - 1) return; // Current crumb
                                if (idx === 0) loadUniqueBatches(false);
                                else if (crumb.view === 'departments') loadDepartmentsForBatch(crumb.id.toString(), false);
                                else if (crumb.view === 'semesters') loadSemestersForManager(crumb.id, false);
                                setHierarchyPath(hierarchyPath.slice(0, idx + 1));
                            }}
                            className={`text-[10px] font-black tracking-widest uppercase transition-colors cursor-pointer ${
                                idx === hierarchyPath.length - 1 ? 'text-indigo-500' : 'text-slate-400 hover:text-indigo-500'
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
                        <h3 className="text-3xl font-bold text-slate-900">
                            {manageView.charAt(0).toUpperCase() + manageView.slice(1)}
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">
                            Select a {manageView.slice(0, -1)} to manage {
                                manageView === 'batches' ? 'departments' :
                                    manageView === 'departments' ? 'semesters' :
                                        manageView === 'semesters' ? 'sections' : 'content'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Search Input */}
                        <div className="relative flex-grow md:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={`Search ${manageView}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-11 w-full md:w-64 border-slate-200 bg-white"
                            />
                        </div>

                        {manageView === 'departments' && hierarchyData.length > 0 && (
                            <Button
                                onClick={handleBulkInitializeSemesters}
                                variant="outline"
                                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-6 h-11 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm uppercase tracking-wide whitespace-nowrap"
                            >
                                <Zap className="h-4 w-4 fill-indigo-100" />
                                BULK INITIALIZE SEMESTERS
                            </Button>
                        )}

                        {manageView === 'semesters' && hierarchyData.length > 0 && (
                            <Button
                                onClick={() => setIsBulkSectionsDialogOpen(true)}
                                variant="outline"
                                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-6 h-11 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm uppercase tracking-wide whitespace-nowrap"
                            >
                                <Zap className="h-4 w-4 fill-indigo-100" />
                                BULK INITIALIZE SECTIONS
                            </Button>
                        )}

                        <Button
                            onClick={() => setIsAddDialogOpen(true)}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 h-11 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-100 uppercase tracking-wide whitespace-nowrap"
                        >
                            <Plus className="h-4 w-4" />
                            ADD {manageView.slice(0, -1).toUpperCase()}
                        </Button>
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
                        {filteredData.map((item: any) => (
                            <Card
                                key={item.id}
                                className="bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group cursor-pointer relative"
                                onClick={() => {
                                    if (manageView === 'batches') loadDepartmentsForBatch(item.name);
                                    else if (manageView === 'departments') loadSemestersForManager(item.id);
                                    else if (manageView === 'semesters') loadSectionsForManage(item.id);
                                }}
                            >
                                <CardHeader className="p-6 pb-2">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 mb-6 font-bold group-hover:scale-110 transition-transform">
                                        {manageView === 'batches' ? <Calendar className="h-6 w-6" /> :
                                            manageView === 'departments' ? <Building2 className="h-6 w-6" /> :
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
                                                    if (manageView === 'batches') loadDepartmentsForBatch(item.name);
                                                    else if (manageView === 'departments') loadSemestersForManager(item.id);
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

                        {filteredData.length === 0 && (
                            <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                                <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mb-4">
                                    <Search className="h-8 w-8 text-slate-200" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                    {searchQuery ? `No results for "${searchQuery}"` : "No Items Initialized"}
                                </h3>
                                {!searchQuery && manageView === 'semesters' && (
                                    <Button
                                        onClick={handleAutoGenerateSemesters}
                                        className="mt-6 bg-indigo-600 text-white rounded-lg px-6 h-11 font-bold text-xs border-none shadow-indigo-200 shadow-lg"
                                    >
                                        AUTO-GENERATE 8 SEMESTERS FOR THIS DEPT
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
                                     <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Year</label>
                                    <Input
                                        placeholder="YYYY"
                                        value={startYear}
                                        onChange={(e) => setStartYear(e.target.value)}
                                        className="font-bold border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">End Year</label>
                                    <Input
                                        placeholder="YYYY"
                                        value={endYear}
                                        onChange={(e) => setEndYear(e.target.value)}
                                        className="font-bold border-slate-200"
                                    />
                                </div>
                            </div>
                        ) : manageView === 'departments' ? (
                            <Tabs value={addMode} onValueChange={(v: any) => setAddMode(v)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="preset" className="text-xs font-bold uppercase">Standard List</TabsTrigger>
                                    <TabsTrigger value="manual" className="text-xs font-bold uppercase">Manual Entry</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="preset" className="space-y-6">
                                    {DEPARTMENT_CATEGORIES.map((cat, catIdx) => (
                                        <div key={catIdx} className="space-y-3">
                                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                                <span className="text-lg">{cat.icon}</span>
                                                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{cat.name}</h4>
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
                                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                                                                isSelected 
                                                                    ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                                                                    : "bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                                                isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"
                                                            }`}>
                                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-[11px] font-bold leading-tight ${isSelected ? "text-indigo-900" : "text-slate-700"}`}>
                                                                    {dept.name}
                                                                </span>
                                                                <span className="text-[10px] font-medium text-slate-400">({dept.short_form})</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {selectedPresets.length > 0 && (
                                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-700 uppercase">{selectedPresets.length} items selected</span>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setSelectedPresets([])}
                                                className="text-[10px] font-bold text-indigo-600 uppercase hover:bg-indigo-100"
                                            >
                                                Clear All
                                            </Button>
                                        </div>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="manual" className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department Name</label>
                                        <Input
                                            placeholder="Enter department name"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            className="font-bold border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Short Form / Shortcut</label>
                                        <Input
                                            placeholder="e.g. CSE"
                                            value={newItemShortForm}
                                            onChange={(e) => setNewItemShortForm(e.target.value)}
                                            className="font-bold border-slate-200 uppercase"
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{manageView.slice(0, -1)} Name/Number</label>
                                <Input
                                    placeholder={manageView === 'semesters' ? "e.g. 1" : `Enter ${manageView.slice(0, -1)} name`}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    className="font-bold border-slate-200"
                                    type={manageView === 'semesters' ? 'number' : 'text'}
                                />
                                {manageView === 'semesters' && <p className="text-xs text-slate-500">Enter the semester number (e.g., 1 for Semester 1)</p>}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsAddDialogOpen(false)}
                            disabled={isAdding}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleAddItem}
                            disabled={isAdding}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create {manageView.slice(0, -1)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Section Initialization Dialog */}
            <Dialog open={isBulkSectionsDialogOpen} onOpenChange={setIsBulkSectionsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bulk Initialize Sections</DialogTitle>
                        <DialogDescription>
                            Select the last section to include. Clicking 'C' will initialize sections A, B, and C for all semesters in this department.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-8">
                        <div className="grid grid-cols-5 gap-3">
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((letter, idx) => {
                                const pos = idx + 1;
                                const isSelected = pos <= selectedSectionLimit;
                                return (
                                    <button
                                        key={letter}
                                        onClick={() => setSelectedSectionLimit(pos)}
                                        className={`h-12 w-full rounded-xl border-2 font-black transition-all flex items-center justify-center ${
                                            isSelected 
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105" 
                                                : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-500"
                                        }`}
                                    >
                                        {letter}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedSectionLimit > 0 && (
                            <p className="mt-6 text-center text-xs font-bold text-indigo-600 uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                                Initializing Sections: {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, selectedSectionLimit).join(', ')}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsBulkSectionsDialogOpen(false)}
                            disabled={isAdding}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleBulkInitializeSections}
                            disabled={isAdding || selectedSectionLimit === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isAdding ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Initializing...
                                </>
                            ) : (
                                `Initialize ${selectedSectionLimit} Sections`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Academics;

