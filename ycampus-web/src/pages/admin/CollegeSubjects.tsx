import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, BookOpen, ArrowLeft, Search, Pencil, Building2, Loader2, ChevronRight, Settings } from "lucide-react";
import {
    fetchCollegeSubjects,
    fetchSubjects,
    assignSubjectToCollege,
    updateCollegeSubject,
    removeSubjectFromCollege,
    CollegeSubject,
    Subject,
} from "@/services/subjectService";
import { collegeService, College } from "@/services/collegeService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";

const CollegeSubjects: React.FC = () => {
    const { user } = useAuth();
    const { collegeId: paramCollegeId } = useParams<{ collegeId: string }>();
    const collegeId = paramCollegeId || (user as any)?.college_id;
    const navigate = useNavigate();

    const [assignments, setAssignments] = useState<CollegeSubject[]>([]);
    const [collegeDetail, setCollegeDetail] = useState<College | null>(null);
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
            loadCollegeDetails();
            loadAssignments();
        }
    }, [collegeId]);

    const loadCollegeDetails = async () => {
        if (!collegeId) return;
        try {
            const data = await collegeService.getCollege(collegeId);
            setCollegeDetail(data);
        } catch (err) {
            console.error("Failed to load college details", err);
        }
    };

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
            // Filter by product type
            const filteredData = data.filter(s => {
                const subjectProductType = s.product_type || 'campus';
                const requiredProductType = collegeDetail?.product_type || 'campus';
                return subjectProductType === requiredProductType;
            });
            setAllSubjects(filteredData as Subject[]);
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

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-gray-50/50 w-full overflow-hidden">
                <AdminSidebar />
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full">
                        {/* Header Container */}
                        <PageHeader
                            title="College Allocation"
                            actions={
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 shadow-sm"
                                        onClick={() => navigate("/admin/subjects/colleges")}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            loadAllSubjects();
                                            setIsAddOpen(true);
                                        }}
                                        className="font-semibold shadow-sm rounded-lg"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Assign Subject Flow
                                    </Button>
                                </div>
                            }
                        />

                        <div className="relative max-w-lg mb-8">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter assignments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background/50 border-muted-foreground/20 h-11 shadow-sm rounded-xl focus-visible:ring-primary focus-visible:border-primary"
                            />
                        </div>

                        {loading ? (
                            <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                <span className="text-sm font-medium tracking-wide">Syncing architecture...</span>
                            </div>
                        ) : filteredAssignments.length === 0 ? (
                            <div className="h-[40vh] flex flex-col items-center justify-center gap-4 bg-background border border-dashed border-border rounded-xl">
                                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-2">
                                    <Building2 className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <h3 className="font-semibold text-lg text-center text-foreground">
                                    {searchQuery ? "No matches recorded" : "No Subjects Hosted Here"}
                                </h3>
                                <p className="text-sm text-muted-foreground text-center">
                                    Initiate assignments to construct context here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {filteredAssignments.map((assignment) => {
                                    const subject = assignment.subject_details;
                                    return (
                                        <Card
                                            key={assignment.id}
                                            className="group hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-background flex flex-col overflow-hidden relative"
                                            onClick={() => subject && navigate(`/admin/subjects/${subject.id}/manage`)}
                                        >
                                            <CardContent className="p-0 flex flex-col h-full">
                                                <div className="bg-primary p-5 text-primary-foreground relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-10">
                                                        <BookOpen className="h-24 w-24" />
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2 text-primary-foreground text-[10px]   font-bold tracking-widest relative z-10 opacity-80">
                                                        <BookOpen className="h-3.5 w-3.5" />
                                                        {subject?.yuvro_id?.split('-')[0] || "SUBJECT"}
                                                    </div>
                                                    <h3 className="font-bold text-lg leading-tight mb-2 truncate relative z-10" title={subject?.subject_name}>
                                                        {subject?.subject_name || "Unknown"}
                                                    </h3>
                                                    {assignment.subject_code ? (
                                                        <div className="inline-flex bg-primary-foreground text-primary px-2 py-0.5 rounded text-xs font-bold shadow-sm relative z-10 mt-1">
                                                            LCL: {assignment.subject_code}
                                                        </div>
                                                    ) : subject?.short_code ? (
                                                        <div className="inline-flex bg-primary-foreground text-primary px-2 py-0.5 rounded text-xs font-bold shadow-sm relative z-10 mt-1">
                                                            GBL: {subject.short_code}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="p-4 bg-background border-t border-border flex items-center justify-between mt-auto z-20">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs font-semibold text-primary/80 group-hover:text-primary flex items-center px-0 hover:bg-transparent   tracking-tight"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            subject && navigate(`/admin/subjects/${subject.id}/manage`);
                                                        }}
                                                    >
                                                        CONFIGURE <Settings className="h-3 w-3 ml-1.5" />
                                                    </Button>
                                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditClick(assignment);
                                                            }}
                                                            className="h-8 w-8 rounded bg-background hover:bg-secondary border-border/50 shadow-sm"
                                                            title="Edit Subject Code"
                                                        >
                                                            <Pencil className="h-3 w-3 text-foreground/70" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDelete(assignment.id);
                                                            }}
                                                            className="h-8 w-8 rounded bg-background hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive border-border/50 shadow-sm transition-colors"
                                                            title="Unassign Subject"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
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
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Bind Subject</DialogTitle>
                            <DialogDescription>Map a global entity towards this collegiate root.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Global Origin</Label>
                                <select
                                    className="w-full border-border bg-background rounded-md p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                >
                                    <option value="">Select available resource...</option>
                                    {allSubjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.subject_name} {subject.short_code ? `(${subject.short_code})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Local Access Code</Label>
                                <Input
                                    placeholder="CS101"
                                    value={subjectCode}
                                    onChange={(e) => setSubjectCode(e.target.value)}
                                    className="h-11 font-mono  "
                                />
                                <p className="text-xs text-muted-foreground">
                                    An alias recognized inside this domain natively.
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0 mt-2">
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddSubject} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                Authorize Assignment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Modifier Node</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Linked Reference</Label>
                                <Input
                                    disabled
                                    value={editingAssignment?.subject_details?.subject_name || ""}
                                    className="h-11 bg-muted/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Target Code Prefix</Label>
                                <Input
                                    placeholder="CS101"
                                    value={editSubjectCode}
                                    onChange={(e) => setEditSubjectCode(e.target.value)}
                                    className="h-11   font-mono"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0 mt-2">
                            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Abort</Button>
                            <Button onClick={handleUpdateSubject} disabled={updating}>
                                {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Initiate Morph"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
                                <Trash2 className="h-5 w-5" />
                                Initiate Server Disconnect
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-muted-foreground text-sm">
                            Severing mapped logic. Does not delete structurally, merely drops pointer assignment locally to this College.
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0 mt-2">
                            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Halt</Button>
                            <Button variant="destructive" disabled={deleting} onClick={handleRemoveSubject}>
                                {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Sever Link"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </SidebarProvider>
    );
};

export default CollegeSubjects;
