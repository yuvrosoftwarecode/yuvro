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
    attachment?: string;
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

export interface TaskSubmissionHistory {
    id: string;
    attempt_number: number;
    answer: string;
    answers_data?: Record<string, any>;
    file?: string;
    status: 'pending' | 'accepted' | 'rejected';
    grade?: string | number | null;
    rejection_reason?: string | null;
    rejection_comment?: string | null;
    submitted_at?: string;
    reviewed_at?: string;
    reviewed_by?: any;
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
    grade?: string | number | null;
    rejection_reason?: string | null;
    rejection_comment?: string | null;
    attempt_number: number;
    reviewed_at?: string;
    reviewed_by?: any;
    submitted_at?: string;
    comments: TaskComment[];
    history?: TaskSubmissionHistory[];
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
        if (data.attachment) {
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    if (Array.isArray(data[key])) {
                        data[key].forEach((val: any) => formData.append(key, val));
                    } else {
                        formData.append(key, data[key]);
                    }
                }
            });
            return await restApiAuthUtil.post<Task>('/core/tasks/', formData);
        }
        return await restApiAuthUtil.post<Task>('/core/tasks/', data);
    },

    updateTask: async (id: string, data: any): Promise<Task> => {
        if (data.attachment instanceof File) {
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    if (Array.isArray(data[key])) {
                        data[key].forEach((val: any) => formData.append(key, val));
                    } else {
                        formData.append(key, data[key]);
                    }
                }
            });
            return await restApiAuthUtil.patch<Task>(`/core/tasks/${id}/`, formData);
        }
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

    reviewSubmission: async (id: string, data: { status: 'accepted' | 'rejected', grade?: number, rejection_reason?: string, rejection_comment?: string }): Promise<TaskSubmission> => {
        return await restApiAuthUtil.post<TaskSubmission>(`/core/task-submissions/${id}/review/`, data);
    },

    resubmitSubmission: async (id: string): Promise<TaskSubmission> => {
        return await restApiAuthUtil.post<TaskSubmission>(`/core/task-submissions/${id}/resubmit/`, {});
    },

    addCommentToSubmission: async (submissionId: string, comment: string): Promise<TaskComment> => {
        return await restApiAuthUtil.post<TaskComment>(`/core/task-submissions/${submissionId}/add_comment/`, { comment });
    },

    createTaskSubmission: async (data: FormData): Promise<TaskSubmission> => {
        return await restApiAuthUtil.post<TaskSubmission>(`/core/task-submissions/`, data);
    },

    submitTask: async (id: string, data: FormData): Promise<TaskSubmission> => {
        return await restApiAuthUtil.patch<TaskSubmission>(`/core/task-submissions/${id}/`, data);
    },

    getStudentSubmissions: async (studentId?: string): Promise<TaskSubmission[]> => {
        // Backend automatically filters submissions for the currently authenticated student
        return await restApiAuthUtil.get<TaskSubmission[]>('/core/task-submissions/');
    }
};

export default taskService;
