import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { userService, User, PaginatedUsersResponse, UsersFilters } from '../../services/userService';

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
    const handleToggleUserStatus = async (userId: string) => {
        try {
            await userService.toggleUserStatus(userId);
            fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Error toggling user status:', err);
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
            setShowAddUser(false);
            resetForm();
            fetchUsers(); // Refresh the list
        } catch (err: any) {
            setFormError(err.message || 'Failed to create user');
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
            setShowEditUser(false);
            setEditingUser(null);
            resetForm();
            fetchUsers(); // Refresh the list
        } catch (err: any) {
            setFormError(err.message || 'Failed to update user');
        } finally {
            setFormLoading(false);
        }
    };

    // Close modals
    const closeModals = () => {
        setShowAddUser(false);
        setShowEditUser(false);
        setEditingUser(null);
        resetForm();
    };

    const filteredUsers = users;

    const getRoleBadge = (role: string) => {
        const roleStyles = {
            admin: 'bg-red-100 text-red-800',
            instructor: 'bg-blue-100 text-blue-800',
            recruiter: 'bg-purple-100 text-purple-800',
            student: 'bg-green-100 text-green-800'
        };
        return roleStyles[role as keyof typeof roleStyles] || 'bg-gray-100 text-gray-800';
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

    // Only check role if we have user data
    if (user && user.role !== 'admin' && user.role !== 'instructor') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
                        <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
                    </div>
                </div>
            </div>
        );
    }

    const headerActions = (
        <button
            onClick={() => setShowAddUser(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
        >
            + Add New User
        </button>
    );

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
                {/* Search and Filters */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search users by name, email, or username..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                    <nav className="flex space-x-8">
                        {[
                            { key: 'admin', label: 'Admins' },
                            { key: 'instructor', label: 'Instructors' },
                            { key: 'recruiter', label: 'Recruiters' },
                            { key: 'student', label: 'Students' }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key as any)}
                                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading users...</span>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                        <div className="flex">
                            <div className="text-red-800">
                                <p className="text-sm font-medium">Error loading users</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                {!loading && !error && (
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Login
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0">
                                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {user.first_name?.charAt(0) || ''}{user.last_name?.charAt(0) || ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.last_login ? formatDate(user.last_login) : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(user.date_joined)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => handleEditUser(user)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleToggleUserStatus(user.id)}
                                                className={`${user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                                            >
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                        disabled={!pagination.previous}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-700">
                                        Page {pagination.currentPage} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                        disabled={!pagination.next}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing{' '}
                                            <span className="font-medium">
                                                {((pagination.currentPage - 1) * (filters.page_size || 20)) + 1}
                                            </span>{' '}
                                            to{' '}
                                            <span className="font-medium">
                                                {Math.min(pagination.currentPage * (filters.page_size || 20), pagination.count)}
                                            </span>{' '}
                                            of{' '}
                                            <span className="font-medium">{pagination.count}</span> results
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <select
                                            value={filters.page_size || 20}
                                            onChange={(e) => {
                                                const newFilters = { ...filters, page_size: parseInt(e.target.value), page: 1 };
                                                setFilters(newFilters);
                                                fetchUsers(newFilters);
                                            }}
                                            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                                        >
                                            <option value={10}>10 per page</option>
                                            <option value={20}>20 per page</option>
                                            <option value={50}>50 per page</option>
                                            <option value={100}>100 per page</option>
                                        </select>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => handlePageChange(1)}
                                                disabled={pagination.currentPage === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                First
                                            </button>
                                            <button
                                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                                disabled={!pagination.previous}
                                                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            
                                            {/* Page numbers */}
                                            {(() => {
                                                const startPage = Math.max(1, pagination.currentPage - 2);
                                                const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
                                                const pages = [];
                                                
                                                for (let i = startPage; i <= endPage; i++) {
                                                    pages.push(
                                                        <button
                                                            key={i}
                                                            onClick={() => handlePageChange(i)}
                                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                                i === pagination.currentPage
                                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {i}
                                                        </button>
                                                    );
                                                }
                                                return pages;
                                            })()}
                                            
                                            <button
                                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                                disabled={!pagination.next}
                                                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                            <button
                                                onClick={() => handlePageChange(pagination.totalPages)}
                                                disabled={pagination.currentPage === pagination.totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Last
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredUsers.length === 0 && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm ? `No users found matching "${searchTerm}"` : `No ${activeTab} users found.`}
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => handleSearch('')}
                                    className="mt-4 text-blue-600 hover:text-blue-500 text-sm font-medium"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    </div>
                )}
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>
                            
                            {formError && (
                                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                                    <p className="text-sm text-red-800">{formError}</p>
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                                    <input 
                                        type="email" 
                                        value={userForm.email}
                                        onChange={(e) => handleFormChange('email', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Username *</label>
                                    <input 
                                        type="text" 
                                        value={userForm.username}
                                        onChange={(e) => handleFormChange('username', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">First Name *</label>
                                        <input 
                                            type="text" 
                                            value={userForm.first_name}
                                            onChange={(e) => handleFormChange('first_name', e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                                        <input 
                                            type="text" 
                                            value={userForm.last_name}
                                            onChange={(e) => handleFormChange('last_name', e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role *</label>
                                    <select 
                                        value={userForm.role}
                                        onChange={(e) => handleFormChange('role', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="student">Student</option>
                                        <option value="instructor">Instructor</option>
                                        <option value="recruiter">Recruiter</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={userForm.is_active}
                                        onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                                        Active User
                                    </label>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        onClick={closeModals}
                                        disabled={formLoading}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleAddUser}
                                        disabled={formLoading || !userForm.email || !userForm.username || !userForm.first_name || !userForm.last_name}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {formLoading ? 'Adding...' : 'Add User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditUser && editingUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
                            
                            {formError && (
                                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                                    <p className="text-sm text-red-800">{formError}</p>
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                                    <input 
                                        type="email" 
                                        value={userForm.email}
                                        onChange={(e) => handleFormChange('email', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Username *</label>
                                    <input 
                                        type="text" 
                                        value={userForm.username}
                                        onChange={(e) => handleFormChange('username', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">First Name *</label>
                                        <input 
                                            type="text" 
                                            value={userForm.first_name}
                                            onChange={(e) => handleFormChange('first_name', e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                                        <input 
                                            type="text" 
                                            value={userForm.last_name}
                                            onChange={(e) => handleFormChange('last_name', e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role *</label>
                                    <select 
                                        value={userForm.role}
                                        onChange={(e) => handleFormChange('role', e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="student">Student</option>
                                        <option value="instructor">Instructor</option>
                                        <option value="recruiter">Recruiter</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="edit_is_active"
                                        checked={userForm.is_active}
                                        onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-900">
                                        Active User
                                    </label>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        onClick={closeModals}
                                        disabled={formLoading}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleUpdateUser}
                                        disabled={formLoading || !userForm.email || !userForm.username || !userForm.first_name || !userForm.last_name}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {formLoading ? 'Updating...' : 'Update User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;