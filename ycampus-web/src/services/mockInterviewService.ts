import { restApiAuthUtil } from '@/utils/RestApiAuthUtil';

export interface MockInterview {
  id: string;
  title: string;
  description: string;
  instructions: string;
  max_duration: number;

  // AI Config
  ai_generation_mode: 'full_ai' | 'mixed' | 'predefined';
  ai_percentage: number;
  ai_verbal_question_count: number;
  ai_coding_question_count: number;

  // Voice Config
  voice_type: 'junnu' | 'munnu';
  interviewer_name: string;
  interviewer_voice_id: string;
  voice_speed: number;
  audio_settings: any;

  // Skills
  required_skills: string[];
  optional_skills: string[];

  // Publishing & Questions
  publish_status: 'draft' | 'active' | 'inactive' | 'archived';
  questions_config: any;
  questions_random_config: any;

  created_at: string;
  updated_at: string;
}

export interface CreateMockInterviewData {
  title: string;
  description: string;
  instructions: string;
  max_duration: number;

  ai_generation_mode: 'full_ai' | 'mixed' | 'predefined';
  ai_verbal_question_count: number;
  ai_coding_question_count: number;

  voice_type: 'junnu' | 'munnu';
  interviewer_name: string;
  interviewer_voice_id: string;
  voice_speed: number;
  audio_settings?: any;

  required_skills: string[];
  optional_skills: string[];

  publish_status: 'draft' | 'active' | 'inactive' | 'archived';
  questions_config?: any;
  questions_random_config?: any;
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

  async startInterview(id: string, experience_level: string, selected_duration: number, resume?: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('experience_level', experience_level);
      formData.append('selected_duration', selected_duration.toString());
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
}

export const mockInterviewService = new MockInterviewService();