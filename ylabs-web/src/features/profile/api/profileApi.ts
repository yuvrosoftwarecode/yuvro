import {
  Profile,
  WorkItem,
  ProjectItem,
  EducationItem,
  Resume,
  Connection,
  VerifiedSkill,
  WorkType,
} from "../types";
import authService from "@/services/authService";
import type { User } from "@/lib/auth";
import restApiAuthUtil, { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

const defaultProfile: Profile = {
  id: "",
  username: "",
  firstName: "",
  lastName: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  website: "",
  about: "",
  avatarUrl: "",
  coverUrl: "",
  userSkills: [],
  verifiedSkills: [],
  work: [],
  projects: [],
  education: [],
  resume: undefined,
  connections: [
    { platform: "github", handle: "", connected: false },
    { platform: "linkedin", handle: "", connected: false },
  ],
};

function mapBackendEducation(items: any[]): EducationItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((e, idx) => ({
    id: String(e.id || `edu-${idx + 1}`),
    school: e.school || e.institution || "",
    degree: e.degree || "",
    field: e.field || e.fieldOfStudy || "",
    startYear: e.startYear ? Number(e.startYear) : (e.start_year ? Number(e.start_year) : undefined),
    endYear: e.endYear ? Number(e.endYear) : (e.end_year ? Number(e.end_year) : undefined),
  }));
}

function mapBackendEmployment(items: any[]): WorkItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((w, idx) => {
    let responsibilities: string[] = [];
    if (Array.isArray(w.responsibilities)) {
      responsibilities = w.responsibilities;
    } else if (typeof w.responsibilities === "string") {
      responsibilities = w.responsibilities
        .split("\n")
        .map((s: string) => s.trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean);
    }

    let technologies: string[] = [];
    if (Array.isArray(w.technologies)) {
      technologies = w.technologies;
    } else if (typeof w.technologies === "string") {
      technologies = w.technologies
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    return {
      id: String(w.id || `work-${idx + 1}`),
      type: (w.type as WorkType) || "Full-time",
      role: w.role || w.title || "",
      company: w.company || "",
      from: w.from || w.start_date || "",
      to: w.to || w.end_date || undefined,
      current: Boolean(w.current || w.is_current),
      responsibilities,
      technologies,
    };
  });
}

function mapBackendProjects(items: any[]): ProjectItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((p, idx) => {
    let bullets: string[] = [];
    if (Array.isArray(p.bullets)) {
      bullets = p.bullets;
    } else if (Array.isArray(p.responsibilities)) {
      bullets = p.responsibilities;
    } else if (typeof p.bullets === "string") {
      bullets = p.bullets
        .split("\n")
        .map((s: string) => s.trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean);
    }

    let technologies: string[] = [];
    if (Array.isArray(p.technologies)) {
      technologies = p.technologies;
    } else if (typeof p.technologies === "string") {
      technologies = p.technologies
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    return {
      id: String(p.id || `proj-${idx + 1}`),
      name: p.name || p.title || "",
      role: p.role || "",
      from: p.from || "",
      to: p.to || undefined,
      ongoing: Boolean(p.ongoing),
      bullets,
      technologies,
      link: p.link || "",
    };
  });
}

async function fetchRealVerifiedSkills(): Promise<VerifiedSkill[]> {
  try {
    const [submissionsRes, labsRes] = await Promise.allSettled([
      restApiAuthUtil.get<any[]>("/lab/submissions/"),
      restApiAuthUtil.get<any[]>("/lab/labs/"),
    ]);

    const submissions =
      submissionsRes.status === "fulfilled" && Array.isArray(submissionsRes.value)
        ? submissionsRes.value
        : [];
    const labsList =
      labsRes.status === "fulfilled"
        ? Array.isArray(labsRes.value)
          ? labsRes.value
          : (labsRes.value as any)?.results || []
        : [];

    const labMap = new Map<string, string>();
    labsList.forEach((l: any) => {
      if (l.id) labMap.set(String(l.id), l.title || l.name || "Engineering Lab");
    });

    // Count solved tickets per lab
    const countPerLab: Record<string, number> = {};
    submissions.forEach((s: any) => {
      if (s.ticket_status === "done" || s.ticket_status === "in_review") {
        const labId = String(
          s.lab_sprint_ticket?.sprint?.lab ||
          s.lab_sprint_ticket?.lab ||
          s.lab_id ||
          s.lab ||
          "core"
        );
        countPerLab[labId] = (countPerLab[labId] || 0) + 1;
      }
    });

    const verified: VerifiedSkill[] = [];
    Object.entries(countPerLab).forEach(([labId, count]) => {
      if (count > 0) {
        const labName = labMap.get(labId) || `Engineering Lab #${labId}`;
        const level = count >= 15 ? "Advanced" : count >= 5 ? "Intermediate" : "Beginner";
        verified.push({
          id: `vs-${labId}`,
          name: labName,
          level,
          tasksCount: count,
        });
      }
    });

    return verified;
  } catch {
    return [];
  }
}

