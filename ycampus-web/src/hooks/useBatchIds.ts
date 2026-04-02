import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BatchSemester {
  id: string;
  batch_id_ref: string;
  semester_number: number;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BatchId {
  id: string;
  department_id: string;
  name: string;
  description: string | null;
  is_archived: boolean;
  created_at: string;
  semesters?: BatchSemester[];
}

export function useBatchIds(departmentId?: string) {
  const queryClient = useQueryClient();

  const { data: batchIds, isLoading, error } = useQuery({
    queryKey: ['batch_ids', departmentId],
    queryFn: async () => {
      let query = supabase
        .from('batch_ids')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BatchId[];
    },
  });

  const createBatchId = useMutation({
    mutationFn: async (data: { department_id: string; name: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from('batch_ids')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ids'] });
      toast.success('Batch ID created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create Batch ID');
    },
  });

  const updateBatchId = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; is_archived?: boolean }) => {
      const { data: result, error } = await supabase
        .from('batch_ids')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ids'] });
      toast.success('Batch ID updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update Batch ID');
    },
  });

  const deleteBatchId = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('batch_ids').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ids'] });
      toast.success('Batch ID deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete Batch ID');
    },
  });

  return {
    batchIds,
    isLoading,
    error,
    createBatchId,
    updateBatchId,
    deleteBatchId,
  };
}

// Semesters are now directly under Batch IDs
export function useBatchSemesters(batchIdRef?: string) {
  const queryClient = useQueryClient();

  const { data: semesters, isLoading, error } = useQuery({
    queryKey: ['batch_semesters', batchIdRef],
    queryFn: async () => {
      if (!batchIdRef) return [];
      
      const { data, error } = await supabase
        .from('batch_semesters')
        .select('*')
        .eq('batch_id_ref', batchIdRef)
        .order('semester_number', { ascending: true });
      
      if (error) throw error;
      return data as BatchSemester[];
    },
    enabled: !!batchIdRef,
  });

  const createSemester = useMutation({
    mutationFn: async (data: { batch_id_ref: string; semester_number: number; name?: string }) => {
      const { data: result, error } = await supabase
        .from('batch_semesters')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_semesters'] });
      toast.success('Semester added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add semester');
    },
  });

  const updateSemester = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; is_active?: boolean }) => {
      const { data: result, error } = await supabase
        .from('batch_semesters')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_semesters'] });
      toast.success('Semester updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update semester');
    },
  });

  const deleteSemester = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('batch_semesters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_semesters'] });
      toast.success('Semester deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete semester');
    },
  });

  return {
    semesters,
    isLoading,
    error,
    createSemester,
    updateSemester,
    deleteSemester,
  };
}
