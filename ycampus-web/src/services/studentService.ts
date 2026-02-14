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
    created_at?: string;
    updated_at?: string;
}

export const studentService = {
    getStudents: async (params?: any): Promise<Student[]> => {
        let url = '/core/student/';
        if (params) {
            const query = new URLSearchParams(params).toString();
            url += `?${query}`;
        }
        return await restApiAuthUtil.get<Student[]>(url);
    },

    getStudent: async (id: string | number): Promise<Student> => {
        return await restApiAuthUtil.get<Student>(`/core/student/${id}/`);
    }
};

export default studentService;
