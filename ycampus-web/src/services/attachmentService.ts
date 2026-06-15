import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface AttachmentDepartment {
  id: string;
  name: string;
}

export interface AttachmentSection {
  id: string;
  name: string;
}

export interface Attachment {
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
  unit?: string | null;
  unit_name?: string | null;
  sub_unit?: string | null;
  sub_unit_name?: string | null;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface AttachmentFilters {
  batch?: string;
  department?: string;
  subject?: string;
  section?: string;
  unit?: string;
  sub_unit?: string;
  search?: string;
}

export async function uploadAttachment(formData: FormData): Promise<Attachment> {
  return restApiAuthUtil.post('/faculty/attachments/', formData);
}

export async function getAttachments(filters?: AttachmentFilters): Promise<Attachment[]> {
  const params: Record<string, string> = {};
  if (filters?.batch) params.batch = filters.batch;
  if (filters?.department) params.department = filters.department;
  if (filters?.subject) params.subject = filters.subject;
  if (filters?.section) params.section = filters.section;
  if (filters?.unit) params.unit = filters.unit;
  if (filters?.sub_unit) params.sub_unit = filters.sub_unit;
  if (filters?.search) params.search = filters.search;
  return restApiAuthUtil.get('/faculty/attachments/', { params });
}

export async function updateAttachment(id: string, formData: FormData): Promise<Attachment> {
  return restApiAuthUtil.patch(`/faculty/attachments/${id}/`, formData);
}

export async function deleteAttachment(id: string): Promise<void> {
  await restApiAuthUtil.delete(`/faculty/attachments/${id}/`);
}

export function getAttachmentDownloadUrl(id: string): string {
  const baseUrl = (restApiAuthUtil as any).defaults?.baseURL || '/api';
  return `${baseUrl}/faculty/attachments/${id}/download/`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const ALLOWED_FILE_TYPES = [
  '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.zip', '.png', '.jpg', '.jpeg', '.webp',
];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const attachmentService = {
  upload: uploadAttachment,
  list: getAttachments,
  update: updateAttachment,
  delete: deleteAttachment,
  getDownloadUrl: getAttachmentDownloadUrl,
  formatFileSize,
};

export default attachmentService;
