import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Company {
  id: string;
  name: string;
  description: string;
  logo?: string;
  roles?: Role[];
}

export interface Role {
  id: string;
  company: string; // Foreign key ID
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  required_skills: string[];
}

export interface Topic {
  id: string;
  name: string;
  category: 'Technical' | 'Behavioral' | 'Core Subjects';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question_count: number;
}

export interface PrepTimeline {
  id: string;
  days: number;
}

export interface StudyTime {
  id: string;
  hours: number;
}

export interface StudentPlan {
  id: string;
  company: string;
  role: string;
  duration_days: number;
  daily_hours: number;
  status: 'Active' | 'Completed' | 'Paused';
  progress_percentage: number;
  company_name: string;
  role_title: string;
  created_at: string;
}

export interface StudentPlanTask {
  id: string;
  plan: string;
  day_number: number;
  title: string;
  task_type: 'Topic' | 'Test' | 'Mock';
  reference_id?: string;
  is_completed: boolean;
}

// --- API Service Functions ---

const BASE_PATH = '/ai-interview-planner';

export const fetchPrepTimelines = async (): Promise<PrepTimeline[]> => {
  return await restApiAuthUtil.get<PrepTimeline[]>(`${BASE_PATH}/prep-timelines/`);
};

export const createPrepTimeline = async (data: { days: number }): Promise<PrepTimeline> => {
  return await restApiAuthUtil.post<PrepTimeline>(`${BASE_PATH}/prep-timelines/`, data);
};

export const deletePrepTimeline = async (id: string): Promise<void> => {
  await restApiAuthUtil.delete(`${BASE_PATH}/prep-timelines/${id}/`);
};

export const fetchStudyTimes = async (): Promise<StudyTime[]> => {
  return await restApiAuthUtil.get<StudyTime[]>(`${BASE_PATH}/study-times/`);
};

export const createStudyTime = async (data: { hours: number }): Promise<StudyTime> => {
  return await restApiAuthUtil.post<StudyTime>(`${BASE_PATH}/study-times/`, data);
};

export const deleteStudyTime = async (id: string): Promise<void> => {
  await restApiAuthUtil.delete(`${BASE_PATH}/study-times/${id}/`);
};

export const fetchStudentPlans = async (): Promise<StudentPlan[]> => {
  return await restApiAuthUtil.get<StudentPlan[]>(`${BASE_PATH}/student-plans/`);
};

export const createStudentPlan = async (data: Partial<StudentPlan>): Promise<StudentPlan> => {
  return await restApiAuthUtil.post<StudentPlan>(`${BASE_PATH}/student-plans/`, data);
};

export const deleteStudentPlan = async (planId: string): Promise<void> => {
  await restApiAuthUtil.delete(`${BASE_PATH}/student-plans/${planId}/`);
};

export const fetchPlanTasks = async (planId: string): Promise<StudentPlanTask[]> => {
  return await restApiAuthUtil.get<StudentPlanTask[]>(`${BASE_PATH}/student-tasks/`, { params: { plan: planId } });
};

export const updateTaskStatus = async (taskId: string, isCompleted: boolean): Promise<StudentPlanTask> => {
  return await restApiAuthUtil.patch<StudentPlanTask>(`${BASE_PATH}/student-tasks/${taskId}/`, { is_completed: isCompleted });
};

export const fetchCompanies = async (): Promise<Company[]> => {
  return await restApiAuthUtil.get<Company[]>(`${BASE_PATH}/companies/`);
};

export const createCompany = async (data: Partial<Company>): Promise<Company> => {
  return await restApiAuthUtil.post<Company>(`${BASE_PATH}/companies/`, data);
};

export const updateCompany = async (id: string, data: Partial<Company>): Promise<Company> => {
  return await restApiAuthUtil.put<Company>(`${BASE_PATH}/companies/${id}/`, data);
};

export const deleteCompany = async (id: string): Promise<void> => {
  await restApiAuthUtil.delete(`${BASE_PATH}/companies/${id}/`);
};

export const fetchRoles = async (companyId?: string): Promise<Role[]> => {
  const params: Record<string, string> = {};
  if (companyId) {
    params.companyId = companyId;
  }
  return await restApiAuthUtil.get<Role[]>(`${BASE_PATH}/roles/`, { params });
};

export const createRole = async (data: Partial<Role>): Promise<Role> => {
  return await restApiAuthUtil.post<Role>(`${BASE_PATH}/roles/`, data);
};

export const fetchTopics = async (): Promise<Topic[]> => {
  return await restApiAuthUtil.get<Topic[]>(`${BASE_PATH}/topics/`);
};

export const createTopic = async (data: Partial<Topic>): Promise<Topic> => {
  return await restApiAuthUtil.post<Topic>(`${BASE_PATH}/topics/`, data);
};

export const updateTopic = async (id: string, data: Partial<Topic>): Promise<Topic> => {
  return await restApiAuthUtil.put<Topic>(`${BASE_PATH}/topics/${id}/`, data);
};

export const deleteTopic = async (id: string): Promise<void> => {
  await restApiAuthUtil.delete(`${BASE_PATH}/topics/${id}/`);
};




