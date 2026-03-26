-- Drop existing restrictive policies on departments
DROP POLICY IF EXISTS "Admins and above can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

-- Create proper permissive policies for departments
CREATE POLICY "Anyone can view departments" 
ON public.departments 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins and college admins can insert departments" 
ON public.departments 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'college_admin', 'principal')
  )
);

CREATE POLICY "Admins and college admins can update departments" 
ON public.departments 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'college_admin', 'principal')
  )
);

CREATE POLICY "Admins and college admins can delete departments" 
ON public.departments 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'college_admin', 'principal')
  )
);