import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { userService, User, PaginatedUsersResponse, UsersFilters } from '../../services/userService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchBar from '@/components/common/SearchBar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "../../components/common/StatsCard";
import { DataTable } from "../../components/common/DataTable";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { Plus, Users as UsersIcon, Shield, UserCheck, UserX, Pencil, Trash } from 'lucide-react';
import { toast } from 'sonner';

interface UserFormData {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'instructor' | 'recruiter' | 'student';
    is_active: boolean;
}

const Users: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'admin' | 'instructor' | 'recruiter' | 'student'>('admin');
    const [showAddUser, setShowAddUser] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [pagination, setPagination] = useState({
        count: 0,
        next: null as string | null,
        previous: null as string | null,
        currentPage: 1,
        totalPages: 1
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<UsersFilters>({
        page: 1,
        page_size: 20,
        role: 'admin'
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
            console.error('Error fetching users:', err);
            toast.error('Failed to fetch users');
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
        if (page < 1 || page > pagination.totalPages) return;
        const newFilters = { ...filters, page };
        setFilters(newFilters);
        fetchUsers(newFilters);
    };

    // Handle user status toggle
    const handleToggleUserStatus = async (userId: string) => {
        try {
            await userService.toggleUserStatus(userId);
            toast.success('User status updated');
            fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Error toggling user status:', err);
            toast.error('Failed to update user status');
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
    };

    // Handle add user
    const handleAddUser = async () => {
        try {
            setFormLoading(true);
            await userService.createUser(userForm);
            setShowAddUser(false);
            resetForm();
            toast.success('User created successfully');
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create user');
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
            await userService.updateUser(editingUser.id, userForm);
            setShowEditUser(false);
            setEditingUser(null);
            resetForm();
            toast.success('User updated successfully');
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update user');
        } finally {
            setFormLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Only check role if we have user data
    if (user && user.role !== 'admin' && user.role !== 'instructor') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
                    <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    const headerActions = (
        <Button
            onClick={() => {
                resetForm();
                setShowAddUser(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all duration-200"
        >
            <Plus className="h-4 w-4" />
            <span>Add New User</span>
        </Button>
    );

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return Shield;
            case 'instructor': return UserCheck;
            case 'recruiter': return UsersIcon;
            default: return UsersIcon;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-red-100 text-red-700 border-red-200';
            case 'instructor': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'recruiter': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'student': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const columns = [
        {
            header: 'User',
            cell: (user: User) => (
                <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-medium">
                            {user.first_name?.charAt(0) || ''}{user.last_name?.charAt(0) || ''}
                        </div>
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            cell: (user: User) => {
                const Icon = getRoleIcon(user.role);
                return (
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                        <span className="mr-1.5"><Icon className="h-4 w-4" /></span>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </div>
                );
            }
        },
        {
            header: 'Status',
            cell: (user: User) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.is_active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {user.is_active ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            header: 'Last Login',
            cell: (user: User) => (
                <span className="text-sm text-gray-600">
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                </span>
            )
        },
        {
            header: 'Created',
            cell: (user: User) => (
                <span className="text-sm text-gray-600">
                    {formatDate(user.date_joined)}
                </span>
            )
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (user: User) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit User"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleToggleUserStatus(user.id)}
                        className={`p-2 rounded-lg transition-colors ${user.is_active
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                        title={user.is_active ? 'Deactivate User' : 'Activate User'}
                    >
                        {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title="User Management"
                        subtitle="Manage system users and their roles"
                        actions={headerActions}
                    />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <StatsCard
                                label={`Total ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s`}
                                value={pagination.count}
                                icon={getRoleIcon(activeTab)}
                                colorScheme={
                                    activeTab === 'admin' ? 'red' :
                                        activeTab === 'instructor' ? 'blue' :
                                            activeTab === 'recruiter' ? 'purple' : 'green'
                                }
                            />
                        </div>

                        {/* Search and Filters */}
                        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                            <Tabs value={activeTab} onValueChange={(v: any) => handleTabChange(v)}>
                                <TabsList className="inline-flex w-auto gap-1">
                                    <TabsTrigger value="admin" className="px-5">Admins</TabsTrigger>
                                    <TabsTrigger value="instructor" className="px-5">Instructors</TabsTrigger>
                                    <TabsTrigger value="recruiter" className="px-5">Recruiters</TabsTrigger>
                                    <TabsTrigger value="student" className="px-5">Students</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <div className="w-full sm:w-72">
                                <SearchBar
                                    searchQuery={searchTerm}
                                    setSearchQuery={handleSearch}
                                    placeholder="Search users..."
                                />
                            </div>
                        </div>

                        {/* Users Table */}
                        <DataTable
                            data={users}
                            columns={columns}
                            keyExtractor={(user) => user.id}
                            isLoading={loading}
                            emptyState={{
                                message: "No users found",
                                subMessage: searchTerm ? `No users found matching "${searchTerm}"` : `No ${activeTab} users found`,
                                action: (
                                    <Button onClick={() => setShowAddUser(true)}>
                                        Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                    </Button>
                                )
                            }}
                        />

                        {/* Pagination */}
                        {!loading && pagination.totalPages > 1 && (
                            <div className="mt-4">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                                className={pagination.previous ? "cursor-pointer" : "pointer-events-none opacity-50"}
                                            />
                                        </PaginationItem>

                                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                                            if (
                                                page === 1 ||
                                                page === pagination.totalPages ||
                                                (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)
                                            ) {
                                                return (
                                                    <PaginationItem key={page}>
                                                        <PaginationLink
                                                            isActive={page === pagination.currentPage}
                                                            onClick={() => handlePageChange(page)}
                                                            className="cursor-pointer"
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            }
                                            if (
                                                page === pagination.currentPage - 2 ||
                                                page === pagination.currentPage + 2
                                            ) {
                                                return <PaginationItem key={page}><PaginationEllipsis /></PaginationItem>;
                                            }
                                            return null;
                                        })}

                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                                className={pagination.next ? "cursor-pointer" : "pointer-events-none opacity-50"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add User Dialog */}
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                            Create a new user account. They will receive an email with their login details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input
                                type="email"
                                value={userForm.email}
                                onChange={(e) => handleFormChange('email', e.target.value)}
                                placeholder="user@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Username *</Label>
                            <Input
                                value={userForm.username}
                                onChange={(e) => handleFormChange('username', e.target.value)}
                                placeholder="jdoe"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name *</Label>
                                <Input
                                    value={userForm.first_name}
                                    onChange={(e) => handleFormChange('first_name', e.target.value)}
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name *</Label>
                                <Input
                                    value={userForm.last_name}
                                    onChange={(e) => handleFormChange('last_name', e.target.value)}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Role *</Label>
                            <Select
                                value={userForm.role}
                                onValueChange={(value) => handleFormChange('role', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="instructor">Instructor</SelectItem>
                                    <SelectItem value="recruiter">Recruiter</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={userForm.is_active}
                                onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Label htmlFor="is_active" className="font-normal cursor-pointer">
                                Active User
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddUser(false)} disabled={formLoading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddUser}
                            disabled={formLoading || !userForm.email || !userForm.username}
                        >
                            {formLoading ? 'Adding...' : 'Add User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user details and permissions.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={userForm.email}
                                onChange={(e) => handleFormChange('email', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Username</Label>
                            <Input
                                value={userForm.username}
                                onChange={(e) => handleFormChange('username', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input
                                    value={userForm.first_name}
                                    onChange={(e) => handleFormChange('first_name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input
                                    value={userForm.last_name}
                                    onChange={(e) => handleFormChange('last_name', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                                value={userForm.role}
                                onValueChange={(value) => handleFormChange('role', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="instructor">Instructor</SelectItem>
                                    <SelectItem value="recruiter">Recruiter</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="edit_is_active"
                                checked={userForm.is_active}
                                onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Label htmlFor="edit_is_active" className="font-normal cursor-pointer">
                                Active User
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditUser(false)} disabled={formLoading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateUser}
                            disabled={formLoading}
                        >
                            {formLoading ? 'Updating...' : 'Update User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Users;