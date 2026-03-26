import { useQuery } from '@tanstack/react-query';

export function useCollegeAdminStats() {
  return useQuery({
    queryKey: ['college-admin-stats'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
      const departments = JSON.parse(localStorage.getItem('mock_departments') || '[]');

      return {
        principals: profiles.filter((p: any) => p.role === 'principal').length,
        departments: departments.length,
        users: profiles.length,
        systemHealth: 98
      };
    }
  });
}

export function usePrincipalStats() {
  return useQuery({
    queryKey: ['principal-stats'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
      const departments = JSON.parse(localStorage.getItem('mock_departments') || '[]');

      return {
        departments: departments.length,
        hods: profiles.filter((p: any) => p.role === 'hod').length,
        faculty: profiles.filter((p: any) => p.role === 'faculty').length,
        students: profiles.filter((p: any) => p.role === 'student').length
      };
    }
  });
}

export function useHODStats() {
  return useQuery({
    queryKey: ['hod-stats'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');

      return {
        students: profiles.filter((p: any) => p.role === 'student').length,
        faculty: profiles.filter((p: any) => p.role === 'faculty').length,
        courses: 12,
        avgPerformance: 85
      };
    }
  });
}

export function useStudentStats() {
  return useQuery({
    queryKey: ['student-stats'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        coursesEnrolled: 6,
        attendance: 92,
        gpa: 3.8,
        assignments: 8
      };
    }
  });
}