export interface ProfileApi {
  getProfile(): Promise<Profile>;
  getDefaultProfile(): Profile;
  updateProfile(updates: Partial<Profile>): Promise<Profile>;
  // Images
  uploadAvatar(file: File): Promise<string>;
  removeAvatar(): Promise<void>;
  uploadCover(file: File): Promise<string>;
  removeCover(): Promise<void>;
  // Work
  addWorkItem(item: Omit<WorkItem, "id">): Promise<WorkItem>;
  updateWorkItem(id: string, updates: Partial<WorkItem>): Promise<WorkItem>;
  deleteWorkItem(id: string): Promise<void>;
  // Projects
  addProjectItem(item: Omit<ProjectItem, "id">): Promise<ProjectItem>;
  updateProjectItem(id: string, updates: Partial<ProjectItem>): Promise<ProjectItem>;
  deleteProjectItem(id: string): Promise<void>;
  // Education
  addEducationItem(item: Omit<EducationItem, "id">): Promise<EducationItem>;
  updateEducationItem(id: string, updates: Partial<EducationItem>): Promise<EducationItem>;
  deleteEducationItem(id: string): Promise<void>;
  // Skills
  addUserSkill(skill: string): Promise<string[]>;
  removeUserSkill(skill: string): Promise<string[]>;
  // Resume
  uploadResume(file: File): Promise<Resume>;
  removeResume(): Promise<void>;
  // Connections
  updateConnection(platform: "github" | "linkedin", handle: string, connected: boolean): Promise<Connection>;
}

