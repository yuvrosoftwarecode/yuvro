import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Loader2, Trash2, User, UserPlus, 
    CheckCircle2, AlertCircle, BookOpen,
    X
} from "lucide-react";
import { facultyService, FacultyProfile } from "@/services/facultyService";
import subjectService, { SemesterSubject, SectionSubjectFaculty } from "@/services/subjectService";
import { Section } from "@/services/sectionService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface FacultyAssignmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    semesterSubject: SemesterSubject | null;
    sections: Section[];
    collegeId: string | number;
    onAssignmentChanged: () => void;
}

const FacultyAssignmentDialog: React.FC<FacultyAssignmentDialogProps> = ({
    isOpen,
    onClose,
    semesterSubject,
    sections,
    collegeId,
    onAssignmentChanged
}) => {
    const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
    const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Track which section is currently being edited/assigned
    const [editingSection, setEditingSection] = useState<string | number | null>(null);
    const [selectedFacultyForEditing, setSelectedFacultyForEditing] = useState<string>("");
    const [assigningLoadingMap, setAssigningLoadingMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen && collegeId && semesterSubject) {
            loadData();
        } else {
            setEditingSection(null);
            setSelectedFacultyForEditing("");
        }
    }, [isOpen, collegeId, semesterSubject]);

    const loadData = async () => {
        setLoading(true);
        try {
            const facultiesData = await facultyService.getFaculties(collegeId);
            setFaculties(facultiesData);
            setAssignments(semesterSubject?.section_faculties || []);
        } catch (err) {
            console.error("Failed to load data for assignment", err);
            toast.error("Failed to load required data");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (sectionId: string | number) => {
        if (!selectedFacultyForEditing || !semesterSubject) {
            toast.error("Please select a faculty member");
            return;
        }

        setAssigningLoadingMap(prev => ({ ...prev, [sectionId]: true }));
        try {
            await subjectService.assignFacultyToSectionSubject({
                semester_subject: semesterSubject.assignment_id || semesterSubject.id,
                section: sectionId,
                faculty: selectedFacultyForEditing
            });
            
            toast.success("Faculty member assigned successfully");
            
            onAssignmentChanged();
            setEditingSection(null);
            setSelectedFacultyForEditing("");
            
            // Reload to fetch the populated faculty details from backend
            loadData();
        } catch (err: any) {
            console.error("Failed to assign faculty", err);
            toast.error(err.response?.data?.error || "Failed to assign faculty member");
        } finally {
            setAssigningLoadingMap(prev => ({ ...prev, [sectionId]: false }));
        }
    };

    const handleRemove = async (assignmentId: string | number, sectionId: string | number) => {
        setAssigningLoadingMap(prev => ({ ...prev, [sectionId]: true }));
        try {
            await subjectService.removeFacultyFromSectionSubject(assignmentId);
            toast.success("Assignment removed");
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
            onAssignmentChanged();
        } catch (err) {
            console.error("Failed to remove assignment", err);
            toast.error("Failed to remove assignment");
        } finally {
            setAssigningLoadingMap(prev => ({ ...prev, [sectionId]: false }));
        }
    };

    if (!semesterSubject) return null;

    const assignedSectionIds = assignments.map(a => a.section.toString());
    const progress = sections.length > 0 ? (assignedSectionIds.length / sections.length) * 100 : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100 shadow-sm">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div className="flex-1 text-left">
                            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                Faculty assignment
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 font-mono text-xs">
                                    {semesterSubject.subject_details?.short_code}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1 text-sm">
                                Manage instructor assignments for <span className="font-semibold text-foreground">{semesterSubject.subject_details?.subject_name}</span> across all sections.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    {/* Progress Bar Section */}
                    <div className="bg-muted/10 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between text-xs font-bold mb-2">
                                <span className="text-muted-foreground font-bold">Assignment progress</span>
                                <span className={progress === 100 ? "text-emerald-600" : "text-amber-600"}>
                                    {assignedSectionIds.length} of {sections.length} sections
                                </span>
                            </div>
                            <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        {progress === 100 ? (
                            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                        )}
                    </div>

                    {/* Section List */}
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground font-bold">Loading sections...</p>
                            </div>
                        ) : sections.length === 0 ? (
                            <div className="text-center py-12 bg-muted/5 border border-dashed rounded-xl">
                                <p className="text-muted-foreground font-bold text-sm">No sections available for this semester.</p>
                            </div>
                        ) : (
                            sections.map((section) => {
                                const assignment = assignments.find(a => a.section.toString() === section.id.toString());
                                const isEditing = editingSection === section.id.toString();
                                const isAssigning = assigningLoadingMap[section.id.toString()];

                                return (
                                    <div 
                                        key={section.id} 
                                        className={`p-4 rounded-xl border transition-all duration-200 ${
                                            assignment ? 'bg-emerald-50/20 border-emerald-100/50 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* Section Info */}
                                            <div className="flex items-center gap-3">
                                                <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm border shadow-inner ${
                                                    assignment ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground border-gray-100'
                                                }`}>
                                                    {section.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">Section {section.name}</h4>
                                                    <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                                                        {section.student_count || 0} students enrolled
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Assignment Controls */}
                                            <div className="flex-1 max-w-sm ml-auto">
                                                {assignment && !isEditing ? (
                                                    <div className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-xl group hover:border-emerald-200 transition-colors">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="h-8 w-8 rounded-full bg-muted border border-gray-100 flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden">
                                                                {assignment.faculty_details?.user_details?.profile_image ? (
                                                                    <img src={assignment.faculty_details.user_details.profile_image} alt="" className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <User className="h-3.5 w-3.5" />
                                                                )}
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="font-bold text-sm text-gray-800 truncate">
                                                                    {assignment.faculty_details?.user_details?.first_name} {assignment.faculty_details?.user_details?.last_name}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground truncate font-bold italic opacity-70">
                                                                    {assignment.faculty_details?.department_name || 'Staff member'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 pl-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                                                                onClick={() => {
                                                                    setEditingSection(section.id.toString());
                                                                    setSelectedFacultyForEditing(assignment.faculty.toString());
                                                                }}
                                                                disabled={isAssigning}
                                                            >
                                                                <UserPlus className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                onClick={() => handleRemove(assignment.id, section.id)}
                                                                disabled={isAssigning}
                                                            >
                                                                {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Select 
                                                            value={selectedFacultyForEditing && editingSection === section.id.toString() ? selectedFacultyForEditing : ""} 
                                                            onValueChange={(val) => {
                                                                setEditingSection(section.id.toString());
                                                                setSelectedFacultyForEditing(val);
                                                            }}
                                                        >
                                                            <SelectTrigger className="bg-white border-gray-200 h-10 rounded-xl focus:ring-foreground">
                                                                <SelectValue placeholder="Assign faculty member..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl shadow-2xl border-gray-100">
                                                                {faculties.map(fac => (
                                                                    <SelectItem key={fac.id} value={fac.id.toString()} className="rounded-lg">
                                                                        <div className="flex items-center justify-between w-full gap-4">
                                                                            <span className="font-medium">{fac.user_details.first_name} {fac.user_details.last_name}</span>
                                                                            <span className="text-[10px] text-muted-foreground font-bold px-1.5 py-0.5 bg-muted rounded">
                                                                                {fac.department_name}
                                                                            </span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        
                                                        {editingSection === section.id.toString() && selectedFacultyForEditing && (
                                                            <div className="flex items-center gap-1">
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-foreground text-background hover:bg-foreground/90 h-10 px-4 rounded-xl font-bold shadow-sm"
                                                                    onClick={() => handleAssign(section.id)}
                                                                    disabled={isAssigning}
                                                                >
                                                                    {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                                                </Button>
                                                                {isEditing && (
                                                                    <Button 
                                                                        size="icon" 
                                                                        variant="ghost" 
                                                                        className="h-10 w-10 text-muted-foreground hover:bg-muted rounded-xl"
                                                                        onClick={() => {
                                                                            setEditingSection(null);
                                                                            setSelectedFacultyForEditing("");
                                                                        }}
                                                                        disabled={isAssigning}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 bg-muted/10 border-t">
                    <Button 
                        variant="default" 
                        className="bg-foreground text-background hover:bg-foreground/90 font-bold h-11 px-8 rounded-xl shadow-lg"
                        onClick={onClose}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FacultyAssignmentDialog;
