
-- Attendance sessions (classes conducted)
CREATE TABLE public.attendance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id),
  course_id UUID NOT NULL REFERENCES public.courses(id),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  semester INTEGER NOT NULL,
  section TEXT NOT NULL,
  batch_id UUID REFERENCES public.batch_ids(id),
  session_date DATE NOT NULL,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, section, session_date, batch_id)
);

-- Individual attendance records
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  is_present BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- Enable RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_sessions
CREATE POLICY "Authenticated can view attendance sessions"
  ON public.attendance_sessions FOR SELECT
  USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "Faculty can insert attendance sessions"
  ON public.attendance_sessions FOR INSERT
  WITH CHECK (faculty_id = auth.uid());

CREATE POLICY "Faculty can update own sessions"
  ON public.attendance_sessions FOR UPDATE
  USING (faculty_id = auth.uid());

-- RLS policies for attendance_records
CREATE POLICY "Authenticated can view attendance records"
  ON public.attendance_records FOR SELECT
  USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "Authenticated can insert attendance records"
  ON public.attendance_records FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "Authenticated can update attendance records"
  ON public.attendance_records FOR UPDATE
  USING (auth.role() IN ('anon', 'authenticated'));

-- Triggers for updated_at
CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
