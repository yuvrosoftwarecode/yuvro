import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/common/Navigation";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";

import profileService, {
  Profile as ProfileType,
  Skill,
  Experience,
  Project,
  Education,
  Certification,
} from "@/services/profileService";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Plus,
  Github,
  Linkedin,
  Globe,
  Mail,
  MapPin,
  Calendar,
  Award,
  Code,
  Briefcase,
  GraduationCap,
  Star,
  ExternalLink,
  Upload,
  Building2,
  Clock,
  Trash2,
  Download,
} from "lucide-react";

// Dialogs
import EditProfileDialog from "@/components/student/profile/EditProfileDialog";
import AddSkillDialog from "@/components/student/profile/AddSkillDialog";
import AddExperienceDialog, {
  ExperienceForm,
} from "@/components/student/profile/AddExperienceDialog";
import AddProjectDialog from "@/components/student/profile/AddProjectDialog";
import AddEducationDialog from "@/components/student/profile/AddEducationDialog";

import AddCertificationDialog, {
  CertificationForm,
} from "@/components/student/profile/AddCertificationDialog";

import ProfileStats from "@/components/student/profile/ProfileStats";

// Local form shapes (must match dialog shapes)
type SkillForm = {
  name: string;
  level: string;
  percentage: number;
};

type ProjectForm = {
  title: string;
  description: string;
  role: string;
  techStack: string[];
  githubLink?: string;
  liveLink?: string;
};

type EducationForm = {
  institution: string;
  degree: string;
  field: string;
  duration: string;
  cgpa?: string;
};

// --------------------------------------------
// PROFILE STRENGTH CALCULATOR
// --------------------------------------------
const calculateProfileStrength = (profile: ProfileType) => {
  let score = 0;

  // 1. Basic Info - 20%
  if (profile.full_name) score += 5;
  if (profile.title) score += 5;
  if (profile.about) score += 5;
  if (profile.location) score += 5;

  // 2. Education - 15%
  if (profile.education.length > 0) score += 15;

  // 3. Skills - 15%
  if (profile.skills.length > 0) score += 15;

  // 4. Experience - 15%
  if (profile.experiences.length > 0) score += 15;

  // 5. Projects - 15%
  if (profile.projects.length > 0) score += 15;

  // 6. Certifications - 10%
  if (profile.certifications.length > 0) score += 10;

  // 7. Social Links - 5%
  const anySocial =
    profile.links.github ||
    profile.links.linkedin ||
    profile.links.portfolio ||
    profile.links.email;

  if (anySocial) score += 5;

  // 8. Images - 5%
  if (profile.profile_image) score += 3;
  if (profile.cover_image) score += 2;

  return score;
};

// --------------------------------------------
// PROFILE IMPROVEMENT SUGGESTIONS
// --------------------------------------------
const generateSuggestions = (profile: ProfileType) => {
  const suggestions: { text: string; boost: number }[] = [];

  if (!profile.profile_image)
    suggestions.push({ text: "Add a profile picture", boost: 3 });

  if (!profile.cover_image)
    suggestions.push({ text: "Add a cover image", boost: 2 });

  if (!profile.title)
    suggestions.push({ text: "Add a professional title", boost: 5 });

  if (!profile.about)
    suggestions.push({ text: "Write a short About section", boost: 5 });

  if (!profile.location)
    suggestions.push({ text: "Add your current location", boost: 5 });

  if (profile.education.length === 0)
    suggestions.push({ text: "Add your education details", boost: 15 });

  if (profile.skills.length === 0)
    suggestions.push({ text: "Add at least one skill", boost: 15 });

  if (profile.experiences.length === 0)
    suggestions.push({ text: "Add your experience", boost: 15 });

  if (profile.projects.length === 0)
    suggestions.push({ text: "Add a project you worked on", boost: 15 });

  if (profile.certifications.length === 0)
    suggestions.push({ text: "Add a certification", boost: 10 });

  const hasSocial =
    profile.links.github ||
    profile.links.linkedin ||
    profile.links.portfolio ||
    profile.links.email;

  if (!hasSocial)
    suggestions.push({ text: "Add social links (GitHub/LinkedIn)", boost: 5 });

  return suggestions;
};



