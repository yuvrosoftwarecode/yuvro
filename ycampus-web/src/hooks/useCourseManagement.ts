import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiService from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Course {
  id: string;
  name: string;
  courseName?: string;
  courseId?: string;
  code?: string;
  department_id?: string;
  semester?: number;
}

export const useCourseManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCourses();
      setCourses(response.content || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const availableCourses = courses
    .filter(course => (course.courseId || course.id) && (course.courseName || course.name))
    .map(course => ({
      value: String(course.courseId || course.id),
      label: course.courseName || course.name
    }));


  useEffect(() => {
    fetchCourses();
  }, []);

  return {
    courses,
    availableCourses,
    loading,
    refetch: fetchCourses
  };
};

// Dummy data for courses
const DUMMY_COURSES = [
  { id: '1', name: 'Java Programming', code: 'CS101', department_id: '1', semester: 1 },
  { id: '2', name: 'Data Structures', code: 'CS102', department_id: '1', semester: 2 },
  { id: '3', name: 'Algorithms', code: 'CS201', department_id: '1', semester: 3 },
  { id: '4', name: 'Database Management', code: 'CS202', department_id: '1', semester: 3 },
  { id: '5', name: 'Web Development', code: 'CS301', department_id: '1', semester: 4 },
  { id: '6', name: 'Computer Networks', code: 'CS302', department_id: '1', semester: 5 },
  { id: '7', name: 'Operating Systems', code: 'CS303', department_id: '1', semester: 5 },
  { id: '8', name: 'Machine Learning', code: 'CS401', department_id: '1', semester: 6 },
  { id: '9', name: 'Digital Electronics', code: 'EC101', department_id: '2', semester: 1 },
  { id: '10', name: 'Circuit Theory', code: 'EC102', department_id: '2', semester: 2 },
  { id: '11', name: 'Signals and Systems', code: 'EC201', department_id: '2', semester: 3 },
  { id: '12', name: 'Microprocessors', code: 'EC301', department_id: '2', semester: 4 },
];

export function useCourses(departmentId?: string) {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', departmentId],
    queryFn: async () => {
      // Try to fetch from database first
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching courses:', error);
      }

      // If no data from database, use dummy data
      const coursesData = data && data.length > 0 ? data : DUMMY_COURSES;
      
      // Filter by department if provided
      if (departmentId) {
        return coursesData.filter(c => c.department_id === departmentId);
      }
      
      return coursesData;
    },
  });

  return {
    courses: courses || [],
    isLoading,
  };
}