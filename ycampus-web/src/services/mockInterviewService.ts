import { restApiAuthUtil } from '@/utils/RestApiAuthUtil';

export interface MockInterview {
  id: string;
  title: string;
  description: string;
  instructions: string;
  max_duration: number;

  required_skills: string[];
  optional_skills: string[];

  publish_status: 'draft' | 'active' | 'inactive' | 'archived';
  predefined_tree?: any[];

  created_at: string;
  updated_at: string;
}

export interface CreateMockInterviewData {
  title: string;
  description: string;
  instructions: string;
  max_duration: number;

  required_skills: string[];
  optional_skills: string[];

  publish_status: 'draft' | 'active' | 'inactive' | 'archived';
  predefined_tree?: any[];
}

export interface CompleteMockInterviewData {
  feedback?: string;
  notes?: string;
  // Add other result fields if needed
}

class MockInterviewService {

  async getAllMockInterviews(): Promise<MockInterview[]> {
    try {
      const response = await restApiAuthUtil.get<any[]>('/assessment/mock-interviews/');
      return response;
    } catch (error) {
      console.error('Error fetching mock interviews:', error);
      throw error;
    }
  }

  // Compatibility method for existing code
  async getMockInterviews(): Promise<MockInterview[]> {
    return this.getAllMockInterviews();
  }

  async getMockInterview(id: string): Promise<MockInterview> {
    try {
      const response = await restApiAuthUtil.get<any>(`/assessment/mock-interviews/${id}/`);
      return response;
    } catch (error) {
      console.error('Error fetching mock interview:', error);
      throw error;
    }
  }

  async createMockInterview(data: CreateMockInterviewData): Promise<MockInterview> {
    try {
      const response = await restApiAuthUtil.post<any>('/assessment/mock-interviews/', data);
      return response;
    } catch (error) {
      console.error('Error creating mock interview:', error);
      throw error;
    }
  }

  async updateMockInterview(id: string, data: Partial<CreateMockInterviewData>): Promise<MockInterview> {
    try {
      const response = await restApiAuthUtil.patch<any>(`/assessment/mock-interviews/${id}/`, data);
      return response;
    } catch (error) {
      console.error('Error updating mock interview:', error);
      throw error;
    }
  }

  async deleteMockInterview(id: string): Promise<void> {
    try {
      await restApiAuthUtil.delete<void>(`/assessment/mock-interviews/${id}/`);
    } catch (error) {
      console.error('Error deleting mock interview:', error);
      throw error;
    }
  }

  async getMockInterviewSubmissions(id: string): Promise<any[]> {
    try {
      const response = await restApiAuthUtil.get<any[]>(`/assessment/mock-interviews/${id}/submissions/`);
      return response;
    } catch (error) {
      console.error('Error fetching mock interview submissions:', error);
      throw error;
    }
  }

  async updateMockInterviewSubmission(id: string, data: any): Promise<any> {
    try {
      const response = await restApiAuthUtil.patch<any>(`/assessment/mock-interview/submissions/${id}/`, data);
      return response;
    } catch (error) {
      console.error('Error updating mock interview submission:', error);
      throw error;
    }
  }

  async getSubmissionReport(id: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.get<any>(`/assessment/mock-interview/submissions/${id}/report/`);
      return response;
    } catch (error) {
      console.error('Error fetching submission report:', error);
      throw error;
    }
  }


  async startInterview(id: string, experience_level?: string, selected_duration?: number, resume?: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('experience_level', experience_level || 'beginner');
      formData.append('selected_duration', (selected_duration || 0).toString());
      if (resume) {
        formData.append('resume', resume);
      }

      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interviews/${id}/start_interview/`, formData);
      return response;
    } catch (error) {
      console.error('Error starting interview:', error);
      throw error;
    }
  }

  async getMockInterviewSubmission(id: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.get<any>(`/assessment/mock-interview/submissions/${id}/`);
      return response;
    } catch (error) {
      console.error('Error fetching mock interview submission:', error);
      throw error;
    }
  }

  async getNextQuestion(id: string, interviewSessionId: string, userAnswer: string, status: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interviews/${id}/get_next_question/`, {
        interview_session_id: interviewSessionId,
        user_answer: userAnswer,
        status: status
      });
      return response;
    } catch (error) {
      console.error('Error fetching next question:', error);
      throw error;
    }
  }

  async completeInterview(id: string, data: CompleteMockInterviewData): Promise<MockInterview> {
    try {
      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interviews/${id}/complete_interview/`, data);
      return response;
    } catch (error) {
      console.error('Error completing interview:', error);
      throw error;
    }
  }

  async cancelInterview(id: string): Promise<MockInterview> {
    try {
      const response = await restApiAuthUtil.post<any>(`/assessment/mock-interviews/${id}/cancel_interview/`, {});
      return response;
    } catch (error) {
      console.error('Error cancelling interview:', error);
      throw error;
    }
  }

  async getMyInterviews(): Promise<MockInterview[]> {
    try {
      const response = await restApiAuthUtil.get<any[]>('/assessment/mock-interviews/my_interviews/');
      return response;
    } catch (error) {
      console.error('Error fetching my interviews:', error);
      throw error;
    }
  }

  async getUpcomingInterviews(): Promise<MockInterview[]> {
    try {
      const response = await restApiAuthUtil.get<any[]>('/assessment/mock-interviews/upcoming/');
      return response;
    } catch (error) {
      console.error('Error fetching upcoming interviews:', error);
      throw error;
    }
  }

  async endInterviewSession(sessionId: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.post<any>(`/interviews/${sessionId}/end_interview/`, {});
      return response;
    } catch (error) {
      console.error('Error ending interview session:', error);
      throw error;
    }
  }

  async getInterviewSession(sessionId: string): Promise<any> {
    try {
      const response = await restApiAuthUtil.get<any>(`/interviews/${sessionId}/`);
      return response;
    } catch (error) {
      console.error('Error fetching interview session:', error);
      throw error;
    }
  }

  async getAllInterviewSessions(filters?: any): Promise<any> {
    try {
      const response = await restApiAuthUtil.get<any>('/interviews/', filters);
      return response;
    } catch (error) {
      console.error('Error fetching all interview sessions:', error);
      throw error;
    }
  }

}

export const mockInterviewService = new MockInterviewService();