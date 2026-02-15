import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Department {
    id: string | number;
    college?: string | number;
    college_name?: string;
    name: string;
    short_form?: string;
    hod_details?: {
        id: string;
        user_details: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            profile?: {
                profile_image?: string;
            };
        };
    };
    created_at?: string;
    updated_at?: string;
}

export const departmentService = {
    getDepartments: async (collegeId?: string | number): Promise<Department[]> => {
        const url = collegeId ? `/course/departments/?college=${collegeId}` : '/course/departments/';
        return await restApiAuthUtil.get<Department[]>(url);
    },

    getDepartment: async (id: string | number): Promise<Department> => {
        return await restApiAuthUtil.get<Department>(`/course/departments/${id}/`);
    },

    createDepartment: async (data: Partial<Department>): Promise<Department> => {
        return await restApiAuthUtil.post<Department>('/course/departments/', data);
    },

    updateDepartment: async (id: string | number, data: Partial<Department>): Promise<Department> => {
        return await restApiAuthUtil.patch<Department>(`/course/departments/${id}/`, data);
    },

    deleteDepartment: async (id: string | number): Promise<void> => {
        await restApiAuthUtil.delete(`/course/departments/${id}/`);
    },

    allocateHOD: async (collegeId: string | number, data: { user_id: string; department_id: string | number }): Promise<any> => {
        return await restApiAuthUtil.post(`/core/college-allocation/${collegeId}/allocate-hod/`, data);
    },

    createHOD: async (collegeId: string | number, data: any): Promise<any> => {
        return await restApiAuthUtil.post(`/core/college-allocation/${collegeId}/create-hod/`, data);
    }
};

export default departmentService;
