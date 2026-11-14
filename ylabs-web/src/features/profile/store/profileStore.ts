import { create } from "zustand";
import { Profile, WorkItem, ProjectItem, EducationItem } from "../types";
import { profileApi } from "../api/profileApi";
import { toast } from "@/lib/toastStore";

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchProfile: (force?: boolean) => Promise<void>;
  initFromAuthUser: (authUser: any) => void;
  updateProfileLive: (updates: Partial<Profile>) => void; // for live preview typing in settings
  saveProfile: (updates: Partial<Profile>) => Promise<boolean>;

  // Work CRUD
  addWork: (item: Omit<WorkItem, "id">) => Promise<boolean>;
  updateWork: (id: string, updates: Partial<WorkItem>) => Promise<boolean>;
  deleteWork: (id: string) => Promise<boolean>;

  // Projects CRUD
  addProject: (item: Omit<ProjectItem, "id">) => Promise<boolean>;
  updateProject: (id: string, updates: Partial<ProjectItem>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;

  // Education CRUD
  addEducation: (item: Omit<EducationItem, "id">) => Promise<boolean>;
  updateEducation: (id: string, updates: Partial<EducationItem>) => Promise<boolean>;
  deleteEducation: (id: string) => Promise<boolean>;

  // Skills
  addSkill: (skill: string) => Promise<boolean>;
  removeSkill: (skill: string) => Promise<boolean>;

  // Resume
  uploadResume: (file: File) => Promise<boolean>;
  removeResume: () => Promise<boolean>;

  // Avatar & Cover
  uploadAvatar: (file: File) => Promise<boolean>;
  removeAvatar: () => Promise<boolean>;
  uploadCover: (file: File) => Promise<boolean>;
  removeCover: () => Promise<boolean>;

  // Connections
  setConnection: (platform: "github" | "linkedin", handle: string, connected: boolean) => Promise<boolean>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: true,
  error: null,

  fetchProfile: async (force = false) => {
    if (!force && get().profile && get().profile?.id) return;
    set({ loading: true, error: null });
    try {
      const data = await profileApi.getProfile();
      set({ profile: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load profile", loading: false });
      toast.error("Failed to load profile");
    }
  },

  initFromAuthUser: (authUser: any) => {
    if (!authUser) return;
    set((state) => {
      const current = state.profile || profileApi.getDefaultProfile();
      const updatedWork =
        current.work.length > 0
          ? current.work
          : Array.isArray(authUser.employment)
          ? authUser.employment
          : [];
      const updatedEducation =
        current.education.length > 0
          ? current.education
          : Array.isArray(authUser.education)
          ? authUser.education
          : [];

      return {
        profile: {
          ...current,
          id: authUser.id || current.id,
          firstName: authUser.first_name || authUser.name?.split(" ")[0] || current.firstName,
          lastName: authUser.last_name || authUser.name?.split(" ").slice(1).join(" ") || current.lastName,
          username: authUser.username || authUser.email?.split("@")[0] || current.username,
          headline: authUser.headline !== undefined ? authUser.headline : current.headline,
          email: authUser.email || current.email,
          phone: authUser.phone || current.phone,
          location: authUser.location || current.location,
          website: authUser.website || current.website,
          about: authUser.about || authUser.profile?.about || current.about,
          avatarUrl: authUser.profile_image || authUser.avatar || current.avatarUrl,
          coverUrl: authUser.cover_image || current.coverUrl,
          emailPublic: authUser.email_public !== undefined ? Boolean(authUser.email_public) : current.emailPublic ?? true,
          phonePublic: authUser.phone_public !== undefined ? Boolean(authUser.phone_public) : current.phonePublic ?? false,
          userSkills: Array.isArray(authUser.skills) && authUser.skills.length > 0 ? authUser.skills : current.userSkills,
          projects: Array.isArray(authUser.projects) && authUser.projects.length > 0 ? authUser.projects : current.projects,
          work: updatedWork,
          education: updatedEducation,
          resume:
            current.resume ||
            (authUser.resume_file
              ? {
                  id: `res-${authUser.id || "me"}`,
                  fileName: decodeURIComponent(
                    authUser.resume_file.split("/").pop()?.split("?")[0] || "Resume.pdf"
                  ),
                  fileSize: 1024 * 512,
                  uploadedAt: new Date().toISOString(),
                  url: authUser.resume_file,
                }
              : undefined),
        },
      };
    });
  },

  updateProfileLive: (updates: Partial<Profile>) => {
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    }));
  },

  saveProfile: async (updates: Partial<Profile>) => {
    try {
      const updated = await profileApi.updateProfile(updates);
      set({ profile: updated });
      toast.success("Profile changes saved");
      return true;
    } catch (err: any) {
      if (
        err?.status === 409 ||
        err?.details?.code === "taken" ||
        err?.details?.field === "username" ||
        err?.message?.includes("taken")
      ) {
        throw err;
      }
      toast.error(err.message || "Failed to save profile changes");
      return false;
    }
  },

  addWork: async (item) => {
    try {
      const created = await profileApi.addWorkItem(item);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, work: [created, ...state.profile.work] }
          : null,
      }));
      toast.success("Work experience added");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to add work experience");
      return false;
    }
  },

  updateWork: async (id, updates) => {
    try {
      const updated = await profileApi.updateWorkItem(id, updates);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              work: state.profile.work.map((w) => (w.id === id ? updated : w)),
            }
          : null,
      }));
      toast.success("Work experience updated");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update work experience");
      return false;
    }
  },

  deleteWork: async (id) => {
    try {
      await profileApi.deleteWorkItem(id);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              work: state.profile.work.filter((w) => w.id !== id),
            }
          : null,
      }));
      toast.success("Work experience removed");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove work experience");
      return false;
    }
  },

  addProject: async (item) => {
    try {
      const created = await profileApi.addProjectItem(item);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, projects: [created, ...state.profile.projects] }
          : null,
      }));
      toast.success("Project added");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to add project");
      return false;
    }
  },

  updateProject: async (id, updates) => {
    try {
      const updated = await profileApi.updateProjectItem(id, updates);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              projects: state.profile.projects.map((p) =>
                p.id === id ? updated : p
              ),
            }
          : null,
      }));
      toast.success("Project updated");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update project");
      return false;
    }
  },

  deleteProject: async (id) => {
    try {
      await profileApi.deleteProjectItem(id);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              projects: state.profile.projects.filter((p) => p.id !== id),
            }
          : null,
      }));
      toast.success("Project removed");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove project");
      return false;
    }
  },

  addEducation: async (item) => {
    try {
      const created = await profileApi.addEducationItem(item);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              education: [created, ...state.profile.education],
            }
          : null,
      }));
      toast.success("Education added");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to add education");
      return false;
    }
  },

  updateEducation: async (id, updates) => {
    try {
      const updated = await profileApi.updateEducationItem(id, updates);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              education: state.profile.education.map((e) =>
                e.id === id ? updated : e
              ),
            }
          : null,
      }));
      toast.success("Education updated");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update education");
      return false;
    }
  },

  deleteEducation: async (id) => {
    try {
      await profileApi.deleteEducationItem(id);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              education: state.profile.education.filter((e) => e.id !== id),
            }
          : null,
      }));
      toast.success("Education removed");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove education");
      return false;
    }
  },

  addSkill: async (skill) => {
    try {
      const updatedSkills = await profileApi.addUserSkill(skill);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, userSkills: updatedSkills }
          : null,
      }));
      toast.success(`Skill "${skill}" added`);
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to add skill");
      return false;
    }
  },

  removeSkill: async (skill) => {
    try {
      const updatedSkills = await profileApi.removeUserSkill(skill);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, userSkills: updatedSkills }
          : null,
      }));
      toast.success(`Skill removed`);
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove skill");
      return false;
    }
  },

  uploadResume: async (file) => {
    try {
      const res = await profileApi.uploadResume(file);
      set((state) => ({
        profile: state.profile ? { ...state.profile, resume: res } : null,
      }));
      toast.success("Resume uploaded successfully");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to upload resume");
      return false;
    }
  },

  removeResume: async () => {
    try {
      await profileApi.removeResume();
      set((state) => ({
        profile: state.profile ? { ...state.profile, resume: undefined } : null,
      }));
      toast.success("Resume removed");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove resume");
      return false;
    }
  },

  uploadAvatar: async (file: File) => {
    try {
      const avatarUrl = await profileApi.uploadAvatar(file);
      set((state) => ({
        profile: state.profile ? { ...state.profile, avatarUrl } : null,
      }));
      toast.success("Profile photo updated");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile photo");
      return false;
    }
  },

  removeAvatar: async () => {
    try {
      await profileApi.removeAvatar();
      set((state) => ({
        profile: state.profile ? { ...state.profile, avatarUrl: "" } : null,
      }));
      toast.success("Profile photo removed");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove profile photo");
      return false;
    }
  },

  uploadCover: async (file: File) => {
    try {
      const coverUrl = await profileApi.uploadCover(file);
      set((state) => ({
        profile: state.profile ? { ...state.profile, coverUrl } : null,
      }));
      toast.success("Cover banner updated");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to upload cover banner");
      return false;
    }
  },

  removeCover: async () => {
    try {
      await profileApi.removeCover();
      set((state) => ({
        profile: state.profile ? { ...state.profile, coverUrl: "" } : null,
      }));
      toast.success("Cover banner removed");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to remove cover banner");
      return false;
    }
  },

  setConnection: async (platform, handle, connected) => {
    try {
      const conn = await profileApi.updateConnection(platform, handle, connected);
      set((state) => {
        if (!state.profile) return { profile: null };
        const nextConnections = state.profile.connections.filter(
          (c) => c.platform !== platform
        );
        return {
          profile: {
            ...state.profile,
            connections: [...nextConnections, conn],
          },
        };
      });
      toast.success(
        connected
          ? `${platform === "github" ? "GitHub" : "LinkedIn"} connected`
          : `${platform === "github" ? "GitHub" : "LinkedIn"} disconnected`
      );
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update connection");
      return false;
    }
  },
}));
