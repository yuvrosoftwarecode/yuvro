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
    Plus, Trash2, Layers, AlertCircle, Loader2, Search
} from "lucide-react";
import { collegeService, College } from "@/services/collegeService";
import departmentService from "@/services/departmentService";
import { batchService } from "@/services/batchService";
import semesterService from "@/services/semesterService";
import sectionService from "@/services/sectionService";

interface AcademicsProps {
    college: College;
}

const Academics: React.FC<AcademicsProps> = ({ college }) => {
    // Hierarchy management state
    const [activeCollege, setActiveCollege] = useState<College>(college);
    const [manageView, setManageView] = useState<'departments' | 'batches' | 'semesters' | 'sections'>('departments');
    const [hierarchyPath, setHierarchyPath] = useState<{ id: string | number, name: string, view: any }[]>([]);
    const [activeParent, setActiveParent] = useState<{ id: string | number, name: string } | null>(null);
    const [hierarchyData, setHierarchyData] = useState<any[]>([]);
    const [manageLoading, setManageLoading] = useState(false);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    
    // Dialog & Form State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [startYear, setStartYear] = useState("");
    const [endYear, setEndYear] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        // Initialize with departments
        if (college) {
            setHierarchyData(college.departments || []);
            setActiveParent({ id: college.id, name: college.name });
            setHierarchyPath([{ id: college.id, name: college.name, view: 'departments' }]);
        }
    }, [college]);

    // Clear search when view changes
    useEffect(() => {
        setSearchQuery("");
    }, [manageView, activeParent]);

    const loadDepartmentsForManage = async (collegeId: string | number, pushPath = true) => {
        setManageLoading(true);
        try {
            const data = await departmentService.getDepartments(collegeId);
            setHierarchyData(data);
            setManageView('departments');
            const newActiveParent = { id: collegeId, name: college.name };
            setActiveParent(newActiveParent);
            if (pushPath) {
                setHierarchyPath([{ id: collegeId, name: college.name, view: 'departments' }]);
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
            let deptName = "Department";
            const dept = hierarchyData.find(d => d.id === deptId);
             if(dept) deptName = dept.name;
            else if (hierarchyPath.length > 0) {
                 // Try to resolve from path if we are navigating back/forward
            }

            setHierarchyData(data);
            setManageView('batches');
            const newActiveParent = { id: deptId, name: deptName };
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
            let batchName = "Batch";
            const batch = hierarchyData.find(b => b.id === batchId);
             if(batch) batchName = batch.name;

            setHierarchyData(data);
            setManageView('semesters');
            const newActiveParent = { id: batchId, name: batchName };
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
            if (manageView === 'departments') {
                await departmentService.deleteDepartment(id);
                 const updatedCollege = await collegeService.getCollege(college.id);
                 setActiveCollege(updatedCollege);
                setHierarchyData(updatedCollege.departments || []);
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
            loadSemestersForManage(activeParent.id, false);
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

        if (!nameToAdd && manageView !== 'batches') {
             toast.error("Name is required");
             return;
        }

        setIsAdding(true);
        try {
            if (manageView === 'departments') {
                await departmentService.createDepartment({ college: college.id, name: nameToAdd });
                const updatedCollege = await collegeService.getCollege(college.id);
                 setActiveCollege(updatedCollege);
                 setHierarchyData(updatedCollege.departments || []);
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
            
            // Clean up
            setNewItemName("");
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
            case 'departments': return "Add New Department";
            case 'batches': return "Add New Batch";
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
                                if (crumb.view === 'departments') loadDepartmentsForManage(crumb.id, false);
                                else if (crumb.view === 'batches') loadBatchesForManage(crumb.id, false);
                                else if (crumb.view === 'semesters') loadSemestersForManage(crumb.id, false);
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
                                manageView === 'departments' ? 'batches' :
                                    manageView === 'batches' ? 'semesters' :
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

            {/* Add Item Dialog */}
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{getDialogTitle()}</DialogTitle>
                        <DialogDescription>
                            Enter the details below to add a new {manageView.slice(0, -1)}.
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
        </div>
    );
};

export default Academics;
