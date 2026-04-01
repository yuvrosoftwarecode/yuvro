
-- Create test faculty user
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data)
VALUES ('f1a00001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'dr.sharma@college.edu', crypt('password123', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Rajesh Sharma"}')
ON CONFLICT (id) DO NOTHING;

-- Create 10 test student users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role, raw_app_meta_data, raw_user_meta_data) VALUES
('a1b00001-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','aarav.kumar@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Aarav Kumar"}'),
('a1b00001-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','diya.patel@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Diya Patel"}'),
('a1b00001-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','rohan.singh@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Rohan Singh"}'),
('a1b00001-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','ananya.reddy@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Ananya Reddy"}'),
('a1b00001-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','vikram.joshi@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Vikram Joshi"}'),
('a1b00001-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','priya.mehta@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Priya Mehta"}'),
('a1b00001-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','arjun.nair@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Arjun Nair"}'),
('a1b00001-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000000','sneha.gupta@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Sneha Gupta"}'),
('a1b00001-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000','karthik.iyer@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Karthik Iyer"}'),
('a1b00001-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000000','meera.sharma@college.edu',crypt('password123',gen_salt('bf')),now(),now(),now(),'authenticated','authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Meera Sharma"}')
ON CONFLICT (id) DO NOTHING;

-- Create identities
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT id, id, email, 'email', jsonb_build_object('sub', id::text, 'email', email), now(), now(), now()
FROM auth.users WHERE id IN ('f1a00001-0000-0000-0000-000000000001','a1b00001-0000-0000-0000-000000000001','a1b00001-0000-0000-0000-000000000002','a1b00001-0000-0000-0000-000000000003','a1b00001-0000-0000-0000-000000000004','a1b00001-0000-0000-0000-000000000005','a1b00001-0000-0000-0000-000000000006','a1b00001-0000-0000-0000-000000000007','a1b00001-0000-0000-0000-000000000008','a1b00001-0000-0000-0000-000000000009','a1b00001-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- Create profiles
INSERT INTO public.profiles (id, email, full_name, role) VALUES
('f1a00001-0000-0000-0000-000000000001','dr.sharma@college.edu','Dr. Rajesh Sharma','faculty'),
('a1b00001-0000-0000-0000-000000000001','aarav.kumar@college.edu','Aarav Kumar','student'),
('a1b00001-0000-0000-0000-000000000002','diya.patel@college.edu','Diya Patel','student'),
('a1b00001-0000-0000-0000-000000000003','rohan.singh@college.edu','Rohan Singh','student'),
('a1b00001-0000-0000-0000-000000000004','ananya.reddy@college.edu','Ananya Reddy','student'),
('a1b00001-0000-0000-0000-000000000005','vikram.joshi@college.edu','Vikram Joshi','student'),
('a1b00001-0000-0000-0000-000000000006','priya.mehta@college.edu','Priya Mehta','student'),
('a1b00001-0000-0000-0000-000000000007','arjun.nair@college.edu','Arjun Nair','student'),
('a1b00001-0000-0000-0000-000000000008','sneha.gupta@college.edu','Sneha Gupta','student'),
('a1b00001-0000-0000-0000-000000000009','karthik.iyer@college.edu','Karthik Iyer','student'),
('a1b00001-0000-0000-0000-000000000010','meera.sharma@college.edu','Meera Sharma','student')
ON CONFLICT (id) DO NOTHING;

-- Student semester mappings
INSERT INTO public.student_semester_mapping (student_id, department_id, semester, academic_year, is_active) VALUES
('a1b00001-0000-0000-0000-000000000001','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-001',true),
('a1b00001-0000-0000-0000-000000000002','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-002',true),
('a1b00001-0000-0000-0000-000000000003','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-003',true),
('a1b00001-0000-0000-0000-000000000004','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-004',true),
('a1b00001-0000-0000-0000-000000000005','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-005',true),
('a1b00001-0000-0000-0000-000000000006','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-006',true),
('a1b00001-0000-0000-0000-000000000007','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-007',true),
('a1b00001-0000-0000-0000-000000000008','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-008',true),
('a1b00001-0000-0000-0000-000000000009','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-009',true),
('a1b00001-0000-0000-0000-000000000010','bc808660-c617-43b0-b6ed-f311e4b59849',1,'DS-2025-010',true);

-- 6 courses
INSERT INTO public.courses (id, name, code, department_id, semester, credits) VALUES
('a1a00001-0000-0000-0000-000000000001','Linear Algebra','DS101','bc808660-c617-43b0-b6ed-f311e4b59849',1,4),
('a1a00001-0000-0000-0000-000000000002','Programming in Python','DS102','bc808660-c617-43b0-b6ed-f311e4b59849',1,4),
('a1a00001-0000-0000-0000-000000000003','Statistics & Probability','DS103','bc808660-c617-43b0-b6ed-f311e4b59849',1,3),
('a1a00001-0000-0000-0000-000000000004','Data Structures','DS104','bc808660-c617-43b0-b6ed-f311e4b59849',1,4),
('a1a00001-0000-0000-0000-000000000005','Database Systems','DS105','bc808660-c617-43b0-b6ed-f311e4b59849',1,3),
('a1a00001-0000-0000-0000-000000000006','Communication Skills','DS106','bc808660-c617-43b0-b6ed-f311e4b59849',1,2);

-- 30 attendance sessions
INSERT INTO public.attendance_sessions (id,faculty_id,course_id,department_id,semester,section,batch_id,session_date,is_cancelled,is_finalized) VALUES
('e1a00001-0000-0000-0000-000000000001','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000001','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-06',false,true),
('e1a00001-0000-0000-0000-000000000002','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000001','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-13',false,true),
('e1a00001-0000-0000-0000-000000000003','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000001','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-20',false,true),
('e1a00001-0000-0000-0000-000000000004','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000001','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-27',false,true),
('e1a00001-0000-0000-0000-000000000005','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000001','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-02-03',false,true),
('e1a00001-0000-0000-0000-000000000006','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000002','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-07',false,true),
('e1a00001-0000-0000-0000-000000000007','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000002','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-14',false,true),
('e1a00001-0000-0000-0000-000000000008','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000002','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-21',false,true),
('e1a00001-0000-0000-0000-000000000009','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000002','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-28',false,true),
('e1a00001-0000-0000-0000-000000000010','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000002','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-02-04',false,true),
('e1a00001-0000-0000-0000-000000000011','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000003','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-08',false,true),
('e1a00001-0000-0000-0000-000000000012','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000003','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-15',false,true),
('e1a00001-0000-0000-0000-000000000013','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000003','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-22',false,true),
('e1a00001-0000-0000-0000-000000000014','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000003','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-29',false,true),
('e1a00001-0000-0000-0000-000000000015','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000003','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-02-05',false,true),
('e1a00001-0000-0000-0000-000000000016','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000004','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-09',false,true),
('e1a00001-0000-0000-0000-000000000017','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000004','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-16',false,true),
('e1a00001-0000-0000-0000-000000000018','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000004','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-23',false,true),
('e1a00001-0000-0000-0000-000000000019','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000004','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-30',false,true),
('e1a00001-0000-0000-0000-000000000020','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000004','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-02-06',false,true),
('e1a00001-0000-0000-0000-000000000021','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000005','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-10',false,true),
('e1a00001-0000-0000-0000-000000000022','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000005','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-17',false,true),
('e1a00001-0000-0000-0000-000000000023','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000005','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-24',false,true),
('e1a00001-0000-0000-0000-000000000024','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000005','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-31',false,true),
('e1a00001-0000-0000-0000-000000000025','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000005','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-02-07',false,true),
('e1a00001-0000-0000-0000-000000000026','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000006','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-11',false,true),
('e1a00001-0000-0000-0000-000000000027','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000006','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-18',false,true),
('e1a00001-0000-0000-0000-000000000028','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000006','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-01-25',false,true),
('e1a00001-0000-0000-0000-000000000029','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000006','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-02-01',false,true),
('e1a00001-0000-0000-0000-000000000030','f1a00001-0000-0000-0000-000000000001','a1a00001-0000-0000-0000-000000000006','bc808660-c617-43b0-b6ed-f311e4b59849',1,'A','fe10524a-b22b-4eb3-875e-bb4f3a746531','2026-02-08',false,true);

-- Attendance records
INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000001', CASE WHEN s.session_date IN ('2026-01-20','2026-02-01') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000002', CASE WHEN s.session_date IN ('2026-01-08','2026-01-15','2026-01-22','2026-01-25','2026-01-29','2026-02-05','2026-02-07') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000003', CASE WHEN s.session_date IN ('2026-01-06','2026-01-08','2026-01-10','2026-01-13','2026-01-16','2026-01-22','2026-01-25','2026-01-30','2026-02-04','2026-02-07') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000004', CASE WHEN s.session_date IN ('2026-01-06','2026-01-07','2026-01-08','2026-01-09','2026-01-10','2026-01-11','2026-01-20','2026-01-21','2026-01-22','2026-01-23','2026-01-24','2026-01-25','2026-02-03','2026-02-06','2026-02-08') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000005', CASE WHEN s.session_date = '2026-01-27' THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000006', CASE WHEN s.session_date IN ('2026-01-11','2026-01-18','2026-01-25','2026-02-01','2026-02-07','2026-02-08') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000007', CASE WHEN s.session_date IN ('2026-01-06','2026-01-07','2026-01-09','2026-01-14','2026-01-17','2026-01-21','2026-01-24','2026-01-28','2026-02-04','2026-02-06','2026-02-08') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000008', CASE WHEN s.session_date IN ('2026-01-15','2026-01-29','2026-02-05') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000009', CASE WHEN s.session_date IN ('2026-01-09','2026-01-10','2026-01-11','2026-01-16','2026-01-17','2026-01-18','2026-01-30','2026-01-31','2026-02-01','2026-02-03','2026-02-04','2026-02-05','2026-02-06','2026-02-07') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';

INSERT INTO public.attendance_records (session_id, student_id, is_present)
SELECT s.id, 'a1b00001-0000-0000-0000-000000000010', CASE WHEN s.session_date IN ('2026-01-13','2026-01-20','2026-01-27','2026-02-03','2026-02-08') THEN false ELSE true END
FROM public.attendance_sessions s WHERE s.id::text LIKE 'e1a00001%';
