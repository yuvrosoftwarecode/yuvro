-- Add section column to faculty_subject_mapping table
ALTER TABLE public.faculty_subject_mapping 
ADD COLUMN section TEXT;