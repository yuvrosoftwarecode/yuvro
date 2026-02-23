import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, User, UserPlus, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import subjectService, { SemesterSubject, SectionSubjectFaculty } from "@/services/subjectService";
import { facultyService, FacultyProfile } from "@/services/facultyService";
import { Section } from "@/services/sectionService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface FacultySectionAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    semesterSubject: SemesterSubject | null;
    sections: Section[];
    collegeId: string | number;
    onAssignmentChanged: () => void;
}

const FacultySectionAssignModal: React.FC<FacultySectionAssignModalProps> = ({
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
            // Reset state when closed
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
            const newAssignment = await subjectService.assignFacultyToSectionSubject({
                semester_subject: semesterSubject.assignment_id || semesterSubject.id,
                section: sectionId,
                faculty: selectedFacultyForEditing
            });
            
            toast.success("Faculty assigned successfully");
            
            // Remove existing assignment for this section if any before adding the new one (simulate update if it was a change)
            setAssignments(prev => {
                const filtered = prev.filter(a => a.section.toString() !== sectionId.toString());
                return [...filtered, newAssignment as any];
            });
            onAssignmentChanged();
            
            setEditingSection(null);
            setSelectedFacultyForEditing("");
            
            // Reload to fetch the populated faculty details from backend
            loadData();
        } catch (err: any) {
            console.error("Failed to assign faculty", err);
            toast.error(err.response?.data?.error || "Failed to assign faculty");
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
            <DialogContent className="sm:max-w-2xl bg-gray-50/50">
                <DialogHeader className="pb-4 border-b">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 border border-orange-200 shadow-sm">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                Faculty Assignment
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 font-mono">
                                    {semesterSubject.subject_details?.short_code}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-gray-500 mt-1">
                                Manage instructor assignments for <span className="font-semibold text-gray-700">{semesterSubject.subject_details?.subject_name}</span> across all sections.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Progress Bar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between text-sm font-semibold mb-2">
                                <span className="text-gray-700">Assignment Progress</span>
                                <span className={progress === 100 ? "text-green-600" : "text-orange-600"}>
                                    {assignedSectionIds.length} of {sections.length} Sections
                                </span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        {progress === 100 ? (
                            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                        )}
                    </div>

                    {/* Sections List */}
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 pb-2">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            </div>
                        ) : sections.length === 0 ? (
                            <div className="text-center py-10 bg-white border border-dashed rounded-xl">
                                <p className="text-gray-500 font-medium">No sections available for this semester.</p>
                                <p className="text-sm text-gray-400 mt-1">Please create sections first.</p>
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
                                            assignment ? 'bg-white border-green-100 shadow-sm' : 'bg-white border-gray-200 hover:border-orange-300'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* Section Info */}
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                                                    assignment ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-600 border-gray-100'
                                                }`}>
                                                    S{section.name}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">Section {section.name}</h4>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                        {section.student_count || 0} Students
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Assignment Logic */}
                                            <div className="flex-1 max-w-sm ml-auto">
                                                {assignment && !isEditing ? (
                                                    // Assigned State
                                                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 p-2 rounded-lg group">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                                                                {assignment.faculty_details?.user_details?.profile_image ? (
                                                                    <img src={assignment.faculty_details.user_details.profile_image} alt="" className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <User className="h-4 w-4" />
                                                                )}
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="font-semibold text-sm text-gray-800 truncate">
                                                                    {assignment.faculty_details?.user_details?.first_name} {assignment.faculty_details?.user_details?.last_name}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500 truncate font-medium uppercase">
                                                                    {assignment.faculty_details?.department_name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full"
                                                                onClick={() => {
                                                                    setEditingSection(section.id.toString());
                                                                    setSelectedFacultyForEditing(assignment.faculty.toString());
                                                                }}
                                                                title="Change Faculty"
                                                                disabled={isAssigning}
                                                            >
                                                                <UserPlus className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                                onClick={() => handleRemove(assignment.id, section.id)}
                                                                disabled={isAssigning}
                                                                title="Remove Assignment"
                                                            >
                                                                {isAssigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : isEditing || (!assignment) ? (
                                                    // Editing / Assigning State
                                                    <div className="flex items-center gap-2">
                                                        <Select 
                                                            value={isEditing ? selectedFacultyForEditing : (editingSection === section.id.toString() ? selectedFacultyForEditing : "")} 
                                                            onValueChange={(val) => {
                                                                setEditingSection(section.id.toString());
                                                                setSelectedFacultyForEditing(val);
                                                            }}
                                                        >
                                                            <SelectTrigger className={`bg-white focus:ring-orange-500 ${!assignment && !isEditing ? 'border-orange-200 hover:border-orange-300' : ''}`}>
                                                                <SelectValue placeholder="Select faculty..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {faculties.map(fac => (
                                                                    <SelectItem key={fac.id} value={fac.id.toString()}>
                                                                        <div className="flex items-center justify-between w-full gap-4">
                                                                            <span>{fac.user_details.first_name} {fac.user_details.last_name}</span>
                                                                            <span className="text-[10px] text-gray-400 capitalize">{fac.department_name}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        
                                                        {(editingSection === section.id.toString() && selectedFacultyForEditing) && (
                                                            <div className="flex items-center gap-1">
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-orange-500 hover:bg-orange-600 text-white h-9 px-3"
                                                                    onClick={() => handleAssign(section.id)}
                                                                    disabled={isAssigning}
                                                                >
                                                                    {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                                                </Button>
                                                                {isEditing && (
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="ghost" 
                                                                        className="h-9 px-2 text-gray-500"
                                                                        onClick={() => {
                                                                            setEditingSection(null);
                                                                            setSelectedFacultyForEditing("");
                                                                        }}
                                                                        disabled={isAssigning}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button 
                        variant="default" 
                        className="bg-gray-900 text-white hover:bg-gray-800"
                        onClick={onClose}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FacultySectionAssignModal;
