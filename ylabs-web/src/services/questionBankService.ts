import { restApiUtil } from "../utils/RestApiUtil";

export const questionBankService = {
  async getLabQuestions(): Promise<any[]> {
    return restApiUtil.get(`/skill_evaluation/lab-questions/`);
  },
  
  async getLabQuestion(id: string): Promise<any> {
    return restApiUtil.get(`/skill_evaluation/lab-questions/${id}/`);
  },

  async createLabQuestion(data: any): Promise<any> {
    return restApiUtil.post(`/skill_evaluation/lab-questions/`, data);
  },

  async updateLabQuestion(id: string, data: any): Promise<any> {
    return restApiUtil.put(`/skill_evaluation/lab-questions/${id}/`, data);
  },

  async deleteLabQuestion(id: string): Promise<any> {
    return restApiUtil.delete(`/skill_evaluation/lab-questions/${id}/`);
  }
};
