import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Company {
  id: number;
  name: string;
  domain?: string;
  website?: string;
  size?: string;
  description?: string;
  location?: string;
  created_at?: string;
}

export const companyService = {
  // Fetch all companies
  async getCompanies(): Promise<Company[]> {
    try {
      const response = await restApiAuthUtil.get('/jobs/companies/');
      return response as Company[];
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },

  // Create a new company
  async createCompany(companyData: Omit<Company, 'id'>): Promise<Company> {
    try {
      const response = await restApiAuthUtil.post('/jobs/companies/', companyData);
      return response as Company;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  },

  // Update an existing company
  async updateCompany(id: number, companyData: Partial<Company>): Promise<Company> {
    try {
      const response = await restApiAuthUtil.put(`/jobs/companies/${id}/`, companyData);
      return response as Company;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  },

  // Delete a company
  async deleteCompany(id: number): Promise<void> {
    try {
      await restApiAuthUtil.delete(`/jobs/companies/${id}/`);
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  },

  // Get a single company by ID
  async getCompany(id: number): Promise<Company> {
    try {
      const response = await restApiAuthUtil.get(`/jobs/companies/${id}/`);
      return response as Company;
    } catch (error) {
      console.error('Error fetching company:', error);
      throw error;
    }
  },
};

export default companyService;