import { useState, useEffect } from 'react';
import { principalService } from '@/services/principalService';
import { useAuth } from '@/contexts/AuthContext';

export interface StudentPRI {
  id: string;
  name: string;
  rollNo: string;
  department: string;
  semester: number;
  section: string;
  batch: string;
  pi: number;
  ps: number;
  pri: number;
  attendance: number;
  taskCompletion: number;
  psBreakdown: Record<string, number>;
  strengths: string[];
  improvements: string[];
}

export const usePrincipalPRIData = () => {
  const [data, setData] = useState<StudentPRI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const collegeId = (user as any)?.college_id || user?.college?.id || (user as any)?.college;
      if (!collegeId) return;
      try {
        setLoading(true);
        const response = await principalService.getPRIReport(collegeId);
        setData(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching PRI report:', err);
        setError('Failed to fetch PRI report data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return { data, loading, error };
};
