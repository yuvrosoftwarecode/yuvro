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




