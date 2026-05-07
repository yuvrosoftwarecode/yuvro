import { useState, useEffect } from 'react';
import { principalService } from '@/services/principalService';
import { useAuth } from '@/contexts/AuthContext';

export interface FacultyEntry {
  id: string;
  name: string;
  department: string;
  departmentId: string;
  sections: string[];
  subjects: string[];
  avgStudentPI: number;
  avgAttendance: number;
  avgAssessmentScore: number;
  fpiScore: number;
  studentsHandled: number;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export const usePrincipalFacultyData = () => {
  const [data, setData] = useState<{ faculty: FacultyEntry[], departments: DepartmentOption[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const collegeId = (user as any)?.college_id || user?.college?.id || (user as any)?.college;
      if (!collegeId) return;
      try {
        setLoading(true);
        const response = await principalService.getFacultyStats(collegeId);
        setData(response);
      } catch (error) {
        console.error("Error fetching principal faculty data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return { data, loading };
};
