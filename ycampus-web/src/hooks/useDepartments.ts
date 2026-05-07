import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentService } from '@/services/departmentService';
import { toast } from 'sonner';

export interface Section {
  id: string;
  name: string;
}

export interface Semester {
  id: string;
  number: number;
  sections: Section[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  semesters: Semester[];
  created_at: string;
  updated_at: string;
}

export function useDepartments() {
  const queryClient = useQueryClient();

  const { data: departments, isLoading, error } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const data = await departmentService.getDepartments();
      
      // Map backend Department (with nested batches) to frontend Department structure
      return data.map((dept: any) => {
        // Flatten semesters from all batches for this department
        // (Assuming the UI expects a flat list of semesters for the department)
        const allSemesters: Semester[] = [];
        const seenSemesters = new Set<number>();

        if (dept.batches) {
          dept.batches.forEach((batch: any) => {
            if (batch.semesters) {
              batch.semesters.forEach((sem: any) => {
                // Avoid duplicate semester numbers from different batches
                if (!seenSemesters.has(sem.number)) {
                  seenSemesters.add(sem.number);
                  allSemesters.push({
                    id: sem.id,
                    number: sem.number,
                    sections: (sem.sections || []).map((sec: any) => ({
                      id: sec.id,
                      name: sec.name
                    }))
                  });
                }
              });
            }
          });
        }

        return {
          id: String(dept.id),
          name: dept.name,
          code: dept.short_form || '',
          description: '', // Backend Department model doesn't have description, but has short_form
          semesters: allSemesters.sort((a, b) => a.number - b.number),
          created_at: dept.created_at || '',
          updated_at: dept.updated_at || '',
        };
      });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (newDepartment: { name: string; code: string; description?: string; semesters?: Semester[] }) => {
      const deptData = await departmentService.createDepartment({
        name: newDepartment.name,
        short_form: newDepartment.code,
      });
      return deptData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create department: ${error.message}`);
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Department> }) => {
      const deptData = await departmentService.updateDepartment(id, {
        name: updates.name,
        short_form: updates.code,
      });
      return deptData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update department: ${error.message}`);
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await departmentService.deleteDepartment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete department: ${error.message}`);
    },
  });

  return {
    departments,
    isLoading,
    error,
    createDepartment: createDepartmentMutation.mutate,
    updateDepartment: updateDepartmentMutation.mutate,
    deleteDepartment: deleteDepartmentMutation.mutate,
  };
}
