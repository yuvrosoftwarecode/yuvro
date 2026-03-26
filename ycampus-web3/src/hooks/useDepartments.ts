import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (deptError) throw deptError;
      
      // Fetch all semesters with sections
      const { data: semesterData, error: semError } = await supabase
        .from('department_semesters')
        .select(`
          id,
          department_id,
          number,
          department_sections (
            id,
            name
          )
        `)
        .order('number');
      
      if (semError) throw semError;
      
      // Map semesters to departments
      return deptData?.map(dept => ({
        ...dept,
        semesters: (semesterData || [])
          .filter(sem => sem.department_id === dept.id)
          .map(sem => ({
            id: sem.id,
            number: sem.number,
            sections: (sem.department_sections || []).map((sec: any) => ({
              id: sec.id,
              name: sec.name
            }))
          }))
      })) || [];
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (newDepartment: { name: string; code: string; description?: string; semesters?: Semester[] }) => {
      // Create department
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .insert({
          name: newDepartment.name,
          code: newDepartment.code,
          description: newDepartment.description || null,
        })
        .select()
        .single();
      
      if (deptError) throw deptError;
      
      // Create semesters and sections
      if (newDepartment.semesters && newDepartment.semesters.length > 0) {
        for (const semester of newDepartment.semesters) {
          const { data: semData, error: semError } = await supabase
            .from('department_semesters')
            .insert({
              department_id: deptData.id,
              number: semester.number
            })
            .select()
            .single();
          
          if (semError) throw semError;
          
          // Create sections for this semester
          if (semester.sections && semester.sections.length > 0) {
            const sectionInserts = semester.sections.map(sec => ({
              semester_id: semData.id,
              name: sec.name
            }));
            
            const { error: secError } = await supabase
              .from('department_sections')
              .insert(sectionInserts);
            
            if (secError) throw secError;
          }
        }
      }
      
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
      // Update department basic info
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .update({
          name: updates.name,
          code: updates.code,
          description: updates.description || null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (deptError) throw deptError;
      
      // Delete existing semesters (cascade will delete sections)
      const { error: deleteError } = await supabase
        .from('department_semesters')
        .delete()
        .eq('department_id', id);
      
      if (deleteError) throw deleteError;
      
      // Recreate semesters and sections
      if (updates.semesters && updates.semesters.length > 0) {
        for (const semester of updates.semesters) {
          const { data: semData, error: semError } = await supabase
            .from('department_semesters')
            .insert({
              department_id: id,
              number: semester.number
            })
            .select()
            .single();
          
          if (semError) throw semError;
          
          // Create sections for this semester
          if (semester.sections && semester.sections.length > 0) {
            const sectionInserts = semester.sections.map(sec => ({
              semester_id: semData.id,
              name: sec.name
            }));
            
            const { error: secError } = await supabase
              .from('department_sections')
              .insert(sectionInserts);
            
            if (secError) throw secError;
          }
        }
      }
      
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
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
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
