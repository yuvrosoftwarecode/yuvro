import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface CandidateSearchFilters {
  skills?: string;
  keywords?: string;
  experience_from?: number;
  experience_to?: number;
  location?: string;
  ctc_from?: number;
  ctc_to?: number;
  notice_period?: string[];
  education?: string;
  domain?: string;
  employment_type?: string[];
  company_type?: string;
  active_in_days?: number;
  page?: number;
  page_size?: number;
}

export interface CandidateSkill {
  skill_name: string;
  proficiency: string;
  years_of_experience: number;
}

export interface CandidateExperience {
  company: string;
  role: string;
  duration: string;
  description_list: string[];
  technologies: string[];
}

export interface CandidateEducation {
  institution: string;
  degree: string;
  field: string;
  duration: string;
  cgpa?: string;
  start_year?: number;
  end_year?: number;
}

export interface CandidateProject {
  title: string;
  description: string;
  role: string;
  tech_stack: string[];
  github_link?: string;
  live_link?: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  title?: string;
  location?: string;
  about?: string;
  user: {
    id: string;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
  profile?: {
    id?: string;
    profile_image?: string;
    cover_image?: string;
    full_name?: string;
    title?: string;
    location?: string;
    about?: string;
    gender?: string;
    skills?: CandidateSkill[];
    experiences?: CandidateExperience[];
    education?: CandidateEducation[];
    projects?: CandidateProject[];
    certifications?: any[];
    links?: {
      github?: string;
      linkedin?: string;
      portfolio?: string;
      email?: string;
      website?: string;
    };
    created_at?: string;
    updated_at?: string;
  };
  job_skills: {
    skill_name: string;
    proficiency: string;
    years_of_experience: number;
  }[];
  current_ctc?: number;
  expected_ctc?: number;
  currency: string;
  total_experience_years: number;
  total_experience_months: number;
  total_experience_in_years: number;
  notice_period: string;
  available_from?: string;
  preferred_employment_types: string[];
  preferred_locations: string[];
  open_to_remote: boolean;
  highest_education?: string;
  domain?: string;
  preferred_company_types: string[];
  last_active: string;
  is_actively_looking: boolean;
  resume_file?: string;
  skills_list: string[];
  experience_companies: string[];
  created_at: string;
  updated_at: string;
}

export interface CandidateSearchResult {
  candidates: Candidate[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface CandidateStats {
  total_candidates: number;
  active_candidates_7_days: number;
  active_candidates_30_days: number;
  recent_searches: number;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  notice_periods: FilterOption[];
  education_levels: FilterOption[];
  employment_types: FilterOption[];
  company_types: FilterOption[];
  popular_skills: string[];
  popular_locations: string[];
  popular_domains: string[];
}

export const candidateService = {
  async healthCheck(): Promise<any> {
    return restApiAuthUtil.get('/jobs/candidates/job-profiles/health/');
  },

  async searchCandidates(filters: CandidateSearchFilters): Promise<CandidateSearchResult> {
    return restApiAuthUtil.post('/jobs/candidates/job-profiles/search/', filters);
  },

  async getStats(): Promise<CandidateStats> {
    return restApiAuthUtil.get('/jobs/candidates/job-profiles/stats/');
  },

  async getFilterOptions(): Promise<FilterOptions> {
    return restApiAuthUtil.get('/jobs/candidates/job-profiles/filter-options/');
  },

  async getCandidate(candidateId: string): Promise<Candidate> {
    return restApiAuthUtil.get(`/jobs/candidates/job-profiles/${candidateId}/`);
  },

  async getAllCandidates(): Promise<Candidate[]> {
    return restApiAuthUtil.get('/jobs/candidates/job-profiles/');
  }
};

export default candidateService;