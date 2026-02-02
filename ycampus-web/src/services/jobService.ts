import restApiAuthUtil from '../utils/RestApiAuthUtil';
import restApiUtil from '../utils/RestApiUtil';

export interface Job {
    id: string;
    company: Company;
    title: string;
    description: string;
    employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
    experience_min_years: number;
    experience_max_years?: number;
    locations: string[];
    is_remote: boolean;
    min_salary?: number;
    max_salary?: number;
    currency: 'INR' | 'USD' | 'EUR' | 'GBP';
    skills: string[];
    notice_period?: number;
    education_level: 'high_school' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'any';
    status: 'draft' | 'active' | 'paused' | 'closed' | 'rejected';
    posted_at?: string;
    expires_at?: string;
    created_at: string;
    updated_at: string;
    screening_questions_config: {
        mcq_single: string[];
        mcq_multiple: string[];
        coding: string[];
        descriptive: string[];
    };
    screening_questions_random_config: {
        mcq_single: number;
        mcq_multiple: number;
        coding: number;
        descriptive: number;
    };
}

export interface Company {
    id: string;
    name: string;
    domain?: string;
    website?: string;
    size?: string;
    description?: string;
    benefits?: string;
    location?: string;
    created_at: string;
    updated_at: string;
}

export interface Question {
    id: number;
    title: string;
    difficulty: string;
    type: string;
    course: {
        id: number;
        title: string;
    };
}

export const fetchJobs = async (): Promise<Job[]> => {
    return restApiAuthUtil.get('/jobs/');
};

export interface CreateJobData {
    company_id: string;
    title: string;
    description: string;
    employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
    experience_min_years: number;
    experience_max_years?: number;
    locations?: string[];
    is_remote?: boolean;
    min_salary?: number;
    max_salary?: number;
    currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
    skills?: string[];
    notice_period?: number;
    education_level?: 'high_school' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'any';
    status?: 'draft' | 'active' | 'paused' | 'closed' | 'rejected';
    posted_at?: string;
    expires_at?: string;
    screening_questions_config?: {
        mcq_single: string[];
        mcq_multiple: string[];
        coding: string[];
        descriptive: string[];
    };
    screening_questions_random_config?: {
        mcq_single: number;
        mcq_multiple: number;
        coding: number;
        descriptive: number;
    };
}

export interface JobFilterData {
    locations?: string[];
    employment_type?: 'full-time' | 'part-time' | 'contract' | 'internship';
    experience_min_years?: number;
    experience_max_years?: number;
    is_remote?: boolean;
    company?: number; 
    skills?: string[];
    min_salary?: number;
    max_salary?: number;
    currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
    education_level?: 'high_school' | 'diploma' | 'bachelor' | 'master' | 'phd' | 'any';
    status?: 'draft' | 'active' | 'paused' | 'closed' | 'rejected';
}

export const jobService = {
    async getAllJobs(): Promise<Job[]> {
        return fetchJobs();
    },

    async getJob(jobId: string): Promise<Job> {
        return restApiUtil.get(`/jobs/${jobId}/`);
    },

    async createJob(data: CreateJobData): Promise<Job> {
        return restApiAuthUtil.post('/jobs/', data);
    },

    async updateJob(jobId: string, data: Partial<Job>): Promise<Job> {
        return restApiAuthUtil.patch(`/jobs/${jobId}/`, data);
    },

    async deleteJob(jobId: string): Promise<void> {
        return restApiAuthUtil.delete(`/jobs/${jobId}/`);
    },

    async filterJobs(filters: JobFilterData): Promise<Job[]> {
        return restApiAuthUtil.post('/jobs/filter/', filters);
    },

    async applyToJob(jobId: string, applicationData?: any): Promise<any> {
        return restApiAuthUtil.post(`/jobs/${jobId}/apply/`, applicationData || {});
    },

    async getAllCompanies(): Promise<Company[]> {
        return restApiAuthUtil.get('/jobs/companies/');
    },

    async getCompany(companyId: string): Promise<Company> {
        return restApiAuthUtil.get(`/jobs/companies/${companyId}/`);
    },

    async createCompany(data: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
        return restApiAuthUtil.post('/jobs/companies/', data);
    },

    async updateCompany(companyId: string, data: Partial<Company>): Promise<Company> {
        return restApiAuthUtil.patch(`/jobs/companies/${companyId}/`, data);
    },

    async deleteCompany(companyId: string): Promise<void> {
        return restApiAuthUtil.delete(`/jobs/companies/${companyId}/`);
    },

    async getQuestion(questionId: number): Promise<Question> {
        return restApiAuthUtil.get(`/course/questions/${questionId}/`);
    },

    async getQuestionsByCourse(courseId: string | number, filters?: {
        difficulty?: string;
        type?: string;
        search?: string;
    }): Promise<Question[]> {
        const params: any = { course: courseId };

        if (filters?.difficulty) {
            params.difficulty = filters.difficulty;
        }
        if (filters?.type) {
            params.type = filters.type;
        }
        if (filters?.search) {
            params.search = filters.search;
        }

        return restApiAuthUtil.get('/course/questions/', { params });
    },

    async addQuestionToJob(jobId: string, questionId: string, questionType: string, currentQuestionsConfig: Job['screening_questions_config']): Promise<Job> {
        const updatedQuestionsConfig = { ...currentQuestionsConfig };
        if (!updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig]) {
            updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig] = [];
        }
        updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig].push(questionId);
        return this.updateJob(jobId, { screening_questions_config: updatedQuestionsConfig });
    },

    async removeQuestionFromJob(jobId: string, questionId: string, questionType: string, currentQuestionsConfig: Job['screening_questions_config']): Promise<Job> {
        const updatedQuestionsConfig = { ...currentQuestionsConfig };
        if (updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig]) {
            updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig] =
                updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig].filter(id => id !== questionId);
        }
        return this.updateJob(jobId, { screening_questions_config: updatedQuestionsConfig });
    },

    async getPendingJobs(): Promise<Job[]> {
        return restApiAuthUtil.get('/jobs/pending-approval/');
    },

    async approveJob(jobId: string): Promise<{ message: string; job: Job }> {
        return restApiAuthUtil.post(`/jobs/${jobId}/approve/`);
    },

    async rejectJob(jobId: string): Promise<{ message: string; job: Job }> {
        return restApiAuthUtil.post(`/jobs/${jobId}/reject/`);
    },
};

