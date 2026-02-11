import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Department {
    id: string | number;
    college?: string | number;
    college_name?: string;
    name: string;
    slug?: string;
    description?: string;
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
    }
};

export default departmentService;
