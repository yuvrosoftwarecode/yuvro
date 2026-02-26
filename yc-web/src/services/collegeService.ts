import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Department {
    id: string | number;
    name: string;
    verification_status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface College {
    id: string | number;
    name: string;
    verification_status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export const collegeService = {
    async getColleges(status?: string): Promise<College[]> {
        const params: Record<string, string> = status ? { verification_status: status } : {};
        return restApiAuthUtil.get('/auth/colleges/', { params });
    },

    async createCollege(data: { name: string }): Promise<College> {
        return restApiAuthUtil.post('/auth/colleges/', data);
    },

    async approveCollege(id: string | number): Promise<void> {
        return restApiAuthUtil.post(`/auth/colleges/${id}/approve/`);
    },

    async rejectCollege(id: string | number): Promise<void> {
        return restApiAuthUtil.post(`/auth/colleges/${id}/reject/`);
    },

    async deleteCollege(id: string | number): Promise<void> {
        return restApiAuthUtil.delete(`/auth/colleges/${id}/`);
    },

    async getDepartments(status?: string): Promise<Department[]> {
        const params: Record<string, string> = status ? { verification_status: status } : {};
        return restApiAuthUtil.get('/auth/departments/', { params });
    },

    async createDepartment(data: { name: string }): Promise<Department> {
        return restApiAuthUtil.post('/auth/departments/', data);
    },

    async approveDepartment(id: string | number): Promise<void> {
        return restApiAuthUtil.post(`/auth/departments/${id}/approve/`);
    },

    async rejectDepartment(id: string | number): Promise<void> {
        return restApiAuthUtil.post(`/auth/departments/${id}/reject/`);
    },

    async deleteDepartment(id: string | number): Promise<void> {
        return restApiAuthUtil.delete(`/auth/departments/${id}/`);
    }
};

