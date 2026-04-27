import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import subjectService from '@/services/subjectService';
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
      const data = await subjectService.getSubjects();
      const mappedCourses = data.map((s: any) => ({
        id: String(s.id),
        name: s.subject_name || s.name || '',
        courseName: s.subject_name || s.name || '',
        courseId: String(s.id),
        code: s.short_code || '',
        department_id: undefined,
        semester: 1,
      }));
      setCourses(mappedCourses);
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

export function useCourses(departmentId?: string) {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', departmentId],
    queryFn: async () => {
      const data = await subjectService.getSubjects();
      
      const coursesData = data.map((s: any) => ({
        id: String(s.id),
        name: s.subject_name || s.name || '',
        code: s.short_code || '',
        department_id: undefined,
        semester: 1,
        created_at: s.created_at || '',
        updated_at: s.updated_at || '',
      }));
      
      // Filter by department if provided (Backend Subjects don't have direct department_id, 
      // but if the UI passes it, we might need to filter via associations if they were loaded.
      // For now, returning all as per current Subject model)
      if (departmentId) {
        // return coursesData.filter(c => c.department_id === departmentId);
      }
      
      return coursesData;
    },
  });

  return {
    courses: courses || [],
    isLoading,
  };
}