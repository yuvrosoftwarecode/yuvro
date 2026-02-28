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
    is_sent?: boolean;
    due_date?: string;
    created_at: string;
    updated_at: string;
}

export interface TaskComment {
    id: string;
    submission: string;
    faculty: string;
    faculty_details?: any;
    comment: string;
    created_at: string;
    updated_at: string;
}

export interface TaskSubmission {
    id: string;
    task: string;
    student: string;
    student_details?: any;
    answer: string;
    is_submitted: boolean;
    submitted_at?: string;
    comments: TaskComment[];
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

    sendTask: async (id: string): Promise<Task> => {
        return await restApiAuthUtil.patch<Task>(`/course/tasks/${id}/`, { is_sent: true });
    },

    deleteTask: async (id: string): Promise<void> => {
        return await restApiAuthUtil.delete(`/course/tasks/${id}/`);
    },

    getTaskSubmissions: async (taskId: string): Promise<TaskSubmission[]> => {
        return await restApiAuthUtil.get<TaskSubmission[]>(`/course/task-submissions/`, { params: { task: taskId } });
    },

    getSubmissionDetail: async (id: string): Promise<TaskSubmission> => {
        return await restApiAuthUtil.get<TaskSubmission>(`/course/task-submissions/${id}/`);
    },

    addCommentToSubmission: async (id: string, comment: string): Promise<TaskComment> => {
        return await restApiAuthUtil.post<TaskComment>(`/course/task-submissions/${id}/add_comment/`, { comment });
    }
};

export default taskService;
