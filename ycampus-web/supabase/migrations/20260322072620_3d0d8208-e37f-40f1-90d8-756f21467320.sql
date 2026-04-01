
ALTER TABLE public.placement_jobs 
ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS jd_attachment_url text;
