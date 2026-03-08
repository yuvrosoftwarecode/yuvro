import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  college: string;
  college_name: string;
  department: string | null;
  department_name: string | null;
  level: 'college' | 'department';
  created_by: string;
  created_by_name: string;
  priority: 'normal' | 'important' | 'urgent';
  is_active: boolean;
  publish_date: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
  attachment?: string | null;
}

export interface AnnouncementFilters {
  college?: string;
  department?: string;
  level?: string;
  priority?: string;
  ordering?: string;
  is_active?: boolean;
}

export const announcementService = {
  getAnnouncements: async (params?: AnnouncementFilters) => {
    let url = '/core/announcement/';
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return await restApiAuthUtil.get<any>(url);
  },

  getAnnouncement: async (id: string) => {
    return await restApiAuthUtil.get<Announcement>(`/core/announcement/${id}/`);
  },
    return await restApiAuthUtil.post<Announcement>('/core/announcement/', data);
  },

  updateAnnouncement: async (id: string, data: Partial<Announcement> | FormData) => {
  },

  deleteAnnouncement: async (id: string) => {
    return await restApiAuthUtil.delete(`/core/announcement/${id}/`);
  },
};

export default announcementService;
