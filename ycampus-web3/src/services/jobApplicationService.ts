import restApiAuthUtil from '../utils/RestApiAuthUtil';
import { Job } from './jobService';

export interface JobApplication {
    id: string;
    job: Job;
    job_id?: string;
    applicant: string;
    applicant_name?: string;
    applicant_email?: string;
    is_bookmarked: boolean;
    is_applied: boolean;
    cover_letter?: string;
    resume_file?: string;
    portfolio_url?: string;
    status?: 'under_review' | 'screening_test_completed' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'selected' | 'rejected' | 'withdrawn';
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

export const jobApplicationService = {
    async getMyApplications(): Promise<JobApplication[]> {
        return restApiAuthUtil.get('/jobs/applications/my-applications/');
    },

    async getBookmarkedJobs(): Promise<JobApplication[]> {
        return restApiAuthUtil.get('/jobs/applications/bookmarked/');
    },

    async getUserJobStatus(): Promise<Record<string, { is_bookmarked: boolean; is_applied: boolean; status?: string; applied_at?: string }>> {
        return restApiAuthUtil.get('/jobs/applications/user-job-status/');
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

export default jobApplicationService;