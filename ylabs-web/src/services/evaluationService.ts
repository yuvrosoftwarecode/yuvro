import { restApiUtil, yhubApiUtil } from '../utils/RestApiUtil';
import { restApiAuthUtil } from '../utils/RestApiAuthUtil';

export const evaluationService = {
  async sendRegistrationOtp(evaluationId: string, email: string): Promise<any> {
    return yhubApiUtil.post(`/auth/public_send_otp/`, { 
      resource_id: evaluationId, 
      resource_type: 'evaluation',
      email, 
      contest_title: 'Evaluation' 
    });
  },

  async verifyRegistrationOtp(evaluationId: string, email: string, otp: string): Promise<any> {
    return yhubApiUtil.post(`/auth/public_verify_otp/`, { 
      resource_id: evaluationId, 
      resource_type: 'evaluation',
      email, 
      otp 
    });
  },

  async registerPublicEvaluation(evaluationId: string, accessToken?: string): Promise<any> {
    return restApiUtil.post(`/skill_evaluation/evaluations/${evaluationId}/public_register/`, {}, {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : undefined
    });
  },

  async checkRegistration(evaluationId: string, email: string): Promise<{ registered: boolean }> {
    return restApiUtil.post(`/skill_evaluation/evaluations/${evaluationId}/check_registration/`, { email });
  },

  async getWorkspaceData(evaluationId: string): Promise<any> {
    const [evalData, allLabs] = await Promise.all([
      restApiAuthUtil.get(`/skill_evaluation/evaluations/${evaluationId}/`),
      restApiUtil.get(`/skill_evaluation/lab-questions/`).catch(() => [])
    ]);

    if ((evalData as any).sections) {
      (evalData as any).sections.forEach((sec: any) => {
        if (sec.type === 'LAB' && sec.questions) {
          sec.questions.forEach((q: any) => {
            const fullLab = (allLabs as any[]).find(l => l.id === q.id);
            if (fullLab && fullLab.tasks && fullLab.tasks.length > 0) {
              q.tasks = fullLab.tasks;
            }
          });
        }
      });
    }

    return evalData;
  }
};
