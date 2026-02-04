import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface SocialLinks {
  id: string;
  github?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  email?: string | null;
  website?: string | null;
}

export interface Skill {
  id: string;
  name: string;
  level: string;
  percentage: number;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  duration: string;
  description_list: string[];
  technologies: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  role: string;
  tech_stack: string[];
  github_link?: string | null;
  live_link?: string | null;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  duration: string;
  cgpa?: string | null;
  start_year?: number | null;
  end_year?: number | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  completion_date: string;
  certificate_file?: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  title: string | null;
  location: string | null;
  about: string | null;
  gender: string | null;
  profile_image?: string | null;
  cover_image?: string | null;
  google_id?: string | null;
  links: SocialLinks;
  skills: Skill[];
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];
  created_at: string;
  updated_at: string;
}

export interface EditProfileData {
  first_name: string;
  last_name: string;
  title: string;
  location: string;
  about: string;
}

export const fetchProfileDetail = async (): Promise<Profile> => {
  return restApiAuthUtil.get<Profile>('/auth/profile/detail/');
};

export const updateProfileDetail = async (payload: any): Promise<Profile> => {
  return restApiAuthUtil.patch<Profile>('/auth/profile/detail/', payload);
};

export const updateSocialLinks = async (payload: Partial<SocialLinks>) => {
  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([_, value]) => value && value.trim() !== "")
  );
  return restApiAuthUtil.patch('/jobs/profile/links/', cleanedPayload);
};

export const addSkill = async (payload: Partial<Skill>) => {
  return restApiAuthUtil.post('/jobs/skills/add/', payload);
};

export const updateSkill = async (id: string, payload: Partial<Skill>) => {
  return restApiAuthUtil.patch(`/jobs/skills/${id}/`, payload);
};

export const deleteSkill = async (id: string) => {
  await restApiAuthUtil.delete(`/jobs/skills/${id}/`);
  return true;
};

export const addExperience = async (payload: Partial<Experience>) => {
  return restApiAuthUtil.post('/jobs/experience/add/', payload);
};

export const updateExperience = async (id: string, payload: Partial<Experience>) => {
  return restApiAuthUtil.patch(`/jobs/experience/${id}/`, payload);
};

export const deleteExperience = async (id: string) => {
  await restApiAuthUtil.delete(`/jobs/experience/${id}/`);
  return true;
};

export const addProject = async (payload: Partial<Project>) => {
  return restApiAuthUtil.post('/jobs/projects/add/', payload);
};

export const updateProject = async (id: string, payload: Partial<Project>) => {
  return restApiAuthUtil.patch(`/jobs/projects/${id}/`, payload);
};

export const deleteProject = async (id: string) => {
  await restApiAuthUtil.delete(`/jobs/projects/${id}/`);
  return true;
};

export const addEducation = async (payload: Partial<Education>) => {
  return restApiAuthUtil.post('/jobs/education/add/', payload);
};

export const updateEducation = async (id: string, payload: Partial<Education>) => {
  return restApiAuthUtil.patch(`/jobs/education/${id}/`, payload);
};

export const deleteEducation = async (id: string) => {
  await restApiAuthUtil.delete(`/jobs/education/${id}/`);
  return true;
};

export const addCertification = async (payload: Partial<Certification>) => {
  return restApiAuthUtil.post('/jobs/certification/add/', payload);
};

export const updateCertification = async (id: string, payload: Partial<Certification>) => {
  return restApiAuthUtil.patch(`/jobs/certification/${id}/`, payload);
};

export const deleteCertification = async (id: string) => {
  await restApiAuthUtil.delete(`/jobs/certification/${id}/`);
  return true;
};

export async function updateProfile(data: EditProfileData) {
  const userRes = await restApiAuthUtil.patch('/auth/profile/', {
    first_name: data.first_name,
    last_name: data.last_name,
  });

  const profileRes = await restApiAuthUtil.patch('/auth/profile/detail/', {
    title: data.title,
    location: data.location,
    about: data.about,
  });

  return {
    ...profileRes,
    first_name: userRes.first_name,
    last_name: userRes.last_name,
  };
}

const profileService = {
  fetchProfileDetail,
  updateProfileDetail,
  updateProfile,
  updateSocialLinks,
  addSkill,
  updateSkill,
  deleteSkill,
  addExperience,
  updateExperience,
  deleteExperience,
  addProject,
  updateProject,
  deleteProject,
  addEducation,
  updateEducation,
  deleteEducation,
  addCertification,
  updateCertification,
  deleteCertification,
};

export default profileService;