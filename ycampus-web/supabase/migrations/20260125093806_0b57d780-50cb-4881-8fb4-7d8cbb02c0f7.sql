
-- Create batch_ids table (container for batches under each department)
CREATE TABLE public.batch_ids (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(department_id, name)
);

-- Create batches table (year ranges like 2021-2025)
CREATE TABLE public.batches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id_ref UUID NOT NULL REFERENCES public.batch_ids(id) ON DELETE CASCADE,
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT valid_year_range CHECK (end_year > start_year)
);

-- Create batch_semesters table
CREATE TABLE public.batch_semesters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_ref UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL CHECK (semester_number >= 1 AND semester_number <= 12),
    name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(batch_ref, semester_number)
);

-- Enable RLS
ALTER TABLE public.batch_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_semesters ENABLE ROW LEVEL SECURITY;

-- RLS policies for batch_ids
CREATE POLICY "Public can view batch_ids" ON public.batch_ids FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert batch_ids" ON public.batch_ids FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated can update batch_ids" ON public.batch_ids FOR UPDATE USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated can delete batch_ids" ON public.batch_ids FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- RLS policies for batches
CREATE POLICY "Public can view batches" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert batches" ON public.batches FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated can update batches" ON public.batches FOR UPDATE USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated can delete batches" ON public.batches FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- RLS policies for batch_semesters
CREATE POLICY "Public can view batch_semesters" ON public.batch_semesters FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert batch_semesters" ON public.batch_semesters FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated can update batch_semesters" ON public.batch_semesters FOR UPDATE USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated can delete batch_semesters" ON public.batch_semesters FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- Add updated_at triggers
CREATE TRIGGER update_batch_ids_updated_at BEFORE UPDATE ON public.batch_ids FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_batch_semesters_updated_at BEFORE UPDATE ON public.batch_semesters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
