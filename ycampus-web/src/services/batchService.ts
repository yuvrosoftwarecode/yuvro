import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Batch {
    id: string | number;
    college: string | number;
    college_name?: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}

export const batchService = {
    getBatches: async (collegeId?: string | number): Promise<Batch[]> => {
        const url = collegeId ? `/course/batches/?college=${collegeId}` : '/course/batches/';
        return await restApiAuthUtil.get<Batch[]>(url);
    },

    getBatch: async (id: string | number): Promise<Batch> => {
        return await restApiAuthUtil.get<Batch>(`/course/batches/${id}/`);
    },

    createBatch: async (data: Partial<Batch>): Promise<Batch> => {
        return await restApiAuthUtil.post<Batch>('/course/batches/', data);
    },

    updateBatch: async (id: string | number, data: Partial<Batch>): Promise<Batch> => {
        return await restApiAuthUtil.patch<Batch>(`/course/batches/${id}/`, data);
    },

    deleteBatch: async (id: string | number): Promise<void> => {
        await restApiAuthUtil.delete(`/course/batches/${id}/`);
    }
};

export default batchService;
