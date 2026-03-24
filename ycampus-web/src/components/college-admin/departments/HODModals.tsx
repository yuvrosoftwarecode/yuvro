import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { facultyService, FacultyProfile } from "@/services/facultyService";
import { departmentService } from "@/services/departmentService";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus } from 'lucide-react';

interface AssignHODModalProps {
    isOpen: boolean;
    onClose: () => void;
    departmentId: string | number;
    onSuccess: () => void;
}

export const AssignHODModal: React.FC<AssignHODModalProps> = ({ isOpen, onClose, departmentId, onSuccess }) => {
    const { user } = useAuth();
    const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadFaculties();
        }
    }, [isOpen]);

    const loadFaculties = async () => {
        try {
            setLoading(true);
            const collegeId = (user as any)?.college_id;
            const data = await facultyService.getFaculties(collegeId);
            setFaculties(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (facultyUserId: string) => {
        try {
            setSubmitting(true);
            const collegeId = (user as any)?.college_id;
            await departmentService.allocateHOD(collegeId, {
                user_id: facultyUserId,
                department_id: departmentId
            });
            toast.success("HOD assigned successfully");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error("Failed to assign HOD");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredFaculties = faculties.filter(f => 
        f.user_details.first_name.toLowerCase().includes(search.toLowerCase()) ||
        f.user_details.last_name.toLowerCase().includes(search.toLowerCase()) ||
        f.user_details.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign HOD from Faculty</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search faculty name or email..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {loading ? (
                            <div className="text-center py-4 text-sm text-gray-500">Loading faculty...</div>
                        ) : filteredFaculties.length === 0 ? (
                            <div className="text-center py-4 text-sm text-gray-500">No faculty found</div>
                        ) : (
                            filteredFaculties.map((f) => (
                                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-white transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900">{f.user_details.first_name} {f.user_details.last_name}</p>
                                        <p className="text-xs text-gray-500">{f.user_details.email}</p>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleAssign(f.user_details.id)}
                                        disabled={submitting}
                                    >
                                        Assign
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

interface CreateHODModalProps {
    isOpen: boolean;
    onClose: () => void;
    departmentId: string | number;
    onSuccess: () => void;
}

export const CreateHODModal: React.FC<CreateHODModalProps> = ({ isOpen, onClose, departmentId, onSuccess }) => {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const collegeId = (user as any)?.college_id;
            await departmentService.createHOD(collegeId, {
                ...formData,
                department_id: departmentId
            });
            toast.success("HOD created and assigned successfully");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to create HOD");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New HOD</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name</Label>
                            <Input
                                id="first_name"
                                required
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input
                                id="last_name"
                                required
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create HOD'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
