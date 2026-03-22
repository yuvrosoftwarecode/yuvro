import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'instructor' | 'recruiter' | 'student';
  is_active: boolean;
  last_login: string | null;
  date_joined: string;
}

export interface PaginatedUsersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

export interface UsersFilters {
  role?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export const userService = {
  // Get paginated users list
  getUsers: async (filters: UsersFilters = {}): Promise<PaginatedUsersResponse> => {
    const params = new URLSearchParams();
    
    if (filters.role) params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    return await restApiAuthUtil.get<PaginatedUsersResponse>(`/auth/users/?${params.toString()}`);
  },

  // Get user by ID
  getUserById: async (id: string): Promise<User> => {
    return await restApiAuthUtil.get<User>(`/auth/users/${id}/`);
  },

  // Update user
  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    return await restApiAuthUtil.patch<User>(`/auth/users/${id}/`, userData);
  },

  // Create user
  createUser: async (userData: Omit<User, 'id' | 'date_joined' | 'last_login'>): Promise<User> => {
    return await restApiAuthUtil.post<User>('/auth/users/', userData);
  },

  // Delete user
  deleteUser: async (id: string): Promise<void> => {
    await restApiAuthUtil.delete(`/auth/users/${id}/`);
  },

  // Toggle user active status
  toggleUserStatus: async (id: string): Promise<User> => {
    return await restApiAuthUtil.patch<User>(`/auth/users/${id}/toggle-status/`);
  }
};