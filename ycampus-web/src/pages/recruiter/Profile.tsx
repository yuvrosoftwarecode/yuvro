import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleSidebar from "@/components/common/RoleSidebar";
import RoleHeader from "@/components/common/RoleHeader";

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
  Phone,
  Building
} from "lucide-react";

// Types
interface RecruiterProfile {
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
  company: Company;
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

interface Company {
  id: string;
  name: string;
  industry: string;
  size: string;
  website?: string;
  description: string;
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

// Profile strength calculator
const calculateProfileStrength = (profile: RecruiterProfile) => {
  let score = 0;

  // Basic Info - 25%
  if (profile.full_name) score += 5;
  if (profile.title) score += 5;
  if (profile.about) score += 5;
  if (profile.location) score += 5;
  if (profile.phone) score += 5;

  // Company Info - 20%
  if (profile.company.name) score += 10;
  if (profile.company.description) score += 10;

  // Education - 15%
  if (profile.education.length > 0) score += 15;

  // Specializations - 15%
  if (profile.specializations.length > 0) score += 15;

  // Experience - 15%
  if (profile.experiences.length > 0) score += 15;

  // Certifications - 5%
  if (profile.certifications.length > 0) score += 5;

  // Social Links - 5%
  const anySocial =
    profile.links.github ||
    profile.links.linkedin ||
    profile.links.portfolio ||
    profile.links.email;
  if (anySocial) score += 5;

  return score;
};

// Profile improvement suggestions
const generateSuggestions = (profile: RecruiterProfile) => {
  const suggestions: { text: string; boost: number }[] = [];

  if (!profile.profile_image)
    suggestions.push({ text: "Add a profile picture", boost: 3 });

  if (!profile.title)
    suggestions.push({ text: "Add your professional title", boost: 5 });

  if (!profile.about)
    suggestions.push({ text: "Write an About section", boost: 5 });

  if (!profile.company.name)
    suggestions.push({ text: "Add your company information", boost: 10 });

  if (!profile.company.description)
    suggestions.push({ text: "Add company description", boost: 10 });

  if (profile.specializations.length === 0)
    suggestions.push({ text: "Add your recruiting specializations", boost: 15 });

  if (profile.experiences.length === 0)
    suggestions.push({ text: "Add your work experience", boost: 15 });

  const hasSocial =
    profile.links.github ||
    profile.links.linkedin ||
    profile.links.portfolio ||
    profile.links.email;

  if (!hasSocial)
    suggestions.push({ text: "Add social links (LinkedIn)", boost: 5 });

  return suggestions;
};

const RecruiterProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Images (preview only)
  const [profilePic, setProfilePic] = useState<string>("");
  const [coverPic, setCoverPic] = useState<string>("");

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);
  const [educationDialogOpen, setEducationDialogOpen] = useState(false);
  const [linksDialogOpen, setLinksDialogOpen] = useState(false);
  const [certificationDialogOpen, setCertificationDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);

  // Initialize empty profile
  useEffect(() => {
    const initializeProfile = () => {
      const emptyProfile: RecruiterProfile = {
        id: user?.id || '1',
        full_name: user?.first_name && user?.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : user?.username || '',
        email: user?.email || '',
        phone: '',
        location: '',
        title: '',
        about: '',
        profile_image: '',
        cover_image: '',
        date_joined: new Date().toISOString(),
        company: {
          id: '1',
          name: '',
          industry: '',
          size: '',
          website: '',
          description: ''
        },
        specializations: [],
        education: [],
        experiences: [],
        certifications: [],
        links: {
          linkedin: '',
          github: '',
          portfolio: '',
          email: user?.email || ''
        }
      };

      setProfile(emptyProfile);
      setLoading(false);
    };

    // Simulate API call - replace with actual service call
    setTimeout(initializeProfile, 500);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader 
              title="Loading Profile..." 
              subtitle="Please wait while we load your profile information." 
            />
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
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const profileStrength = calculateProfileStrength(profile);
  const suggestions = generateSuggestions(profile);

  // Image handlers
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader 
            title="Recruiter Profile" 
            subtitle="Manage your professional profile and company information"
          />
          
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Header Card */}
                  <Card>
                    <div className="relative">
                      {/* Cover Image */}
                      <div className="h-48 bg-gradient-to-r from-purple-600 to-indigo-600 relative group">
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
                            <Button size="sm" variant="secondary">
                              <Upload className="h-4 w-4 mr-2" /> Upload Cover
                            </Button>
                          </label>
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
                                .join("") || "R"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <label className="absolute bottom-2 right-2 cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleProfilePicUpload}
                          />
                          <div className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors">
                            <Upload className="w-4 h-4" />
                          </div>
                        </label>
                      </div>
                    </div>

                    <CardContent className="pt-20 pb-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h1 className="text-3xl font-bold">
                            {profile.full_name || "Recruiter Name"}
                          </h1>
                          <p className="text-lg text-muted-foreground">
                            {profile.title || "Add your professional title"}
                          </p>

                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                            {profile.company.name && (
                              <div className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {profile.company.name}
                              </div>
                            )}
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
                        {profile.about || "Tell us about yourself, your recruiting philosophy, and your expertise in talent acquisition. This helps candidates understand your background and approach to recruitment."}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Company Information */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          Company Information
                        </h2>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCompanyDialogOpen(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit Company
                        </Button>
                      </div>

                      {!profile.company.name ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No company information added yet.</p>
                          <p className="text-sm">Add your company details to build trust with candidates.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold">{profile.company.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              {profile.company.industry && (
                                <Badge variant="secondary">{profile.company.industry}</Badge>
                              )}
                              {profile.company.size && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {profile.company.size}
                                </span>
                              )}
                              {profile.company.website && (
                                <a 
                                  href={profile.company.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Globe className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                            </div>
                          </div>
                          {profile.company.description && (
                            <p className="text-muted-foreground">{profile.company.description}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recruiting Specializations */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          Recruiting Specializations
                        </h2>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSkillDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Specialization
                        </Button>
                      </div>

                      {profile.specializations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No specializations added yet.</p>
                          <p className="text-sm">Add your recruiting focus areas and industries.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {profile.specializations.map((skill) => (
                            <div key={skill.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold">{skill.name}</h3>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="hover:text-destructive">
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
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Profile Strength */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Profile Strength</h3>
                        <Badge variant={profileStrength >= 80 ? "default" : profileStrength >= 60 ? "secondary" : "destructive"}>
                          {profileStrength}%
                        </Badge>
                      </div>
                      
                      <Progress value={profileStrength} className="mb-4" />
                      
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {profileStrength >= 80 
                            ? "Excellent! Your profile is complete and professional."
                            : profileStrength >= 60 
                            ? "Good progress! A few more details will make your profile shine."
                            : "Let's build your profile to attract top talent."
                          }
                        </p>
                        
                        {suggestions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Suggestions:</p>
                            {suggestions.slice(0, 3).map((suggestion, index) => (
                              <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-3 w-3 text-green-500" />
                                <span>{suggestion.text}</span>
                                <Badge variant="outline" className="text-xs">+{suggestion.boost}%</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Specializations</span>
                          <Badge variant="secondary">{profile.specializations.length}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Experience</span>
                          <Badge variant="secondary">{profile.experiences.length}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Education</span>
                          <Badge variant="secondary">{profile.education.length}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Certifications</span>
                          <Badge variant="secondary">{profile.certifications.length}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterProfile;