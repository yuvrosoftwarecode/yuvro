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
import subjectService, { Subject } from "@/services/subjectService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface SubjectAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    semesterId: string | number;
    onSubjectAdded: () => void;
}

const SubjectAddModal: React.FC<SubjectAddModalProps> = ({ isOpen, onClose, semesterId, onSubjectAdded }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState<string | number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: "", short_code: "", category: "fundamentals" });

    useEffect(() => {
        if (isOpen) {
            loadAvailableSubjects();
        }
    }, [isOpen]);

    const loadAvailableSubjects = async () => {
        setLoading(true);
        try {
            // Fetch subjects that don't have a semester assigned
            // The backend filter might need to support 'null' for semester
            const allSubjects = await subjectService.getSubjects();
            // Filter client side for now if backend doesn't support null filter explicitly
            const orphaned = allSubjects.filter(s => !s.semester);
            setAvailableSubjects(orphaned);
        } catch (err) {
            console.error("Failed to load available subjects", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLinkSubject = async (subjectId: string | number) => {
        setLinking(subjectId);
        try {
            await subjectService.updateSubject(subjectId.toString(), { semester: semesterId } as any);
            toast.success("Subject linked successfully");
            onSubjectAdded();
            onClose();
        } catch (err) {
            toast.error("Failed to link subject");
        } finally {
            setLinking(null);
        }
    };

    const handleCreateSubject = async () => {
        if (!newSubject.name) {
            toast.error("Subject name is required");
            return;
        }
        setLoading(true);
        try {
            await subjectService.createSubject({
                ...newSubject,
                semester: semesterId
            });
            toast.success("Subject created successfully");
            onSubjectAdded();
            onClose();
        } catch (err) {
            toast.error("Failed to create subject");
        } finally {
            setLoading(false);
        }
    };

    const filteredSubjects = availableSubjects.filter(s => 
        (s.name || s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.short_code || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isCreating ? "Create New Subject" : "Add Subject to Semester"}</DialogTitle>
                </DialogHeader>

                {isCreating ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                             <label className="text-xs font-semibold uppercase text-gray-500">Subject Name</label>
                             <Input 
                                value={newSubject.name}
                                onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                                placeholder="e.g. Data Structures"
                             />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-semibold uppercase text-gray-500">Short Code</label>
                             <Input 
                                value={newSubject.short_code}
                                onChange={(e) => setNewSubject({...newSubject, short_code: e.target.value})}
                                placeholder="e.g. CS101"
                             />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-semibold uppercase text-gray-500">Category</label>
                             <select 
                                className="w-full border rounded-md p-2 text-sm"
                                value={newSubject.category}
                                onChange={(e) => setNewSubject({...newSubject, category: e.target.value})}
                             >
                                <option value="fundamentals">Fundamentals</option>
                                <option value="programming_languages">Programming Languages</option>
                                <option value="databases">Databases</option>
                                <option value="ai_tools">AI Tools</option>
                                <option value="web_development">Web Development</option>
                             </select>
                        </div>
                    </div>
                ) : (
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
                                filteredSubjects.map(subject => (
                                    <div key={subject.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md border group">
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm truncate">{subject.name || subject.title}</span>
                                            <span className="text-[10px] text-gray-400">{subject.short_code || "No code"} • {subject.category}</span>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleLinkSubject(subject.id)}
                                            disabled={linking === subject.id}
                                        >
                                            {linking === subject.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs italic">No matching unassigned subjects</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="h-px bg-gray-100 flex-1" />
                            <span className="text-[10px] font-bold text-gray-300 uppercase">Or</span>
                            <div className="h-px bg-gray-100 flex-1" />
                        </div>

                        <Button 
                            variant="outline" 
                            className="w-full border-dashed flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Create New Subject
                        </Button>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={isCreating ? () => setIsCreating(false) : onClose}>
                        Cancel
                    </Button>
                    {isCreating && (
                        <Button 
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={handleCreateSubject}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Create Subject
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SubjectAddModal;
