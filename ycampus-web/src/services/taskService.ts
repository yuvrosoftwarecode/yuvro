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
    task_type?: 'descriptive' | 'coding';
    question_source?: 'manual' | 'bank';
    questions?: number[];
    question_details?: any[];
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
    answers_data?: Record<string, any>;
    file?: string;
    is_submitted: boolean;
    status: 'pending' | 'accepted' | 'rejected';
    submitted_at?: string;
    comments: TaskComment[];
    created_at: string;
    updated_at: string;
}

export const taskService = {
    getTasks: async (params?: any): Promise<Task[]> => {
        return await restApiAuthUtil.get<Task[]>('/core/tasks/', { params });
    },

    getTask: async (id: string): Promise<Task> => {
        return await restApiAuthUtil.get<Task>(`/core/tasks/${id}/`);
    },

    createTask: async (data: any): Promise<Task> => {
        return await restApiAuthUtil.post<Task>('/core/tasks/', data);
    },

    updateTask: async (id: string, data: any): Promise<Task> => {
        return await restApiAuthUtil.patch<Task>(`/core/tasks/${id}/`, data);
    },

    sendTask: async (id: string, sections?: string[]): Promise<Task> => {
        const data: any = { is_sent: true };
        if (sections) data.sections = sections;
        return await restApiAuthUtil.patch<Task>(`/core/tasks/${id}/`, data);
    },

    deleteTask: async (id: string): Promise<void> => {
        return await restApiAuthUtil.delete(`/core/tasks/${id}/`);
    },

    getTaskSubmissions: async (taskId: string): Promise<TaskSubmission[]> => {
        return await restApiAuthUtil.get<TaskSubmission[]>(`/core/task-submissions/`, { params: { task: taskId } });
    },

    getSubmissionDetail: async (id: string): Promise<TaskSubmission> => {
        return await restApiAuthUtil.get<TaskSubmission>(`/core/task-submissions/${id}/`);
    },

    addCommentToSubmission: async (id: string, comment: string): Promise<TaskComment> => {
        return await restApiAuthUtil.post<TaskComment>(`/core/task-submissions/${id}/add_comment/`, { comment });
    },

    createTaskSubmission: async (data: FormData): Promise<TaskSubmission> => {
        return await restApiAuthUtil.post<TaskSubmission>(`/core/task-submissions/`, data);
    },

    submitTask: async (id: string, data: FormData): Promise<TaskSubmission> => {
        return await restApiAuthUtil.patch<TaskSubmission>(`/core/task-submissions/${id}/`, data);
    },

    updateSubmissionStatus: async (id: string, status: 'pending' | 'accepted' | 'rejected'): Promise<TaskSubmission> => {
        return await restApiAuthUtil.patch<TaskSubmission>(`/core/task-submissions/${id}/`, { status });
    },

    getStudentSubmissions: async (studentId: string): Promise<TaskSubmission[]> => {
        return await restApiAuthUtil.get<TaskSubmission[]>('/core/task-submissions/', { params: { student: studentId } });
    }
};

export default taskService;
