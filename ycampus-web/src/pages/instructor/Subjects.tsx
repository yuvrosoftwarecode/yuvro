import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, BookOpen, Building2, ChevronRight, Search } from "lucide-react";
import {
    fetchSubjects,
    createSubject,
    deleteSubject,
    updateSubject,
    fetchColleges,
    Subject,
    CollegeBasic,
} from "@/services/subjectService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import { toast } from "sonner";

type MainTab = "global" | "colleges";

const Subjects: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { tab } = useParams<{ tab: string }>();

    // Main tab state
    const [mainTab, setMainTab] = useState<MainTab>("global");

    useEffect(() => {
        if (tab && (tab === "global" || tab === "colleges")) {
            setMainTab(tab as MainTab);
        } else {
            // Default to global if tab is invalid or missing (though App.tsx handles missing)
            setMainTab("global");
        }
    }, [tab]);

    // Global Subjects Tab
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
    const [subjectsLoading, setSubjectsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Colleges Tab
    const [colleges, setColleges] = useState<CollegeBasic[]>([]);
    const [filteredColleges, setFilteredColleges] = useState<CollegeBasic[]>([]);
    const [collegesLoading, setCollegesLoading] = useState(false);
    const [collegeSearchQuery, setCollegeSearchQuery] = useState("");

    // Add Subject Modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newSubject, setNewSubject] = useState({
        subject_name: "",
        short_code: "",
    });
    const [saving, setSaving] = useState(false);

    // Edit Subject Modal
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editSubjectId, setEditSubjectId] = useState<string | number | null>(null);

    // Delete Confirmation
    const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadSubjects();
    }, []);

    useEffect(() => {
        if (mainTab === "colleges" && colleges.length === 0) {
            loadColleges();
        }
    }, [mainTab]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredSubjects(subjects);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredSubjects(
                subjects.filter(
                    (s) =>
                        s.subject_name.toLowerCase().includes(query) ||
                        s.short_code?.toLowerCase().includes(query) ||
                        s.yuvro_id?.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, subjects]);

    useEffect(() => {
        if (collegeSearchQuery.trim() === "") {
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
            toast.error("Failed to load subjects");
        } finally {
            setSubjectsLoading(false);
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
            toast.error("Failed to load colleges");
        } finally {
            setCollegesLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);

        try {
            await deleteSubject(confirmDelete.toString());
            toast.success("Subject deleted successfully");
            setConfirmDelete(null);
            loadSubjects();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to delete subject");
        } finally {
            setDeleting(false);
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
            toast.success("Subject created successfully");
            setNewSubject({ subject_name: "", short_code: "" });
            setIsAddOpen(false);
            loadSubjects();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create subject");
        } finally {
            setSaving(false);
        }
    };

    const openEditSubjectModal = (subject: Subject) => {
        setEditSubjectId(subject.id);
        setNewSubject({
            subject_name: subject.subject_name,
            short_code: subject.short_code || "",
        });
        setIsEditOpen(true);
    };

    const handleUpdateSubject = async () => {
        if (!editSubjectId) return;

        try {
            setSaving(true);
            await updateSubject(editSubjectId.toString(), newSubject);
            toast.success("Subject updated successfully");
            setNewSubject({ subject_name: "", short_code: "" });
            setIsEditOpen(false);
            loadSubjects();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update subject");
        } finally {
            setSaving(false);
        }
    };

    const headerActions = mainTab === "global" ? (
        <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
        >
            <Plus className="h-4 w-4 mr-2" />
            Add New Subject
        </Button>
    ) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title="Subject Management"
                        subtitle={
                            mainTab === "global"
                                ? "Manage all subjects in the global repository"
                                : "Select a college to manage its subjects"
                        }
                        actions={headerActions}
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Main Tabs */}
                        <div className="mb-6">
                            <nav className="flex space-x-8 border-b border-gray-200">
                                <button
                                    onClick={() => navigate("/instructor/subjects/global")}
                                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-all cursor-pointer ${
                                        mainTab === "global"
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    <BookOpen className="h-5 w-5" />
                                    <span>Global Subjects</span>
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs transition-colors ${
                                            mainTab === "global"
                                                ? "bg-blue-100 text-blue-600"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {subjects.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => navigate("/instructor/subjects/colleges")}
                                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-all cursor-pointer ${
                                        mainTab === "colleges"
                                            ? "border-blue-500 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                                >
                                    <Building2 className="h-5 w-5" />
                                    <span>Colleges</span>
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs transition-colors ${
                                            mainTab === "colleges"
                                                ? "bg-blue-100 text-blue-600"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {colleges.length}
                                    </span>
                                </button>
                            </nav>
                        </div>

                        {/* Global Subjects Tab Content */}
                        {mainTab === "global" && (
                            <>
                                {/* Search Bar */}
                                <div className="mb-6">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="Search by name, code, or Yuvro ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 w-full md:w-96"
                                        />
                                    </div>
                                </div>

                                {subjectsLoading && (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <span className="ml-2 text-gray-600">Loading subjects...</span>
                                    </div>
                                )}

                                {!subjectsLoading && filteredSubjects.length === 0 && (
                                    <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
                                        {searchQuery
                                            ? "No subjects found matching your search."
                                            : "No subjects found. Create one to get started."}
                                    </div>
                                )}

                                {!subjectsLoading && filteredSubjects.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredSubjects.map((subject) => (
                                            <Card
                                                key={subject.id}
                                                className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white rounded-xl cursor-pointer border-none shadow-md"
                                                onClick={() => navigate(`/instructor/subjects/${subject.id}/manage`)}
                                            >
                                                <CardContent className="p-0">
                                                    <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-4 text-white hover:brightness-110 transition-all">
                                                        <div className="flex items-center gap-2 mb-2 text-white/70 text-xs uppercase font-medium">
                                                            <BookOpen className="h-4 w-4" />
                                                            {subject.yuvro_id || "Subject"}
                                                        </div>
                                                        <h3 className="font-bold text-lg leading-tight mb-2">
                                                            {subject.subject_name}
                                                        </h3>
                                                        {subject.short_code && (
                                                            <div className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold">
                                                                {subject.short_code}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-5 flex items-center justify-between">
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="bg-black hover:bg-gray-800 text-white cursor-pointer px-4 font-medium"
                                                        >
                                                            Manage
                                                        </Button>
                                                        {user?.role === "admin" && (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        openEditSubjectModal(subject);
                                                                    }}
                                                                    className="h-8 w-8 cursor-pointer hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setConfirmDelete(subject.id);
                                                                    }}
                                                                    className="h-8 w-8 text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Colleges Tab Content */}
                        {mainTab === "colleges" && (
                            <>
                                {/* Search Bar */}
                                <div className="mb-6">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="Search colleges..."
                                            value={collegeSearchQuery}
                                            onChange={(e) => setCollegeSearchQuery(e.target.value)}
                                            className="pl-10 w-full md:w-96"
                                        />
                                    </div>
                                </div>

                                {collegesLoading && (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <span className="ml-2 text-gray-600">Loading colleges...</span>
                                    </div>
                                )}

                                {!collegesLoading && filteredColleges.length === 0 && (
                                    <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
                                        {collegeSearchQuery
                                            ? "No colleges found matching your search."
                                            : "No colleges found."}
                                    </div>
                                )}

                                {!collegesLoading && filteredColleges.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredColleges.map((college) => (
                                            <Card
                                                key={college.id}
                                                className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white rounded-xl cursor-pointer border-none shadow-md"
                                                onClick={() =>
                                                    navigate(`/instructor/subjects/colleges/${college.id}`)
                                                }
                                            >
                                                <CardContent className="p-0">
                                                    <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 p-6 text-white hover:brightness-110 transition-all">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <Building2 className="h-8 w-8" />
                                                            <h3 className="font-bold text-xl leading-tight">
                                                                {college.name}
                                                            </h3>
                                                        </div>
                                                        {college.location && (
                                                            <p className="text-white/70 text-sm">{college.location}</p>
                                                        )}
                                                    </div>
                                                    <div className="p-5 flex items-center justify-between">
                                                        <span className="text-sm text-gray-600">Manage Subjects</span>
                                                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Add Subject Dialog */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Create New Subject</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Subject Name *</Label>
                                    <Input
                                        value={newSubject.subject_name}
                                        onChange={(e) =>
                                            setNewSubject({ ...newSubject, subject_name: e.target.value })
                                        }
                                        placeholder="e.g., Data Structures and Algorithms"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Short Code (Optional)</Label>
                                    <Input
                                        value={newSubject.short_code}
                                        onChange={(e) =>
                                            setNewSubject({ ...newSubject, short_code: e.target.value })
                                        }
                                        placeholder="e.g., DSA"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() => setIsAddOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={saving}
                                    className="cursor-pointer"
                                    onClick={handleCreateSubject}
                                >
                                    {saving ? "Creating..." : "Create Subject"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Subject Dialog */}
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Edit Subject</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Subject Name *</Label>
                                    <Input
                                        value={newSubject.subject_name}
                                        onChange={(e) =>
                                            setNewSubject({ ...newSubject, subject_name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Short Code (Optional)</Label>
                                    <Input
                                        value={newSubject.short_code}
                                        onChange={(e) =>
                                            setNewSubject({ ...newSubject, short_code: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() => setIsEditOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={saving}
                                    className="cursor-pointer"
                                    onClick={handleUpdateSubject}
                                >
                                    {saving ? "Updating..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation */}
                    <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Subject</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                Are you sure you want to delete this subject? This action cannot be undone.
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() => setConfirmDelete(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="cursor-pointer"
                                    disabled={deleting}
                                    onClick={handleDelete}
                                >
                                    {deleting ? "Deleting..." : "Delete"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
};

export default Subjects;
