import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import companyService from '@/services/companyService';
import jobService, { applicationService } from '@/services/jobService';
import type { Company as CompanyRecord, CompanyStatus } from '@/services/companyService';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

// ── Company hooks ───────────────────────────────────────────────────────────

export type { CompanyRecord, CompanyStatus };

export function useCompanies() {
  return useQuery<CompanyRecord[]>({
    queryKey: ['companies'],
    queryFn: () => companyService.getCompanies(),
    staleTime: 30_000,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CompanyRecord, 'id' | 'created_at' | 'updated_at'>) =>
      companyService.createCompany(data),
    onSuccess: (company) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: 'Company added', description: company.name });
    },
    onError: (e: any) =>
      toast({ title: 'Error adding company', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyRecord> }) =>
      companyService.updateCompany(id, data),
    onSuccess: (company) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: 'Company updated', description: company.name });
    },
    onError: (e: any) =>
      toast({ title: 'Error updating company', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companyService.deleteCompany(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: 'Company deleted' });
    },
    onError: (e: any) =>
      toast({ title: 'Error deleting company', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobService.deleteJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['placement-jobs'] });
      qc.invalidateQueries({ queryKey: ['placement-stats'] });
      toast({ title: 'Job deleted' });
    },
    onError: (e: any) =>
      toast({ title: 'Error deleting job', description: e.message, variant: 'destructive' }),
  });
}


export interface Recruiter {
  id: string;
  name: string;
  designation: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  company_name: string;
  company_type: string | null;
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
      const jobs = await jobService.getAllJobs();
      console.log('usePlacementJobs fetched jobs:', jobs);
      
      // Map backend Job to UI PlacementJob
      const mapped: PlacementJob[] = jobs.map(j => ({
        id: j.id,
        recruiter_id: j.company.id,
        role_title: j.title,
        role_description: j.description,
        skills_required: j.skills || [],
        ctc_fixed: j.min_salary || 0,
        ctc_variable: (j.max_salary && j.min_salary) ? (j.max_salary - j.min_salary) : 0,
        ctc_total: j.max_salary || j.min_salary || 0,
        location: j.locations?.[0] || 'Remote',
        bond_details: j.bond_details || null,
        selection_rounds: j.selection_rounds || [],
        vacancies: j.vacancies || 0,
        eligible_branches: j.eligible_branches || [],
        eligible_years: [],
        min_cgpa: j.min_cgpa || 0,
        deadline: j.expires_at || null,
        posted_date: j.posted_at || j.created_at,
        status: (j.status === 'active' ? 'approved' : j.status === 'draft' ? 'pending' : j.status) as any,
        rejection_reason: null,
        hold_remarks: null,
        ai_risk_level: 'low',
        total_applications: j.applications_count || 0,
        shortlisted_count: 0,
        selected_count: 0,
        created_at: j.created_at,
        updated_at: j.updated_at,
        job_type: (j.employment_type === 'full-time' ? 'full_time' : j.employment_type) as any,
        recruiter: {
          id: j.company.id,
          name: j.company.recruiter_name || '',
          email: j.company.recruiter_email || j.company.email || '',
          phone: j.company.recruiter_phone || j.company.phone || '',
          designation: j.company.recruiter_designation || '',
          company_name: j.company.name,
          company_type: j.company.company_type || null,
          company_website: j.company.website || null,
          company_industry: j.company.domain || null,
          company_location: j.company.location || null,
          company_logo_url: null,
          is_verified: true,
          trust_score: 90,
          rating: j.company.rating || 4.5,
          created_at: j.company.created_at,
          updated_at: j.company.updated_at,
          linkedin_url: null,
        }
      }));

      if (statusFilter && statusFilter !== 'all') {
        const target = statusFilter === 'approved' ? 'approved' : statusFilter === 'pending' ? 'pending' : statusFilter;
        return mapped.filter(j => j.status === target);
      }
      
      return mapped;
    },
  });
}

export function usePlacementJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['placement-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const j = await jobService.getJob(jobId);
      
      const mapped: PlacementJob = {
        id: j.id,
        role_title: j.title,
        role_description: j.description || '',
        location: j.locations?.[0] || 'Remote',
        ctc_fixed: Number(j.min_salary) || 0,
        ctc_variable: (Number(j.max_salary) || 0) - (Number(j.min_salary) || 0),
        ctc_total: Number(j.max_salary) || Number(j.min_salary) || 0,
        vacancies: j.vacancies || 1,
        deadline: j.expires_at || j.updated_at,
        min_cgpa: Number(j.min_cgpa) || 0,
        eligible_branches: j.eligible_branches || [],
        skills_required: j.skills || [],
        bond_details: j.bond_details || null,
        selection_rounds: j.selection_rounds || [],
        ai_risk_level: 'low',
        status: (j.status === 'active' ? 'approved' : j.status === 'draft' ? 'pending' : j.status) as any,
        total_applications: 0,
        shortlisted_count: 0,
        selected_count: 0,
        created_at: j.created_at,
        updated_at: j.updated_at,
        job_type: (j.employment_type === 'full-time' ? 'full_time' : j.employment_type) as any,
        recruiter: {
          id: j.company.id,
          name: j.company.recruiter_name || '',
          email: j.company.recruiter_email || j.company.email || '',
          phone: j.company.recruiter_phone || j.company.phone || '',
          designation: j.company.recruiter_designation || '',
          company_name: j.company.name,
          company_type: j.company.company_type || null,
          company_website: j.company.website || null,
          company_industry: j.company.domain || null,
          company_location: j.company.location || null,
          company_logo_url: null,
          is_verified: true,
          trust_score: 90,
          rating: j.company.rating || 4.5,
          created_at: j.company.created_at,
          updated_at: j.company.updated_at,
          linkedin_url: null,
        }
      };
      return mapped;
    },
    enabled: !!jobId,
  });
}

