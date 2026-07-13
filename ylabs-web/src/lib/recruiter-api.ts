import restApiAuthUtil, { yhubApiAuthUtil } from '../utils/RestApiAuthUtil';

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
        if (data.password) {
            try {
                await yhubApiAuthUtil.post('/auth/register/?product=ylabs', {
                    email: data.email,
                    username: data.email.split('@')[0],
                    password: data.password,
                    password_confirm: data.password,
                    first_name: data.first_name,
                    last_name: data.last_name,
                });
            } catch (e: any) {
                console.error("YHub registration failed:", e);
                // If user already exists on YHub, we can still proceed to link them as a recruiter locally
            }
        }
        return await restApiAuthUtil.post<CompanyRecruiter>('/recruiter/recruiters/', data);
    },

    updateRecruiter: async (id: string, data: any): Promise<CompanyRecruiter> => {
        return await restApiAuthUtil.patch<CompanyRecruiter>(`/recruiter/recruiters/${id}/`, data);
    },

    deleteRecruiter: async (id: string): Promise<void> => {
        return await restApiAuthUtil.delete(`/recruiter/recruiters/${id}/`);
    },
};
