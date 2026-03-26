import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Batch {
    id: string | number;
    department?: string | number;
    department_name?: string;
    college?: string | number;
    name: string;
    semesters?: any[]; // Avoiding circular dependency for now, or I can import Semester
    created_at?: string;
    updated_at?: string;
}

export interface BatchCreateData {
    department?: string | number;
    college?: string | number;
    name: string;
}

export const batchService = {
    getBatches: async (departmentId?: string | number): Promise<Batch[]> => {
        const url = departmentId ? `/course/batches/?department=${departmentId}` : '/course/batches/';
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
    },

    getBatchesByCollegeAndName: async (collegeId: string | number, name: string): Promise<Batch[]> => {
        return await restApiAuthUtil.get<Batch[]>(`/course/batches/?college=${collegeId}&name=${name}`);
    }
};

export default batchService;
