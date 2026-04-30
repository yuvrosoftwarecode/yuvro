import restApiAuthUtil from '../utils/RestApiAuthUtil';

export type CompanyStatus = 'active' | 'inactive' | 'blacklisted';

export interface Company {
  id: string;
  name: string;
  domain?: string;
  website?: string;
  size?: string;
  description?: string;
  location?: string;
  status?: CompanyStatus;
  company_type?: 'Product' | 'Service' | 'Startup' | 'MNC' | 'IT Service & Consulting';
  rating?: number;
  total_hires?: number;
  avg_ctc?: number;          // in LPA
  // Recruiter info
  recruiter_name?: string;
  recruiter_designation?: string;
  recruiter_email?: string;
  recruiter_phone?: string;
  // Contact
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyStats {
  totalCompanies: number;
  activePartners: number;
  totalHires: number;
  avgCTC: string;
}

export const companyService = {
  async getCompanies(): Promise<Company[]> {
    try {
      const response = await restApiAuthUtil.get('/jobs/companies/');
      return response as Company[];
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },

  async createCompany(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    try {
      const response = await restApiAuthUtil.post('/jobs/companies/', companyData);
      return response as Company;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  },

  async updateCompany(id: string, companyData: Partial<Company>): Promise<Company> {
    try {
      const response = await restApiAuthUtil.patch(`/jobs/companies/${id}/`, companyData);
      return response as Company;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  },

  async deleteCompany(id: string): Promise<void> {
    try {
      await restApiAuthUtil.delete(`/jobs/companies/${id}/`);
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  },

  async getCompany(id: string): Promise<Company> {
    try {
      const response = await restApiAuthUtil.get(`/jobs/companies/${id}/`);
      return response as Company;
    } catch (error) {
      console.error('Error fetching company:', error);
      throw error;
    }
  },

  /** Derives stats client-side from the companies list */
  deriveStats(companies: Company[]): CompanyStats {
    const active = companies.filter(c => (c.status ?? 'active') === 'active');
    const totalHires = companies.reduce((s, c) => s + (c.total_hires ?? 0), 0);
    const ctcValues = companies.map(c => c.avg_ctc ?? 0).filter(v => v > 0);
    const avgCTC = ctcValues.length
      ? (ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length).toFixed(1)
      : '0.0';
    return {
      totalCompanies: companies.length,
      activePartners: active.length,
      totalHires,
      avgCTC,
    };
  },
};

export default companyService;