export const profileApi: ProfileApi = {
  getDefaultProfile(): Profile {
    return { ...defaultProfile };
  },

  async getProfile(): Promise<Profile> {
    let user: User | null = null;
    try {
      user = await authService.getCurrentUser();
    } catch (err) {
      console.error("Failed to load user from authService:", err);
    }

    if (!user) {
      return { ...defaultProfile };
    }

    const verifiedSkills = await fetchRealVerifiedSkills();

    const resume: Resume | undefined = user.resume_file
      ? {
          id: `res-${user.id}`,
          fileName: decodeURIComponent(
            user.resume_file.split("/").pop()?.split("?")[0] || "Resume.pdf"
          ),
          fileSize: 1024 * 512,
          uploadedAt: new Date().toISOString(),
          url: user.resume_file,
        }
      : undefined;

    const connections: Connection[] = [
      {
        platform: "github",
        handle: user.github_username || "",
        connected: Boolean(user.github_connected),
      },
      {
        platform: "linkedin",
        handle: user.linkedin_name || "",
        connected: Boolean(user.linkedin_connected),
      },
    ];

    const backendWork = mapBackendEmployment(user.employment || []);
    const backendEducation = mapBackendEducation(user.education || []);
    const backendProjects = mapBackendProjects(user.projects || []);
    const backendSkills = Array.isArray(user.skills) ? user.skills : [];

    return {
      id: user.id || "",
      username: user.username || user.email?.split("@")[0] || "",
      firstName: user.first_name || (user as any).name?.split(" ")[0] || "",
      lastName: user.last_name || (user as any).name?.split(" ").slice(1).join(" ") || "",
      headline: user.headline || "",
      location: user.location || "",
      email: user.email || "",
      phone: user.phone || "",
      website: user.website || "",
      about: user.about || user.profile?.about || "",
      avatarUrl: user.profile_image || user.profile?.avatar || "",
      coverUrl: user.cover_image || "",
      userSkills: backendSkills,
      verifiedSkills,
      work: backendWork,
      projects: backendProjects,
      education: backendEducation,
      resume,
      connections,
    };
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const backendPayload: Record<string, any> = {};
    if (updates.firstName !== undefined) backendPayload.first_name = updates.firstName;
    if (updates.lastName !== undefined) backendPayload.last_name = updates.lastName;
    if (updates.username !== undefined) backendPayload.username = updates.username;
    if (updates.phone !== undefined) backendPayload.phone = updates.phone;
    if (updates.location !== undefined) backendPayload.location = updates.location;
    if (updates.website !== undefined) backendPayload.website = updates.website;
    if (updates.about !== undefined) backendPayload.about = updates.about;
    if (updates.headline !== undefined) backendPayload.headline = updates.headline;
    if (updates.work !== undefined) backendPayload.employment = updates.work;
    if (updates.education !== undefined) backendPayload.education = updates.education;
    if (updates.projects !== undefined) backendPayload.projects = updates.projects;
    if (updates.userSkills !== undefined) backendPayload.skills = updates.userSkills;

    if (Object.keys(backendPayload).length > 0) {
      await authService.updateUser(backendPayload);
    }

    return await this.getProfile();
  },

  async uploadAvatar(file: File): Promise<string> {
    const updatedUser = await authService.uploadProfileImage(file, "profile_image");
    return updatedUser.profile_image || "";
  },

  async removeAvatar(): Promise<void> {
    await authService.removeProfileImage("profile_image");
  },

  async uploadCover(file: File): Promise<string> {
    const updatedUser = await authService.uploadProfileImage(file, "cover_image");
    return updatedUser.cover_image || "";
  },

  async removeCover(): Promise<void> {
    await authService.removeProfileImage("cover_image");
  },

  async addWorkItem(item: Omit<WorkItem, "id">): Promise<WorkItem> {
    const profile = await this.getProfile();
    const newItem: WorkItem = {
      ...item,
      id: `work-${Date.now()}`,
    };
    const updatedWork = [newItem, ...profile.work];
    await this.updateProfile({ work: updatedWork });
    return newItem;
  },

  async updateWorkItem(id: string, updates: Partial<WorkItem>): Promise<WorkItem> {
    const profile = await this.getProfile();
    const idx = profile.work.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error("Work experience item not found");
    const updated = { ...profile.work[idx], ...updates };
    const updatedWork = profile.work.map((w) => (w.id === id ? updated : w));
    await this.updateProfile({ work: updatedWork });
    return updated;
  },

  async deleteWorkItem(id: string): Promise<void> {
    const profile = await this.getProfile();
    const updatedWork = profile.work.filter((w) => w.id !== id);
    await this.updateProfile({ work: updatedWork });
  },

  async addProjectItem(item: Omit<ProjectItem, "id">): Promise<ProjectItem> {
    const profile = await this.getProfile();
    const newItem: ProjectItem = {
      ...item,
      id: `proj-${Date.now()}`,
    };
    const updatedProjects = [newItem, ...profile.projects];
    await this.updateProfile({ projects: updatedProjects });
    return newItem;
  },

  async updateProjectItem(id: string, updates: Partial<ProjectItem>): Promise<ProjectItem> {
    const profile = await this.getProfile();
    const idx = profile.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Project not found");
    const updated = { ...profile.projects[idx], ...updates };
    const updatedProjects = profile.projects.map((p) => (p.id === id ? updated : p));
    await this.updateProfile({ projects: updatedProjects });
    return updated;
  },

  async deleteProjectItem(id: string): Promise<void> {
    const profile = await this.getProfile();
    const updatedProjects = profile.projects.filter((p) => p.id !== id);
    await this.updateProfile({ projects: updatedProjects });
  },

  async addEducationItem(item: Omit<EducationItem, "id">): Promise<EducationItem> {
    const profile = await this.getProfile();
    const newItem: EducationItem = {
      ...item,
      id: `edu-${Date.now()}`,
    };
    const updatedEducation = [newItem, ...profile.education];
    await this.updateProfile({ education: updatedEducation });
    return newItem;
  },

  async updateEducationItem(id: string, updates: Partial<EducationItem>): Promise<EducationItem> {
    const profile = await this.getProfile();
    const idx = profile.education.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Education item not found");
    const updated = { ...profile.education[idx], ...updates };
    const updatedEducation = profile.education.map((e) => (e.id === id ? updated : e));
    await this.updateProfile({ education: updatedEducation });
    return updated;
  },

  async deleteEducationItem(id: string): Promise<void> {
    const profile = await this.getProfile();
    const updatedEducation = profile.education.filter((e) => e.id !== id);
    await this.updateProfile({ education: updatedEducation });
  },

  async addUserSkill(skill: string): Promise<string[]> {
    const profile = await this.getProfile();
    if (!profile.userSkills.includes(skill)) {
      const updated = [...profile.userSkills, skill];
      await this.updateProfile({ userSkills: updated });
      return updated;
    }
    return profile.userSkills;
  },

  async removeUserSkill(skill: string): Promise<string[]> {
    const profile = await this.getProfile();
    const updated = profile.userSkills.filter((s) => s !== skill);
    await this.updateProfile({ userSkills: updated });
    return updated;
  },

  async uploadResume(file: File): Promise<Resume> {
    const updatedUser = await authService.uploadResume(file);
    const resumeUrl = updatedUser.resume_file || "";
    return {
      id: `res-${updatedUser.id || Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      url: resumeUrl,
    };
  },

  async removeResume(): Promise<void> {
    await authService.removeResume();
  },

  async updateConnection(
    platform: "github" | "linkedin",
    handle: string,
    connected: boolean
  ): Promise<Connection> {
    if (!connected) {
      if (platform === "github") {
        try {
          await yhubApiAuthUtil.delete("/auth/github/connect/");
        } catch {}
      }
    }

    return {
      platform,
      handle,
      connected,
    };
  },
};
