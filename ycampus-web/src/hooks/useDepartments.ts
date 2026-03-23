import { useState, useEffect } from 'react';
import { departmentService, Department } from '@/services/departmentService';
import { useAuth } from '@/contexts/AuthContext';

export const useDepartments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const collegeId = (user as any)?.college_id;
      const data = await departmentService.getDepartments(collegeId);
      setDepartments(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch departments'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [user]);

  return { departments, isLoading, error, refetch: fetchDepartments };
};
