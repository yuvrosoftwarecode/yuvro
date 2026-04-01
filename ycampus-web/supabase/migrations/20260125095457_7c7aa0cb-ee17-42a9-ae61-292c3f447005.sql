-- Update batch_semesters to reference batch_ids instead of batches
-- First, drop the old foreign key constraint if it exists
ALTER TABLE public.batch_semesters 
DROP CONSTRAINT IF EXISTS batch_semesters_batch_ref_fkey;

-- Rename batch_ref to batch_id_ref to be clearer
ALTER TABLE public.batch_semesters 
RENAME COLUMN batch_ref TO batch_id_ref;

-- Add comment for clarity
COMMENT ON COLUMN public.batch_semesters.batch_id_ref IS 'References batch_ids table directly';

-- We can optionally drop the batches table if no longer needed
-- For now, keep it but it won't be used in this new hierarchy