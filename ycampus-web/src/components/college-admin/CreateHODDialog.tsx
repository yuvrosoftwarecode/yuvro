import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Mail } from "lucide-react";
import { departmentService } from "@/services/departmentService";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

interface CreateHODDialogProps {
    isOpen: boolean;
    onClose: () => void;
    departmentId: string | number;
    departmentName: string;
    onCreated: () => void;
}

const CreateHODDialog: React.FC<CreateHODDialogProps> = ({ 
    isOpen, 
    onClose, 
    departmentId, 
    departmentName,
    onCreated 
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const collegeId = (user as any)?.college_id;
            await departmentService.createHOD(collegeId, {
                ...formData,
                username: formData.email,
                password: 'ChangeMe@123',
                department_id: departmentId
            });
            toast.success(`HOD account created for ${departmentName}`);
            onCreated();
            onClose();
            setFormData({ email: '', first_name: '', last_name: '' });
        } catch (err) {
            console.error("Failed to create HOD", err);
            toast.error("Failed to create HOD account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
                <DialogHeader className="p-6 bg-muted/30 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center gap-3">
                        <UserPlus className="h-5 w-5 text-foreground" />
                        Create new HOD
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Register a new user as head of {departmentName}.
                    </p>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name" className="text-xs font-semibold text-muted-foreground">First name *</Label>
                                <Input
                                    id="first_name"
                                    placeholder="John"
                                    className="h-10 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name" className="text-xs font-semibold text-muted-foreground">Last name *</Label>
                                <Input
                                    id="last_name"
                                    placeholder="Doe"
                                    className="h-10 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email address *</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="hod@college.edu"
                                    className="pl-10 h-10 border-gray-100 bg-muted/20 rounded-xl focus:ring-foreground"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic px-1 font-medium">
                                Account will use email as username. Default password: ChangeMe@123
                            </p>
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-bold rounded-xl transition-all shadow-sm"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create and assign'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateHODDialog;
