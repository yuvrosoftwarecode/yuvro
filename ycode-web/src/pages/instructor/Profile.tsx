import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/common/DashboardLayout";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Trophy,
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
  Users,
  BookOpen,
  Target,
  TrendingUp,
  Phone
} from "lucide-react";

// Dialogs
import EditProfileDialog from "@/components/student/profile/EditProfileDialog";
import AddSkillDialog from "@/components/student/profile/AddSkillDialog";
import AddExperienceDialog, {
  ExperienceForm,
} from "@/components/student/profile/AddExperienceDialog";
import AddEducationDialog, {
  EducationForm,
} from "@/components/student/profile/AddEducationDialog";
import AddCertificationDialog, {
  CertificationForm,
} from "@/components/student/profile/AddCertificationDialog";

import profileService, {
  Profile as ProfileType,
} from "@/services/profileService";
import { toast } from "sonner";

// Types
interface InstructorProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  about: string;
  profile_image: string;
  cover_image: string;
  date_joined: string;
  specializations: Skill[];
  education: Education[];
  experiences: Experience[];
  certifications: Certification[];
  links: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    email?: string;
  };
}

interface Skill {
  id: string;
  name: string;
  level: string;
  percentage: number;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  duration: string;
  cgpa?: string;
}

interface Experience {
  id: string;
  role: string;
  company: string;
  duration: string;
  description_list: string[];
  technologies: string[];
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  completion_date: string;
  certificate_file?: string;
}

// Form types for dialogs
type SkillForm = {
  name: string;
  level: string;
  percentage: number;
};