export default jobService;

export interface JobApplication {
    id: string;
    job: Job;
    job_id?: string;
    applicant: string;
    applicant_name: string;
    applicant_email: string;
    is_bookmarked: boolean;
    is_applied: boolean;
    cover_letter?: string;
    resume_file?: string;
    portfolio_url?: string;
    status: 'under_review' | 'screening_test_completed' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'selected' | 'rejected' | 'withdrawn';
    applied_at?: string;
    screening_responses?: any;
    recruiter_notes?: string;
    feedback?: string;
    interview_scheduled_at?: string;
    interview_feedback?: string;
    expected_salary?: number;
    expected_currency?: string;
    available_from?: string;
    notice_period_days?: number;
    created_at: string;
    updated_at: string;
}

export interface JobApplicationListItem {
    id: string;
    applicant_name: string;
    applicant_email: string;
    job: Job;
    status: 'under_review' | 'screening_test_completed' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'selected' | 'rejected' | 'withdrawn';
    applied_at?: string;
    expected_salary?: number;
    expected_currency?: string;
}

export interface JobApplicationData {
    job_id: string;
    cover_letter?: string;
    portfolio_url?: string;
    expected_salary?: number;
    expected_currency?: string;
    available_from?: string;
    notice_period_days?: number;
    screening_responses?: any;
}

export interface JobWithApplications extends Job {
    applications_count: number;
    recent_applications: JobApplication[];
}

export const applicationService = {
    async getMyApplications(): Promise<JobApplicationListItem[]> {
        return restApiAuthUtil.get('/jobs/applications/my-applications/');
    },

    async getBookmarkedJobs(): Promise<JobApplicationListItem[]> {
        return restApiAuthUtil.get('/jobs/applications/bookmarked/');
    },

    async bookmarkJob(jobId: string): Promise<any> {
        return restApiAuthUtil.post('/jobs/applications/bookmark/', { job_id: jobId });
    },

    async removeBookmark(jobId: string): Promise<any> {
        return restApiAuthUtil.post('/jobs/applications/remove-bookmark/', { job_id: jobId });
    },

    async applyToJob(applicationData: JobApplicationData): Promise<any> {
        return restApiAuthUtil.post('/jobs/applications/', applicationData);
    },

    async getJobApplications(jobId: string): Promise<any> {
        return restApiAuthUtil.get(`/jobs/${jobId}/applications/`);
    },

    async getJobsWithApplications(): Promise<JobWithApplications[]> {
        return restApiAuthUtil.get('/jobs/with-applications/');
    },

    async updateApplicationStatus(applicationId: string, status: string, notes?: string, feedback?: string): Promise<JobApplication> {
        return restApiAuthUtil.patch(`/jobs/applications/${applicationId}/update-status/`, {
            status,
            recruiter_notes: notes,
            feedback
        });
    },

    async getApplication(applicationId: string): Promise<JobApplication> {
        return restApiAuthUtil.get(`/jobs/applications/${applicationId}/`);
    }
};