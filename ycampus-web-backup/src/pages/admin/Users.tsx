import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import PageHeader from '../../components/common/PageHeader';
import { userService, User, PaginatedUsersResponse, UsersFilters } from '../../services/userService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "../../components/ui/empty";
import { Search, Plus, MoreVertical, Edit, Power, Trash2, FilterX, UserPlus, Shield, GraduationCap, Briefcase, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface UserFormData {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'instructor' | 'recruiter' | 'student' | 'faculty';
    is_active: boolean;
}

const Users: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'admin' | 'instructor' | 'recruiter' | 'student' | 'faculty'>('admin');
    const [showAddUser, setShowAddUser] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
        is_active: undefined
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
    }, []);

    // Handle tab change
    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        const newFilters = {
            ...filters,
            role: tab,
            page: 1
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
    const handleToggleUserStatus = async (user: User) => {
        try {
            await userService.toggleUserStatus(user.id);
            toast.success(`User ${user.username} ${user.is_active ? 'deactivated' : 'activated'} successfully`);
            fetchUsers(); // Refresh the list
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
    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setUserForm({
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_active: user.is_active
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

    const filteredUsers = users;

    const getRoleBadge = (role: string) => {
        const roleStyles = {
            admin: 'bg-red-100 text-red-800 border-red-200',
            instructor: 'bg-blue-100 text-blue-800 border-blue-200',
            faculty: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            recruiter: 'bg-purple-100 text-purple-800 border-purple-200',
            student: 'bg-green-100 text-green-800 border-green-200'
        };
        return roleStyles[role as keyof typeof roleStyles] || 'bg-white text-gray-800 border-gray-200';
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <Shield className="w-4 h-4" />;
            case 'instructor': return <GraduationCap className="w-4 h-4" />;
            case 'faculty': return <UserCheck className="w-4 h-4" />;
            case 'recruiter': return <Briefcase className="w-4 h-4" />;
            default: return <GraduationCap className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        const newFilters: UsersFilters = {
            page: 1,
            page_size: 20,
            role: activeTab,
            is_active: undefined
        };
        setFilters(newFilters);
        fetchUsers(newFilters);
    };

    if (user && user.role !== 'admin' && user.role !== 'instructor') {
        return (
            <div className="min-h-screen bg-background">
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <Empty className="max-w-md">
                        <EmptyHeader>
                            <Shield className="w-12 h-12 text-destructive mb-4" />
                            <EmptyTitle>Access Denied</EmptyTitle>
                            <EmptyDescription>
                                You don't have the required administrative permissions to access this page.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </div>
            </div>
        );
    }

    const headerActions = (
        <Button
            onClick={() => setShowAddUser(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer"
        >
            <UserPlus className="w-4 h-4 mr-2" />
            Add New User
        </Button>
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="flex">
                <RoleSidebar />
                <main className="flex-1 overflow-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                        <PageHeader
                            title="User Management"
                            subtitle="Centralized management for system users, roles, and access"
                            actions={headerActions}
                        />
                        <Card className="border-none shadow-none bg-transparent">
                            <CardHeader className="pb-2 px-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1 max-w-lg">
                                        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                            <Input
                                                id="main-user-search-input"
                                                name="user_mgmt_search_filter"
                                                type="search"
                                                autoComplete="off"
                                                placeholder="Search by name, email, or username..."
                                                value={searchTerm}
                                                onChange={(e) => handleSearch(e.target.value)}
                                                className="pl-10 border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm h-10 w-full"
                                            />
                                        </form>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {filters.is_active !== true ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const newFilters = { ...filters, is_active: true };
                                                    setFilters(newFilters);
                                                    fetchUsers(newFilters);
                                                }}
                                                className="bg-muted/50 text-muted-foreground hover:bg-muted cursor-pointer transition-all"
                                            >
                                                Show Active Only
                                            </Button>
                                        ) : null}

                                        {(searchTerm || filters.is_active === true) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearFilters}
                                                className="cursor-pointer text-primary bg-primary/10 hover:bg-primary/20 transition-all font-medium flex items-center gap-1"
                                            >
                                                <FilterX className="w-4 h-4" />
                                                Clear filters
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <Tabs value={activeTab} onValueChange={(val) => handleTabChange(val as any)} className="mt-8">
                                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/50 rounded-lg">
                                        <TabsTrigger value="admin" className="py-2 cursor-pointer transition-all border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-background data-[state=active]:shadow-sm hover:border-primary/40 rounded-none">Admins</TabsTrigger>
                                        <TabsTrigger value="instructor" className="py-2 cursor-pointer transition-all border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-background data-[state=active]:shadow-sm hover:border-primary/40 rounded-none">Instructors</TabsTrigger>
                                        <TabsTrigger value="faculty" className="py-2 cursor-pointer transition-all border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-background data-[state=active]:shadow-sm hover:border-primary/40 rounded-none">Faculty</TabsTrigger>
                                        <TabsTrigger value="recruiter" className="py-2 cursor-pointer transition-all border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-background data-[state=active]:shadow-sm hover:border-primary/40 rounded-none">Recruiters</TabsTrigger>
                                        <TabsTrigger value="student" className="py-2 cursor-pointer transition-all border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-background data-[state=active]:shadow-sm hover:border-primary/40 rounded-none">Students</TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                <div className="mt-6 overflow-hidden bg-background">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="w-[300px]">User</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                                                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                                                <TableHead className="text-right pr-6">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-24 ml-auto rounded-md" /></TableCell>
                                                    </TableRow>
                                                ))
                                            ) : users.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-72 text-center">
                                                        <Empty>
                                                            <EmptyHeader>
                                                                <EmptyTitle>No users found</EmptyTitle>
                                                                <EmptyDescription>
                                                                    {searchTerm ? `Try adjusting your search for "${searchTerm}"` : `No ${activeTab} users available currently.`}
                                                                </EmptyDescription>
                                                                {searchTerm && (
                                                                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                                                                        Clear Search
                                                                    </Button>
                                                                )}
                                                            </EmptyHeader>
                                                        </Empty>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                users.map((user) => (
                                                    <TableRow key={user.id} className="group transition-colors">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-9 w-9 border border-border/50 ring-1 ring-border/5 ring-offset-background">
                                                                    <AvatarFallback className="bg-muted text-xs font-semibold">
                                                                        {user.first_name?.charAt(0) || ''}{user.last_name?.charAt(0) || ''}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-sm font-semibold truncate text-foreground/90">
                                                                        {user.first_name} {user.last_name}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                                        {user.email}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={cn("gap-1.5 font-medium px-2 py-0.5", getRoleBadge(user.role))}>
                                                                {getRoleIcon(user.role)}
                                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("h-2 w-2 rounded-full", user.is_active ? "bg-emerald-500" : "bg-destructive")} />
                                                                <span className="text-sm text-foreground/70">{user.is_active ? 'Active' : 'Inactive'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                                                            {user.last_login ? formatDate(user.last_login) : 'Never'}
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                                                            {formatDate(user.date_joined)}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-4">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors"
                                                                    onClick={() => handleEditUser(user)}
                                                                    title="Edit Details"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className={cn(
                                                                        "h-8 w-8 p-0 cursor-pointer transition-colors",
                                                                        user.is_active ? "text-orange-500 hover:text-orange-600 hover:bg-orange-50" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                                    )}
                                                                    onClick={() => handleToggleUserStatus(user)}
                                                                    title={user.is_active ? 'Deactivate User' : 'Activate User'}
                                                                >
                                                                    <Power className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                                                    onClick={() => {
                                                                        setUserToDelete(user);
                                                                        setShowDeleteConfirm(true);
                                                                    }}
                                                                    title="Delete User"
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

                                {/* Pagination */}
                                {pagination.totalPages > 1 && (
                                    <div className="mt-4 flex items-center justify-between px-2">
                                        <div className="hidden sm:block text-sm text-muted-foreground">
                                            Showing <span className="font-semibold text-foreground">{((pagination.currentPage - 1) * (filters.page_size || 20)) + 1}</span> to <span className="font-semibold text-foreground">{Math.min(pagination.currentPage * (filters.page_size || 20), pagination.count)}</span> of <span className="font-semibold text-foreground">{pagination.count}</span> users
                                        </div>
                                        <div className="flex items-center gap-2 ml-auto">
                                            <div className="flex items-center gap-1 mr-4">
                                                <span className="text-xs text-muted-foreground">Rows per page:</span>
                                                <select
                                                    value={filters.page_size || 20}
                                                    onChange={(e) => {
                                                        const newFilters = { ...filters, page_size: parseInt(e.target.value), page: 1 };
                                                        setFilters(newFilters);
                                                        fetchUsers(newFilters);
                                                    }}
                                                    className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                                                >
                                                    <option value={10}>10</option>
                                                    <option value={20}>20</option>
                                                    <option value={50}>50</option>
                                                </select>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                                disabled={!pagination.previous}
                                            >
                                                Previous
                                            </Button>
                                            <div className="flex items-center gap-1 px-2">
                                                {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                                                    let pageNum;
                                                    if (pagination.totalPages <= 5) pageNum = i + 1;
                                                    else if (pagination.currentPage <= 3) pageNum = i + 1;
                                                    else if (pagination.currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                                    else pageNum = pagination.currentPage - 2 + i;

                                                    return (
                                                        <Button
                                                            key={pageNum}
                                                            variant={pagination.currentPage === pageNum ? "default" : "ghost"}
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handlePageChange(pageNum!)}
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                                disabled={!pagination.next}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>

            {/* User Form Dialog (Add/Edit) */}
            <Dialog open={showAddUser || showEditUser} onOpenChange={(open) => !open && closeModals()}>
                <DialogContent className="sm:max-w-[500px] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 bg-muted/30 pb-4">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {showAddUser ? <UserPlus className="h-5 w-5 text-orange-500" /> : <Edit className="h-5 w-5 text-emerald-500" />}
                            {showAddUser ? 'Add New User' : 'Edit User Record'}
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            {showAddUser
                                ? 'Create a new user account and assign system permissions.'
                                : 'Update user profile details and access control settings.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={(e) => { e.preventDefault(); showAddUser ? handleAddUser() : handleUpdateUser(); }}>
                        <div className="p-6 pt-2 space-y-6">
                            {formError && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-foreground/80 ml-1">First Name</label>
                                        <Input
                                            id="add-user-field-firstname"
                                            name="unique_user_reg_first_name"
                                            autoComplete="new-password"
                                            value={userForm.first_name}
                                            onChange={(e) => handleFormChange('first_name', e.target.value)}
                                            placeholder="Enter first name"
                                            className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-foreground/80 ml-1">Last Name</label>
                                        <Input
                                            id="add-user-field-lastname"
                                            name="unique_user_reg_last_name"
                                            autoComplete="new-password"
                                            value={userForm.last_name}
                                            onChange={(e) => handleFormChange('last_name', e.target.value)}
                                            placeholder="Enter last name"
                                            className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 ml-1">Username</label>
                                    <Input
                                        id="add-user-field-username"
                                        name="unique_user_reg_username"
                                        autoComplete="new-password"
                                        value={userForm.username}
                                        onChange={(e) => handleFormChange('username', e.target.value)}
                                        placeholder="Choose a username"
                                        className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground/80 ml-1">Email Address</label>
                                    <Input
                                        id="add-user-field-email"
                                        name="unique_user_reg_email"
                                        autoComplete="new-password"
                                        type="email"
                                        value={userForm.email}
                                        onChange={(e) => handleFormChange('email', e.target.value)}
                                        placeholder="name@example.com"
                                        className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 h-11"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-end">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-foreground/80 ml-1">System Role</label>
                                        <select
                                            value={userForm.role}
                                            onChange={(e) => handleFormChange('role', e.target.value)}
                                            className="h-11 w-full rounded-md border-none bg-muted/30 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all hover:bg-muted/50"
                                        >
                                            <option value="student">Student</option>
                                            <option value="instructor">Instructor</option>
                                            <option value="faculty">Faculty</option>
                                            <option value="recruiter">Recruiter</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="pb-3 px-1">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="is_active_check"
                                                    checked={userForm.is_active}
                                                    onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-muted-foreground/30 bg-muted/30 checked:bg-primary checked:border-primary transition-all"
                                                />
                                                <UserCheck className="absolute h-3.5 w-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" />
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                                User is active
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-muted/10 border-t border-border/5">
                            <Button variant="ghost" type="button" onClick={closeModals} disabled={formLoading} className="cursor-pointer">Cancel</Button>
                            <Button
                                type="submit"
                                disabled={formLoading || !userForm.email || !userForm.username || !userForm.first_name}
                                className={cn(
                                    "cursor-pointer shadow-sm px-8",
                                    showAddUser ? "bg-orange-500 hover:bg-orange-600" : "bg-emerald-500 hover:bg-emerald-600"
                                )}
                            >
                                {formLoading ? (showAddUser ? 'Adding...' : 'Saving...') : (showAddUser ? 'Create User' : 'Save Changes')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && closeModals()}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Confirm Deletion
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            This action cannot be undone. This will permanently delete the user account for
                            <span className="font-bold text-foreground mx-1">@{userToDelete?.username}</span>
                            and remove all associated data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={closeModals} disabled={formLoading}>Keep User</Button>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={formLoading}>
                            {formLoading ? 'Deleting...' : 'Delete Permanently'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Users;