import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { departmentService } from '../services/departmentService';

export function useCollegeAdminStats() {
  const { user } = useAuth();
  const collegeId = user?.college_id || (user as any)?.college?.id;

  return useQuery({
    queryKey: ['college-admin-stats', collegeId],
    queryFn: async () => {
      if (!collegeId) {
        return { principals: 0, departments: 0, users: 0, systemHealth: 98 };
      }

      const [principalsRes, departmentsRes, usersRes] = await Promise.all([
        userService.getUsers({ role: 'principal', college_id: collegeId, page_size: 1 }),
        departmentService.getDepartments(collegeId),
        userService.getUsers({ college_id: collegeId, page_size: 1 })
      ]);

      return {
        principals: principalsRes.count,
        departments: departmentsRes.length,
        users: usersRes.count,
        systemHealth: 98
      };
    },
    enabled: !!collegeId
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