const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileType | null>(null);

  // Images (preview only)
  const [profilePic, setProfilePic] = useState<string>("");
  const [coverPic, setCoverPic] = useState<string>("");

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [educationDialogOpen, setEducationDialogOpen] = useState(false);

  const [certificationDialogOpen, setCertificationDialogOpen] =
    useState(false);

  // Editing states
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [experienceEditData, setExperienceEditData] =
    useState<Experience | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingEducation, setEditingEducation] = useState<Education | null>(
    null
  );
  const [editingCertification, setEditingCertification] =
    useState<Certification | null>(null);

  const [gamificationStats, setGamificationStats] = useState<any>(null);

  // Fetch profile
  useEffect(() => {
    loadProfile();
    loadGamificationStats();
  }, []);

  const loadGamificationStats = async () => {
    try {
      const stats = await restApiAuthUtil.get("/course/student-course-progress/stats/");
      setGamificationStats(stats);
    } catch (err) {
      console.error("Failed to load gamification stats", err);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await profileService.fetchProfileDetail();
      setProfile(response);

      if (response.profile_image) setProfilePic(response.profile_image);
      if (response.cover_image) setCoverPic(response.cover_image);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading profile...
      </div>
    );
  }
  const profileStrength = calculateProfileStrength(profile);
  const suggestions = generateSuggestions(profile);



  /* -------------------------------------------- *
   * IMAGE HANDLERS
   * -------------------------------------------- */
  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePic(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCoverPicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCoverPic(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* -------------------------------------------- *
   * EXPERIENCE HANDLERS
   * -------------------------------------------- */
  const handleAddExperience = async (exp: ExperienceForm) => {
    await profileService.addExperience(exp);
    await loadProfile();
    setExperienceEditData(null);
  };

  const handleEditExperience = async (expId: string, data: ExperienceForm) => {
    await profileService.updateExperience(expId, data);
    await loadProfile();
    setExperienceEditData(null);
  };

  const handleDeleteExperience = async (id: string) => {
    await profileService.deleteExperience(id);
    await loadProfile();
  };

  /* -------------------------------------------- *
   * SKILL HANDLERS
   * -------------------------------------------- */
  const handleSaveSkill = async (data: SkillForm) => {
    if (editingSkill) {
      await profileService.updateSkill(editingSkill.id, data);
    } else {
      await profileService.addSkill(data);
    }
    await loadProfile();
    setEditingSkill(null);
  };

  const handleDeleteSkill = async (id: string) => {
    await profileService.deleteSkill(id);
    await loadProfile();
  };

  /* -------------------------------------------- *
   * PROJECT HANDLERS
   * -------------------------------------------- */
  const handleSaveProject = async (form: ProjectForm) => {
    const payload = {
      title: form.title,
      description: form.description,
      role: form.role,
      tech_stack: form.techStack,
      github_link: form.githubLink,
      live_link: form.liveLink,
    };

    if (editingProject) {
      await profileService.updateProject(editingProject.id, payload);
    } else {
      await profileService.addProject(payload);
    }
    await loadProfile();
    setEditingProject(null);
  };

  const handleDeleteProject = async (id: string) => {
    await profileService.deleteProject(id);
    await loadProfile();
  };

  /* -------------------------------------------- *
   * EDUCATION HANDLERS
   * -------------------------------------------- */
  const handleSaveEducation = async (form: EducationForm) => {
    if (editingEducation) {
      await profileService.updateEducation(editingEducation.id, form);
    } else {
      await profileService.addEducation(form);
    }
    await loadProfile();
    setEditingEducation(null);
  };

  const handleDeleteEducation = async (id: string) => {
    await profileService.deleteEducation(id);
    await loadProfile();
  };

  /* -------------------------------------------- *
   * CERTIFICATION HANDLERS
   * -------------------------------------------- */
  const handleSaveCertification = async (data: CertificationForm) => {
    if (editingCertification) {
      await profileService.updateCertification(editingCertification.id, data);
    } else {
      await profileService.addCertification(data);
    }
    await loadProfile();
    setEditingCertification(null);
  };

  const handleDeleteCertification = async (id: string) => {
    await profileService.deleteCertification(id);
    await loadProfile();
  };

  /* -------------------------------------------- *
   * MAIN RENDER
   * -------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <Navigation />

      <div className="max-w-[1480px] mx-auto px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* ========== LEFT MAIN CONTENT ========== */}
          <div className="lg:col-span-3 space-y-8">
            {/* ========= HEADER CARD ========= */}
            <Card className="border-0 shadow-lg ring-1 ring-black/5 overflow-hidden">
              <div className="relative">
                {/* COVER */}
                <div className="h-56 bg-gradient-to-r from-orange-400/80 via-rose-400/80 to-purple-500/80 backdrop-blur-md relative group">
                  {coverPic && (
                    <img
                      src={coverPic}
                      className="w-full h-full object-cover"
                      alt="Cover"
                    />
                  )}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverPicUpload}
                      />
                      <Button size="sm" variant="secondary" className="shadow-sm">
                        <Upload className="h-4 w-4 mr-2" /> Upload Cover
                      </Button>
                    </label>
                  </div>
                </div>

                {/* PROFILE PIC */}
                <div className="absolute -bottom-16 left-8">
                  <Avatar className="h-36 w-36 border-4 border-background shadow-xl">
                    {profilePic ? (
                      <AvatarImage src={profilePic} alt="Profile" />
                    ) : (
                      <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                        {profile.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
              </div>

              <CardContent className="pt-20 pb-8 px-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                      {profile.full_name || "Student User"}
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium">
                      {profile.title || "Your Title Here"}
                    </p>

                    {profile.education.length > 0 && (
                      <p className="text-sm text-muted-foreground flex gap-2 items-center pt-1">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">{profile.education[0].institution}</span>
                        <span>•</span>
                        <span>{profile.education[0].degree}</span>
                      </p>
                    )}

                    <p className="text-sm flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {profile.location || "Location not set"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-6 mt-2">
                    <Button onClick={() => setEditDialogOpen(true)} className="shadow-sm rounded-xl px-6">
                      <Edit className="h-4 w-4 mr-2" /> Edit Profile
                    </Button>

                    {/* Social Links Row */}
                    <div className="flex gap-3">
                      {profile.links.github && (
                        <a href={profile.links.github} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:scale-110 transition-transform">
                            <Github className="h-6 w-6" />
                          </Button>
                        </a>
                      )}
                      {profile.links.linkedin && (
                        <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:scale-110 transition-transform">
                            <Linkedin className="h-6 w-6" />
                          </Button>
                        </a>
                      )}
                      {profile.links.portfolio && (
                        <a href={profile.links.portfolio} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 hover:scale-110 transition-transform">
                            <Globe className="h-6 w-6" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ========= ABOUT ========= */}
            <Card className="border-0 shadow-lg ring-1 ring-black/5">
              <CardContent className="p-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground/90">
                  About Me
                </h2>
                <p className="text-muted-foreground leading-loose text-base">
                  {profile.about || "Write a short bio to introduce yourself."}
                </p>
              </CardContent>
            </Card>

            {/* ========= PROJECTS (MOVED UP) ========= */}
            <Card className="border-0 shadow-lg ring-1 ring-black/5 bg-card">
              <CardContent className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Code className="h-6 w-6 text-blue-600" />
                    Projects
                  </h2>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-0 shadow-sm bg-background/50 backdrop-blur"
                    onClick={() => {
                      setEditingProject(null);
                      setProjectDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Project
                  </Button>
                </div>

                <div className="grid gap-6">
                  {profile.projects.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                      No projects added yet. Showcase your work!
                    </div>
                  )}
                  {profile.projects.map((project) => (
                    <Card key={project.id} className="border-0 shadow-md ring-1 ring-black/5 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-primary">
                              {project.title}
                            </h3>
                            <p className="text-sm font-medium text-foreground/80 mt-1">
                              {project.role}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingProject(project);
                                setProjectDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:text-destructive"
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                          {project.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.tech_stack.map((tech, idx) => (
                            <Badge
                              key={`${tech}-${idx}`}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-50 px-3 py-1 font-medium hover:bg-blue-100 transition-colors"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex gap-3 pt-4">
                          {project.github_link && (
                            <a
                              href={project.github_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm" className="h-8 gap-2 bg-white border-slate-200 hover:bg-slate-50 text-slate-700">
                                <Github className="h-3.5 w-3.5" /> Code
                              </Button>
                            </a>
                          )}
                          {project.live_link && (
                            <a
                              href={project.live_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" className="h-8 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                                <ExternalLink className="h-3.5 w-3.5" /> Live Demo
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ========= EXPERIENCE ========= */}
            <Card className="border-0 shadow-lg ring-1 ring-black/5">
              <CardContent className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Briefcase className="h-6 w-6 text-orange-600" />
                    Experience
                  </h2>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-0 shadow-sm bg-background/50 backdrop-blur"
                    onClick={() => {
                      setExperienceEditData(null);
                      setExperienceDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>

                <div className="space-y-4">
                  {profile.experiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-6 rounded-xl bg-card border-0 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-shadow group border-l-4 border-l-orange-500"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-primary">{exp.role}</h3>
                          <div className="flex items-center gap-2 text-base font-medium text-muted-foreground mt-1">
                            <Building2 className="h-4 w-4 text-orange-500" />
                            <span>{exp.company}</span>
                            <span className="text-xs text-muted-foreground/50">•</span>
                            <span className="text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {exp.duration}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setExperienceEditData(exp);
                              setExperienceDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:text-destructive"
                            onClick={() => handleDeleteExperience(exp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Description */}
                      <ul className="list-disc pl-4 text-muted-foreground text-sm space-y-2 mb-4 marker:text-orange-400">
                        {exp.description_list.map((d, idx) => (
                          <li key={idx} className="leading-relaxed">{d}</li>
                        ))}
                      </ul>

                      {/* Tech stack */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {exp.technologies.map((tech, idx) => (
                          <Badge
                            key={`${tech}-${idx}`}
                            variant="outline"
                            className="bg-slate-50 text-slate-700 border-slate-200 px-3 py-1 font-medium hover:bg-slate-100 transition-colors"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ========= EDUCATION ========= */}
            <Card className="border-0 shadow-lg ring-1 ring-black/5">
              <CardContent className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-green-600" />
                    Education
                  </h2>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-0 shadow-sm bg-background/50 backdrop-blur"
                    onClick={() => {
                      setEditingEducation(null);
                      setEducationDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>

                <div className="grid gap-4">
                  {profile.education.map((edu) => (
                    <div
                      key={edu.id}
                      className="p-6 rounded-xl bg-card border-0 shadow-sm ring-1 ring-black/5 flex justify-between items-start hover:shadow-md transition-shadow border-l-4 border-l-green-500"
                    >
                      <div>
                        <h3 className="font-bold text-lg text-primary">
                          {edu.institution}
                        </h3>
                        <p className="text-muted-foreground font-medium mt-1">
                          {edu.degree} in {edu.field}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> {edu.duration}
                        </p>
                        {edu.cgpa && (
                          <Badge variant="secondary" className="mt-3 font-medium bg-green-50 text-green-700 hover:bg-green-100 border-0">
                            CGPA: {edu.cgpa}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingEducation(edu);
                            setEducationDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:text-destructive"
                          onClick={() => handleDeleteEducation(edu.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ========= CERTIFICATIONS ========= */}
            <Card className="border-0 shadow-lg ring-1 ring-black/5">
              <CardContent className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Award className="h-6 w-6 text-yellow-600" />
                    Certifications
                  </h2>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-0 shadow-sm bg-background/50 backdrop-blur"
                    onClick={() => {
                      setEditingCertification(null);
                      setCertificationDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Certification
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.certifications.map((cert) => (
                    <Card key={cert.id} className="border-0 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all group border-t-4 border-t-yellow-500">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{cert.name}</h3>

                            <p className="text-sm text-muted-foreground font-medium">
                              {cert.issuer}
                            </p>

                            <p className="text-xs text-muted-foreground pt-2 flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {cert.completion_date}
                            </p>
                          </div>

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Edit */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingCertification(cert);
                                setCertificationDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>

                            {/* Delete */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-destructive"
                              onClick={() =>
                                handleDeleteCertification(cert.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Download file */}
                        {cert.certificate_file && (
                          <div className="mt-4 pt-3 border-t border-border/50">
                            <a
                              href={cert.certificate_file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-primary hover:underline flex items-center justify-center gap-2"
                            >
                              <Download className="h-3 w-3" /> Download Certificate
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ========== RIGHT SIDEBAR ========== */}
          <div className="space-y-8">

            {/* Dynamic Gamification Stats */}
            <ProfileStats
              profileStrength={profileStrength}
              suggestions={suggestions}
              gamificationStats={gamificationStats}
            />



            {/* Skills Matrix */}
            <Card className="border-0 shadow-lg ring-1 ring-black/5">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Skills</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-0 shadow-sm"
                    onClick={() => {
                      setEditingSkill(null);
                      setSkillDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>

                <div className="space-y-5">
                  {profile.skills.map((skill) => (
                    <div key={skill.id} className="group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">{skill.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {skill.percentage}%
                          </span>

                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => {
                                setEditingSkill(skill);
                                setSkillDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3 text-muted-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:text-destructive"
                              onClick={() => handleDeleteSkill(skill.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="relative w-full h-2.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                          style={{ width: `${skill.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>



            {/* AI Insight */}
            <Card className="border-0 shadow-lg ring-1 ring-black/5 bg-card">
              <CardContent className="p-6">
                <div className="flex items-start gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-[hsl(var(--saffron))]/20 text-[hsl(var(--saffron))]">
                    <Star className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-lg">AI Insight</h3>
                </div>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <li className="flex items-start gap-3">
                    <span className="text-[hsl(var(--saffron))] text-lg leading-none">•</span>
                    <span>Add <span className="font-medium">3 more projects</span> to boost visibility by 40%.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[hsl(var(--saffron))] text-lg leading-none">•</span>
                    <span>Complete <span className="font-medium">Education</span> details for internship matching.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* DIALOGS BELOW */}
      {/* ============================================ */}

      {/* UPDATE PROFILE */}
      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profileData={{
          first_name: profile.user.first_name,
          last_name: profile.user.last_name,
          title: profile.title || "",
          location: profile.location || "",
          about: profile.about || "",
          github: profile.links.github || "",
          linkedin: profile.links.linkedin || "",
          portfolio: profile.links.portfolio || "",
        }}
        onSave={async (data) => {
          await profileService.updateProfile(data);
          await loadProfile();
        }}
      />

      {/* SKILLS */}
      <AddSkillDialog
        open={skillDialogOpen}
        onOpenChange={(open) => {
          setSkillDialogOpen(open);
          if (!open) setEditingSkill(null);
        }}
        editingData={editingSkill ?? undefined}
        onSave={handleSaveSkill}
      />

      {/* EXPERIENCE (Dynamic) */}
      <AddExperienceDialog
        open={experienceDialogOpen}
        onOpenChange={(open) => {
          setExperienceDialogOpen(open);
          if (!open) setExperienceEditData(null);
        }}
        editingData={experienceEditData ?? undefined}
        onSave={async (exp) => {
          if (experienceEditData) {
            await handleEditExperience(experienceEditData.id, exp);
          } else {
            await handleAddExperience(exp);
          }
        }}
      />

      {/* PROJECTS */}
      <AddProjectDialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open);
          if (!open) setEditingProject(null);
        }}
        editingData={editingProject ?? undefined}
        onSave={handleSaveProject}
      />

      {/* EDUCATION */}
      <AddEducationDialog
        open={educationDialogOpen}
        onOpenChange={(open) => {
          setEducationDialogOpen(open);
          if (!open) setEditingEducation(null);
        }}
        editingData={editingEducation ?? undefined}
        onSave={handleSaveEducation}
      />

      {/* CERTIFICATION */}
      <AddCertificationDialog
        open={certificationDialogOpen}
        onOpenChange={(open) => {
          setCertificationDialogOpen(open);
          if (!open) setEditingCertification(null);
        }}
        editingData={editingCertification ?? undefined}
        onSave={handleSaveCertification}
      />


    </div>
  );
};

export default Profile;