// Fetch dashboard stats
export function usePlacementStats() {
  return useQuery({
    queryKey: ['placement-stats'],
    queryFn: async () => {
      const [jobsData, appsData] = await Promise.all([
        jobService.getAllJobs(),
        jobService.getAllApplications() 
      ]);
      
      const jobs = jobsData.map(j => ({ 
        ...j, 
        status: (j.status === 'active' ? 'approved' : j.status === 'draft' ? 'pending' : j.status) as any,
        total_applications: j.applications_count || 0, 
        shortlisted_count: 0, 
        selected_count: 0 
      }));
      const apps = (appsData || []) as any[];
      
      const statsResponse = await restApiAuthUtil.get<any>('/jobs/offer-records/stats/');
      const backendSelectedCount = statsResponse.selected_count || 0;

      const pendingCount = jobs.filter(j => j.status === 'pending').length;
      const liveCount = jobs.filter(j => (j.status as string) === 'approved').length;
      const selectedApps = apps.filter(a => ['selected', 'offer_accepted'].includes(a.status));
      const totalStudents = apps.length;
      const ctcValues = selectedApps.map(a => Number(a.ctc_offered || 0)).filter(v => v > 0);
      const avgCTC = ctcValues.length ? ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length : 0;
      const highestCTC = ctcValues.length ? Math.max(...ctcValues) : 0;
      const placementPct = totalStudents > 0 ? Math.round((selectedApps.length / totalStudents) * 100) : 0;
      const totalApps = jobs.reduce((s, j: any) => s + (j.total_applications || 0), 0);
      const totalShortlisted = jobs.reduce((s, j: any) => s + (j.shortlisted_count || 0), 0);
      const totalSelected = backendSelectedCount; // Use actual backend data
      
      return {
        pendingCount, 
        liveCount, 
        totalSelected: backendSelectedCount,
        avgCTC, 
        highestCTC, 
        placementPct, 
        totalApps, 
        totalShortlisted, 
        totalSelected,
        jobs, 
        apps,
      };
    },
  });
}

// Update job status
export function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, status, reason }: { jobId: string; status: 'approved' | 'rejected' | 'hold'; reason?: string }) => {
      const backendStatus = status === 'approved' ? 'active' : status;
      await jobService.updateJob(jobId, { 
        status: backendStatus as any,
        // We'll need to extend updateJob to handle rejection reason if needed
      });
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
      const apps = await applicationService.getMyApplications();
      return apps;
    },
  });
}

export function useJobApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-applications', jobId],
    queryFn: async () => {
      if (!jobId) return { applications: [] };
      return await jobService.getApplicationsForJob(jobId);
    },
    enabled: !!jobId,
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, status, notes }: { applicationId: string; status: string; notes?: string }) => {
      return await jobService.updateApplicationStatus(applicationId, status, notes);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['job-applications'] });
      toast({ title: 'Status Updated', description: `Application status changed to ${variables.status}.` });
    },
    onError: (e: any) => {
      toast({ title: 'Update Failed', description: e.message, variant: 'destructive' });
    }
  });
}

export function useApplyToJob() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { job_id: string; cgpa: number; status?: string }) => {
      const res = await jobService.applyToJob(data.job_id, {
        cgpa: data.cgpa, // Though backend might not store it explicitly, we send it
      });
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-applications'] });
      qc.invalidateQueries({ queryKey: ['placement-jobs'] });
      toast({ title: 'Application Submitted', description: 'Your application has been received successfully.' });
    },
    onError: (e: any) => {
      toast({ title: 'Application Failed', description: e.message, variant: 'destructive' });
    }
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

// ── Offer Tracking hooks ──────────────────────────────────────────────────

export interface OfferRecord {
  id: string;
  roll_number: string;
  student_name: string;
  branch: string;
  batch: string;
  cgpa: string;
  company: string;
  role: string;
  ctc: string;
  offer_status: string;
  joining_date: string;
}

export function useOfferRecords() {
  return useQuery<OfferRecord[]>({
    queryKey: ['offer-records'],
    queryFn: async () => {
      return restApiAuthUtil.get<OfferRecord[]>('/jobs/offer-records/');
    },
  });
}

export function useBulkUploadOffers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: any[]) => {
      return restApiAuthUtil.post('/jobs/offer-records/bulk-upload/', records);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offer-records'] });
      qc.invalidateQueries({ queryKey: ['placement-stats'] });
      toast({ title: 'Offers imported successfully' });
    },
    onError: (e: any) =>
      toast({ title: 'Import failed', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return restApiAuthUtil.delete(`/jobs/offer-records/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offer-records'] });
      qc.invalidateQueries({ queryKey: ['placement-stats'] });
      toast({ title: 'Record deleted' });
    },
    onError: (e: any) =>
      toast({ title: 'Deletion failed', description: e.message, variant: 'destructive' }),
  });
}

export function useBulkDeleteOffers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      return restApiAuthUtil.post('/jobs/offer-records/bulk-delete/', { ids });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offer-records'] });
      qc.invalidateQueries({ queryKey: ['placement-stats'] });
      toast({ title: 'Records deleted' });
    },
    onError: (e: any) =>
      toast({ title: 'Deletion failed', description: e.message, variant: 'destructive' }),
  });
}
