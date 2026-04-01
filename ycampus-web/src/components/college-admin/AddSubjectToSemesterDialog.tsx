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
import { Search, Plus, Loader2, BookOpen } from "lucide-react";
import subjectService, { CollegeSubject } from "@/services/subjectService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface AddSubjectToSemesterDialogProps {
    isOpen: boolean;
    onClose: () => void;
    semesterId: string | number;
    collegeId: string | number;
    existingSubjectIds?: (string | number)[];
    onSubjectAdded: () => void;
}

const AddSubjectToSemesterDialog: React.FC<AddSubjectToSemesterDialogProps> = ({ 
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
            const collegeSubjects = await subjectService.fetchCollegeSubjects(collegeId.toString());
            
            // Filter out subjects that are already in the semester
            const filtered = collegeSubjects.filter(cs => {
                const subjectId = cs.subject;
                return !existingSubjectIds.includes(subjectId) && 
                       (!cs.subject_details?.id || !existingSubjectIds.includes(cs.subject_details.id));
            });
            
            setAvailableSubjects(filtered);
        } catch (err) {
            console.error("Failed to load available subjects", err);
            toast.error("Failed to load institutional subjects");
        } finally {
            setLoading(false);
        }
    };

    const handleLinkSubject = async (collegeSubject: CollegeSubject) => {
        setLinking(collegeSubject.id);
        try {
            await subjectService.addSubjectToSemester(semesterId, collegeSubject.subject);
            toast.success(`${collegeSubject.subject_details?.subject_name} linked to current semester`);
            onSubjectAdded();
            
            // UI Feedback: Remove from available list immediately
            setAvailableSubjects(prev => prev.filter(p => p.id !== collegeSubject.id));
        } catch (err) {
            console.error("Failed to link subject", err);
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
            (sub.short_code || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
    <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
                <DialogHeader className="p-6 bg-muted/30 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-foreground" />
                        Add institutional subject
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Map subjects from your college catalog to this semester.
                    </p>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Find subjects in catalog..." 
                            className="pl-9 h-10 border-none bg-muted/50 rounded-xl focus:ring-foreground"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar border border-gray-100 rounded-xl p-2 bg-muted/5">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground italic">Fetching catalog...</p>
                            </div>
                        ) : filteredSubjects.length > 0 ? (
                            filteredSubjects.map(cs => (
                                <div key={cs.id} className="flex items-center justify-between p-3 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 group transition-all">
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-sm truncate">{cs.subject_details?.subject_name}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {cs.subject_details?.yuvro_id || cs.subject_details?.short_code || "uncoded"}
                                            </span>
                                            {cs.subject_details?.level && (
                                                <Badge variant="outline" className="text-[9px] py-0 h-3.5 opacity-60 rounded-sm">
                                                    {cs.subject_details.level}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        className="h-8 w-8 rounded-lg bg-secondary text-secondary-foreground hover:bg-foreground hover:text-background transition-all p-0 shadow-sm"
                                        onClick={() => handleLinkSubject(cs)}
                                        disabled={!!linking}
                                    >
                                        {linking === cs.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 text-muted-foreground italic">
                                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-10" />
                                <p className="text-xs">No available subjects found in catalog.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 bg-muted/20 border-t">
                    <Button 
                        className="bg-foreground text-background hover:bg-foreground/90 font-bold rounded-xl h-10 px-8"
                        onClick={onClose}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddSubjectToSemesterDialog;
