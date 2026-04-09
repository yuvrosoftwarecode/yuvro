import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { departmentService, Department } from '@/services/departmentService';

export function usePrincipalDepartments() {
  const { user } = useAuth();
  const collegeId = (user as any)?.college_id;

  const { data: departments = [], isLoading, error } = useQuery({
    queryKey: ['principal-departments', collegeId],
    queryFn: async () => {
      // If there's no collegeId, maybe it needs it to return anything
      const response = await departmentService.getDepartments(collegeId);
      const results = Array.isArray(response) ? response : (response as any).results || [];
      return results as Department[];
    },
    enabled: !!collegeId,
  });

  return {
    departments,
    isLoading,
    error,
  };
}
