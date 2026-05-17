import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { BookOpen, Building2, ChevronRight, Edit, Plus, Search, Trash2, Loader2, BookA, GraduationCap } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    fetchSubjects,
    createSubject,
    deleteSubject,
    updateSubject,
    fetchColleges,
    Subject,
    CollegeBasic,
} from "@/services/subjectService";
import { collegeService, University } from "@/services/collegeService";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from '@/components/common/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type MainTab = "global" | "colleges" | "auto";

const AdminSubjects: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { tab } = useParams<{ tab: string }>();

    // Derived states
    const activeTab: MainTab = (tab as MainTab) || "auto";

    if (activeTab === "auto") {
        return <Navigate to="/admin/subjects/global" replace />;
    }

    // Global Subjects State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
    const [subjectsLoading, setSubjectsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [productTypeFilter, setProductTypeFilter] = useState<"all" | "campus" | "assessments">("all");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Colleges State
    const [colleges, setColleges] = useState<CollegeBasic[]>([]);
    const [filteredColleges, setFilteredColleges] = useState<CollegeBasic[]>([]);
    const [collegesLoading, setCollegesLoading] = useState(false);
    const [collegeSearchQuery, setCollegeSearchQuery] = useState("");

    // Universities
    const [universities, setUniversities] = useState<University[]>([]);
    const [loadingUniversities, setLoadingUniversities] = useState(false);


    // Modal States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newSubject, setNewSubject] = useState<{
        subject_name: string;
        short_code: string;
        product_type: 'campus' | 'assessments';
        university?: string | number;
    }>({
        subject_name: "",
        short_code: "",
        product_type: "campus",
        university: "",
    });
    const [saving, setSaving] = useState(false);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editSubjectId, setEditSubjectId] = useState<string | number | null>(null);

    const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadSubjects();
        loadUniversities();
    }, []);


    useEffect(() => {
        if (activeTab === "colleges" && colleges.length === 0) {
            loadColleges();
        }
    }, [activeTab]);

    useEffect(() => {
        let result = [...subjects];

        // Sort by yuvro_id
        result.sort((a, b) => {
            const idA = a.yuvro_id || "";
            const idB = b.yuvro_id || "";
            return idA.localeCompare(idB);
        });

        if (productTypeFilter !== "all") {
            result = result.filter(s => (s.product_type || 'campus') === productTypeFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (s) =>
                    s.subject_name.toLowerCase().includes(query) ||
                    (s.short_code && s.short_code.toLowerCase().includes(query)) ||
                    (s.yuvro_id && s.yuvro_id.toLowerCase().includes(query))
            );
        }

        setFilteredSubjects(result);
        setCurrentPage(1); // Reset to first page when filters change
    }, [searchQuery, productTypeFilter, subjects]);

    // Derived pagination data
    const totalPages = Math.ceil(filteredSubjects.length / ITEMS_PER_PAGE);
    const paginatedSubjects = filteredSubjects.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        if (!collegeSearchQuery.trim()) {
            setFilteredColleges(colleges);
        } else {
            const query = collegeSearchQuery.toLowerCase();
            setFilteredColleges(colleges.filter((c) => c.name.toLowerCase().includes(query)));
        }
    }, [collegeSearchQuery, colleges]);

    const loadSubjects = async () => {
        try {
            setSubjectsLoading(true);
            const data = await fetchSubjects();
            setSubjects(data as Subject[]);
            setFilteredSubjects(data as Subject[]);
        } catch (err) {
            console.error("Failed to load subjects", err);
            toast.error("Failed to load global subjects from server");
        } finally {
            setSubjectsLoading(false);
        }
    };

    const loadUniversities = async () => {
        try {
            setLoadingUniversities(true);
            const data = await collegeService.getUniversities();
            setUniversities(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingUniversities(false);
        }
    };

    const loadColleges = async () => {
        try {
            setCollegesLoading(true);
            const data = await fetchColleges();
            setColleges(data);
            setFilteredColleges(data);
        } catch (err) {
            console.error("Failed to load colleges", err);
            toast.error("Failed to load colleges from server");
        } finally {
            setCollegesLoading(false);
        }
    };

    const handleCreateSubject = async () => {
        if (!newSubject.subject_name.trim()) {
            toast.error("Subject name is required");
            return;
        }
        try {
            setSaving(true);
            await createSubject(newSubject);
            toast.success("Subject created successfully!");
            setNewSubject({ subject_name: "", short_code: "", product_type: "campus" });
            setIsAddOpen(false);
            loadSubjects();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create subject");
        } finally {
            setSaving(false);
        }
    };

    const openEditSubjectModal = (subject: Subject) => {
        setEditSubjectId(subject.id);
        setNewSubject({
            subject_name: subject.subject_name,
            short_code: subject.short_code || "",
            product_type: subject.product_type || "campus",
            university: subject.university || "",
        });
        setIsEditOpen(true);
    };

    const handleUpdateSubject = async () => {
        if (!editSubjectId) return;
        if (!newSubject.subject_name.trim()) {
            toast.error("Subject name is required");
            return;
        }

        try {
            setSaving(true);
            await updateSubject(editSubjectId.toString(), newSubject);
            toast.success("Subject updated successfully!");
            setNewSubject({ subject_name: "", short_code: "", product_type: "campus" });
            setIsEditOpen(false);
            loadSubjects();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to update subject");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;

        try {
            setDeleting(true);
            await deleteSubject(confirmDelete.toString());
            toast.success("Subject completely purged.");
            setConfirmDelete(null);
            loadSubjects();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to delete subject");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-gray-50/50 w-full overflow-hidden">
                <AdminSidebar />
                <div className="flex-1 flex flex-col">
                    <main className="flex-1 p-6 bg-background overflow-y-auto">
                        <div className="mx-auto max-w-7xl">
                            {/* Header Container */}
                            <PageHeader
                                title="Subject Management"
                                actions={activeTab === "global" && (
                                    <Button
                                        onClick={() => setIsAddOpen(true)}
                                        className="font-semibold shadow-sm rounded-lg"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create New Subject
                                    </Button>
                                )}
                            />

                            {/* Navigation Tabs */}
                            <div className="flex items-center space-x-2 border-b border-border/60 mb-8 pb-px">
                                <button
                                    onClick={() => navigate("/admin/subjects/global")}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${activeTab === "global"
                                            ? "text-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-lg"
                                        }`}
                                >
                                    <BookOpen className="h-4 w-4" />
                                    <span className="  tracking-wider">Global Repository</span>
                                    <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'global' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {subjects.length}
                                    </span>
                                    {activeTab === "global" && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(0,0,0,0.1)]" />
                                    )}
                                </button>
                                <button
                                    onClick={() => navigate("/admin/subjects/colleges")}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${activeTab === "colleges"
                                            ? "text-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-lg"
                                        }`}
                                >
                                    <Building2 className="h-4 w-4" />
                                    <span className="  tracking-wider">Colleges Catalogue</span>
                                    <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'colleges' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {colleges.length}
                                    </span>
                                    {activeTab === "colleges" && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(0,0,0,0.1)]" />
                                    )}
                                </button>
                            </div>

                            {/* Content Area */}

                            {activeTab === "global" && (
                                <div className="space-y-6">
                                    {/* Search and Filter */}
                                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-2">
                                        <div className="relative flex-1 w-full max-w-lg">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by ID, code, or exact nomenclature..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 bg-background/50 border-muted-foreground/20 h-11 shadow-sm rounded-xl focus-visible:ring-primary focus-visible:border-primary"
                                            />
                                        </div>
                                        <div className="w-full sm:w-auto flex items-center gap-2">
                                            <select
                                                value={productTypeFilter}
                                                onChange={(e) => setProductTypeFilter(e.target.value as "all" | "campus" | "assessments")}
                                                className="h-11 px-4 py-2 bg-background/50 border border-muted-foreground/20 rounded-xl shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                                            >
                                                <option value="all">All Products</option>
                                                <option value="campus">Campus</option>
                                                <option value="assessments">Assessments</option>
                                            </select>
                                            {(searchQuery || productTypeFilter !== "all") && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSearchQuery("");
                                                        setProductTypeFilter("all");
                                                    }}
                                                    className="h-11 px-4 text-muted-foreground hover:text-foreground"
                                                >
                                                    Clear Filters
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {subjectsLoading ? (
                                        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                            <span className="text-sm font-medium tracking-wide">Synchronizing global catalogue...</span>
                                        </div>
                                    ) : filteredSubjects.length === 0 ? (
                                        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 bg-background border border-dashed border-border rounded-xl">
                                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-2">
                                                <BookA className="h-8 w-8 text-muted-foreground/50" />
                                            </div>
                                            <h3 className="font-semibold text-lg max-w-[250px] text-center text-foreground w-full">
                                                {searchQuery ? "No matches recorded" : "Catalogue Empty"}
                                            </h3>
                                            <p className="text-sm text-muted-foreground max-w-sm text-center">
                                                {searchQuery
                                                    ? `We couldn't locate any subject matching "${searchQuery}" inside the global pool.`
                                                    : "There are no subjects generated currently in the global pool."}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-background rounded-xl border border-border/60 shadow-sm overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                                        <thead className="text-xs text-muted-foreground   bg-muted/40 border-b border-border/60">
                                                            <tr>
                                                                <th scope="col" className="px-6 py-4 font-semibold">Subject Name</th>
                                                                <th scope="col" className="px-6 py-4 font-semibold">ID</th>
                                                                <th scope="col" className="px-6 py-4 font-semibold">Code</th>
                                                                <th scope="col" className="px-6 py-4 font-semibold">University</th>
                                                                <th scope="col" className="px-6 py-4 font-semibold text-center">Colleges</th>
                                                                <th scope="col" className="px-6 py-4 font-semibold">Product Type</th>
                                                                <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/60">
                                                            {paginatedSubjects.map((subject) => (
                                                                <tr
                                                                    key={subject.id}
                                                                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                                                                    onClick={() => navigate(`/admin/subjects/${subject.id}/manage`)}
                                                                >
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                                                                <BookOpen className="h-5 w-5" />
                                                                            </div>
                                                                            <div className="font-semibold text-foreground max-w-[300px] truncate" title={subject.subject_name}>
                                                                                {subject.subject_name}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="text-[10px] font-bold tracking-widest   text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
                                                                            {subject.yuvro_id || subject.id.toString().substring(0, 8)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {subject.short_code && (
                                                                            <span className="text-xs font-bold tracking-wider text-primary">
                                                                                {subject.short_code}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                                            <GraduationCap className="h-3 w-3" />
                                                                            {universities.find(u => u.id == subject.university)?.name || 'N/A'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border/50">
                                                                            {subject.college_count || 0}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className={`text-[10px] font-bold tracking-widest   px-2.5 py-1 rounded-md border ${subject.product_type === 'assessments'
                                                                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                                : "border-blue-200 bg-blue-50 text-blue-700"
                                                                            }`}>
                                                                            {subject.product_type || 'campus'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 px-3 text-xs font-semibold text-primary group-hover:bg-primary/10"
                                                                                onClick={() => navigate(`/admin/subjects/${subject.id}/manage`)}
                                                                            >
                                                                                CONFIGURE
                                                                            </Button>
                                                                            {user?.role === "admin" && (
                                                                                <>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="icon"
                                                                                        onClick={() => openEditSubjectModal(subject)}
                                                                                        className="h-8 w-8 rounded-lg bg-background hover:bg-secondary border-border/50 shadow-sm"
                                                                                    >
                                                                                        <Edit className="h-3.5 w-3.5 text-foreground/70" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="icon"
                                                                                        onClick={() => setConfirmDelete(subject.id)}
                                                                                        className="h-8 w-8 rounded-lg bg-background hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive border-border/50 shadow-sm transition-colors"
                                                                                    >
                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {totalPages > 1 && (
                                                <div className="flex items-center justify-between pt-2">
                                                    <div className="text-sm text-muted-foreground">
                                                        Showing <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredSubjects.length)}</span> of <span className="font-medium text-foreground">{filteredSubjects.length}</span> results
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={currentPage === 1}
                                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                            className="h-8 shadow-sm"
                                                        >
                                                            Previous
                                                        </Button>
                                                        <div className="text-sm font-medium px-2">
                                                            Page {currentPage} of {totalPages}
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={currentPage === totalPages}
                                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                            className="h-8 shadow-sm"
                                                        >
                                                            Next
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === "colleges" && (
                                <div className="space-y-6">
                                    <div className="relative max-w-lg">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search mapped colleges..."
                                            value={collegeSearchQuery}
                                            onChange={(e) => setCollegeSearchQuery(e.target.value)}
                                            className="pl-9 bg-background/50 border-muted-foreground/20 h-11 shadow-sm rounded-xl focus-visible:ring-primary focus-visible:border-primary"
                                        />
                                    </div>

                                    {collegesLoading ? (
                                        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                            <span className="text-sm font-medium tracking-wide">Discovering localized institutions...</span>
                                        </div>
                                    ) : filteredColleges.length === 0 ? (
                                        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 bg-background border border-dashed border-border rounded-xl">
                                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-2">
                                                <Building2 className="h-8 w-8 text-muted-foreground/50" />
                                            </div>
                                            <h3 className="font-semibold text-lg text-center text-foreground">
                                                {collegeSearchQuery ? "No colleges discovered" : "Ecosystem Empty"}
                                            </h3>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                            {filteredColleges.map((college) => (
                                                <Card
                                                    key={college.id}
                                                    className="group hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-background cursor-pointer overflow-hidden relative"
                                                    onClick={() => navigate(`/admin/subjects/colleges/${college.id}`)}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-tl from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                    <CardContent className="p-6 flex flex-col justify-between h-full gap-5">
                                                        <div className="flex gap-4">
                                                            <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center">
                                                                <Building2 className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-bold text-base leading-tight truncate text-foreground mb-1 mt-0.5">
                                                                    {college.name}
                                                                </h3>
                                                                {college.location ? (
                                                                    <p className="text-xs text-muted-foreground line-clamp-2">{college.location}</p>
                                                                ) : (
                                                                    <p className="text-xs text-muted-foreground/50 italic">Location unassigned</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="mt-auto border-t border-border pt-4 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1.5   tracking-wide group/btn">
                                                                Explore Academics
                                                            </span>
                                                            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                                                                <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Create/Edit Modals mapped precisely from legacy app */}
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogContent className="sm:max-w-[450px]">
                                <DialogHeader>
                                    <DialogTitle className="text-xl">Allocate New Subject</DialogTitle>
                                    <DialogDescription>
                                        Input the nomenclature for this globally available item.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-5 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name" className="text-sm font-semibold">Subject Name <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="name"
                                            autoComplete="off"
                                            value={newSubject.subject_name}
                                            onChange={(e) => setNewSubject({ ...newSubject, subject_name: e.target.value })}
                                            placeholder="Engineered Calculus V"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="code" className="text-sm font-semibold">Short Code</Label>
                                        <Input
                                            id="code"
                                            autoComplete="off"
                                            value={newSubject.short_code}
                                            onChange={(e) => setNewSubject({ ...newSubject, short_code: e.target.value })}
                                            placeholder="ECV05"
                                            className="h-11   font-mono placeholder:normal-case placeholder:font-sans"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="product_type" className="text-sm font-semibold">Product Type</Label>
                                        <select
                                            id="product_type"
                                            value={newSubject.product_type}
                                            onChange={(e) => setNewSubject({ ...newSubject, product_type: e.target.value as 'campus' | 'assessments' })}
                                            className="h-11 w-full border-border bg-background rounded-md px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                                        >
                                            <option value="campus">Campus</option>
                                            <option value="assessments">Assessments</option>
                                        </select>
                                    </div>

                                    {newSubject.product_type === 'campus' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="university" className="text-sm font-semibold">University Affiliation</Label>
                                            <Select
                                                value={newSubject.university?.toString()}
                                                onValueChange={v => setNewSubject({ ...newSubject, university: v })}
                                            >
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select University" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {universities.map(u => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                                    ))}
                                                    {universities.length === 0 && <SelectItem value="none" disabled>No universities added</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                </div>
                                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateSubject} disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                        Instantiate
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogContent className="sm:max-w-[450px]">
                                <DialogHeader>
                                    <DialogTitle className="text-xl">Reconfigure Reference</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-5 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-name" className="text-sm font-semibold">Subject Ref Nomenclature <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="edit-name"
                                            autoComplete="off"
                                            value={newSubject.subject_name}
                                            onChange={(e) => setNewSubject({ ...newSubject, subject_name: e.target.value })}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-code" className="text-sm font-semibold">Short Code Identifier</Label>
                                        <Input
                                            id="edit-code"
                                            autoComplete="off"
                                            value={newSubject.short_code}
                                            onChange={(e) => setNewSubject({ ...newSubject, short_code: e.target.value })}
                                            className="h-11   font-mono"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-product_type" className="text-sm font-semibold">Product Type</Label>
                                        <select
                                            id="edit-product_type"
                                            value={newSubject.product_type}
                                            onChange={(e) => setNewSubject({ ...newSubject, product_type: e.target.value as 'campus' | 'assessments' })}
                                            className="h-11 w-full border-border bg-background rounded-md px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                                        >
                                            <option value="campus">Campus</option>
                                            <option value="assessments">Assessments</option>
                                        </select>
                                    </div>

                                    {newSubject.product_type === 'campus' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-university" className="text-sm font-semibold">University Affiliation</Label>
                                            <Select
                                                value={newSubject.university?.toString()}
                                                onValueChange={v => setNewSubject({ ...newSubject, university: v })}
                                            >
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select University" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {universities.map(u => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                                    ))}
                                                    {universities.length === 0 && <SelectItem value="none" disabled>No universities added</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                </div>
                                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                                    <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                    <Button onClick={handleUpdateSubject} disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                        Save Mutation
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
                                        <Trash2 className="h-5 w-5" />
                                        Initiate Destructive Override
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <p className="text-muted-foreground text-sm">
                                        System verification required. Are you sure you wish to permanently purge this subject from the repository? Associated curriculum elements might become orphaned.
                                    </p>
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                                    <Button variant="outline" onClick={() => setConfirmDelete(null)}>Abort</Button>
                                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                                        {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Authorize Purge"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default AdminSubjects;
