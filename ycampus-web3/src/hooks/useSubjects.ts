import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Subject {
  id: string;
  name: string;
  code: string;
  department_id: string | null;
  semester?: number;
  credits?: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubjects(departmentId?: string) {
  const queryClient = useQueryClient();

  const { data: subjects, isLoading, error } = useQuery({
    queryKey: ['subjects', departmentId],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('*')
        .order('name');
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data as Subject[];
    },
  });

  const createSubjectMutation = useMutation({
    mutationFn: async (newSubject: { name: string; code: string; department_id: string; semester?: number; description?: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          name: newSubject.name,
          code: newSubject.code,
          department_id: newSubject.department_id,
          semester: newSubject.semester || 1,
          description: newSubject.description || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subject: ${error.message}`);
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async (updatedSubject: Partial<Subject> & { id: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .update({
          name: updatedSubject.name,
          code: updatedSubject.code,
          department_id: updatedSubject.department_id,
          semester: updatedSubject.semester,
          description: updatedSubject.description,
        })
        .eq('id', updatedSubject.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subject: ${error.message}`);
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subject: ${error.message}`);
    },
  });

  return {
    subjects,
    isLoading,
    error,
    createSubject: createSubjectMutation.mutate,
    updateSubject: updateSubjectMutation.mutate,
    deleteSubject: deleteSubjectMutation.mutate,
  };
}
