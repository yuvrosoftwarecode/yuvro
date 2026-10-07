-- Database initialization and seed script for College Academic Analytics Lab
-- Target Database: PostgreSQL

DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- -------------------------------------------------------------
-- Table 1: departments
-- -------------------------------------------------------------
CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL
);

-- -------------------------------------------------------------
-- Table 2: faculty
-- -------------------------------------------------------------
CREATE TABLE faculty (
    faculty_id INTEGER PRIMARY KEY,
    faculty_name VARCHAR(100) NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(department_id)
);

-- -------------------------------------------------------------
-- Table 3: courses
-- -------------------------------------------------------------
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name VARCHAR(120) NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(department_id),
    credits INTEGER NOT NULL
);

-- -------------------------------------------------------------
-- Table 4: students
-- -------------------------------------------------------------
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    department_id INTEGER NOT NULL REFERENCES departments(department_id),
    admission_year INTEGER NOT NULL
);

-- -------------------------------------------------------------
-- Table 5: enrollments
-- -------------------------------------------------------------
CREATE TABLE enrollments (
    enrollment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(student_id),
    course_id INTEGER NOT NULL REFERENCES courses(course_id),
    faculty_id INTEGER NOT NULL REFERENCES faculty(faculty_id),
    marks NUMERIC(5,2),
    status VARCHAR(30) NOT NULL,
    enrolled_on DATE NOT NULL
);

-- -------------------------------------------------------------
-- Seed Data: departments (5 departments)
-- -------------------------------------------------------------
INSERT INTO departments (department_id, department_name) VALUES
(1, 'Computer Science'),
(2, 'Electronics'),
(3, 'Mechanical'),
(4, 'Civil'),
(5, 'Information Technology');

-- -------------------------------------------------------------
-- Seed Data: faculty (8 faculty members)
-- -------------------------------------------------------------
INSERT INTO faculty (faculty_id, faculty_name, department_id) VALUES
(1, 'Dr. Alan Turing', 1),
(2, 'Dr. Ada Lovelace', 1),
(3, 'Dr. Claude Shannon', 2),
(4, 'Dr. Nikola Tesla', 2),
(5, 'Dr. James Watt', 3),
(6, 'Dr. Rudolf Diesel', 3),
(7, 'Dr. Isambard Brunel', 4),
(8, 'Dr. Grace Hopper', 5);

-- -------------------------------------------------------------
-- Seed Data: courses (12 courses)
-- -------------------------------------------------------------
INSERT INTO courses (course_id, course_name, department_id, credits) VALUES
(1, 'Data Structures and Algorithms', 1, 4),
(2, 'Operating Systems', 1, 4),
(3, 'Database Management Systems', 1, 3),
(4, 'Digital Electronics', 2, 4),
(5, 'Signals and Systems', 2, 3),
(6, 'Microprocessors', 2, 4),
(7, 'Thermodynamics', 3, 4),
(8, 'Fluid Mechanics', 3, 3),
(9, 'Structural Analysis', 4, 4),
(10, 'Surveying', 4, 3),
(11, 'Web Technologies', 5, 3),
(12, 'Cloud Computing', 5, 4);

-- -------------------------------------------------------------
-- Seed Data: students (16 students)
-- -------------------------------------------------------------
INSERT INTO students (student_id, student_name, email, department_id, admission_year) VALUES
(1, 'Alice Johnson', 'alice.johnson@univ.edu', 1, 2022),
(2, 'Bob Smith', 'bob.smith@univ.edu', 1, 2022),
(3, 'Charlie Brown', 'charlie.brown@univ.edu', 1, 2023),
(4, 'Diana Prince', 'diana.prince@univ.edu', 1, 2023),
(5, 'Ethan Hunt', 'ethan.hunt@univ.edu', 2, 2022),
(6, 'Fiona Gallagher', 'fiona.gallagher@univ.edu', 2, 2022),
(7, 'George Clark', 'george.clark@univ.edu', 2, 2023),
(8, 'Hannah Abbott', 'hannah.abbott@univ.edu', 3, 2022),
(9, 'Ian Wright', 'ian.wright@univ.edu', 3, 2023),
(10, 'Julia Roberts', 'julia.roberts@univ.edu', 3, 2023),
(11, 'Kevin Bacon', 'kevin.bacon@univ.edu', 4, 2022),
(12, 'Laura Croft', 'laura.croft@univ.edu', 4, 2023),
(13, 'Michael Scott', 'michael.scott@univ.edu', 4, 2023),
(14, 'Nina Simone', 'nina.simone@univ.edu', 5, 2022),
(15, 'Oscar Isaac', 'oscar.isaac@univ.edu', 5, 2022),
(16, 'Paul Atreides', 'paul.atreides@univ.edu', 5, 2023);

