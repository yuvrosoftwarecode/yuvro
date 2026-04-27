import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { jobService, applicationService, Job as BackendJob, JobApplication as BackendJobApplication } from '@/services/jobService';

export interface Recruiter {
  id: string;
  name: string;
  designation: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  company_name: string;
  company_website: string | null;
  company_industry: string | null;
  company_location: string | null;
  company_logo_url: string | null;
  is_verified: boolean;
  trust_score: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface PlacementJob {
  id: string;
  recruiter_id: string;
  role_title: string;
  role_description: string | null;
  skills_required: string[] | null;
  ctc_fixed: number;
  ctc_variable: number;
  ctc_total: number;
  location: string | null;
  bond_details: string | null;
  selection_rounds: string[] | null;
  vacancies: number;
  eligible_branches: string[] | null;
  eligible_years: number[] | null;
  min_cgpa: number;
  deadline: string | null;
  posted_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'hold';
  rejection_reason: string | null;
  hold_remarks: string | null;
  ai_risk_level: 'low' | 'medium' | 'high';
  total_applications: number;
  shortlisted_count: number;
  selected_count: number;
  created_at: string;
  updated_at: string;
  job_type?: 'full_time' | 'internship' | 'contract';
  recruiter?: Recruiter;
}

export interface StudentApplication {
  id: string;
  job_id: string;
  student_id: string;
  student_name: string;
  branch: string | null;
  cgpa: number | null;
  status: 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | 'offer_accepted' | 'offer_declined';
  interview_round: string | null;
  ctc_offered: number | null;
  offer_status: string | null;
  joining_date: string | null;
  created_at: string;
  updated_at: string;
  job?: PlacementJob;
}

export interface PlacementNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_job_id: string | null;
  created_at: string;
}

export interface PlacementDrive {
  id: string;
  job_id: string | null;
  title: string;
  company_name: string;
  drive_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
}

const mapBackendJobToPlacement = (j: BackendJob): PlacementJob => ({
  id: String(j.id),
  recruiter_id: String(j.company?.id || ''),
  role_title: j.title,
  role_description: j.description,
  skills_required: j.skills || [],
  ctc_fixed: j.min_salary || 0,
  ctc_variable: 0,
  ctc_total: j.max_salary || 0,
  location: (j.locations || []).join(', '),
  bond_details: null,
  selection_rounds: [],
  vacancies: 0,
  eligible_branches: [],
  eligible_years: [],
  min_cgpa: 0,
  deadline: j.expires_at || null,
  posted_date: j.posted_at || j.created_at,
  status: j.status === 'active' ? 'approved' : (j.status === 'rejected' ? 'rejected' : 'pending'),
  rejection_reason: null,
  hold_remarks: null,
  ai_risk_level: 'low',
  total_applications: 0,
  shortlisted_count: 0,
  selected_count: 0,
  created_at: j.created_at,
  updated_at: j.updated_at,
  job_type: j.employment_type === 'full-time' ? 'full_time' : (j.employment_type === 'internship' ? 'internship' : 'contract'),
  recruiter: j.company ? {
    id: String(j.company.id),
    name: j.company.name,
    designation: null,
    email: '',
    phone: null,
    linkedin_url: null,
    company_name: j.company.name,
    company_website: j.company.website || null,
    company_industry: null,
    company_location: j.company.location || null,
    company_logo_url: null,
    is_verified: true,
    trust_score: 100,
    rating: 5,
    created_at: j.company.created_at,
    updated_at: j.company.updated_at,
  } : undefined,
});

// Fetch all jobs with recruiter info
export function usePlacementJobs(statusFilter?: string) {
  return useQuery({
    queryKey: ['placement-jobs', statusFilter],
    queryFn: async () => {
      const data = await jobService.getAllJobs();
      let placementJobs = data.map(mapBackendJobToPlacement);
      
      if (statusFilter && statusFilter !== 'all') {
        placementJobs = placementJobs.filter(j => j.status === statusFilter);
      }
      
      return placementJobs;
    },
  });
}

// Fetch dashboard stats
export function usePlacementStats() {
  return useQuery({
    queryKey: ['placement-stats'],
    queryFn: async () => {
      const [jobsData, appsData] = await Promise.all([
        jobService.getAllJobs(),
        // applicationService.getMyApplications(), // This might not be right for admin/placement officer
        // In backend, there might be a view all applications endpoint
        [] as any[] 
      ]);
      
      const placementJobs = jobsData.map(mapBackendJobToPlacement);
      
      const pendingCount = placementJobs.filter(j => j.status === 'pending').length;
      const liveCount = placementJobs.filter(j => j.status === 'approved').length;
      
      return {
        pendingCount, 
        liveCount, 
        selectedThisMonth: 0,
        avgCTC: 0, 
        highestCTC: 0, 
        placementPct: 0, 
        totalApps: 0, 
        totalShortlisted: 0, 
        totalSelected: 0,
        jobs: placementJobs, 
        apps: [],
      };
    },
  });
}

// Update job status
export function useUpdateJobStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ jobId, status, reason }: { jobId: string; status: 'approved' | 'rejected' | 'hold'; reason?: string }) => {
      if (status === 'approved') {
        await jobService.approveJob(jobId);
      } else if (status === 'rejected') {
        await jobService.rejectJob(jobId);
      } else {
        await jobService.updateJob(jobId, { status: 'paused' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['placement-jobs'] });
      qc.invalidateQueries({ queryKey: ['placement-stats'] });
      toast({ title: 'Job status updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

// Student applications
export function useStudentApplications() {
  return useQuery({
    queryKey: ['student-applications'],
    queryFn: async () => {
      // In the backend, we need an endpoint to get all applications for placement officer
      const data = await applicationService.getMyApplications(); 
      return data;
    },
  });
}

// Notifications
export function usePlacementNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['placement-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Backend notification service should be used here
      return [];
    },
    enabled: !!user,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Backend notification service should be used here
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['placement-notifications'] }),
  });
}

// Drives
export function usePlacementDrives() {
  return useQuery({
    queryKey: ['placement-drives'],
    queryFn: async () => {
      // Backend drives service
      return [];
    },
  });
}

// Recruiters
export function useRecruiters() {
  return useQuery({
    queryKey: ['recruiters'],
    queryFn: async () => {
      const data = await jobService.getAllCompanies();
      return data.map(c => ({
        id: String(c.id),
        name: c.name,
        designation: null,
        email: '',
        phone: null,
        linkedin_url: null,
        company_name: c.name,
        company_website: c.website || null,
        company_industry: null,
        company_location: c.location || null,
        company_logo_url: null,
        is_verified: true,
        trust_score: 100,
        rating: 5,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })) as Recruiter[];
    },
  });
}
