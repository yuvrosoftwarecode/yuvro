import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:8001/api';

export interface UserSubmission {
  id: string;
  user: string;
  user_details?: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  assessment_type: 'contest' | 'mock_interview' | 'job_test' | 'skill_test';
  assessment_id: string;
  assessment_title: string;
  status: 'started' | 'in_progress' | 'completed' | 'submitted' | 'evaluated' | 'cancelled';
  started_at: string;
  submitted_at?: string;
  completed_at?: string;
  time_spent: number;
  user_solutions: Record<string, any>;
  question_scores: Record<string, number>;
  total_score?: number;
  max_possible_score?: number;
  percentage_score?: number;
  technical_score?: number;
  aptitude_score?: number;
  coding_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
  proctoring_events: any[];
  browser_info: Record<string, any>;
  ip_address?: string;
  user_agent: string;
  evaluator_feedback: string;
  auto_evaluation_results: Record<string, any>;
  manual_evaluation_required: boolean;
  proctoring_summary: {
    total_events: number;
    tab_switches: number;
    window_focus_lost: number;
    copy_paste_attempts: number;
    suspicious_activities: number;
    is_suspicious: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateUserSubmissionData {
  assessment_type: 'contest' | 'mock_interview' | 'job_test' | 'skill_test';
  assessment_id: string;
  assessment_title: string;
  browser_info: Record<string, any>;
  ip_address?: string;
  user_agent: string;
}

export interface UpdateUserSubmissionData {
  status?: 'started' | 'in_progress' | 'completed' | 'submitted' | 'evaluated' | 'cancelled';
  user_solutions?: Record<string, any>;
  question_scores?: Record<string, number>;
  total_score?: number;
  max_possible_score?: number;
  technical_score?: number;
  aptitude_score?: number;
  coding_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
  time_spent?: number;
  submitted_at?: string;
  completed_at?: string;
}

export interface ProctorEventData {
  event_type: string;
  description: string;
}

class UserSubmissionService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllSubmissions(): Promise<UserSubmission[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      throw error;
    }
  }

  async getSubmission(id: string): Promise<UserSubmission> {
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/${id}/`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching submission:', error);
      throw error;
    }
  }

  async createSubmission(data: CreateUserSubmissionData): Promise<UserSubmission> {
    try {
      const response = await axios.post(`${API_BASE_URL}/submissions/`, data, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  }

  async updateSubmission(id: string, data: UpdateUserSubmissionData): Promise<UserSubmission> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/submissions/${id}/`, data, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  }

  async deleteSubmission(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/submissions/${id}/`, {
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  }

  async addProctorEvent(id: string, eventData: ProctorEventData): Promise<UserSubmission> {
    try {
      const response = await axios.post(`${API_BASE_URL}/submissions/${id}/add_proctoring_event/`, eventData, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error adding proctor event:', error);
      throw error;
    }
  }

  async submitSubmission(id: string, submissionData: {
    user_solutions?: Record<string, any>;
    total_score?: number;
    time_spent?: number;
  }): Promise<UserSubmission> {
    try {
      const response = await axios.post(`${API_BASE_URL}/submissions/${id}/submit/`, submissionData, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting submission:', error);
      throw error;
    }
  }

  async getMySubmissions(assessmentType?: string): Promise<UserSubmission[]> {
    try {
      const params = assessmentType ? { assessment_type: assessmentType } : {};
      const response = await axios.get(`${API_BASE_URL}/submissions/my_submissions/`, {
        headers: this.getAuthHeaders(),
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching my submissions:', error);
      throw error;
    }
  }

  async getSuspiciousSubmissions(): Promise<UserSubmission[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/suspicious_submissions/`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching suspicious submissions:', error);
      throw error;
    }
  }

  async getSubmissionsByAssessment(assessmentType: string, assessmentId: string): Promise<UserSubmission[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/`, {
        headers: this.getAuthHeaders(),
        params: {
          assessment_type: assessmentType,
          assessment_id: assessmentId,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching submissions by assessment:', error);
      throw error;
    }
  }

  // Helper methods for proctoring
  async recordTabSwitch(submissionId: string): Promise<void> {
    await this.addProctorEvent(submissionId, {
      event_type: 'tab_switch',
      description: 'User switched browser tab',
    });
  }

  async recordWindowFocusLost(submissionId: string): Promise<void> {
    await this.addProctorEvent(submissionId, {
      event_type: 'window_focus_lost',
      description: 'Browser window lost focus',
    });
  }

  async recordCopyPasteAttempt(submissionId: string): Promise<void> {
    await this.addProctorEvent(submissionId, {
      event_type: 'copy_paste',
      description: 'Copy/paste attempt detected',
    });
  }

  async recordSuspiciousActivity(submissionId: string, description: string): Promise<void> {
    await this.addProctorEvent(submissionId, {
      event_type: 'suspicious_activity',
      description,
    });
  }
}

export const userSubmissionService = new UserSubmissionService();