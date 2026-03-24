import { useState, useEffect } from 'react';
import { departmentService, Department } from '@/services/departmentService';
import { batchService } from '@/services/batchService';
import { semesterService } from '@/services/semesterService';
import { useAuth } from '@/contexts/AuthContext';

export interface DepartmentWithSemesters extends Department {
  semesterCount: number;
}

export const useDepartments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<DepartmentWithSemesters[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const collegeId = (user as any)?.college_id;
      const depts = await departmentService.getDepartments(collegeId);

      // For each department, fetch its batches, then count total semesters
      const deptsWithSemesters = await Promise.all(
        depts.map(async (dept) => {
          try {
            const batches = await batchService.getBatches(dept.id);
            // For each batch, fetch its semesters and count them
            const semesterCounts = await Promise.all(
              batches.map(async (batch) => {
                try {
                  const semesters = await semesterService.getSemesters(batch.id);
                  return semesters.length;
                } catch {
                  return 0;
                }
              })
            );
            const semesterCount = semesterCounts.reduce((a, b) => a + b, 0);
            return { ...dept, semesterCount };
          } catch {
            return { ...dept, semesterCount: 0 };
          }
        })
      );

      setDepartments(deptsWithSemesters);
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
