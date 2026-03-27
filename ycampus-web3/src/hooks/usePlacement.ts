import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { MOCK_PLACEMENT_JOBS } from '@/services/mockPlacementData';

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

// Fetch all jobs with recruiter info
export function usePlacementJobs(statusFilter?: string) {
  return useQuery({
    queryKey: ['placement-jobs', statusFilter],
    queryFn: async () => {
      // Use mock data
      let data = [...MOCK_PLACEMENT_JOBS];
      
      if (statusFilter && statusFilter !== 'all') {
        data = data.filter(j => j.status === statusFilter);
      }
      
      console.log('usePlacementJobs returning mock data:', { statusFilter, count: data.length, data });
      return data;
    },
  });
}

// Fetch dashboard stats
export function usePlacementStats() {
  return useQuery({
    queryKey: ['placement-stats'],
    queryFn: async () => {
      const [appsRes] = await Promise.all([
        supabase.from('student_applications').select('id, status, ctc_offered'),
      ]);
      
      const jobs = [...MOCK_PLACEMENT_JOBS];
      const apps = (appsRes.data || []) as any[];
      
      const pendingCount = jobs.filter(j => j.status === 'pending').length;
      const liveCount = jobs.filter(j => j.status === 'approved').length;
      const selectedApps = apps.filter(a => ['selected', 'offer_accepted'].includes(a.status));
      const totalStudents = apps.length;
      const ctcValues = selectedApps.map(a => Number(a.ctc_offered || 0)).filter(v => v > 0);
      const avgCTC = ctcValues.length ? ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length : 0;
      const highestCTC = ctcValues.length ? Math.max(...ctcValues) : 0;
      const placementPct = totalStudents > 0 ? Math.round((selectedApps.length / totalStudents) * 100) : 0;
      const totalApps = jobs.reduce((s, j) => s + (j.total_applications || 0), 0);
      const totalShortlisted = jobs.reduce((s, j) => s + (j.shortlisted_count || 0), 0);
      const totalSelected = jobs.reduce((s, j) => s + (j.selected_count || 0), 0);
      
      return {
        pendingCount, liveCount, selectedThisMonth: selectedApps.length,
        avgCTC, highestCTC, placementPct, totalApps, totalShortlisted, totalSelected,
        jobs, apps,
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
      // Get current status
      const { data: job } = await supabase.from('placement_jobs').select('status').eq('id', jobId).single();
      const updates: any = { status };
      if (status === 'rejected') updates.rejection_reason = reason;
      if (status === 'hold') updates.hold_remarks = reason;
      const { error } = await supabase.from('placement_jobs').update(updates).eq('id', jobId);
      if (error) throw error;
      // Log
      await supabase.from('job_status_logs').insert({
        job_id: jobId,
        previous_status: (job as any)?.status,
        new_status: status,
        changed_by: user?.id,
        reason,
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
      const { data, error } = await supabase.from('student_applications').select('*, job:placement_jobs(role_title, recruiter:recruiters(company_name))').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as any[];
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
      const { data, error } = await supabase.from('placement_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return (data || []) as PlacementNotification[];
    },
    enabled: !!user,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('placement_notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['placement-notifications'] }),
  });
}

// Drives
export function usePlacementDrives() {
  return useQuery({
    queryKey: ['placement-drives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('placement_drives').select('*').order('drive_date', { ascending: true });
      if (error) throw error;
      return (data || []) as PlacementDrive[];
    },
  });
}

// Recruiters
export function useRecruiters() {
  return useQuery({
    queryKey: ['recruiters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recruiters').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Recruiter[];
    },
  });
}
