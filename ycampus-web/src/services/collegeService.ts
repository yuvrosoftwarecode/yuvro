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
    }
};

export default collegeService;
