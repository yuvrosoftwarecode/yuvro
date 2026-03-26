-- Adjust departments RLS to allow any authenticated user to manage departments
DROP POLICY IF EXISTS "Admins and college admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins and college admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins and college admins can delete departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

CREATE POLICY "Authenticated users can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);