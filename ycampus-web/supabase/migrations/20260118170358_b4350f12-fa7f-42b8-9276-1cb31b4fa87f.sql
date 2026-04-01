-- QUICKFIX: Allow anon + authenticated to manage profiles, courses, faculty_subject_mapping, student_semester_mapping (development only)

-- ========== PROFILES TABLE ==========
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Public can view profiles"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Public can insert profiles (dev)"
ON public.profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update profiles (dev)"
ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete profiles (dev)"
ON public.profiles
FOR DELETE
USING (true);

-- ========== COURSES TABLE (Subjects) ==========
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "HODs and above can manage courses" ON public.courses;

CREATE POLICY "Public can view courses"
ON public.courses
FOR SELECT
USING (true);

CREATE POLICY "Public can insert courses (dev)"
ON public.courses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update courses (dev)"
ON public.courses
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete courses (dev)"
ON public.courses
FOR DELETE
USING (true);

-- ========== FACULTY_SUBJECT_MAPPING TABLE ==========
DROP POLICY IF EXISTS "Anyone can view faculty subject mappings" ON public.faculty_subject_mapping;
DROP POLICY IF EXISTS "HODs and above can manage faculty assignments" ON public.faculty_subject_mapping;

CREATE POLICY "Public can view faculty mappings"
ON public.faculty_subject_mapping
FOR SELECT
USING (true);

CREATE POLICY "Public can insert faculty mappings (dev)"
ON public.faculty_subject_mapping
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update faculty mappings (dev)"
ON public.faculty_subject_mapping
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete faculty mappings (dev)"
ON public.faculty_subject_mapping
FOR DELETE
USING (true);

-- ========== STUDENT_SEMESTER_MAPPING TABLE ==========
DROP POLICY IF EXISTS "Students can view own semester info" ON public.student_semester_mapping;
DROP POLICY IF EXISTS "HODs and above can manage student semesters" ON public.student_semester_mapping;

CREATE POLICY "Public can view student mappings"
ON public.student_semester_mapping
FOR SELECT
USING (true);

CREATE POLICY "Public can insert student mappings (dev)"
ON public.student_semester_mapping
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update student mappings (dev)"
ON public.student_semester_mapping
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete student mappings (dev)"
ON public.student_semester_mapping
FOR DELETE
USING (true);

-- ========== HOD_DEPARTMENT_MAPPING TABLE ==========
DROP POLICY IF EXISTS "Anyone can view HOD mappings" ON public.hod_department_mapping;
DROP POLICY IF EXISTS "Principals and above can manage HOD mappings" ON public.hod_department_mapping;

CREATE POLICY "Public can view hod mappings"
ON public.hod_department_mapping
FOR SELECT
USING (true);

CREATE POLICY "Public can insert hod mappings (dev)"
ON public.hod_department_mapping
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update hod mappings (dev)"
ON public.hod_department_mapping
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete hod mappings (dev)"
ON public.hod_department_mapping
FOR DELETE
USING (true);

-- ========== PRINCIPAL_DEPARTMENT_MAPPING TABLE ==========
DROP POLICY IF EXISTS "Anyone can view principal mappings" ON public.principal_department_mapping;
DROP POLICY IF EXISTS "College admins can manage principal mappings" ON public.principal_department_mapping;

CREATE POLICY "Public can view principal mappings"
ON public.principal_department_mapping
FOR SELECT
USING (true);

CREATE POLICY "Public can insert principal mappings (dev)"
ON public.principal_department_mapping
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update principal mappings (dev)"
ON public.principal_department_mapping
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can delete principal mappings (dev)"
ON public.principal_department_mapping
FOR DELETE
USING (true);