
-- Recruiters table
CREATE TABLE public.recruiters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  designation text,
  email text NOT NULL,
  phone text,
  linkedin_url text,
  company_name text NOT NULL,
  company_website text,
  company_industry text,
  company_location text,
  company_logo_url text,
  is_verified boolean NOT NULL DEFAULT false,
  trust_score integer DEFAULT 50,
  rating numeric(2,1) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view recruiters" ON public.recruiters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Placement officers can manage recruiters" ON public.recruiters FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
);

-- Placement jobs table
CREATE TYPE public.job_approval_status AS ENUM ('pending', 'approved', 'rejected', 'hold');
CREATE TYPE public.ai_risk_level AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.placement_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES public.recruiters(id) ON DELETE CASCADE NOT NULL,
  role_title text NOT NULL,
  role_description text,
  skills_required text[],
  ctc_fixed numeric DEFAULT 0,
  ctc_variable numeric DEFAULT 0,
  ctc_total numeric GENERATED ALWAYS AS (ctc_fixed + ctc_variable) STORED,
  location text,
  bond_details text,
  selection_rounds text[],
  vacancies integer DEFAULT 1,
  eligible_branches text[],
  eligible_years integer[] DEFAULT '{3,4}',
  min_cgpa numeric(3,1) DEFAULT 0,
  deadline timestamptz,
  posted_date timestamptz NOT NULL DEFAULT now(),
  status job_approval_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  hold_remarks text,
  ai_risk_level ai_risk_level DEFAULT 'low',
  total_applications integer DEFAULT 0,
  shortlisted_count integer DEFAULT 0,
  selected_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.placement_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view approved jobs" ON public.placement_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Placement officers can manage jobs" ON public.placement_jobs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
);

-- Job status logs
CREATE TABLE public.job_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.placement_jobs(id) ON DELETE CASCADE NOT NULL,
  previous_status job_approval_status,
  new_status job_approval_status NOT NULL,
  changed_by uuid REFERENCES public.profiles(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_status_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Placement officers can view logs" ON public.job_status_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
);
CREATE POLICY "Placement officers can insert logs" ON public.job_status_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
);

-- Student applications
CREATE TYPE public.application_status AS ENUM ('applied', 'shortlisted', 'interview', 'selected', 'rejected', 'offer_accepted', 'offer_declined');

CREATE TABLE public.student_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.placement_jobs(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  student_name text NOT NULL,
  branch text,
  cgpa numeric(3,1),
  status application_status NOT NULL DEFAULT 'applied',
  interview_round text,
  ctc_offered numeric,
  offer_status text,
  joining_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, student_id)
);
ALTER TABLE public.student_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view applications" ON public.student_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Placement officers can manage applications" ON public.student_applications FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
);
CREATE POLICY "Students can apply" ON public.student_applications FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can view own applications" ON public.student_applications FOR SELECT TO authenticated USING (student_id = auth.uid());

-- Placement notifications
CREATE TABLE public.placement_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  related_job_id uuid REFERENCES public.placement_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.placement_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.placement_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.placement_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.placement_notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Placement drives
CREATE TABLE public.placement_drives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.placement_jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  company_name text NOT NULL,
  drive_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view drives" ON public.placement_drives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Placement officers can manage drives" ON public.placement_drives FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'placement_officer')
);

-- Triggers for updated_at
CREATE TRIGGER update_recruiters_updated_at BEFORE UPDATE ON public.recruiters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_placement_jobs_updated_at BEFORE UPDATE ON public.placement_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_applications_updated_at BEFORE UPDATE ON public.student_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_placement_drives_updated_at BEFORE UPDATE ON public.placement_drives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
