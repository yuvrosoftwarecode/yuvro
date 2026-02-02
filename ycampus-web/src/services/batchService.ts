import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface BatchStudent {
  id: string;
  student: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  enrolled_at: string;
  is_active: boolean;
  progress_percentage: number;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  name: string;
  title: string;
  description: string | null;
  course: string;
  course_name: string;
  course_short_code: string | null;
  start_date: string;
  end_date: string | null;
  max_students: number;
  status: 'active' | 'inactive' | 'completed' | 'draft';
  enrolled_count: number;
  is_full: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  batch_students?: BatchStudent[];
}

export interface CreateBatchData {
  name: string;
  title: string;
  description?: string;
  course: string;
  start_date: string;
  end_date?: string;
  max_students: number;
  status?: 'active' | 'inactive' | 'completed' | 'draft';
  student_ids?: string[];
}

export interface UpdateBatchData extends Partial<CreateBatchData> {
  id: string;
}

export interface BatchStats {
  total_batches: number;
  active_batches: number;
  draft_batches: number;
  completed_batches: number;
  total_enrolled_students: number;
}

class BatchService {
  private baseUrl = '/course/batches';

  async fetchBatches(params?: {
    course?: string;
    status?: string;
    ordering?: string;
  }): Promise<Batch[]> {
    return restApiAuthUtil.get(this.baseUrl + '/', { params });
  }

  async fetchBatchById(batchId: string): Promise<Batch> {
    return restApiAuthUtil.get(`${this.baseUrl}/${batchId}/`);
  }

  async createBatch(batchData: CreateBatchData): Promise<Batch> {
    return restApiAuthUtil.post(this.baseUrl + '/', batchData);
  }

  async updateBatch(batchId: string, batchData: Partial<CreateBatchData>): Promise<Batch> {
    return restApiAuthUtil.patch(`${this.baseUrl}/${batchId}/`, batchData);
  }

  async deleteBatch(batchId: string): Promise<void> {
    return restApiAuthUtil.delete(`${this.baseUrl}/${batchId}/`);
  }

  async addStudentsToBatch(batchId: string, studentIds: string[]): Promise<{
    message: string;
    added_students: number;
    total_enrolled: number;
    batch_students: BatchStudent[];
  }> {
    return restApiAuthUtil.post(`${this.baseUrl}/${batchId}/add_students/`, {
      student_ids: studentIds
    });
  }

  async removeStudentsFromBatch(batchId: string, studentIds: string[]): Promise<{
    message: string;
    removed_students: number;
    total_enrolled: number;
  }> {
    return restApiAuthUtil.post(`${this.baseUrl}/${batchId}/remove_students/`, {
      student_ids: studentIds
    });
  }

  async getBatchStudents(batchId: string): Promise<{
    batch_id: string;
    batch_name: string;
    total_enrolled: number;
    max_students: number;
    students: BatchStudent[];
  }> {
    return restApiAuthUtil.get(`${this.baseUrl}/${batchId}/students/`);
  }


  async getBatchStats(): Promise<BatchStats> {
    return restApiAuthUtil.get(`${this.baseUrl}/stats/`);
  }


  async activateBatch(batchId: string): Promise<Batch> {
    return restApiAuthUtil.post(`${this.baseUrl}/${batchId}/activate/`);
  }


  async deactivateBatch(batchId: string): Promise<Batch> {
    return restApiAuthUtil.post(`${this.baseUrl}/${batchId}/deactivate/`);
  }


  async getBatchesByCourse(courseId: string): Promise<Batch[]> {
    return this.fetchBatches({ course: courseId });
  }


  async getActiveBatches(): Promise<Batch[]> {
    return this.fetchBatches({ status: 'active' });
  }


  async getDraftBatches(): Promise<Batch[]> {
    return this.fetchBatches({ status: 'draft' });
  }
}

export const batchService = new BatchService();
export default batchService;