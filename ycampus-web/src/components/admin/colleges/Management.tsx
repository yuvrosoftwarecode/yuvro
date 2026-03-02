import React, { useState, useEffect } from 'react';
import { College, collegeService } from '@/services/collegeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Loader2,
    School,
    Plus,
    Pencil,
    Trash2,
    Mail,
    UserCircle,
    Building2,
    GraduationCap,
    Check
} from 'lucide-react';
import { toast } from 'sonner';

// --- Reusable Form Component ---

interface UserFormProps {
    onSubmit: (userData: any) => Promise<void>;
    initialData?: any;
    roleName: string;
    isEditMode?: boolean;
}

const UserForm = ({ onSubmit, initialData, roleName, isEditMode = false }: UserFormProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        password: 'ChangeMe@123',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                first_name: initialData.first_name || '',
                last_name: initialData.last_name || '',
                email: initialData.email || '',
                username: initialData.username || '',
                password: '',
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const submissionData = { ...formData };
            if (!isEditMode) {
                 submissionData.username = formData.username || formData.email.split('@')[0];
            } else {
                delete (submissionData as any).password;
                delete (submissionData as any).username; 
            }
            
            await onSubmit(submissionData);
        } catch (error) {
             console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">First Name</label>
                    <div className="relative">
                        <UserCircle className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                            name="first_name" 
                            value={formData.first_name} 
                            onChange={handleChange} 
                            required 
                            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            placeholder="e.g. John"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                     <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last Name</label>
                    <div className="relative">
                        <UserCircle className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                            name="last_name" 
                            value={formData.last_name} 
                            onChange={handleChange} 
                            required 
                            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            placeholder="e.g. Doe"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                 <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                        name="email" 
                        type="email"
                        value={formData.email} 
                        onChange={handleChange} 
                        required 
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        placeholder="john.doe@college.edu"
                    />
                </div>
            </div>
            
            {!isEditMode && (
                <>
                    <div className="space-y-2">
                         <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
                        <Input 
                            name="password" 
                            type="password"
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                            className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            placeholder="Set a strong password"
                        />
                        <p className="text-xs text-slate-500">Default: ChangeMe@123</p>
                    </div>
                </>
            )}

            <div className="pt-4 flex justify-end gap-3">
                <Button type="submit" disabled={loading} className={`w-full sm:w-auto ${roleName === 'Principal' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? "Save Changes" : `Create ${roleName}`}
                </Button>
            </div>
        </form>
    );
};

// --- Main Component ---

interface ManagementProps {
    college: College;
}

const Management: React.FC<ManagementProps> = ({ college }) => {
    // Dialog States
    const [isPrincipalDialogOpen, setIsPrincipalDialogOpen] = useState(false);
    const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Selection States
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [actionRole, setActionRole] = useState<'Principal' | 'Admin'>('Principal');

    // Helpers
    const principals = college.principals?.map((p: any) => p.user_details) || [];
    // Fallback for singular principal field if present
    if (principals.length === 0 && (college as any).principal?.user_details) {
        principals.push((college as any).principal.user_details);
    }
    const admins = college.college_admins?.map((ca: any) => ca.user_details) || [];

    // Handlers
    const handleCreatePrincipal = async (userData: any) => {
        try {
            await collegeService.createPrincipal(college.id, userData);
            toast.success(`Created Principal: ${userData.first_name}`);
            setIsPrincipalDialogOpen(false);
            window.location.reload(); 
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to create Principal");
        }
    };

    const handleCreateAdmin = async (userData: any) => {
        try {
            await collegeService.createCollegeAdmin(college.id, userData);
            toast.success(`Created Admin: ${userData.first_name}`);
            setIsAdminDialogOpen(false);
            window.location.reload();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to create Admin");
        }
    };

    const handleUpdateUser = async (userData: any) => {
        if (!selectedUser) return;
        try {
            await collegeService.updateStaffMember(college.id, {
                user_id: selectedUser.id,
                ...userData
            });
            toast.success("User updated successfully");
            setIsEditOpen(false);
            window.location.reload();
        } catch (error: any) {
             toast.error(error.response?.data?.error || "Failed to update user");
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        try {
            await collegeService.deleteStaffMember(college.id, selectedUser.id);
            toast.success("User removed successfully");
            setIsDeleteOpen(false);
            window.location.reload();
        } catch (error: any) {
             toast.error(error.response?.data?.error || "Failed to remove user");
        }
    };

    const openEdit = (user: any, role: 'Principal' | 'Admin') => {
        setSelectedUser(user);
        setActionRole(role);
        setIsEditOpen(true);
    };

    const openDelete = (user: any, role: 'Principal' | 'Admin') => {
        setSelectedUser(user);
        setActionRole(role);
        setIsDeleteOpen(true);
    };


    const UserList = ({ users, role, colorTheme }: { users: any[], role: 'Principal' | 'Admin', colorTheme: 'indigo' | 'orange' }) => {
        const EmptyIcon = role === 'Principal' ? GraduationCap : Shield;
        
        if (users.length === 0) {
             return (
                 <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <h4 className="font-semibold text-slate-700 text-sm">No {role}s Added</h4>
                    <Button 
                        variant="link" 
                        onClick={() => role === 'Principal' ? setIsPrincipalDialogOpen(true) : setIsAdminDialogOpen(true)}
                        className={`mt-1 h-auto p-0 ${colorTheme === 'indigo' ? 'text-indigo-600' : 'text-orange-600'}`}
                    >
                        + Add {role}
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {users.map((user) => (
                    <div key={user.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all gap-4">
                        <div className="flex items-center gap-4">
                             <Avatar className={`h-12 w-12 border-2 border-white shadow-sm ${colorTheme === 'indigo' ? 'bg-indigo-50' : 'bg-orange-50'}`}>
                                <AvatarFallback className={`${colorTheme === 'indigo' ? 'text-indigo-600' : 'text-orange-600'} font-bold`}>
                                    {user.first_name?.[0] || user.username?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="font-semibold text-slate-900 leading-tight flex items-center gap-2">
                                    {user.first_name} {user.last_name}
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
                                        {role}
                                    </Badge>
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    {user.email}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openEdit(user, role)} 
                                className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                                title="Edit Details"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openDelete(user, role)} 
                                className="h-9 w-9 p-0 rounded-full hover:bg-red-50 text-slate-500 hover:text-red-600"
                                title="Remove User"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (!college) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-1 bg-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-slate-200">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-4">
                        <Building2 className="h-4 w-4" />
                        Institution
                    </div>
                    <h2 className="text-2xl font-semibold leading-tight mb-1">{college.name || "College Management"}</h2>
                    <p className="text-slate-400 text-sm">Administration Portal</p>
                 </div>
                 
                 <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                        <p className="text-indigo-600 font-medium text-sm">Total Principals</p>
                        <p className="text-4xl font-bold text-slate-900 mt-2">{principals.length}</p>
                    </div>
                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <School className="h-6 w-6 text-indigo-600" />
                    </div>
                 </div>

                 <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                        <p className="text-orange-600 font-medium text-sm">System Admins</p>
                        <p className="text-4xl font-bold text-slate-900 mt-2">{admins.length}</p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <Shield className="h-6 w-6 text-orange-600" />
                    </div>
                 </div>
            </div>

            {/* Principal Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                     <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <span className="h-6 w-1 bg-indigo-500 rounded-full"></span>
                        Principals
                     </h3>
                     <Button 
                        onClick={() => setIsPrincipalDialogOpen(true)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Principal
                    </Button>
                </div>
                <Card className="border-0 shadow-none bg-transparent">
                    <CardContent className="p-0">
                        <UserList users={principals} role="Principal" colorTheme="indigo" />
                    </CardContent>
                </Card>
            </div>

            {/* Admin Section */}
             <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                     <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <span className="h-6 w-1 bg-orange-500 rounded-full"></span>
                        College Admins
                     </h3>
                     <Button 
                        onClick={() => setIsAdminDialogOpen(true)} 
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-200"
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Admin
                    </Button>
                </div>
                <Card className="border-0 shadow-none bg-transparent">
                    <CardContent className="p-0">
                         <UserList users={admins} role="Admin" colorTheme="orange" />
                    </CardContent>
                </Card>
            </div>

             {/* Dialogs */}
             <Dialog open={isPrincipalDialogOpen} onOpenChange={setIsPrincipalDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Principal</DialogTitle>
                        <DialogDescription>
                            Create a new account for a Principal. They will have full administrative access.
                        </DialogDescription>
                    </DialogHeader>
                    <UserForm onSubmit={handleCreatePrincipal} roleName="Principal" />
                </DialogContent>
            </Dialog>

            <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add College Admin</DialogTitle>
                        <DialogDescription>
                            Create a new account for administrative staff.
                        </DialogDescription>
                    </DialogHeader>
                    <UserForm onSubmit={handleCreateAdmin} roleName="Admin" />
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Details</DialogTitle>
                        <DialogDescription>Update the profile information.</DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <UserForm 
                            onSubmit={handleUpdateUser} 
                            initialData={selectedUser} 
                            roleName={actionRole}
                            isEditMode={true}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                             <Trash2 className="h-5 w-5" /> Revoke Access?
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to remove <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong> from the {actionRole} role?
                            <br/><br/>
                            <span className="font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                                Warning: This will permanently delete their user account.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-end mt-4">
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteUser}>Confirm Removal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Management;
