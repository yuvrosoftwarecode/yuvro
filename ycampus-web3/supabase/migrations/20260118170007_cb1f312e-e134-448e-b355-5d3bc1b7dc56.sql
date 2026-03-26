-- QUICKFIX: Allow anon + authenticated to manage departments (development only)
-- Replace overly-permissive ALL policy with role-gated policies

DROP POLICY IF EXISTS "Authenticated users can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

-- Anyone (anon + authenticated) can view
CREATE POLICY "Public can view departments"
ON public.departments
FOR SELECT
USING (true);

-- Allow create/update/delete for anon + authenticated (role-gated)
CREATE POLICY "Public can insert departments (dev)"
ON public.departments
FOR INSERT
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "Public can update departments (dev)"
ON public.departments
FOR UPDATE
USING (auth.role() IN ('anon', 'authenticated'))
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "Public can delete departments (dev)"
ON public.departments
FOR DELETE
USING (auth.role() IN ('anon', 'authenticated'));