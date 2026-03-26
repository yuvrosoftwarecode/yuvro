import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiService from '@/services/api';

interface Batch {
  batchId: string;
  batchName: string;
  batchTitle: string;
  description: string;
  _links?: any;
}

export function useBatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBatches();
      const normalizedBatches = response.content.map((batch: any) => {
        const id = String(batch?._links?.self?.href?.split('/')?.pop() ?? '');
        return { ...batch, batchId: batch.batchId ?? id };
      });
      setBatches(normalizedBatches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const deleteBatch = async (batchId: string) => {
    try {
      const batch = batches.find(b => b.batchId === batchId);
      if (!batch) throw new Error('Batch not found');
      
      await apiService.deleteBatch(batchId);
      toast.success('Batch deleted successfully!');
      await fetchBatches();
      return true;
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
      return false;
    }
  };

  const updateBatch = async (batchId: string, payload: any) => {
    try {
      await apiService.updateBatch(batchId, payload);
      toast.success('Batch updated successfully!');
      await fetchBatches();
      return true;
    } catch (error) {
      console.error('Error updating batch:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update batch');
      return false;
    }
  };

  const addBatch = async (payload: any) => {
    try {
      await apiService.addBatch(payload);
      toast.success('Batch added successfully!');
      await fetchBatches();
      return true;
    } catch (error) {
      console.error('Error adding batch:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add batch');
      return false;
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  return {
    batches,
    loading,
    fetchBatches,
    deleteBatch,
    updateBatch,
    addBatch
  };
}