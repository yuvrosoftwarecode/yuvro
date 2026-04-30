import restApiAuthUtil from '../utils/RestApiAuthUtil';
import { Department } from './departmentService';

export interface Batch {
    id: string | number;
    college?: string | number;
    college_name?: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}

export interface College {
    id: string | number;
    name: string;
    short_form?: string;
    location: string;
    website: string;
    college_type: 'government' | 'autonomous' | 'deemed' | 'private';
    affiliated_university: 'jntu' | 'anna' | 'vtu' | 'ou';
    is_aicte_approved: boolean;
    is_ugc_approved: boolean;
    departments: Department[];
    principal?: {
        user_details: {
            id: string;
            email: string;
            username: string;
            first_name: string;
            last_name: string;
        };
    };
    college_admins?: {
        user_details: {
            id: string;
            email: string;
            username: string;
            first_name: string;
            last_name: string;
        };
    }[];
    created_at?: string;
    updated_at?: string;
}

export interface CollegeCreateData {
    name: string;
    short_form?: string;
    location: string;
    principals?: any[]; // Changed from principal (single) to principals (list)
    college_admins?: any[];
    department_names?: string[];
    is_aicte_approved: boolean;
    is_ugc_approved: boolean;
}

export const collegeService = {
    getColleges: async (): Promise<College[]> => {
        const response = await restApiAuthUtil.get<College[]>('/course/colleges/');
        return response;
    },

    getCollege: async (id: string | number): Promise<College> => {
        const response = await restApiAuthUtil.get<College>(`/course/colleges/${id}/`);
        return response;
    },

    createCollege: async (collegeData: Partial<College>): Promise<College> => {
        const response = await restApiAuthUtil.post<College>('/course/colleges/', collegeData);
        return response;
    },

    updateCollege: async (id: string | number, collegeData: Partial<College>): Promise<College> => {
        const response = await restApiAuthUtil.patch<College>(`/course/colleges/${id}/`, collegeData);
        return response;
    },

    deleteCollege: async (id: string | number): Promise<void> => {
        await restApiAuthUtil.delete(`/course/colleges/${id}/`);
    },

    allocatePrincipal: async (collegeId: string | number, userId: string): Promise<void> => {
        // Kept for backward compatibility if needed, but UI uses createPrincipal now
        await restApiAuthUtil.post(`/core/college/${collegeId}/allocate-principal/`, { user_id: userId });
    },

    allocateCollegeAdmin: async (collegeId: string | number, userId: string): Promise<void> => {
        await restApiAuthUtil.post(`/core/college/${collegeId}/allocate-admin/`, { user_id: userId });
    },

    createPrincipal: async (collegeId: string | number, userData: any): Promise<void> => {
        await restApiAuthUtil.post(`/core/college/${collegeId}/create-principal/`, userData);
    },
    
    getDashboardStats: async (collegeId: string | number, filters?: any): Promise<any> => {
        return await restApiAuthUtil.get(`/course/colleges/${collegeId}/dashboard_stats/`, filters);
    },

    createCollegeAdmin: async (collegeId: string | number, userData: any): Promise<void> => {
        await restApiAuthUtil.post(`/core/college/${collegeId}/create-admin/`, userData);
    },

    updateStaffMember: async (collegeId: string | number, userData: { user_id: string, first_name?: string, last_name?: string, email?: string }): Promise<void> => {
        await restApiAuthUtil.post(`/core/college/${collegeId}/update-staff/`, userData);
    },

    deleteStaffMember: async (collegeId: string | number, userId: string): Promise<void> => {
        await restApiAuthUtil.post(`/core/college/${collegeId}/delete-staff/`, { user_id: userId });
    },

    getUniqueBatches: async (collegeId: string | number): Promise<string[]> => {
        return await restApiAuthUtil.get<string[]>(`/course/colleges/${collegeId}/unique_batches/`);
    },

    bulkInitializeSemesters: async (collegeId: string | number, batchName: string): Promise<any> => {
        return await restApiAuthUtil.post(`/course/colleges/${collegeId}/bulk_initialize_semesters/`, { batch_name: batchName });
    }
};

export default collegeService;
