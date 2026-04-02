import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Student {
    id: string | number;
    user: string | number;
    user_details: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        profile?: {
            profile_image?: string;
        };
    };
    college?: string | number;
    college_name?: string;
    department?: string | number;
    department_name?: string;
    batch?: string | number;
    batch_name?: string;
    semester?: string | number;
    semester_number?: number;
    section?: string | number;
    section_name?: string;
    roll_number: string;
    phone_number?: string;
    admission_type: 'regular' | 'lateral_entry';
    is_detained: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export const studentService = {
    getStudents: async (params?: any): Promise<PaginatedResponse<Student>> => {
        let url = '/core/student/';
        if (params) {
            const cleanParams: any = {};
            Object.keys(params).forEach(key => {
                const value = params[key];
                if (value !== undefined && value !== null && value !== '') {
                    cleanParams[key] = value;
                }
            });
            const query = new URLSearchParams(cleanParams).toString();
            url += `?${query}`;
        }
        return await restApiAuthUtil.get<PaginatedResponse<Student>>(url);
    },

    getStudent: async (id: string | number): Promise<Student> => {
        return await restApiAuthUtil.get<Student>(`/core/student/${id}/`);
    },

    createStudent: async (data: any): Promise<Student> => {
        return await restApiAuthUtil.post<Student>('/core/student/', data);
    },

    updateStudent: async (id: string | number, data: any): Promise<Student> => {
        return await restApiAuthUtil.patch<Student>(`/core/student/${id}/`, data);
    },

    deleteStudent: async (id: string | number): Promise<void> => {
        return await restApiAuthUtil.delete(`/core/student/${id}/`);
    },

    bulkImport: async (file: File, params?: { department?: string | number, batch?: string | number }): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        if (params?.department) formData.append('department', params.department.toString());
        if (params?.batch) formData.append('batch', params.batch.toString());
        return await restApiAuthUtil.post('/core/student/bulk-import/', formData);
    }
};

export default studentService;
