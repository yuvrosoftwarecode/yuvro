import restApiAuthUtil from '../utils/RestApiAuthUtil';

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
}

export const recruiterApi = {
    fetchCompanies: async (): Promise<Company[]> => {
        return await restApiAuthUtil.get<Company[]>('/recruiter/companies/');
    },

    createCompany: async (data: Partial<Company>): Promise<Company> => {
        return await restApiAuthUtil.post<Company>('/recruiter/companies/', data);
    },

    fetchRecruiters: async (): Promise<CompanyRecruiter[]> => {
        return await restApiAuthUtil.get<CompanyRecruiter[]>('/recruiter/recruiters/');
    },

    createRecruiter: async (data: any): Promise<CompanyRecruiter> => {
        return await restApiAuthUtil.post<CompanyRecruiter>('/recruiter/recruiters/', data);
    },

    updateRecruiter: async (id: string, data: any): Promise<CompanyRecruiter> => {
        return await restApiAuthUtil.patch<CompanyRecruiter>(`/recruiter/recruiters/${id}/`, data);
    },

    deleteRecruiter: async (id: string): Promise<void> => {
        return await restApiAuthUtil.delete(`/recruiter/recruiters/${id}/`);
    },
};
