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
    website: string;
    college_type: string;
    affiliated_university: string;
    is_aicte_approved: boolean;
    is_ugc_approved: boolean;
    department_names: string[];
}

export const collegeService = {
    getColleges: async (): Promise<College[]> => {
        return await restApiAuthUtil.get<College[]>('/course/colleges/');
    },

    getCollege: async (id: string | number): Promise<College> => {
        return await restApiAuthUtil.get<College>(`/course/colleges/${id}/`);
    },

    createCollege: async (data: CollegeCreateData): Promise<College> => {
        return await restApiAuthUtil.post<College>('/course/colleges/', data);
    },

    updateCollege: async (id: string | number, data: CollegeCreateData): Promise<College> => {
        return await restApiAuthUtil.patch<College>(`/course/colleges/${id}/`, data);
    },

    deleteCollege: async (id: string | number): Promise<void> => {
        await restApiAuthUtil.delete(`/course/colleges/${id}/`);
    },

    allocatePrincipal: async (collegeId: string | number, userId: string): Promise<void> => {
        await restApiAuthUtil.post(`/core/college/${collegeId}/allocate-principal/`, { user_id: userId });
    },

    allocateCollegeAdmin: async (collegeId: string | number, userId: string): Promise<void> => {
        await restApiAuthUtil.post(`/core/college/${collegeId}/allocate-admin/`, { user_id: userId });
    }
};

export default collegeService;
