import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface CertificationExam {
    id: number;
    title: string;
    description: string;
    instructions?: string;
    subject: number | string;
    course?: number | string; // Keeping for compatibility temporarily
    course_name?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    duration: number; // minutes
    total_marks?: number;
    passing_marks: number;
    max_attempts: number;
    enable_proctoring?: boolean;
    questions_config?: any;
    questions_random_config?: any;
    is_active?: boolean; // Deprecated, use publish_status
    publish_status: 'draft' | 'active' | 'inactive' | 'archived';
    created_at: string;
    updated_at: string;
    start_datetime?: string;
    end_datetime?: string;
    pass_rate?: number; // optionally from backend
    participants_count?: number;
}

export const createCertificationExam = async (data: any) => {
    return restApiAuthUtil.post('/assessment/certification-exams/', data);
};

export const getCertificationExams = async (params: Record<string, any> = {}) => {
    const stringParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            stringParams[key] = String(value);
        }
    });
    return restApiAuthUtil.get('/assessment/certification-exams/', { params: stringParams });
};

export const getCertificationExam = async (id: string | number) => {
    return restApiAuthUtil.get(`/assessment/certification-exams/${id}/`);
};

export const updateCertificationExam = async (id: string | number, data: any) => {
    return restApiAuthUtil.patch(`/assessment/certification-exams/${id}/`, data);
};

export const getCertificationAnalytics = async (id: string | number) => {
    return restApiAuthUtil.get(`/assessment/certification-exams/${id}/analytics/`);
};

export const startCertificationExam = async (id: string | number) => {
    return restApiAuthUtil.post(`/assessment/certification-exams/${id}/start/`, {});
};

export const submitCertificationExam = async (id: string | number, data: any) => {
    return restApiAuthUtil.post(`/assessment/certification-exams/${id}/submit/`, data);
};

export const getCertificationExamSubmissions = async (examId: string | number) => {
    return restApiAuthUtil.get('/assessment/certification-submissions/', {
        params: { certification_exam: String(examId) }
    });
};

export const getCertificationSubmission = async (submissionId: string | number) => {
    return restApiAuthUtil.get(`/assessment/certification-submissions/${submissionId}/`);
};

export const deleteCertificationExam = async (id: string | number) => {
    return restApiAuthUtil.delete(`/assessment/certification-exams/${id}/`);
};
