
-- Create announcement priority enum
CREATE TYPE public.announcement_priority AS ENUM ('normal', 'important', 'urgent');

-- Create announcement category enum
CREATE TYPE public.announcement_category AS ENUM ('college', 'department');

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  full_content TEXT,
  category announcement_category NOT NULL DEFAULT 'college',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  priority announcement_priority NOT NULL DEFAULT 'normal',
  posted_by TEXT NOT NULL,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create announcement reads table (tracks per-student read status)
CREATE TABLE public.announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Announcements: anyone authenticated can view
CREATE POLICY "Authenticated can view announcements"
ON public.announcements FOR SELECT
USING (auth.role() IN ('anon', 'authenticated'));

-- Announcement reads: users can manage their own reads
CREATE POLICY "Users can view own reads"
ON public.announcement_reads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark as read"
ON public.announcement_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reads"
ON public.announcement_reads FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at on announcements
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
