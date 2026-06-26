import { restApiAuthUtil } from '@/utils/RestApiAuthUtil';

class AIMockInterviewService {
  async uploadResume(jdText: string, resumeText: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>('/assessment/mock-interview/submissions/upload_resume/', {
        jd_text: jdText,
        resume_text: resumeText,
      });
      return response;
    } catch (error) {
      console.error('Error uploading/analyzing resume text:', error);
      throw error;
    }
  }

  async uploadResumePdf(jdText: string, resumeFile: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('jd_text', jdText);
      formData.append('resume', resumeFile);

      const response = await restApiAuthUtil.post<any>('/assessment/mock-interview/submissions/upload_resume_pdf/', formData);
      return response;
    } catch (error) {
      console.error('Error uploading/analyzing resume PDF:', error);
      throw error;
    }
  }

  async startInterview(
    analysis: any,
    difficulty: string = 'medium',
    numQuestions: number = 5,
    adaptive: boolean = false,
    jdText: string = '',
    resumeText: string = ''
  ): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>('/assessment/mock-interview/submissions/start_interview/', {
        analysis,
        difficulty,
        num_questions: numQuestions,
        adaptive,
        jd_text: jdText,
        resume_text: resumeText,
      });
      return response;
    } catch (error) {
      console.error('Error starting custom interview:', error);
      throw error;
    }
  }

  async nextQuestion(submissionId: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interview/submissions/${submissionId}/next_question/`, {});
      return response;
    } catch (error) {
      console.error('Error fetching next question:', error);
      throw error;
    }
  }

  async submitAnswer(
    submissionId: string,
    questionId: number,
    answer: string,
    answerDurationSeconds?: number
  ): Promise<any> {
    try {
      const payload: any = {
        question_id: questionId,
        answer,
      };
      if (answerDurationSeconds !== undefined) {
        payload.answer_duration_seconds = answerDurationSeconds;
      }
      const response = await restApiAuthUtil.post<any>(
        `/assessment/mock-interview/submissions/${submissionId}/submit_answer/`,
        payload
      );
      return response;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  async getHint(submissionId: string, questionId: number, partialAnswer: string = ''): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interview/submissions/${submissionId}/get_hint/`, {
        question_id: questionId,
        partial_answer: partialAnswer,
      });
      return response;
    } catch (error) {
      console.error('Error getting hint:', error);
      throw error;
    }
  }

  async interviewCue(
    submissionId: string,
    data: {
      event_type: string;
      silence_seconds?: number;
      answer_duration_seconds?: number;
      partial_answer?: string;
    }
  ): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>(
        `/assessment/mock-interview/submissions/${submissionId}/interview_cue/`,
        data
      );
      return response;
    } catch (error) {
      console.error('Error posting interview cue:', error);
      throw error;
    }
  }

  async faceEnroll(submissionId: string, imageB64: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interview/submissions/${submissionId}/face_enroll/`, {
        image: imageB64,
      });
      return response;
    } catch (error) {
      console.error('Error enrolling face:', error);
      throw error;
    }
  }

  async faceVerify(submissionId: string, imageB64: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interview/submissions/${submissionId}/face_verify/`, {
        image: imageB64,
      });
      return response;
    } catch (error) {
      console.error('Error verifying face:', error);
      throw error;
    }
  }

  async generateReport(submissionId: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interview/submissions/${submissionId}/generate_report/`, {});
      return response;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async getSubmission(submissionId: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.get<any>(`/assessment/mock-interview/submissions/${submissionId}/`);
      return response;
    } catch (error) {
      console.error('Error fetching submission:', error);
      throw error;
    }
  }
  async getCustomSubmissions(): Promise<any[]> {
    try {
      const response = await restApiAuthUtil.get<any[]>('/assessment/mock-interview/submissions/');
      return response.filter((sub: any) => !sub.mock_interview);
    } catch (error) {
      console.error('Error fetching custom submissions:', error);
      return [];
    }
  }
}

export const aiMockInterviewService = new AIMockInterviewService();
