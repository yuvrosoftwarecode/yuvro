import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { userService, User, PaginatedUsersResponse, UsersFilters } from '@/services/userService';
import { collegeService, College } from '@/services/collegeService';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Search, Edit, Power, Trash2, FilterX, UserPlus, Shield, GraduationCap, Briefcase, UserCheck, Building, UserCircle, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserFormData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'college_admin' | 'principal' | 'hod' | 'faculty' | 'placement_officer' | 'student';
  is_active: boolean;
}

const Users: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'admin' | 'college_admin' | 'principal' | 'hod' | 'faculty' | 'placement_officer' | 'student'>('admin');
    const [showAddUser, setShowAddUser] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        count: 0,
        next: null as string | null,
        previous: null as string | null,
        currentPage: 1,
        totalPages: 1
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [filters, setFilters] = useState<UsersFilters>({
        page: 1,
        page_size: 20,
        role: 'admin',
        is_active: undefined,
        ordering: '-date_joined',
        college_id: undefined
    });

    const [userForm, setUserForm] = useState<UserFormData>({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        role: 'student',
        is_active: true
    });

    // Fetch users from API
    const fetchUsers = async (newFilters: UsersFilters = filters) => {
        try {
            setLoading(true);
            setError(null);
            const response: PaginatedUsersResponse = await userService.getUsers(newFilters);
            setUsers(response.results);
            setPagination({
                count: response.count,
                next: response.next,
                previous: response.previous,
                currentPage: newFilters.page || 1,
                totalPages: Math.ceil(response.count / (newFilters.page_size || 20))
            });
        } catch (err) {
            setError('Failed to fetch users');
            toast.error('Could not load users list');
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load users on component mount and when filters change
    useEffect(() => {
        fetchUsers();
        
        // Fetch colleges
        const fetchColleges = async () => {
            try {
                const data = await collegeService.getColleges();
                setColleges(data);
            } catch (err) {
                console.error("Failed to load colleges", err);
            }
        };
        fetchColleges();
    }, []);

    // Handle tab change
    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        const newFilters = {
            ...filters,
            role: tab,
            page: 1,
            college_id: tab === 'admin' ? undefined : filters.college_id
        };
        setFilters(newFilters);
        fetchUsers(newFilters);
    };

    // Handle search with debounce
    const handleSearch = (search: string) => {
        setSearchTerm(search);
    };

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const newFilters = {
                ...filters,
                search: searchTerm || undefined,
                page: 1
            };
            setFilters(newFilters);
            fetchUsers(newFilters);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    // Handle pagination
    const handlePageChange = (page: number) => {
        const newFilters = { ...filters, page };
        setFilters(newFilters);
        fetchUsers(newFilters);
    };

    // Handle user status toggle
    const handleToggleUserStatus = async (userObj: User) => {
        try {
            await userService.toggleUserStatus(userObj.id);
            toast.success(`User ${userObj.username} ${userObj.is_active ? 'deactivated' : 'activated'} successfully`);
            fetchUsers();
        } catch (err) {
            toast.error('Failed to change user status');
            console.error('Error toggling user status:', err);
        }
    };

    // Handle user deletion
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            setFormLoading(true);
            await userService.deleteUser(userToDelete.id);
            toast.success(`User ${userToDelete.username} deleted successfully`);
            setShowDeleteConfirm(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete user');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle form input changes
    const handleFormChange = (field: keyof UserFormData, value: string | boolean) => {
        setUserForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Reset form
    const resetForm = () => {
        setUserForm({
            email: '',
            username: '',
            first_name: '',
            last_name: '',
            role: 'student',
            is_active: true
        });
        setFormError(null);
    };

    // Handle add user
    const handleAddUser = async () => {
        try {
            setFormLoading(true);
            setFormError(null);
            await userService.createUser(userForm);
            toast.success('User created successfully');
            setShowAddUser(false);
            resetForm();
            fetchUsers();
        } catch (err: any) {
            setFormError(err.message || 'Failed to create user');
            toast.error('User creation failed');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle edit user
    const handleEditUser = (userObj: User) => {
        setEditingUser(userObj);
        setUserForm({
            email: userObj.email,
            username: userObj.username,
            first_name: userObj.first_name,
            last_name: userObj.last_name,
            role: userObj.role as any,
            is_active: userObj.is_active
        });
        setShowEditUser(true);
    };

    // Handle update user
    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            setFormLoading(true);
            setFormError(null);
            await userService.updateUser(editingUser.id, userForm);
            toast.success('User updated successfully');
            setShowEditUser(false);
            setEditingUser(null);
            resetForm();
            fetchUsers();
        } catch (err: any) {
            setFormError(err.message || 'Failed to update user');
            toast.error('User update failed');
        } finally {
            setFormLoading(false);
        }
    };

    // Close modals
    const closeModals = () => {
        setShowAddUser(false);
        setShowEditUser(false);
        setShowDeleteConfirm(false);
        setEditingUser(null);
        setUserToDelete(null);
        resetForm();
    };

    const getRoleBadge = (role: string) => {
        const roleStyles = {
            admin: 'bg-red-100 text-red-800 border-red-200',
            college_admin: 'bg-purple-100 text-purple-800 border-purple-200',
            principal: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            placement_officer: 'bg-orange-100 text-orange-800 border-orange-200',
            hod: 'bg-cyan-100 text-cyan-800 border-cyan-200',
            faculty: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            student: 'bg-green-100 text-green-800 border-green-200'
        };
        return roleStyles[role as keyof typeof roleStyles] || 'bg-muted text-foreground border-border';
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <Shield className="w-4 h-4" />;
            case 'college_admin': return <Building className="w-4 h-4" />;
            case 'principal': return <UserCircle className="w-4 h-4" />;
            case 'placement_officer': return <Briefcase className="w-4 h-4" />;
            case 'hod': return <UsersIcon className="w-4 h-4" />;
            case 'faculty': return <UserCheck className="w-4 h-4" />;
            case 'student': return <GraduationCap className="w-4 h-4" />;
            default: return <GraduationCap className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        const newFilters: UsersFilters = {
            page: 1,
            page_size: 20,
            role: activeTab,
            is_active: undefined,
            ordering: '-date_joined',
            college_id: undefined
        };
        setFilters(newFilters);
        fetchUsers(newFilters);
    };

    if (user && user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Empty className="max-w-md">
                    <EmptyHeader>
                        <Shield className="w-12 h-12 text-destructive mb-4" />
                        <EmptyTitle>Access Denied</EmptyTitle>
                        <EmptyDescription>
                            You do not have the required administrative permissions to access this page.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full">
                <AdminSidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className="flex-1 p-6 bg-background overflow-y-auto">
                        <div className="flex flex-col space-y-6 max-w-7xl mx-auto">
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                                    <p className="text-muted-foreground">Manage system users, roles, and platform access control.</p>
                                </div>
                                <Button
                                    onClick={() => setShowAddUser(true)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm w-full sm:w-auto"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add New User
                                </Button>
                            </div>

                            <Card className="border shadow-sm">
                                <CardHeader className="pb-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="w-full md:max-w-72 relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Search by name, email..."
                                                value={searchTerm}
                                                onChange={(e) => handleSearch(e.target.value)}
                                                className="pl-9 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary h-10 w-full"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                            <select
                                                value={filters.is_active === undefined ? '' : filters.is_active.toString()}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newFilters = { 
                                                        ...filters, 
                                                        is_active: val === '' ? undefined : val === 'true',
                                                        page: 1 
                                                    };
                                                    setFilters(newFilters);
                                                    fetchUsers(newFilters);
                                                }}
                                                className="h-10 border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="true">Active Only</option>
                                                <option value="false">Inactive Only</option>
                                            </select>

                                            <select
                                                value={filters.ordering || '-date_joined'}
                                                onChange={(e) => {
                                                    const newFilters = { ...filters, ordering: e.target.value, page: 1 };
                                                    setFilters(newFilters);
                                                    fetchUsers(newFilters);
                                                }}
                                                className="h-10 border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                                            >
                                                <option value="-date_joined">Latest Joined</option>
                                                <option value="date_joined">Oldest Joined</option>
                                                <option value="-last_login">Recent Login</option>
                                                <option value="username">Username (A-Z)</option>
                                                <option value="-username">Username (Z-A)</option>
                                                <option value="first_name">Name (A-Z)</option>
                                                <option value="-first_name">Name (Z-A)</option>
                                                <option value="email">Email (A-Z)</option>
                                            </select>

                                            {activeTab !== 'admin' && (
                                                <select
                                                    value={filters.college_id || ''}
                                                    onChange={(e) => {
                                                        const newFilters = { ...filters, college_id: e.target.value || undefined, page: 1 };
                                                        setFilters(newFilters);
                                                        fetchUsers(newFilters);
                                                    }}
                                                    className="h-10 border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                                                >
                                                    <option value="">All Colleges</option>
                                                    {colleges.map(c => (
                                                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {(searchTerm || filters.is_active !== undefined || filters.ordering !== '-date_joined' || filters.college_id) && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={clearFilters}
                                                    className="text-primary hover:bg-primary/10 h-10 px-3"
                                                >
                                                    <FilterX className="w-4 h-4 mr-2" />
                                                    Clear Desktop Filters
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as any)} className="mt-6 w-full max-w-full overflow-x-auto pb-2 scrollbar-none">
                                        <TabsList className="bg-muted inline-flex w-auto min-w-full sm:min-w-0">
                                            <TabsTrigger value="admin" className="px-3 sm:px-4">Admins</TabsTrigger>
                                            <TabsTrigger value="college_admin" className="px-3 sm:px-4">College Admins</TabsTrigger>
                                            <TabsTrigger value="principal" className="px-3 sm:px-4">Principals</TabsTrigger>
                                            <TabsTrigger value="placement_officer" className="px-3 sm:px-4">TPOs</TabsTrigger>
                                            <TabsTrigger value="hod" className="px-3 sm:px-4">HODs</TabsTrigger>
                                            <TabsTrigger value="faculty" className="px-3 sm:px-4">Faculty</TabsTrigger>
                                            <TabsTrigger value="student" className="px-3 sm:px-4">Students</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <div className="overflow-x-auto border rounded-md">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-[300px]">User</TableHead>
                                                    <TableHead>Role</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    {activeTab !== 'admin' && <TableHead className="hidden md:table-cell">College</TableHead>}
                                                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                                                    <TableHead className="text-right pr-4">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    Array.from({ length: 5 }).map((_, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                                                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                                            {activeTab !== 'admin' && <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>}
                                                            <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                                                            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : users.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={activeTab !== 'admin' ? 6 : 5} className="h-48 text-center text-muted-foreground">
                                                            No users found.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    users.map((userObj) => (
                                                        <TableRow key={userObj.id} className="group hover:bg-muted/20">
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="h-9 w-9 border border-border">
                                                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                                                            {userObj.first_name?.charAt(0) || ''}{userObj.last_name?.charAt(0) || ''}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium text-foreground">
                                                                            {userObj.first_name} {userObj.last_name}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {userObj.email}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={cn("gap-1 py-0.5", getRoleBadge(userObj.role))}>
                                                                    {getRoleIcon(userObj.role)}
                                                                    <span className="capitalize">{userObj.role.replace('_', ' ')}</span>
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn("h-2 w-2 rounded-full", userObj.is_active ? "bg-emerald-500" : "bg-destructive")} />
                                                                    <span className="text-sm font-medium">{userObj.is_active ? 'Active' : 'Inactive'}</span>
                                                                </div>
                                                            </TableCell>
                                                            {activeTab !== 'admin' && (
                                                                <TableCell className="hidden md:table-cell text-sm text-foreground/80">
                                                                    {userObj.college_name || <span className="text-muted-foreground">None</span>}
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                                                {formatDate(userObj.date_joined)}
                                                            </TableCell>
                                                            <TableCell className="text-right pr-4">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                                                        onClick={() => handleEditUser(userObj)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className={cn(
                                                                            "h-8 w-8",
                                                                            userObj.is_active ? "text-orange-500 hover:text-orange-500 hover:bg-orange-50" : "text-emerald-500 hover:text-emerald-500 hover:bg-emerald-50"
                                                                        )}
                                                                        onClick={() => handleToggleUserStatus(userObj)}
                                                                    >
                                                                        <Power className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        onClick={() => {
                                                                            setUserToDelete(userObj);
                                                                            setShowDeleteConfirm(true);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {pagination.totalPages > 1 && (
                                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                                            <div>
                                                Showing {((pagination.currentPage - 1) * (filters.page_size || 20)) + 1} to {Math.min(pagination.currentPage * (filters.page_size || 20), pagination.count)} of {pagination.count}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <select
                                                    value={filters.page_size || 20}
                                                    onChange={(e) => {
                                                        const newFilters = { ...filters, page_size: parseInt(e.target.value), page: 1 };
                                                        setFilters(newFilters);
                                                        fetchUsers(newFilters);
                                                    }}
                                                    className="border rounded px-2 py-1 bg-transparent text-foreground h-8 focus:outline-none focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value={10}>10 / page</option>
                                                    <option value={20}>20 / page</option>
                                                    <option value={50}>50 / page</option>
                                                </select>
                                                <div className="flex items-center gap-1 border rounded-md">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-none rounded-l border-r px-3"
                                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                                        disabled={!pagination.previous}
                                                    >
                                                        Prev
                                                    </Button>
                                                    <div className="px-3 font-medium text-foreground">
                                                        {pagination.currentPage} / {pagination.totalPages}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 rounded-none rounded-r border-l px-3"
                                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                                        disabled={!pagination.next}
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </main>
                </div>
            </div>

            {/* Add/Edit User Dialog */}
            <Dialog open={showAddUser || showEditUser} onOpenChange={(open) => !open && closeModals()}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {showAddUser ? <UserPlus className="h-5 w-5 text-primary" /> : <Edit className="h-5 w-5 text-primary" />}
                            {showAddUser ? 'Add New User' : 'Edit User'}
                        </DialogTitle>
                        <DialogDescription>
                            {showAddUser ? 'Create a new user account below.' : 'Update the user profile details.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {formError && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                                {formError}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <Input
                                    value={userForm.first_name}
                                    onChange={(e) => handleFormChange('first_name', e.target.value)}
                                    className="bg-muted/30"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <Input
                                    value={userForm.last_name}
                                    onChange={(e) => handleFormChange('last_name', e.target.value)}
                                    className="bg-muted/30"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Username</label>
                            <Input
                                value={userForm.username}
                                onChange={(e) => handleFormChange('username', e.target.value)}
                                className="bg-muted/30"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Address</label>
                            <Input
                                type="email"
                                value={userForm.email}
                                onChange={(e) => handleFormChange('email', e.target.value)}
                                className="bg-muted/30"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center mt-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">System Role</label>
                                <select
                                    value={userForm.role}
                                    onChange={(e) => handleFormChange('role', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="student">Student</option>
                                    <option value="faculty">Faculty</option>
                                    <option value="hod">HOD</option>
                                    <option value="placement_officer">TPO</option>
                                    <option value="principal">Principal</option>
                                    <option value="college_admin">College Admin</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-3 pt-6 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={userForm.is_active}
                                    onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary shadow-sm focus:ring-primary"
                                />
                                <span className="text-sm font-medium">User is Active</span>
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeModals} disabled={formLoading}>Cancel</Button>
                        <Button onClick={showAddUser ? handleAddUser : handleUpdateUser} disabled={formLoading || !userForm.email || !userForm.username} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {formLoading ? 'Saving...' : 'Save User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Conf Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && closeModals()}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Delete User Account</DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete <span className="font-semibold text-foreground">{userToDelete?.username}</span>? This action is irreversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button variant="ghost" onClick={closeModals} disabled={formLoading}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={formLoading}>
                            {formLoading ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
};

export default Users;
