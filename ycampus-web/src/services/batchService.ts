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

  /**
   * Fetch all batches with optional filters
   */
  async fetchBatches(params?: {
    course?: string;
    status?: string;
    ordering?: string;
  }): Promise<Batch[]> {
    return restApiAuthUtil.get(this.baseUrl + '/', { params });
  }

  /**
   * Fetch a single batch by ID with detailed information
   */
  async fetchBatchById(batchId: string): Promise<Batch> {
    return restApiAuthUtil.get(`${this.baseUrl}/${batchId}/`);
  }

  /**
   * Create a new batch
   */
  async createBatch(batchData: CreateBatchData): Promise<Batch> {
    return restApiAuthUtil.post(this.baseUrl + '/', batchData);
  }

  /**
   * Update an existing batch
   */
  async updateBatch(batchId: string, batchData: Partial<CreateBatchData>): Promise<Batch> {
    return restApiAuthUtil.patch(`${this.baseUrl}/${batchId}/`, batchData);
  }

  /**
   * Delete a batch
   */
  async deleteBatch(batchId: string): Promise<void> {
    return restApiAuthUtil.delete(`${this.baseUrl}/${batchId}/`);
  }

  /**
   * Add students to a batch
   */
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

  /**
   * Remove students from a batch
   */
  async removeStudentsFromBatch(batchId: string, studentIds: string[]): Promise<{
    message: string;
    removed_students: number;
    total_enrolled: number;
  }> {
    return restApiAuthUtil.post(`${this.baseUrl}/${batchId}/remove_students/`, {
      student_ids: studentIds
    });
  }

  /**
   * Get all students in a batch
   */
  async getBatchStudents(batchId: string): Promise<{
    batch_id: string;
    batch_name: string;
    total_enrolled: number;
    max_students: number;
    students: BatchStudent[];
  }> {
    return restApiAuthUtil.get(`${this.baseUrl}/${batchId}/students/`);
  }

  /**
   * Get batch statistics
   */
  async getBatchStats(): Promise<BatchStats> {
    return restApiAuthUtil.get(`${this.baseUrl}/stats/`);
  }

  /**
   * Activate a batch (change status from draft to active)
   */
  async activateBatch(batchId: string): Promise<Batch> {
    return restApiAuthUtil.post(`${this.baseUrl}/${batchId}/activate/`);
  }

  /**
   * Deactivate a batch (change status to inactive)
   */
  async deactivateBatch(batchId: string): Promise<Batch> {
    return restApiAuthUtil.post(`${this.baseUrl}/${batchId}/deactivate/`);
  }

  /**
   * Get batches by course
   */
  async getBatchesByCourse(courseId: string): Promise<Batch[]> {
    return this.fetchBatches({ course: courseId });
  }

  /**
   * Get active batches only
   */
  async getActiveBatches(): Promise<Batch[]> {
    return this.fetchBatches({ status: 'active' });
  }

  /**
   * Get draft batches only
   */
  async getDraftBatches(): Promise<Batch[]> {
    return this.fetchBatches({ status: 'draft' });
  }
}

export const batchService = new BatchService();
export default batchService;