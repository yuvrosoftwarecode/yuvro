import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Semester {
    id: string | number;
    department: string | number;
    department_name?: string;
    number: number;
    is_current: boolean;
    created_at?: string;
    updated_at?: string;
}

export const semesterService = {
    getSemesters: async (departmentId?: string | number): Promise<Semester[]> => {
        const url = departmentId ? `/course/semesters/?department=${departmentId}` : '/course/semesters/';
        return await restApiAuthUtil.get<Semester[]>(url);
    },

    getSemester: async (id: string | number): Promise<Semester> => {
        return await restApiAuthUtil.get<Semester>(`/course/semesters/${id}/`);
    },

    createSemester: async (data: Partial<Semester>): Promise<Semester> => {
        return await restApiAuthUtil.post<Semester>('/course/semesters/', data);
    },

    updateSemester: async (id: string | number, data: Partial<Semester>): Promise<Semester> => {
        return await restApiAuthUtil.patch<Semester>(`/course/semesters/${id}/`, data);
    },

    deleteSemester: async (id: string | number): Promise<void> => {
        await restApiAuthUtil.delete(`/course/semesters/${id}/`);
    }
};

export default semesterService;