type ExperienceForm = {
  role: string;
  company: string;
  duration: string;
  description_list: string[];
  technologies: string[];
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

type CertificationForm = {
  name: string;
  issuer: string;
  completion_date: string;
  certificate_file?: string;
};

// Profile strength calculator
const calculateProfileStrength = (profile: InstructorProfile) => {
  let score = 0;

  // Basic Info - 25%
  if (profile.full_name) score += 5;
  if (profile.title) score += 5;
  if (profile.about) score += 5;
  if (profile.location) score += 5;
  if (profile.phone) score += 5;

  // Education - 15%
  if (profile.education.length > 0) score += 15;

  // Specializations - 15%
  if (profile.specializations.length > 0) score += 15;

  // Experience - 15%
  if (profile.experiences.length > 0) score += 15;

  // Certifications - 15%
  if (profile.certifications.length > 0) score += 15;

  // Social Links - 5%
  const anySocial =
    profile.links.github ||
    profile.links.linkedin ||
    profile.links.portfolio ||
    profile.links.email;
  if (anySocial) score += 5;

  // Images - 5%
  if (profile.profile_image) score += 3;
  if (profile.cover_image) score += 2;

  return score;
};

// Profile improvement suggestions
const generateSuggestions = (profile: InstructorProfile) => {
  const suggestions: { text: string; boost: number }[] = [];

  if (!profile.profile_image)
    suggestions.push({ text: "Add a profile picture", boost: 3 });

  if (!profile.cover_image)
    suggestions.push({ text: "Add a cover image", boost: 2 });

  if (!profile.title)
    suggestions.push({ text: "Add your professional title", boost: 5 });

  if (!profile.about)
    suggestions.push({ text: "Write an About section", boost: 5 });

  if (!profile.location)
    suggestions.push({ text: "Add your location", boost: 5 });

  if (!profile.phone)
    suggestions.push({ text: "Add your phone number", boost: 5 });

  if (profile.education.length === 0)
    suggestions.push({ text: "Add your education details", boost: 15 });

  if (profile.specializations.length === 0)
    suggestions.push({ text: "Add your specializations", boost: 15 });

  if (profile.experiences.length === 0)
    suggestions.push({ text: "Add your work experience", boost: 15 });

  if (profile.certifications.length === 0)
    suggestions.push({ text: "Add certifications", boost: 15 });

  const hasSocial =
    profile.links.github ||
    profile.links.linkedin ||
    profile.links.portfolio ||
    profile.links.email;

  if (!hasSocial)
    suggestions.push({ text: "Add social links (GitHub/LinkedIn)", boost: 5 });

  return suggestions;
};

const InstructorProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Images (preview only)
  const [profilePic, setProfilePic] = useState<string>("");
  const [coverPic, setCoverPic] = useState<string>("");

  // Refs so the visible buttons (rather than the label/click target) can
  // programmatically open the file picker.
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);
  const [educationDialogOpen, setEducationDialogOpen] = useState(false);
  const [linksDialogOpen, setLinksDialogOpen] = useState(false);
  const [certificationDialogOpen, setCertificationDialogOpen] = useState(false);

  // Editing states
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [experienceEditData, setExperienceEditData] = useState<Experience | null>(null);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [editingCertification, setEditingCertification] = useState<Certification | null>(null);

  const loadProfile = async () => {
    try {
      const response = await profileService.fetchProfileDetail();
      const mappedProfile: InstructorProfile = {
        id: response.id,
        full_name: response.full_name || '',
        email: response.user?.email || response.email || '',
        phone: response.phone || '',
        location: response.location || '',
        title: response.title || '',
        about: response.about || '',
        profile_image: response.profile_image || '',
        cover_image: response.cover_image || '',
        date_joined: response.created_at || new Date().toISOString(),
        specializations: response.skills || [],
        education: response.education || [],
        experiences: response.experiences || [],
        certifications: response.certifications || [],
        links: {
          linkedin: response.links.linkedin || '',
          github: response.links.github || '',
          portfolio: response.links.portfolio || '',
          email: response.links.email || response.user?.email || ''
        }
      };
      setProfile(mappedProfile);
      if (response.profile_image) setProfilePic(response.profile_image);
      if (response.cover_image) setCoverPic(response.cover_image);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

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

  if (loading) {

    return (
      <DashboardLayout
        title="Loading Profile..."
        subtitle="Please wait while we load your profile information."
      >
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="bg-gray-300 rounded-lg h-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-300 rounded-lg h-48"></div>
                ))}
              </div>
              <div className="space-y-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-gray-300 rounded-lg h-32"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) return null;

  const profileStrength = calculateProfileStrength(profile);
  const suggestions = generateSuggestions(profile);

  // Image handlers
  const handleImageUpload = async (
    file: File,
    field: "profile_image" | "cover_image",
  ) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (field === "profile_image") setProfilePic(reader.result as string);
      else setCoverPic(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const updated = await profileService.uploadProfileImage(file, field);
      if (field === "profile_image" && updated.profile_image) {
        setProfilePic(updated.profile_image);
      } else if (field === "cover_image" && updated.cover_image) {
        setCoverPic(updated.cover_image);
      }
      await loadProfile();
      toast.success(
        field === "profile_image"
          ? "Profile picture updated"
          : "Cover image updated",
      );
    } catch (err) {
      console.error(`Failed to upload ${field}:`, err);
      toast.error(
        `Failed to upload ${field === "profile_image" ? "profile picture" : "cover image"}. Please try again.`,
      );
      await loadProfile();
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, "profile_image");
    e.target.value = "";
  };

  const handleCoverPicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, "cover_image");
    e.target.value = "";
  };

  return (
    <DashboardLayout
      title="Instructor Profile"
      subtitle="Manage your professional profile and teaching credentials"
    >

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Card */}
              <Card>
                <div className="relative">
                  {/* Cover Image */}
                  <div className="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 relative group">
                    {coverPic && (
                      <img
                        src={coverPic}
                        className="w-full h-full object-cover"
                        alt="Cover"
                      />
                    )}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        ref={coverInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverPicChange}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" /> Upload Cover
                      </Button>
                    </div>
                  </div>

                  {/* Profile Picture */}
                  <div className="absolute -bottom-16 left-8">
                    <Avatar className="h-32 w-32 border-4 border-background">
                      {profilePic ? (
                        <AvatarImage src={profilePic} alt="Profile" />
                      ) : (
                        <AvatarFallback className="text-3xl">
                          {profile.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "I"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <input
                      ref={profileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleProfilePicChange}
                    />
                    <button
                      type="button"
                      className="absolute bottom-2 right-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg transition-colors"
                      onClick={() => profileInputRef.current?.click()}
                      aria-label="Upload profile picture"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <CardContent className="pt-20 pb-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h1 className="text-3xl font-bold">
                        {profile.full_name || "Instructor Name"}
                      </h1>
                      <p className="text-lg text-muted-foreground">
                        {profile.title || "Add your professional title"}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                        {profile.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {profile.location}
                          </div>
                        )}
                        {profile.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {profile.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Joined {new Date(profile.date_joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <Button onClick={() => setEditDialogOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* About Section */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">About</h2>
                  <p className="text-muted-foreground">
                    {profile.about || "Tell us about yourself, your teaching philosophy, and your expertise. This helps students understand your background and approach to education."}
                  </p>
                </CardContent>
              </Card>

              {/* Specializations */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Code className="h-5 w-5 text-primary" />
                      Specializations
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSkill(null);
                        setSkillDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Specialization
                    </Button>
                  </div>

                  {profile.specializations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No specializations added yet.</p>
                      <p className="text-sm">Add your areas of expertise to showcase your skills.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.specializations.map((skill) => (
                        <div key={skill.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{skill.name}</h3>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingSkill(skill);
                                  setSkillDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:text-destructive"
                                onClick={() => handleDeleteSkill(skill.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Badge variant="secondary" className="mb-2">
                            {skill.level}
                          </Badge>
                          <Progress value={skill.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Experience */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Experience
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExperienceEditData(null);
                        setExperienceDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Experience
                    </Button>
                  </div>

                  {profile.experiences.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No experience added yet.</p>
                      <p className="text-sm">Add your work experience to build credibility.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {profile.experiences.map((exp) => (
                        <div
                          key={exp.id}
                          className="border-l-2 border-primary/20 pl-4 relative"
                        >
                          <div className="absolute -left-2 top-0 w-4 h-4 bg-primary rounded-full" />
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{exp.role}</h3>
                              <p className="text-muted-foreground">{exp.company}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" /> {exp.duration}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setExperienceEditData(exp);
                                  setExperienceDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:text-destructive"
                                onClick={() => handleDeleteExperience(exp.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <ul className="list-disc pl-4 text-muted-foreground text-sm mb-3">
                            {exp.description_list.map((d, idx) => (
                              <li key={idx}>{d}</li>
                            ))}
                          </ul>

                          <div className="flex flex-wrap gap-2">
                            {exp.technologies.map((tech, idx) => (
                              <Badge key={idx} variant="secondary">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Education
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingEducation(null);
                        setEducationDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Education
                    </Button>
                  </div>

                  {profile.education.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No education added yet.</p>
                      <p className="text-sm">Add your educational background.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profile.education.map((edu) => (
                        <div
                          key={edu.id}
                          className="p-4 border rounded-lg flex justify-between"
                        >
                          <div>
                            <h3 className="font-semibold text-lg">{edu.institution}</h3>
                            <p className="text-muted-foreground">
                              {edu.degree} in {edu.field}
                            </p>
                            <p className="text-sm text-muted-foreground">{edu.duration}</p>
                            {edu.cgpa && (
                              <p className="text-sm text-primary">CGPA: {edu.cgpa}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEducation(edu);
                                setEducationDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:text-destructive"
                              onClick={() => handleDeleteEducation(edu.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Certifications
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCertification(null);
                        setCertificationDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Certification
                    </Button>
                  </div>

                  {profile.certifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No certifications added yet.</p>
                      <p className="text-sm">Add your professional certifications.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.certifications.map((cert) => (
                        <Card key={cert.id} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold">{cert.name}</h3>
                                <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {cert.completion_date}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCertification(cert);
                                    setCertificationDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="hover:text-destructive"
                                  onClick={() => handleDeleteCertification(cert.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {cert.certificate_file && (
                                  <a
                                    href={cert.certificate_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button size="sm" variant="outline">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between mb-3">
                    <h2 className="text-xl font-semibold">Social Links</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLinksDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Edit Links
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <a
                      href={profile.links.github || "#"}
                      className="p-3 border rounded hover:bg-accent flex items-center gap-2"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                    <a
                      href={profile.links.linkedin || "#"}
                      className="p-3 border rounded hover:bg-accent flex items-center gap-2"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                    <a
                      href={profile.links.portfolio || "#"}
                      className="p-3 border rounded hover:bg-accent flex items-center gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Portfolio
                    </a>
                    <a
                      href={`mailto:${profile.links.email}`}
                      className="p-3 border rounded hover:bg-accent flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Strength */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Profile Strength
                  </h2>

                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {profileStrength}%
                    </div>
                    <Progress value={profileStrength} className="h-3 mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {profileStrength >= 80 && "Excellent! Your profile is very strong."}
                      {profileStrength >= 60 && profileStrength < 80 && "Good profile! A few improvements can make it even better."}
                      {profileStrength < 60 && "Your profile needs some work to attract more students."}
                    </p>
                  </div>

                  {suggestions.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Suggestions:</h3>
                      <div className="space-y-2">
                        {suggestions.slice(0, 3).map((suggestion, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{suggestion.text}</span>
                            <span className="text-green-600 font-medium">+{suggestion.boost}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => navigate('/instructor/courses')}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Manage Courses
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => navigate('/instructor/skill-tests')}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Create Skill Test
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => navigate('/instructor/contests')}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Host Contest
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => navigate('/instructor/users')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Students
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Teaching Stats */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Teaching Impact</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Courses Created</span>
                      <span className="font-semibold text-2xl text-blue-600">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Students Enrolled</span>
                      <span className="font-semibold text-2xl text-green-600">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Average Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-semibold">-</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Reviews</span>
                      <span className="font-semibold text-2xl text-purple-600">0</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      Start creating courses to see your teaching impact!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* UPDATE PROFILE */}
      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profileData={{
          first_name: profile.full_name?.split(" ")[0] || "",
          last_name: profile.full_name?.split(" ").slice(1).join(" ") || "",
          title: profile.title || "",
          location: profile.location || "",
          about: profile.about || "",
          college: null,
          college_other: null,
          department: null,
          github: profile.links.github || "",
          linkedin: profile.links.linkedin || "",
          portfolio: profile.links.portfolio || "",
        }}
        onSave={async () => {
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

      {/* EXPERIENCE */}
      <AddExperienceDialog
        open={experienceDialogOpen}
        onOpenChange={(open) => {
          setExperienceDialogOpen(open);
          if (!open) setExperienceEditData(null);
        }}
        editingData={experienceEditData ?? null}
        onSave={async (exp) => {
          if (experienceEditData) {
            await handleEditExperience(experienceEditData.id, exp);
          } else {
            await handleAddExperience(exp);
          }
        }}
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
    </DashboardLayout>
  );
};

export default InstructorProfile;