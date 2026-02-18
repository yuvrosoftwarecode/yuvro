import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Check, Loader2, BookOpen } from "lucide-react";
import subjectService, { Subject, CollegeSubject } from "@/services/subjectService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface SubjectAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    semesterId: string | number;
    collegeId: string | number;
    existingSubjectIds?: (string | number)[];
    onSubjectAdded: () => void;
}

const SubjectAddModal: React.FC<SubjectAddModalProps> = ({ 
    isOpen, 
    onClose, 
    semesterId, 
    collegeId, 
    existingSubjectIds = [], 
    onSubjectAdded 
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [availableSubjects, setAvailableSubjects] = useState<CollegeSubject[]>([]);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState<string | number | null>(null);

    useEffect(() => {
        if (isOpen && collegeId) {
            loadAvailableSubjects();
        }
    }, [isOpen, collegeId]);

    const loadAvailableSubjects = async () => {
        setLoading(true);
        try {
            // Fetch subjects assigned to the college
            const collegeSubjects = await subjectService.fetchCollegeSubjects(collegeId.toString());
            
            // Filter out subjects that are already in the semester
            // We need to compare subject IDs. collegeSubject.subject is the ID (or subject object depending on API, let's check service)
            // Service says: subject: string (ID)
            
            const filtered = collegeSubjects.filter(cs => 
                !existingSubjectIds.includes(cs.subject) &&
                (!cs.subject_details?.short_code || !existingSubjectIds.includes(cs.subject_details.id)) // Double check ID
            );
            
            setAvailableSubjects(filtered);
        } catch (err) {
            console.error("Failed to load available subjects", err);
            toast.error("Failed to load subjects");
        } finally {
            setLoading(false);
        }
    };

    const handleLinkSubject = async (collegeSubject: CollegeSubject) => {
        setLinking(collegeSubject.id);
        try {
            // We need to link the SUBJECT ID to the Semester
            await subjectService.addSubjectToSemester(semesterId, collegeSubject.subject);
            toast.success("Subject added to semester successfully");
            onSubjectAdded();
            // Don't close immediately, allow adding more
            
            // Remove from local list
            setAvailableSubjects(prev => prev.filter(p => p.id !== collegeSubject.id));
        } catch (err) {
            toast.error("Failed to add subject to semester");
        } finally {
            setLinking(null);
        }
    };

    const filteredSubjects = availableSubjects.filter(cs => {
        const sub = cs.subject_details;
        if (!sub) return false;
        return (
            (sub.subject_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sub.short_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cs.subject_code || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Subject to Semester</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Search available subjects..." 
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            </div>
                        ) : filteredSubjects.length > 0 ? (
                            filteredSubjects.map(cs => (
                                <div key={cs.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md border group">
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-semibold text-sm truncate">{cs.subject_details?.subject_name}</span>
                                        <span className="text-[10px] text-gray-400">
                                            {cs.subject_code || cs.subject_details?.short_code || "No code"}
                                        </span>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleLinkSubject(cs)}
                                        disabled={linking === cs.id}
                                    >
                                        {linking === cs.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs italic">No matching subjects found in college</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SubjectAddModal;
