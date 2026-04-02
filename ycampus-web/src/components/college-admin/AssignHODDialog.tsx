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
import { Search, Loader2, UserCheck, User } from "lucide-react";
import { facultyService, FacultyProfile } from "@/services/facultyService";
import { departmentService } from "@/services/departmentService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';

interface AssignHODDialogProps {
    isOpen: boolean;
    onClose: () => void;
    departmentId: string | number;
    departmentName: string;
    onAssigned: () => void;
}

const AssignHODDialog: React.FC<AssignHODDialogProps> = ({ 
    isOpen, 
    onClose, 
    departmentId, 
    departmentName,
    onAssigned 
}) => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadFaculties();
        }
    }, [isOpen]);

    const loadFaculties = async () => {
        setLoading(true);
        try {
            const collegeId = (user as any)?.college_id;
            const data = await facultyService.getFaculties(collegeId);
            setFaculties(data);
        } catch (err) {
            console.error("Failed to load faculties", err);
            toast.error("Failed to load faculty list");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (faculty: FacultyProfile) => {
        setAssigning(faculty.id);
        try {
            const collegeId = (user as any)?.college_id;
            await departmentService.allocateHOD(collegeId, {
                user_id: faculty.user_details.id,
                department_id: departmentId
            });
            toast.success(`${faculty.user_details.first_name} assigned as HOD for ${departmentName}`);
            onAssigned();
            onClose();
        } catch (err) {
            console.error("Failed to assign HOD", err);
            toast.error("Failed to assign HOD");
        } finally {
            setAssigning(null);
        }
    };

    const filteredFaculties = faculties.filter(f => {
        const name = `${f.user_details.first_name} ${f.user_details.last_name}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || 
               f.user_details.email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
                <DialogHeader className="p-6 bg-muted/30 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <UserCheck className="h-5 w-5 text-foreground" />
                        Assign Faculty as HOD
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select an existing staff member to lead this department.
                    </p>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or email..." 
                            className="pl-9 h-10 border-none bg-muted/50 rounded-xl focus:ring-foreground"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar border border-gray-100 rounded-xl p-2 bg-muted/5">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground italic">Searching staff...</p>
                            </div>
                        ) : filteredFaculties.length > 0 ? (
                            filteredFaculties.map(faculty => (
                                <div key={faculty.id} className="flex items-center justify-between p-3 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 group transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-gray-100">
                                            {faculty.user_details.profile?.profile_image ? (
                                                <img src={faculty.user_details.profile.profile_image} alt="" className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                <User className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-sm truncate">
                                                {faculty.user_details.first_name} {faculty.user_details.last_name}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    {faculty.user_details.email}
                                                </span>
                                                <Badge variant="outline" className="text-[9px] py-0 h-3.5 opacity-60 rounded-sm">
                                                    {faculty.department_name || "Faculty"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        className="h-8 px-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-foreground hover:text-background transition-all shadow-sm font-bold text-xs"
                                        onClick={() => handleAssign(faculty)}
                                        disabled={!!assigning}
                                    >
                                        {assigning === faculty.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 text-muted-foreground italic">
                                <User className="h-10 w-10 mx-auto mb-3 opacity-10" />
                                <p className="text-xs">No faculty members found.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 bg-muted/20 border-t">
                    <Button 
                        variant="ghost"
                        className="font-bold rounded-xl h-10 px-8"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AssignHODDialog;
