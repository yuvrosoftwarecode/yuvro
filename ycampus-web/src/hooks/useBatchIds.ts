import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchService } from '@/services/batchService';
import { semesterService } from '@/services/semesterService';
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
      const data = await batchService.getBatches(departmentId);
      
      return data.map((batch: any) => ({
        id: String(batch.id),
        department_id: String(batch.department),
        name: batch.name,
        description: '', // Backend Batch model doesn't have description in the serializer currently
        is_archived: false, // Backend doesn't have is_archived yet
        created_at: batch.created_at || '',
        semesters: (batch.semesters || []).map((sem: any) => ({
          id: String(sem.id),
          batch_id_ref: String(batch.id),
          semester_number: sem.number,
          name: `Semester ${sem.number}`,
          is_active: sem.is_current,
          created_at: sem.created_at || '',
        })),
      })) as BatchId[];
    },
  });

  const createBatchId = useMutation({
    mutationFn: async (data: { department_id: string; name: string; description?: string }) => {
      return await batchService.createBatch({
        department: data.department_id,
        name: data.name,
      });
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
      return await batchService.updateBatch(id, {
        name: data.name,
      });
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
      await batchService.deleteBatch(id);
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
      
      const data = await semesterService.getSemesters(batchIdRef);
      
      return data.map((sem: any) => ({
        id: String(sem.id),
        batch_id_ref: String(sem.batch),
        semester_number: sem.number,
        name: `Semester ${sem.number}`,
        is_active: sem.is_current,
        created_at: sem.created_at || '',
      })) as BatchSemester[];
    },
    enabled: !!batchIdRef,
  });

  const createSemester = useMutation({
    mutationFn: async (data: { batch_id_ref: string; semester_number: number; name?: string }) => {
      return await semesterService.createSemester({
        batch: data.batch_id_ref,
        number: data.semester_number,
        is_current: false,
      });
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
      return await semesterService.updateSemester(id, {
        is_current: data.is_active,
      });
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
      await semesterService.deleteSemester(id);
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
