import restApiAuthUtil from "../utils/RestApiAuthUtil";

export interface Company {
  id: string;
  name: string;
  description?: string;
  benefits?: string;
  domain?: string;
  website?: string;
  size?: string;
  location?: string;
  created_at?: string;
}

export interface CompanyRecruiter {
  id: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
  };
  company: Company;
  notification_config?: any;
  created_at?: string;
  is_self_signup?: boolean;
}

export const recruiterApi = {
  fetchCompanies: async (): Promise<Company[]> => {
    return await restApiAuthUtil.get<Company[]>("/recruiter/companies/");
  },

  createCompany: async (data: Partial<Company>): Promise<Company> => {
    return await restApiAuthUtil.post<Company>("/recruiter/companies/", data);
  },

  updateCompany: async (id: string, data: Partial<Company>): Promise<Company> => {
    return await restApiAuthUtil.patch<Company>(`/recruiter/companies/${id}/`, data);
  },

  deleteCompany: async (id: string): Promise<void> => {
    return await restApiAuthUtil.delete(`/recruiter/companies/${id}/`);
  },

  fetchRecruiters: async (page = 1, pageSize = 20): Promise<{ count: number; results: CompanyRecruiter[] }> => {
    return await restApiAuthUtil.get<{ count: number; results: CompanyRecruiter[] }>(`/recruiter/recruiters/?page=${page}&page_size=${pageSize}`);
  },

  createRecruiter: async (data: any): Promise<CompanyRecruiter> => {
    return await restApiAuthUtil.post<CompanyRecruiter>("/recruiter/recruiters/", data);
  },

  updateRecruiter: async (id: string, data: any): Promise<CompanyRecruiter> => {
    return await restApiAuthUtil.patch<CompanyRecruiter>(`/recruiter/recruiters/${id}/`, data);
  },

  deleteRecruiter: async (id: string): Promise<void> => {
    return await restApiAuthUtil.delete(`/recruiter/recruiters/${id}/`);
  },
};
