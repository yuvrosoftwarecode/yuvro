import React, { useState, useEffect } from 'react';
import { College, collegeService } from '@/services/collegeService';
import { userService, User } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Search,
    Loader2,
    Check,
    X,
    UserPlus,
    School
} from 'lucide-react';
import { toast } from 'sonner';

// --- Internal Components to avoid import issues ---

interface UserSearchProps {
    onSelect: (user: User) => void;
    roleFilter?: string;
}

const UserSearch = ({ onSelect, roleFilter }: UserSearchProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 500);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        if (!debouncedQuery) {
            setResults([]);
            return;
        }

        const searchUsers = async () => {
            setLoading(true);
            try {
                // @ts-ignore
                const response = await userService.getUsers({ search: debouncedQuery, role: roleFilter });
                // Handle potential different response structures just in case
                if (response && Array.isArray(response.results)) {
                     setResults(response.results);
                } else if (Array.isArray(response)) {
                     setResults(response);
                } else {
                     setResults([]);
                }
            } catch (error) {
                console.error("Failed to search users", error);
                toast.error("Failed to search users");
            } finally {
                setLoading(false);
            }
        };

        searchUsers();
    }, [debouncedQuery, roleFilter]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by name or email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                />
                {loading && (
                    <div className="absolute right-3 top-3">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    </div>
                )}
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2 bg-slate-50/50">
                {results.length === 0 && query && !loading && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        No users found.
                    </div>
                )}
                 {results.length === 0 && !query && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        Start typing to search for users...
                    </div>
                )}

                {results.map((user) => (
                    <div
                        key={user.id}
                        onClick={() => onSelect(user)}
                        className="flex items-center justify-between p-3 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-slate-200 hover:shadow-sm bg-white"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                                <AvatarFallback className="bg-indigo-50 text-indigo-600">
                                    {user.first_name?.[0] || user.username?.[0] || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-left w-full overflow-hidden">
                                <p className="font-medium text-sm text-slate-900 truncate">
                                    {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-xs whitespace-nowrap ml-2">
                            {user.role}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---

interface ManagementProps {
    college: College;
}

const Management: React.FC<ManagementProps> = ({ college }) => {
    const [isPrincipalDialogOpen, setIsPrincipalDialogOpen] = useState(false);
    const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);

    // Guard clause for safety
    if (!college) {
        return <div className="p-8 text-center text-slate-500">Loading college data...</div>;
    }

    // Safely access nested properties
    const principal = college.principal?.user_details;
    const admins = college.college_admins?.map((ca: any) => ca.user_details) || [];

    const handleAllocatePrincipal = async (user: User) => {
        try {
            await collegeService.allocatePrincipal(college.id, user.id);
            toast.success(`Assigned ${user.first_name} as Principal`);
            setIsPrincipalDialogOpen(false);
            // Refresh to show changes
             setTimeout(() => window.location.reload(), 1500); 
        } catch (error) {
            toast.error("Failed to assign Principal");
            console.error(error);
        }
    };

    const handleAllocateAdmin = async (user: User) => {
        try {
            await collegeService.allocateCollegeAdmin(college.id, user.id);
            toast.success(`Assigned ${user.first_name} as College Admin`);
            setIsAdminDialogOpen(false);
             setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast.error("Failed to assign College Admin");
            console.error(error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                     <h2 className="text-2xl font-bold tracking-tight text-slate-900">Management & Roles</h2>
                     <p className="text-slate-500">Manage administrative access and hierarchy for {college.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Principal Allocation Card */}
                <Card className="border-indigo-100 shadow-sm overflow-hidden bg-white">
                    <div className="h-1 bg-indigo-500" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <School className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Principal</CardTitle>
                                    <CardDescription>Head of the Institution</CardDescription>
                                </div>
                            </div>
                            <Dialog open={isPrincipalDialogOpen} onOpenChange={setIsPrincipalDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        {principal ? "Replace" : "Assign"}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Assign Principal</DialogTitle>
                                        <DialogDescription>
                                            Select a user to appoint as Principal.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <UserSearch onSelect={handleAllocatePrincipal} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {principal ? (
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-lg">
                                        {principal.first_name?.[0] || principal.username?.[0] || "P"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-bold text-slate-900">
                                        {principal.first_name} {principal.last_name}
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium">
                                        {principal.email}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                            <Check className="h-3 w-3 mr-1" /> Active
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <School className="h-6 w-6 text-slate-400" />
                                </div>
                                <h4 className="font-medium text-slate-900">No Principal Assigned</h4>
                                <p className="text-xs text-slate-500 max-w-[200px] mt-1">
                                    Assign a principal to manage departments and faculty.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* College Admin Allocation Card */}
                <Card className="border-orange-100 shadow-sm overflow-hidden bg-white">
                    <div className="h-1 bg-orange-500" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    <Shield className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">College Admins</CardTitle>
                                    <CardDescription>Administrative Staff</CardDescription>
                                </div>
                            </div>
                            <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        Add New
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Add College Admin</DialogTitle>
                                        <DialogDescription>
                                            Select a user to grant admin privileges.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <UserSearch onSelect={handleAllocateAdmin} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {admins.length > 0 ? (
                            <div className="space-y-3">
                                {admins.map((admin: any) => (
                                    <div key={admin.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-orange-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-white shadow-sm">
                                                <AvatarFallback className="bg-orange-100 text-orange-700 font-medium">
                                                    {admin.first_name?.[0] || admin.username?.[0] || "A"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm text-slate-900">
                                                    {admin.first_name} {admin.last_name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {admin.email}
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <Shield className="h-6 w-6 text-slate-400" />
                                </div>
                                <h4 className="font-medium text-slate-900">No Admins Assigned</h4>
                                <p className="text-xs text-slate-500 max-w-[200px] mt-1">
                                    Add admins to help manage the college operations.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Role Hierarchy</CardTitle>
                    <CardDescription>Understanding permissions and access levels</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
                            <div className="mt-1">
                                <School className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">Principal</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                    Has highest authority within the college context. Can manage departments, faculty allocations, and view all college-related data.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-orange-50/50 border border-orange-100">
                            <div className="mt-1">
                                <Shield className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">College Admin</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                    assist administrative tasks. Can manage student records, batches, and general settings but cannot override Principal's decisions.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Management;
