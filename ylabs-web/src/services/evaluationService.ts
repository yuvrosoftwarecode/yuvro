import { restApiUtil, yhubApiUtil } from '../utils/RestApiUtil';

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
  }
};
