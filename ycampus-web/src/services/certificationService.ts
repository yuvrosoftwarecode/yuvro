import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface CertificationExam {
    id: number;
    title: string;
    description: string;
    course: number;
    course_name?: string;
    duration: number; // minutes
    passing_marks: number;
    max_attempts: number;
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

export const getCertificationExams = async (params: any = {}) => {
    return restApiAuthUtil.get('/assessment/certification-exams/', { params });
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
    return restApiAuthUtil.get('/assessment/certification-submissions/', { params: { certification_exam: examId } });
};

export const getCertificationSubmission = async (submissionId: string | number) => {
    return restApiAuthUtil.get(`/assessment/certification-submissions/${submissionId}/`);
};

export const deleteCertificationExam = async (id: string | number) => {
    return restApiAuthUtil.delete(`/assessment/certification-exams/${id}/`);
};
