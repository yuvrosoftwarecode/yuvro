import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Task {
    id: string;
    faculty: string;
    faculty_details?: any;
    subject: string | number;
    subject_details?: any;
    unit?: string;
    unit_name?: string;
    sub_unit?: string;
    sub_unit_name?: string;
    sections: string[];
    section_details?: any[];
    title: string;
    description: string;
    department: string | number;
    department_name?: string;
    due_date?: string;
    created_at: string;
    updated_at: string;
}

export const taskService = {
    getTasks: async (params?: any): Promise<Task[]> => {
        return await restApiAuthUtil.get<Task[]>('/course/tasks/', { params });
    },

    getTask: async (id: string): Promise<Task> => {
        return await restApiAuthUtil.get<Task>(`/course/tasks/${id}/`);
    },

    createTask: async (data: any): Promise<Task> => {
        return await restApiAuthUtil.post<Task>('/course/tasks/', data);
    },

    updateTask: async (id: string, data: any): Promise<Task> => {
        return await restApiAuthUtil.patch<Task>(`/course/tasks/${id}/`, data);
    },

    deleteTask: async (id: string): Promise<void> => {
        return await restApiAuthUtil.delete(`/course/tasks/${id}/`);
    }
};

export default taskService;
