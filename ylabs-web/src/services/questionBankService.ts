import { restApiAuthUtil } from "../utils/RestApiAuthUtil";

export const questionBankService = {
  async getLabQuestions(): Promise<any[]> {
    return restApiAuthUtil.get(`/skill_evaluation/lab-questions/`);
  },
  
  async getLabQuestion(id: string): Promise<any> {
    return restApiAuthUtil.get(`/skill_evaluation/lab-questions/${id}/`);
  },

  async createLabQuestion(data: any): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/lab-questions/`, data);
  },

  async updateLabQuestion(id: string, data: any): Promise<any> {
    return restApiAuthUtil.put(`/skill_evaluation/lab-questions/${id}/`, data);
  },

  async deleteLabQuestion(id: string): Promise<any> {
    return restApiAuthUtil.delete(`/skill_evaluation/lab-questions/${id}/`);
  },

  async verifyLabQuestion(data: any): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/lab-questions/verify/`, data);
  },

  async exportFixture(id: string): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/lab-questions/${id}/export-fixture/`);
  },

  async getKnowledgeQuestions(): Promise<any[]> {
    const data: any = await restApiAuthUtil.get(`/skill_evaluation/knowledge-questions/`);
    return Array.isArray(data) ? data : data?.results || [];
  },

  async getKnowledgeQuestion(id: string): Promise<any> {
    return restApiAuthUtil.get(`/skill_evaluation/knowledge-questions/${id}/`);
  },

  async createKnowledgeQuestion(data: any): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/knowledge-questions/`, data);
  },

  async updateKnowledgeQuestion(id: string, data: any): Promise<any> {
    return restApiAuthUtil.put(`/skill_evaluation/knowledge-questions/${id}/`, data);
  },

  async deleteKnowledgeQuestion(id: string): Promise<any> {
    return restApiAuthUtil.delete(`/skill_evaluation/knowledge-questions/${id}/`);
  },

  async getSystemDesignQuestions(): Promise<any[]> {
    const data: any = await restApiAuthUtil.get(`/skill_evaluation/system-design-questions/`);
    return Array.isArray(data) ? data : data?.results || [];
  },

  async getSystemDesignQuestion(id: string): Promise<any> {
    return restApiAuthUtil.get(`/skill_evaluation/system-design-questions/${id}/`);
  },

  async createSystemDesignQuestion(data: any): Promise<any> {
    return restApiAuthUtil.post(`/skill_evaluation/system-design-questions/`, data);
  },

  async updateSystemDesignQuestion(id: string, data: any): Promise<any> {
    return restApiAuthUtil.put(`/skill_evaluation/system-design-questions/${id}/`, data);
  },

  async deleteSystemDesignQuestion(id: string): Promise<any> {
    return restApiAuthUtil.delete(`/skill_evaluation/system-design-questions/${id}/`);
  }
};

