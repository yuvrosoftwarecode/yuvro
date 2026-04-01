import restApiAuthUtil from '../utils/RestApiAuthUtil';
import { User } from './userService';

export interface FacultyProfile {
  id: string;
  user: string;
  user_details: User;
  college: string;
  college_name: string;
  department: string;
  department_name: string;
  linked_departments: string[];
  linked_departments_data: { id: string; name: string }[];
  designation: string;
  created_at: string;
  updated_at: string;
}

export interface FacultyCreateData {
  user: {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    password?: string;
  };
  college: string;
  department: string;
  linked_departments: string[];
  designation: string;
}

export const facultyService = {
  getFaculties: async (collegeId?: string | number): Promise<FacultyProfile[]> => {
    const url = collegeId ? `/core/faculty/?college=${collegeId}` : '/core/faculty/';
    return await restApiAuthUtil.get<FacultyProfile[]>(url);
  },

  getFaculty: async (id: string): Promise<FacultyProfile> => {
    return await restApiAuthUtil.get<FacultyProfile>(`/core/faculty/${id}/`);
  },

  createFaculty: async (data: FacultyCreateData): Promise<FacultyProfile> => {
    return await restApiAuthUtil.post<FacultyProfile>('/core/faculty/', data);
  },

  updateFaculty: async (id: string, data: Partial<FacultyCreateData>): Promise<FacultyProfile> => {
    return await restApiAuthUtil.patch<FacultyProfile>(`/core/faculty/${id}/`, data);
  },

  deleteFaculty: async (id: string): Promise<void> => {
    await restApiAuthUtil.delete(`/core/faculty/${id}/`);
  }
};
