-- Create department_semesters table
CREATE TABLE public.department_semesters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_id, number)
);

-- Create department_sections table
CREATE TABLE public.department_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  semester_id UUID NOT NULL REFERENCES public.department_semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(semester_id, name)
);

-- Enable RLS
ALTER TABLE public.department_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_sections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for department_semesters (dev mode - public access)
CREATE POLICY "Public can view department_semesters"
  ON public.department_semesters FOR SELECT
  USING (true);

CREATE POLICY "Public can insert department_semesters (dev)"
  ON public.department_semesters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update department_semesters (dev)"
  ON public.department_semesters FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete department_semesters (dev)"
  ON public.department_semesters FOR DELETE
  USING (true);

-- Create RLS policies for department_sections (dev mode - public access)
CREATE POLICY "Public can view department_sections"
  ON public.department_sections FOR SELECT
  USING (true);

CREATE POLICY "Public can insert department_sections (dev)"
  ON public.department_sections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update department_sections (dev)"
  ON public.department_sections FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Public can delete department_sections (dev)"
  ON public.department_sections FOR DELETE
  USING (true);