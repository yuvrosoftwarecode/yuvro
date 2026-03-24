import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, BookOpen, ArrowLeft, Search, Pencil } from "lucide-react";
import {
    fetchCollegeSubjects,
    fetchSubjects,
    assignSubjectToCollege,
    updateCollegeSubject,
    removeSubjectFromCollege,
    CollegeSubject,
    Subject,
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
import RoleSidebar from "../../components/common/RoleSidebar";
import PageHeader from "../../components/common/PageHeader";
import { toast } from "sonner";

const CollegeSubjects: React.FC = () => {
    const { collegeId } = useParams<{ collegeId: string }>();
    const navigate = useNavigate();

    const [assignments, setAssignments] = useState<CollegeSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Add Subject Modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [subjectCode, setSubjectCode] = useState("");
    const [saving, setSaving] = useState(false);

    // Delete Confirmation
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Edit Modal
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<CollegeSubject | null>(null);
    const [editSubjectCode, setEditSubjectCode] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (collegeId) {
            loadAssignments();
        }
    }, [collegeId]);

    const loadAssignments = async () => {
        if (!collegeId) return;

        try {
            setLoading(true);
            const data = await fetchCollegeSubjects(collegeId);
            setAssignments(data);
        } catch (err) {
            console.error("Failed to load college subjects", err);
            toast.error("Failed to load college subjects");
        } finally {
            setLoading(false);
        }
    };

    const loadAllSubjects = async () => {
        try {
            const data = await fetchSubjects();
            setAllSubjects(data as Subject[]);
        } catch (err) {
            console.error("Failed to load subjects", err);
            toast.error("Failed to load subjects");
        }
    };

    const handleAddSubject = async () => {
        if (!selectedSubjectId || !collegeId) {
            toast.error("Please select a subject");
            return;
        }

        // Check if already assigned
        const alreadyAssigned = assignments.some((a) => a.subject === selectedSubjectId);
        if (alreadyAssigned) {
            toast.error("This subject is already assigned to this college");
            return;
        }

        try {
            setSaving(true);
            await assignSubjectToCollege({
                college: collegeId,
                subject: selectedSubjectId,
                subject_code: subjectCode,
            });
            toast.success("Subject assigned successfully");
            setSelectedSubjectId("");
            setSubjectCode("");
            setIsAddOpen(false);
            loadAssignments();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to assign subject");
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (assignment: CollegeSubject) => {
        setEditingAssignment(assignment);
        setEditSubjectCode(assignment.subject_code || "");
        setIsEditOpen(true);
    };

    const handleUpdateSubject = async () => {
        if (!editingAssignment || !collegeId) return;

        try {
            setUpdating(true);
            await updateCollegeSubject(editingAssignment.id, {
                subject_code: editSubjectCode,
            });
            toast.success("Subject updated successfully");
            setIsEditOpen(false);
            setEditingAssignment(null);
            setEditSubjectCode("");
            loadAssignments();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to update subject");
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveSubject = async () => {
        if (!confirmDelete) return;

        try {
            setDeleting(true);
            await removeSubjectFromCollege(confirmDelete);
            toast.success("Subject removed successfully");
            setConfirmDelete(null);
            loadAssignments();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to remove subject");
        } finally {
            setDeleting(false);
        }
    };

    const filteredAssignments = assignments.filter((assignment) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const subject = assignment.subject_details;
        return (
            subject?.subject_name.toLowerCase().includes(query) ||
            subject?.short_code?.toLowerCase().includes(query) ||
            subject?.yuvro_id?.toLowerCase().includes(query) ||
            assignment.subject_code?.toLowerCase().includes(query)
        );
    });

    const headerActions = (
        <div className="flex gap-3">
            <Button
                variant="outline"
                onClick={() => navigate("/admin/subjects/colleges")}
                className="cursor-pointer"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Colleges
            </Button>
            <Button
                onClick={() => {
                    loadAllSubjects();
                    setIsAddOpen(true);
                }}
                className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors cursor-pointer"
            >
                <Plus className="h-4 w-4 mr-2" />
                Assign Subject
            </Button>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <PageHeader
                            title="College Subjects"
                            subtitle="Manage subjects assigned to this college"
                            actions={headerActions}
                        />
                        {/* Search Bar */}
                        <div className="mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search subjects..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-full md:w-96"
                                />
                            </div>
                        </div>

                    

                        {loading && (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-gray-600">Loading subjects...</span>
                            </div>
                        )}

                        {!loading && filteredAssignments.length === 0 && (
                            <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
                                {searchQuery ? "No subjects found matching your search." : "No subjects assigned to this college yet. Click 'Assign Subject' to get started."}
                            </div>
                        )}

                        {!loading && filteredAssignments.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredAssignments.map((assignment) => {
                                    const subject = assignment.subject_details;
                                    return (
                                        <Card
                                            key={assignment.id}
                                            className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-white rounded-xl cursor-pointer border-none shadow-md"
                                            onClick={() => subject && navigate(`/admin/subjects/${subject.id}/manage`)}
                                        >
                                            <CardContent className="p-0">
                                                <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-4 text-white hover:brightness-110 transition-all">
                                                    <div className="flex items-center gap-2 mb-2 text-white/70 text-xs uppercase font-medium">
                                                        <BookOpen className="h-4 w-4" />
                                                        {subject?.yuvro_id || "Subject"}
                                                    </div>
                                                    <h3 className="font-bold text-lg leading-tight mb-2 truncate" title={subject?.subject_name}>
                                                        {subject?.subject_name || "Unknown"}
                                                    </h3>
                                                    {assignment.subject_code ? (
                                                        <div className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold">
                                                            {assignment.subject_code}
                                                        </div>
                                                    ) : subject?.short_code ? (
                                                        <div className="inline-block bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-white/80" title="Global Short Code">
                                                            {subject.short_code}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="p-5 flex items-center justify-between">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="bg-black hover:bg-gray-800 text-white cursor-pointer px-4 font-medium"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            subject && navigate(`/admin/subjects/${subject.id}/manage`);
                                                        }}
                                                    >
                                                        Manage
                                                    </Button>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditClick(assignment);
                                                            }}
                                                            className="h-8 w-8 cursor-pointer hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                                            title="Edit Subject Code"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDelete(assignment.id);
                                                            }}
                                                            className="h-8 w-8 text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                                                            title="Unassign Subject"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Add Subject Dialog */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Assign Subject to College</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Select Subject</Label>
                                    <select
                                        className="w-full border rounded-md p-2"
                                        value={selectedSubjectId}
                                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    >
                                        <option value="">Choose a subject...</option>
                                        {allSubjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.yuvro_id ? `[${subject.yuvro_id}] ` : ""}
                                                {subject.subject_name}
                                                {subject.short_code ? ` (${subject.short_code})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Subject Code (College Specific)</Label>
                                    <Input
                                        placeholder="e.g. CS101, ENG202"
                                        value={subjectCode}
                                        onChange={(e) => setSubjectCode(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500">
                                        This code will be used to identify this subject within this college.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" className="cursor-pointer" onClick={() => setIsAddOpen(false)}>
                                    Cancel
                                </Button>
                                <Button disabled={saving} className="cursor-pointer" onClick={handleAddSubject}>
                                    {saving ? "Assigning..." : "Assign Subject"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Subject Dialog */}
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Edit Subject details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Subject Name</Label>
                                    <Input
                                        disabled
                                        value={editingAssignment?.subject_details?.subject_name || ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Subject Code (College Specific)</Label>
                                    <Input
                                        placeholder="e.g. CS101, ENG202"
                                        value={editSubjectCode}
                                        onChange={(e) => setEditSubjectCode(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500">
                                        This code will be used to identify this subject within this college.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" className="cursor-pointer" onClick={() => setIsEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button disabled={updating} className="cursor-pointer" onClick={handleUpdateSubject}>
                                    {updating ? "Updating..." : "Update Subject"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation */}
                    <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Remove Subject</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                Are you sure you want to remove this subject from this college? This action cannot be undone.
                            </div>
                            <DialogFooter>
                                <Button variant="outline" className="cursor-pointer" onClick={() => setConfirmDelete(null)}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" className="cursor-pointer" disabled={deleting} onClick={handleRemoveSubject}>
                                    {deleting ? "Removing..." : "Remove"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
};

export default CollegeSubjects;