-- -------------------------------------------------------------
-- Seed Data: enrollments (56 enrollments)
-- Includes completed, active, and dropped enrollments.
-- -------------------------------------------------------------
INSERT INTO enrollments (enrollment_id, student_id, course_id, faculty_id, marks, status, enrolled_on) VALUES
(1, 1, 1, 1, 90.00, 'completed', '2023-01-10'),
(2, 1, 2, 2, 85.00, 'completed', '2023-01-12'),
(3, 1, 3, 1, 95.00, 'completed', '2023-08-15'),
(4, 2, 1, 1, 82.00, 'completed', '2023-01-10'),
(5, 2, 2, 2, 88.00, 'completed', '2023-01-12'),
(6, 2, 3, 1, 80.00, 'completed', '2023-08-15'),
(7, 2, 11, 8, 78.00, 'completed', '2023-08-16'),
(8, 3, 1, 1, 95.00, 'completed', '2023-08-15'),
(9, 3, 2, 2, 95.00, 'completed', '2023-08-15'),
(10, 4, 1, 1, 65.00, 'completed', '2023-01-10'),
(11, 4, 2, 2, 70.00, 'completed', '2023-01-12'),
(12, 4, 3, 1, 72.00, 'completed', '2023-08-15'),
(13, 5, 4, 3, 88.00, 'completed', '2023-01-10'),
(14, 5, 5, 4, 92.00, 'completed', '2023-01-12'),
(15, 5, 6, 3, 84.00, 'completed', '2023-08-15'),
(16, 6, 4, 3, 88.00, 'completed', '2023-01-10'),
(17, 6, 5, 4, 92.00, 'completed', '2023-01-12'),
(18, 6, 6, 3, 84.00, 'completed', '2023-08-15'),
(19, 7, 4, 3, 60.00, 'completed', '2023-01-10'),
(20, 7, 5, 4, 68.00, 'completed', '2023-01-12'),
(21, 7, 6, 3, 70.00, 'completed', '2023-08-15'),
(22, 8, 7, 5, 80.00, 'completed', '2023-01-10'),
(23, 8, 8, 6, 78.00, 'completed', '2023-01-12'),
(24, 8, 12, 8, 76.00, 'completed', '2023-08-15'),
(25, 9, 7, 5, 75.00, 'completed', '2023-01-10'),
(26, 9, 8, 6, 75.00, 'completed', '2023-01-12'),
(27, 9, 12, 8, 75.00, 'completed', '2023-08-15'),
(28, 10, 7, 5, 80.00, 'completed', '2023-01-10'),
(29, 10, 8, 6, NULL, 'active', '2023-08-15'),
(30, 10, 12, 8, NULL, 'active', '2023-08-16'),
(31, 11, 9, 7, 85.00, 'completed', '2023-01-10'),
(32, 11, 10, 7, 85.00, 'completed', '2023-01-12'),
(33, 12, 7, 5, 70.00, 'completed', '2023-01-10'),
(34, 12, 9, 7, 72.00, 'completed', '2023-01-12'),
(35, 12, 11, 8, 74.00, 'completed', '2023-08-15'),
(36, 13, 11, 8, 60.00, 'completed', '2023-01-10'),
(37, 13, 1, 1, NULL, 'active', '2023-08-15'),
(38, 13, 2, 2, NULL, 'active', '2023-08-15'),
(39, 14, 11, 8, 90.00, 'completed', '2023-01-10'),
(40, 14, 12, 8, 92.00, 'completed', '2023-01-12'),
(41, 14, 3, 1, 88.00, 'completed', '2023-08-15'),
(42, 15, 11, 8, 85.00, 'completed', '2023-01-10'),
(43, 15, 3, 1, 80.00, 'completed', '2023-01-12'),
(44, 15, 4, 3, NULL, 'dropped', '2023-08-15'),
(45, 16, 4, 3, 70.00, 'completed', '2023-01-10'),
(46, 16, 5, 4, NULL, 'active', '2023-08-15'),
(47, 16, 1, 1, NULL, 'active', '2023-08-15'),
(48, 16, 2, 2, NULL, 'active', '2023-08-16'),
(49, 3, 4, 3, NULL, 'dropped', '2023-08-15'),
(50, 4, 4, 3, NULL, 'dropped', '2023-08-15'),
(51, 8, 1, 1, NULL, 'dropped', '2023-08-15'),
(52, 9, 2, 2, NULL, 'dropped', '2023-08-15'),
(53, 10, 10, 7, NULL, 'dropped', '2023-08-15'),
(54, 11, 12, 8, NULL, 'dropped', '2023-08-15'),
(55, 14, 6, 3, NULL, 'dropped', '2023-08-15'),
(56, 7, 4, 3, NULL, 'active', '2023-08-16');