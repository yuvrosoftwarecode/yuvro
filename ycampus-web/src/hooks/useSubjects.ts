import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import subjectService from '@/services/subjectService';
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
      // In the backend, subjects are not directly linked to departments in the Subject model.
      // They are linked via SemesterSubject or CollegeSubject.
      // However, for compatibility with hooks that expect a list of subjects, 
      // we fetch all subjects or filter if possible.
      const data = await subjectService.getSubjects();
      
      return data.map((s: any) => ({
        id: String(s.id),
        name: s.subject_name || s.name || '',
        code: s.short_code || '',
        department_id: null, // Backend doesn't have direct department link
        semester: 1, // Defaulting as backend Subject doesn't have semester
        description: s.description || null,
        created_at: s.created_at || '',
        updated_at: s.updated_at || '',
      })) as Subject[];
    },
  });

  const createSubjectMutation = useMutation({
    mutationFn: async (newSubject: { name: string; code: string; department_id: string; semester?: number; description?: string }) => {
      return await subjectService.createSubject({
        subject_name: newSubject.name,
        short_code: newSubject.code,
        description: newSubject.description,
      });
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
      return await subjectService.updateSubject(updatedSubject.id, {
        subject_name: updatedSubject.name,
        short_code: updatedSubject.code,
        description: updatedSubject.description,
      });
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
      await subjectService.deleteSubject(id);
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
