import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface AttachmentDepartment {
  id: string;
  name: string;
}

export interface AttachmentSection {
  id: string;
  name: string;
}

export interface StudentAttachment {
  id: string;
  file_name: string;
  file: string;
  file_type: string;
  file_size: number;
  batch: string;
  batch_name: string;
  departments: string[];
  department_details: AttachmentDepartment[];
  subject: string;
  subject_name: string;
  sections: string[];
  section_details: AttachmentSection[];
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface StudentAttachmentFilters {
  subject?: string;
  search?: string;
}

export async function getStudentAttachments(filters?: StudentAttachmentFilters): Promise<StudentAttachment[]> {
  const params: Record<string, string> = {};
  if (filters?.subject) params.subject = filters.subject;
  if (filters?.search) params.search = filters.search;
  return restApiAuthUtil.get('/course/student-attachments/', { params });
}

export function getStudentAttachmentDownloadUrl(id: string): string {
  const baseUrl = (restApiAuthUtil as any).defaults?.baseURL || '/api';
  return `${baseUrl}/course/student-attachments/${id}/download/`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const studentAttachmentService = {
  list: getStudentAttachments,
  getDownloadUrl: getStudentAttachmentDownloadUrl,
  formatFileSize,
};

export default studentAttachmentService;
