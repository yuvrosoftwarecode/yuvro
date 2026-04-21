import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import profileService from '@/services/profileService';
import studentDashboardService from '@/services/studentDashboardService';
import studentService from '@/services/studentService';
import { useToast } from '@/components/ui/use-toast';
import {
  User, Mail, Phone, MapPin, Linkedin, Upload, FileText,
  GraduationCap, Code, Trophy, Plus, Pencil, Check, X,
  ExternalLink, Github, BookOpen, ClipboardCheck, Mic,
  MessageSquare, Target, Trash2, Zap, Calendar
} from 'lucide-react';
import { getMediaUrl } from '@/utils/mediaUtils';

// --- Mock Data ---
const mockProfile = {
  name: 'Rahul Sharma',
  rollNo: 'CSE2022045',
  department: 'Computer Science',
  semester: 'VI',
  section: 'A',
  email: 'rahul.sharma@college.edu',
  phone: '+91 98765 43210',
  dob: '2003-05-15',
  gender: 'Male',
  location: 'Hyderabad, India',
  linkedin: 'linkedin.com/in/rahulsharma',
};

const mockScores = {
  pi: { score: 82, status: 'Good' as const },
  ps: { score: 74, status: 'Good' as const },
  pri: { score: 78, status: 'Good' as const },
};

const mockActivity = {
  testsAttempted: 24,
  mockInterviews: 8,
  notesCompleted: 45,
  tasksCompleted: 18,
};

const mockBadges = [
  { icon: '🔥', label: '7-Day Streak', color: 'bg-amber-500/10 text-amber-600' },
  { icon: '🏆', label: 'Top 10%', color: 'bg-yellow-500/10 text-yellow-600' },
  { icon: '⭐', label: 'Quiz Master', color: 'bg-blue-500/10 text-blue-600' },
  { icon: '🎯', label: 'DSA Pro', color: 'bg-emerald-500/10 text-emerald-600' },
];

const mockInsights = [
  { area: 'System Design', suggestion: 'Practice HLD/LLD patterns and case studies', severity: 'high' as const },
  { area: 'Communication', suggestion: 'Take more mock interviews to improve verbal articulation', severity: 'medium' as const },
  { area: 'Mock Interviews', suggestion: 'Increase mock interview frequency to at least 2/week', severity: 'medium' as const },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Strong': return 'text-emerald-600 bg-emerald-500/10';
    case 'Good': return 'text-amber-600 bg-amber-500/10';
    case 'Needs Improvement': return 'text-red-500 bg-red-500/10';
    default: return 'text-muted-foreground bg-muted';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-red-500';
};

const getProgressColor = (score: number) => {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-amber-500';
  return 'bg-red-500';
};

const ScoreCard = ({ label, score, status }: { label: string; score: number; status: string }) => (
  <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-card border border-border/50">
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
    <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${getProgressColor(score)}`} style={{ width: `${score}%` }} />
    </div>
    <Badge variant="secondary" className={`text-[10px] ${getStatusColor(status)}`}>{status}</Badge>
  </div>
);

const EduCard = ({ badge, type, data, editing, onChange, fields }: any) => (
  <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
    <div className="flex items-center gap-2 mb-3">
      <Badge className={`${badge.color} border-0 text-xs`}>{badge.label}</Badge>
      <span className="text-xs text-muted-foreground">{data.year}</span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {fields.map((f: any) => (
        <div key={f.key || f.label} className={f.fullWidth ? "col-span-full" : ""}>
          <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
          {f.isCombined ? (
            editing ? (
              <div className="flex gap-1">
                {f.subFields.map((sf: any) => (
                  <Input
                    key={sf.key}
                    value={data[sf.key]}
                    onChange={e => onChange(type, sf.key, e.target.value)}
                    className="h-8 text-sm"
                    placeholder={sf.placeholder}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium">
                {(data[f.subFields[0].key] || data[f.subFields[1].key]) 
                  ? `${data[f.subFields[0].key] || ''} ${data[f.subFields[1].key] ? `– ${data[f.subFields[1].key]}` : ''}` 
                  : 'Not specified'}
              </p>
            )
          ) : (
            editing ? (
              <Input
                value={data[f.key]}
                onChange={e => onChange(type, f.key, e.target.value)}
                className="h-8 text-sm"
                placeholder={f.placeholder}
              />
            ) : (
              <p className={`text-sm font-medium ${f.isScore ? 'text-emerald-600' : ''}`}>
                {data[f.key] ? (f.isPercentage ? `${data[f.key]}%` : data[f.key]) : 'Not specified'}
              </p>
            )
          )}
        </div>
      ))}
    </div>
  </div>
);

const Section = ({ title, icon: Icon, children, action }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) => (
  <Card className="border-border/50 shadow-sm">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {action}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// --- Education Form ---
const EducationForm = ({
  form, setForm, onSave, onCancel, isSaving
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}) => (
  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Input placeholder="Institution / School" value={form.institution} onChange={(e: any) => setForm((prev: any) => ({ ...prev, institution: e.target.value }))} className="h-9 text-sm" />
      <Input placeholder="Degree (e.g. B.Tech, 12th)" value={form.degree} onChange={(e: any) => setForm((prev: any) => ({ ...prev, degree: e.target.value }))} className="h-9 text-sm" />
      <Input placeholder="Field of Study (e.g. Computer Science)" value={form.field} onChange={(e: any) => setForm((prev: any) => ({ ...prev, field: e.target.value }))} className="h-9 text-sm" />
      <Input placeholder="CGPA / Percentage" value={form.cgpa} onChange={(e: any) => setForm((prev: any) => ({ ...prev, cgpa: e.target.value }))} className="h-9 text-sm" />
      <Input placeholder="Start Year" type="number" min="1900" max="2100" value={form.start_year || ''} onChange={(e: any) => setForm((prev: any) => ({ ...prev, start_year: e.target.value }))} className="h-9 text-sm" />
      <Input placeholder="End Year" type="number" min="1900" max="2100" value={form.end_year || ''} onChange={(e: any) => setForm((prev: any) => ({ ...prev, end_year: e.target.value }))} className="h-9 text-sm" />
    </div>
    <div className="flex gap-2 justify-end mt-2">
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel} disabled={isSaving}>Cancel</Button>
      <Button size="sm" className="h-8 text-xs gap-1" onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : <><Check className="h-3 w-3" /> Save</>}
      </Button>
    </div>
  </div>
);

// --- Project Form ---
const ProjectForm = ({
  form, setForm, onSave, onCancel, newTechTag, setNewTechTag, onAddTag, onRemoveTag, isSaving
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  onCancel: () => void;
  newTechTag: string;
  setNewTechTag: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (t: string) => void;
  isSaving?: boolean;
}) => (
  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
    <Input placeholder="Project Title" value={form.title} onChange={(e: any) => setForm((prev: any) => ({ ...prev, title: e.target.value }))} className="h-9 text-sm" />
    <Textarea placeholder="Description" value={form.description} onChange={(e: any) => setForm((prev: any) => ({ ...prev, description: e.target.value }))} className="text-sm min-h-[60px]" />
    <div className="flex flex-wrap gap-1.5">
      {form.tech.map((t: string) => (
        <Badge key={t} variant="secondary" className="text-[10px] bg-primary/10 text-primary gap-1 pr-1">
          {t}
          <button onClick={() => onRemoveTag(t)} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
        </Badge>
      ))}
    <div className="flex gap-1">
        <Input placeholder="Add tech..." value={newTechTag} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTechTag(e.target.value)} className="h-7 w-28 text-xs"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), onAddTag())} />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAddTag}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Input placeholder="GitHub URL" value={form.github} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev: any) => ({ ...prev, github: e.target.value }))} className="h-8 text-xs" />
      <Input placeholder="Live URL" value={form.live} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev: any) => ({ ...prev, live: e.target.value }))} className="h-8 text-xs" />
    </div>
    <div className="flex gap-2 justify-end">
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel} disabled={isSaving}>Cancel</Button>
      <Button size="sm" className="h-8 text-xs gap-1" onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : <><Check className="h-3 w-3" /> Save</>}
      </Button>
    </div>
  </div>
);

// --- Main Component ---

const StudentProfile = () => {
  const { user, updateUser } = useAuth();
  
  // Real Data Queries
  const { data: profileDetail, isLoading: profileLoading } = useQuery({
    queryKey: ['profileDetail'],
    queryFn: profileService.fetchProfileDetail,
  });

  const { data: testPerf } = useQuery({
    queryKey: ['testPerformance'],
    queryFn: () => studentDashboardService.getTestPerformance(),
  });

  const { toast } = useToast();
  const { refetch: refetchProfile } = useQuery({
    queryKey: ['profileDetail'],
    queryFn: profileService.fetchProfileDetail,
  });

  const { data: tasksStats } = useQuery({
    queryKey: ['tasksSummary'],
    queryFn: () => studentDashboardService.getTasksSummary(),
  });

  const { data: assessmentsStats } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => studentDashboardService.getAssessments(),
  });

  const { data: studentDetail } = useQuery({
    queryKey: ['studentDetail'],
    queryFn: () => studentService.getStudents().then(res => res.results[0]),
  });

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [educations, setEducations] = useState<any[]>([]);
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null);
  const [educationForm, setEducationForm] = useState<any>({
    id: '', institution: '', degree: '', field: '', duration: '', start_year: null, end_year: null, cgpa: ''
  });
  const [addingEducation, setAddingEducation] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [activity, setActivity] = useState(mockActivity);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<any>({ id: '', title: '', description: '', tech: [], github: '', live: '' });
  const [addingProject, setAddingProject] = useState(false);
  const [newTechTag, setNewTechTag] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [addingSkillType, setAddingSkillType] = useState<'technical' | 'soft' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const localResumeName = typeof window !== 'undefined' ? localStorage.getItem('local_resume_name') : null;
  const localResumeUrl = typeof window !== 'undefined' ? localStorage.getItem('local_resume_url') : null;
  const [resumeName, setResumeName] = useState<string | null>(localResumeName);
  const [resumeUrl, setResumeUrl] = useState<string | null>(localResumeUrl);

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/') && !file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF, Word document, or image.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const base64Url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });
      localStorage.setItem('local_resume_name', file.name);
      localStorage.setItem('local_resume_url', base64Url);
      setResumeName(file.name);
      setResumeUrl(base64Url);
      
      toast({
        title: "Resume Uploaded",
        description: "Your resume has been uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Failed to upload resume:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload resume.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResume = () => {
    localStorage.removeItem('local_resume_name');
    localStorage.removeItem('local_resume_url');
    setResumeName(null);
    setResumeUrl(null);
    if (resumeInputRef.current) resumeInputRef.current.value = '';
    toast({
      title: "Resume Removed",
      description: "Your resume has been successfully deleted.",
    });
  };

  const handleViewResume = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!resumeUrl) return;
    
    try {
      const [header, base64Data] = resumeUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'application/pdf';
      
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }
      
      const blob = new Blob(byteArrays, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Give the browser time to open the file before revoking
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('Failed to parse resume blob', err);
      window.open(resumeUrl, '_blank');
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    about: '',
    gender: '',
    dob: '',
    location: '',
    github: '',
    linkedin: '',
  });

  // Sync real data to state
  useEffect(() => {
    if (profileDetail) {
      setPersonalForm({
        full_name: profileDetail.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : ''),
        email: profileDetail.links?.email || user?.email || '',
        phone: (user as any)?.profile?.phone || '',
        about: profileDetail.about || '',
        gender: profileDetail.gender || '',
        dob: profileDetail.dob || (typeof window !== 'undefined' ? localStorage.getItem('local_dob') : null) || '',
        location: profileDetail.location || '',
        github: profileDetail.links?.github || '',
        linkedin: profileDetail.links?.linkedin || '',
      });
      // Map profile education
      if (profileDetail.education) {
        setEducations(profileDetail.education);
      }

      // Map profile projects
      if (profileDetail.projects) {
        setProjects(profileDetail.projects.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          tech: p.tech_stack || [],
          github: p.github_link || '',
          live: p.live_link || ''
        })));
      }

      // Map profile skills
      if (profileDetail.skills) {
        setSkills(profileDetail.skills);
      }
    }
  }, [profileDetail]);

  // Sync Activity stats
  useEffect(() => {
    if (testPerf || tasksStats || assessmentsStats) {
      setActivity((prev: any) => ({
        ...prev,
        testsAttempted: testPerf?.completed || prev.testsAttempted,
        tasksCompleted: tasksStats?.completed || prev.tasksCompleted,
        notesCompleted: prev.notesCompleted, // mockDashboardService doesn't have a clear counterpart for notes yet
        mockInterviews: prev.mockInterviews // placeholder
      }));
    }
  }, [testPerf, tasksStats, assessmentsStats]);
  
  const handleSavePersonal = async () => {
    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (personalForm.email && !emailRegex.test(personalForm.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Sanitize URLs by prepending https:// if protocol is missing
    const sanitizeUrl = (url: string) => {
      if (!url) return url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    };

    const sanitizedGithub = sanitizeUrl(personalForm.github);
    const sanitizedLinkedin = sanitizeUrl(personalForm.linkedin);

    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (sanitizedGithub && !urlRegex.test(sanitizedGithub)) {
      toast({
        title: "Invalid GitHub URL",
        description: "Please enter a valid URL for your GitHub profile.",
        variant: "destructive",
      });
      return;
    }
    if (sanitizedLinkedin && !urlRegex.test(sanitizedLinkedin)) {
      toast({
        title: "Invalid LinkedIn URL",
        description: "Please enter a valid URL for your LinkedIn profile.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Profile Details & Names
      // Using /auth/profile/detail/ for all profile fields as it is the most reliable endpoint
      try {
        await profileService.updateProfileDetail({
          full_name: personalForm.full_name,
          location: personalForm.location,
          about: personalForm.about,
          gender: personalForm.gender.toLowerCase(),
          dob: personalForm.dob,
        });
        
        if (personalForm.dob) {
          localStorage.setItem('local_dob', personalForm.dob);
        } else {
          localStorage.removeItem('local_dob');
        }
      } catch (e: any) {
        console.error('Failed to update profile details:', e);
        throw new Error(`Profile update failed: ${e.message || 'Unknown error'}`);
      }

      // 2. Update Social Links (GitHub, LinkedIn, Email)
      try {
        await profileService.updateSocialLinks({
          github: sanitizedGithub,
          linkedin: sanitizedLinkedin,
          email: personalForm.email
        });
      } catch (e: any) {
        console.warn('Social links update failed (non-critical):', e);
        // We don't throw here to allow partial success
      }

      toast({
        title: "Profile Updated",
        description: "Your personal details have been saved successfully.",
      });
      
      setEditingPersonal(false);
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      
      // Extract field-specific errors if available
      let errorMsg = error.message;
      if (error.details && typeof error.details === 'object') {
        const fieldErrors = Object.entries(error.details)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join(', ');
        if (fieldErrors) errorMsg = fieldErrors;
      }

      toast({
        title: "Update Failed",
        description: errorMsg || "There was an error saving your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEducationEdit = () => {
    setEditingEducationId(null);
    setAddingEducation(false);
  };

  const startEditEducation = (education: any) => {
    setEditingEducationId(education.id);
    setEducationForm({
      id: education.id || '',
      institution: education.institution || '',
      degree: education.degree || '',
      field: education.field || '',
      duration: education.duration || '',
      cgpa: education.cgpa || '',
      start_year: education.start_year || '',
      end_year: education.end_year || ''
    });
    setAddingEducation(false);
  };

  const startAddEducation = () => {
    setEducationForm({ id: '', institution: '', degree: '', field: '', duration: '', start_year: '', end_year: '', cgpa: '' });
    setAddingEducation(true);
    setEditingEducationId(null);
  };

  const saveEducation = async () => {
    if (!educationForm.institution.trim() || !educationForm.degree.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please enter both Institution and Degree.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let computedDuration = educationForm.duration;
      if (!computedDuration) {
        if (educationForm.start_year && educationForm.end_year) {
          computedDuration = `${parseInt(educationForm.end_year) - parseInt(educationForm.start_year)} years`;
        } else if (educationForm.degree?.toLowerCase().includes('b.tech') || educationForm.degree?.toLowerCase().includes('graduation')) {
          computedDuration = "4 years";
        } else if (educationForm.degree?.toLowerCase().includes('12') || educationForm.degree?.toLowerCase().includes('inter') || educationForm.degree?.toLowerCase().includes('hsc')) {
          computedDuration = "2 years";
        } else {
          computedDuration = "1 year";
        }
      }

      const payload = {
        institution: educationForm.institution,
        degree: educationForm.degree,
        field: educationForm.field || 'General',
        duration: computedDuration,
        cgpa: educationForm.cgpa || '',
        start_year: educationForm.start_year ? parseInt(educationForm.start_year) : null,
        end_year: educationForm.end_year ? parseInt(educationForm.end_year) : null,
      };

      if (addingEducation) {
        await profileService.addEducation(payload);
        toast({ title: "Education Added", description: "Successfully added to your profile." });
      } else if (editingEducationId) {
        await profileService.updateEducation(editingEducationId, payload);
        toast({ title: "Education Updated", description: "Successfully updated your education." });
      }

      setEditingEducationId(null);
      setAddingEducation(false);
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to save education:', error);
      let errorMsg = error.message;
      if (error.details && typeof error.details === 'object') {
        const fieldErrors = Object.entries(error.details)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join(', ');
        if (fieldErrors) errorMsg = fieldErrors;
      }
      toast({
        title: "Save Failed",
        description: errorMsg || "Failed to save education. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education entry?')) return;
    
    setIsSaving(true);
    try {
      await profileService.deleteEducation(id);
      toast({ title: "Education Deleted", description: "Successfully removed from your profile." });
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to delete education:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete education.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const startEditProject = (project: any) => {
    setEditingProjectId(project.id);
    setProjectForm({ ...project });
    setAddingProject(false);
  };

  const startAddProject = () => {
    setProjectForm({ id: '', title: '', description: '', tech: [], github: '', live: '' });
    setAddingProject(true);
    setEditingProjectId(null);
  };

  const saveProject = async () => {
    if (!projectForm.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a project title.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: projectForm.title,
        description: projectForm.description,
        tech_stack: projectForm.tech,
        github_link: projectForm.github,
        live_link: projectForm.live,
        role: 'Developer' // Required by backend
      };

      if (addingProject) {
        await profileService.addProject(payload);
        toast({ title: "Project Added", description: "Successfully added to your portfolio." });
      } else if (editingProjectId) {
        await profileService.updateProject(editingProjectId, payload);
        toast({ title: "Project Updated", description: "Successfully updated your project." });
      }

      setEditingProjectId(null);
      setAddingProject(false);
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to save project:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    setIsSaving(true);
    try {
      await profileService.deleteProject(id);
      toast({ title: "Project Deleted", description: "Successfully removed from your portfolio." });
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelProjectEdit = () => {
    setEditingProjectId(null);
    setAddingProject(false);
  };

  const addTechTag = () => {
    if (newTechTag.trim() && !projectForm.tech.includes(newTechTag.trim())) {
      setProjectForm((prev: any) => ({ ...prev, tech: [...prev.tech, newTechTag.trim()] }));
      setNewTechTag('');
    }
  };

  const removeTechTag = (tag: string) => {
    setProjectForm((prev: any) => ({ ...prev, tech: prev.tech.filter((t: string) => t !== tag) }));
  };

  const handleAddSkill = async (type: 'technical' | 'soft') => {
    if (!newSkill.trim()) return;
    
    setIsSaving(true);
    try {
      const prefix = type === 'soft' ? '[S] ' : '[T] ';
      await profileService.addSkill({
        name: prefix + newSkill.trim(),
        level: 'Beginner', // Consistent with backend enum
        percentage: 100
      });
      setNewSkill('');
      setAddingSkillType(null);
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to add skill:', error);
      toast({
        title: "Add Failed",
        description: error.message || "Failed to add skill.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    setIsSaving(true);
    try {
      await profileService.deleteSkill(id);
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to delete skill:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to remove skill.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await profileService.uploadProfileImage(file);
      const backendUrl = result.profile_image;
      
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      });
      
      // Update global auth state to sync with other components (like Sidebar)
      if (user && backendUrl) {
        updateUser({
          ...user,
          profile: {
            ...user.profile,
            avatar: backendUrl
          }
        });
      }
      
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      
      // Extract field-specific errors if available (important for invalid URLs in other fields)
      let errorMsg = error.message;
      if (error.details && typeof error.details === 'object') {
        const fieldErrors = Object.entries(error.details)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join(', ');
        if (fieldErrors) errorMsg = fieldErrors;
      }

      toast({
        title: "Upload Failed",
        description: errorMsg || "Failed to upload profile picture.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImage = async () => {
    setIsSaving(true);
    try {
      await profileService.deleteProfileImage();
      toast({
        title: "Profile Picture Removed",
        description: "Your profile picture has been removed successfully.",
      });
      
      // Update global auth state
      if (user) {
        updateUser({
          ...user,
          profile: {
            ...user.profile,
            avatar: undefined
          }
        });
      }
      
      refetchProfile();
    } catch (error: any) {
      console.error('Failed to delete image:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to remove profile picture.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const profileImage = getMediaUrl(profileDetail?.profile_image || (user as any)?.profile?.avatar || (user as any)?.avatar);
  const initials = (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : mockProfile.name).trim().split(' ').map((n: string) => n[0]).join('');

  return (
    <StudentLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 p-4 md:p-6">
        {/* ─── PROFILE HEADER ─── */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10" />
          <CardContent className="relative pt-0 pb-5 px-5">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-10">
              <div className="relative inline-block">
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary ring-offset-background transform transition-transform hover:scale-105">
                      <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                        <AvatarImage src={profileImage} />
                        <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-fit border-none bg-transparent shadow-none p-0 overflow-hidden flex justify-center items-center h-auto sm:rounded-none [&>button]:hidden">
                    <DialogTitle className="sr-only">Profile Picture</DialogTitle>
                    <DialogDescription className="sr-only">View full profile picture.</DialogDescription>
                    <img 
                      src={profileImage || ""} 
                      alt="Profile" 
                      className="h-[300px] w-[300px] md:h-[400px] md:w-[400px] lg:h-[500px] lg:w-[500px] object-cover rounded-full shadow-2xl border-4 border-background/20"
                    />
                  </DialogContent>
                </Dialog>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      disabled={isSaving}
                      className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-0 w-28 text-xs p-1 rounded-lg">
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="text-xs py-1">
                      <Upload className="mr-2 h-3.5 w-3.5" />
                      <span>Upload</span>
                    </DropdownMenuItem>
                    {profileImage && (
                      <DropdownMenuItem onClick={handleDeleteImage} className="text-destructive focus:bg-destructive/10 focus:text-destructive text-xs py-1">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">
                  {profileDetail?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : mockProfile.name)}
                </h1>
                <p className="text-sm text-muted-foreground">{studentDetail?.roll_number || profileDetail?.id || mockProfile.rollNo}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{studentDetail?.department_name || profileDetail?.title || mockProfile.department}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Sem: {studentDetail?.semester_number || '—'} - Sec: {studentDetail?.section_name || '—'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <ScoreCard label="PI" score={mockScores.pi.score} status={mockScores.pi.status} />
                <ScoreCard label="PS" score={mockScores.ps.score} status={mockScores.ps.status} />
                <ScoreCard label="PRI" score={mockScores.pri.score} status={mockScores.pri.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {profileDetail?.links?.email || user?.email || mockProfile.email}</div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {(user as any)?.profile?.phone || mockProfile.phone}</div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Linkedin className="h-3.5 w-3.5" />
                {profileDetail?.links?.linkedin ? (
                  <a href={profileDetail.links.linkedin.startsWith('http') ? profileDetail.links.linkedin : `https://${profileDetail.links.linkedin}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    LinkedIn
                  </a>
                ) : (
                  'LinkedIn'
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Github className="h-3.5 w-3.5" />
                {profileDetail?.links?.github ? (
                  <a href={profileDetail.links.github.startsWith('http') ? profileDetail.links.github : `https://${profileDetail.links.github}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    GitHub
                  </a>
                ) : (
                  'GitHub'
                )}
              </div>
              {resumeName && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground group">
                  <FileText className="h-3.5 w-3.5" />
                  <a href={resumeUrl || "#"} onClick={handleViewResume} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors max-w-[150px] truncate" title="View Resume">
                    {resumeName}
                  </a>
                  <button onClick={handleDeleteResume} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Resume">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
              {profileLoading && <span className="text-xs text-muted-foreground animate-pulse ml-auto">Loading...</span>}
              <input
                type="file"
                ref={resumeInputRef}
                onChange={handleResumeUpload}
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className={profileLoading ? "hidden" : "ml-auto h-8 text-xs gap-1.5"}
                onClick={() => resumeInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="h-3 w-3" /> {resumeName ? "Update Resume" : "Upload Resume"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── TABS ─── */}
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="personal" className="text-xs gap-1.5"><User className="h-3.5 w-3.5" /> Personal</TabsTrigger>
            <TabsTrigger value="education" className="text-xs gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Education</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs gap-1.5"><Code className="h-3.5 w-3.5" /> Projects</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs gap-1.5"><Zap className="h-3.5 w-3.5" /> Skills</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1.5"><Target className="h-3.5 w-3.5" /> Activity</TabsTrigger>
          </TabsList>

          {/* ─── PERSONAL ─── */}
          <TabsContent value="personal">
            <Section title="Personal Details" icon={User} action={
              <div className="flex gap-2">
                {editingPersonal && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={() => {
                    setEditingPersonal(false);
                    // Reset form to current data
                    if (profileDetail) {
                      setPersonalForm({
                        full_name: profileDetail.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : ''),
                        email: profileDetail.links?.email || user?.email || '',
                        phone: (user as any)?.profile?.phone || '',
                        about: profileDetail.about || '',
                        gender: profileDetail.gender || '',
                        dob: profileDetail.dob || (typeof window !== 'undefined' ? localStorage.getItem('local_dob') : null) || '',
                        location: profileDetail.location || '',
                        github: profileDetail.links?.github || '',
                        linkedin: profileDetail.links?.linkedin || '',
                      });
                    }
                  }} disabled={isSaving}>
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => {
                  if (editingPersonal) {
                    handleSavePersonal();
                  } else {
                    setEditingPersonal(true);
                  }
                }} disabled={isSaving}>
                  {editingPersonal ? <><Check className="h-3 w-3" /> Save</> : <><Pencil className="h-3 w-3" /> Edit</>}
                </Button>
              </div>
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'full_name', value: personalForm.full_name, icon: User, type: 'text' },
                  { label: 'Email', key: 'email', value: personalForm.email, icon: Mail, type: 'email' },
                  { label: 'Phone', key: 'phone', value: personalForm.phone, icon: Phone, type: 'tel' },
                  { label: 'Gender', key: 'gender', value: personalForm.gender, icon: User, type: 'text' },
                  { label: 'Date of Birth', key: 'dob', value: personalForm.dob, icon: Calendar, type: 'date' },
                  { label: 'Location', key: 'location', value: personalForm.location, icon: MapPin, type: 'text' },
                  { label: 'GitHub Profile URL', key: 'github', value: personalForm.github, icon: Github, type: 'url' },
                  { label: 'LinkedIn Profile URL', key: 'linkedin', value: personalForm.linkedin, icon: Linkedin, type: 'url' },
                  { label: 'About', key: 'about', value: personalForm.about, icon: FileText, type: 'textarea' },
                ].map((field) => (
                  <div key={field.label} className={`${field.type === 'textarea' ? 'md:col-span-2' : ''} flex items-start gap-3 p-3 rounded-lg bg-muted/30`}>
                    <field.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      {editingPersonal ? (
                        field.type === 'textarea' ? (
                          <Textarea
                            value={field.value}
                            onChange={e => setPersonalForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="mt-1 text-sm min-h-[80px]"
                            placeholder={`Enter your ${field.label.toLowerCase()}...`}
                          />
                        ) : field.key === 'gender' ? (
                          <Select
                            value={personalForm.gender.toLowerCase()}
                            onValueChange={val => setPersonalForm(prev => ({ ...prev, gender: val }))}
                          >
                            <SelectTrigger className="h-8 mt-1 text-sm">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : field.key === 'dob' ? (
                          <div className="mt-1 relative">
                            <input
                              type="date"
                              value={field.value}
                              onChange={e => setPersonalForm(prev => ({ ...prev, dob: e.target.value }))}
                              className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                        ) : (
                          <Input
                            type={field.type}
                            value={field.value}
                            onChange={e => setPersonalForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="h-8 mt-1 text-sm"
                            placeholder={`Enter your ${field.label.toLowerCase()}...`}
                          />
                        )
                      ) : (
                        <div className="mt-1">
                          {field.type === 'url' && field.value ? (
                            <a
                              href={field.value.startsWith('http') ? field.value : `https://${field.value}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate"
                            >
                              {field.value} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <p className={`text-sm ${field.key === 'dob' && !field.value ? 'text-muted-foreground' : 'font-medium'} whitespace-pre-wrap break-words`}>
                              {field.key === 'gender' && field.value 
                                ? field.value.charAt(0).toUpperCase() + field.value.slice(1) 
                                : field.key === 'dob' && field.value 
                                ? new Date(field.value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + new Date(field.value).getFullYear()
                                : field.value || <span className="text-muted-foreground italic font-normal text-xs">{field.key === 'dob' ? 'dd-mm-yyyy' : 'Not specified'}</span>}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </TabsContent>

          {/* ─── EDUCATION ─── */}
          <TabsContent value="education">
            <Section title="Education Details" icon={GraduationCap} action={
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={startAddEducation}><Plus className="h-3 w-3" /> Add Education</Button>
            }>
              <div className="grid gap-4">
                {addingEducation && (
                  <EducationForm
                    form={educationForm} setForm={setEducationForm}
                    onSave={saveEducation} onCancel={cancelEducationEdit}
                    isSaving={isSaving}
                  />
                )}
                {educations.map((edu) => (
                  editingEducationId === edu.id ? (
                    <EducationForm
                      key={edu.id}
                      form={educationForm} setForm={setEducationForm}
                      onSave={saveEducation} onCancel={cancelEducationEdit}
                      isSaving={isSaving}
                    />
                  ) : (
                    <div key={edu.id} className="relative p-4 rounded-xl border border-border/50 bg-muted/20">
                      <div className="flex items-center gap-2 mb-3 pr-16">
                        <Badge className={`${
                          edu.degree?.toLowerCase().includes('10') || edu.degree?.toLowerCase().includes('ssc') ? 'bg-primary/10 text-primary' 
                          : edu.degree?.toLowerCase().includes('12') || edu.degree?.toLowerCase().includes('inter') || edu.degree?.toLowerCase().includes('hsc') ? 'bg-amber-500/10 text-amber-600' 
                          : 'bg-emerald-500/10 text-emerald-600'
                        } border-0 text-xs`}>{edu.degree || 'Degree'}</Badge>
                        <span className="text-xs text-muted-foreground">{edu.end_year ? edu.end_year : (edu.duration || '')}</span>
                      </div>
                      
                      <div className="absolute top-3 right-3 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => startEditEducation(edu)} disabled={isSaving}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => handleDeleteEducation(edu.id)} disabled={isSaving}><Trash2 className="h-3 w-3" /></Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs text-muted-foreground mb-1">
                            {edu.degree?.toLowerCase().includes('b.tech') || edu.degree?.toLowerCase().includes('graduation') ? 'College' : 'School'}
                          </p>
                          <p className="text-sm font-medium">{edu.institution || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {edu.degree?.toLowerCase().includes('10') || edu.degree?.toLowerCase().includes('ssc') ? 'Board' : edu.degree?.toLowerCase().includes('12') || edu.degree?.toLowerCase().includes('inter') ? 'Stream' : 'Degree / Branch'}
                          </p>
                          <p className="text-sm font-medium">{edu.field || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Year</p>
                          <p className="text-sm font-medium">
                            {edu.end_year || edu.start_year || edu.duration || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {edu.degree?.toLowerCase().includes('graduation') || edu.degree?.toLowerCase().includes('b.tech') ? 'CGPA' : 'Percentage'}
                          </p>
                          <p className="text-sm font-medium text-emerald-600">
                            {edu.cgpa ? (edu.degree?.toLowerCase().includes('graduation') || edu.degree?.toLowerCase().includes('b.tech') ? edu.cgpa : `${edu.cgpa}%`) : 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ))}
                {educations.length === 0 && !addingEducation && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No education details added yet.</p>
                  </div>
                )}
              </div>
            </Section>
          </TabsContent>

          {/* ─── PROJECTS ─── */}
          <TabsContent value="projects">
            <Section title="Projects" icon={Code} action={
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={startAddProject}><Plus className="h-3 w-3" /> Add Project</Button>
            }>
              <div className="grid gap-4">
                {addingProject && (
                  <ProjectForm
                    form={projectForm} setForm={setProjectForm}
                    onSave={saveProject} onCancel={cancelProjectEdit}
                    newTechTag={newTechTag} setNewTechTag={setNewTechTag}
                    onAddTag={addTechTag} onRemoveTag={removeTechTag}
                    isSaving={isSaving}
                  />
                )}
                {projects.map((project) => (
                  editingProjectId === project.id ? (
                    <ProjectForm
                      key={project.id}
                      form={projectForm} setForm={setProjectForm}
                      onSave={saveProject} onCancel={cancelProjectEdit}
                      newTechTag={newTechTag} setNewTechTag={setNewTechTag}
                      onAddTag={addTechTag} onRemoveTag={removeTechTag}
                      isSaving={isSaving}
                    />
                  ) : (
                    <div key={project.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold">{project.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{project.description}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {project.tech.map((t: string) => (
                              <Badge key={t} variant="secondary" className="text-[10px] bg-primary/5 text-primary border-0">{t}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => startEditProject(project)} disabled={isSaving}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => handleDeleteProject(project.id)} disabled={isSaving}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-3 pt-3 border-t border-border/30">
                        {project.github && (
                          <a href={project.github.startsWith('http') ? project.github : `https://${project.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <Github className="h-3 w-3" /> GitHub
                          </a>
                        )}
                        {project.live && (
                          <a href={project.live.startsWith('http') ? project.live : `https://${project.live}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="h-3 w-3" /> Live Demo
                          </a>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </Section>
          </TabsContent>

          {/* ─── SKILLS ─── */}
          <TabsContent value="skills">
            <div className="grid gap-4">
              <Section title="Technical Skills" icon={Code} action={
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setAddingSkillType(addingSkillType === 'technical' ? null : 'technical')}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              }>
                <div className="flex flex-wrap gap-2">
                  {skills.filter((s: any) => !s.name.startsWith('[S] ')).length > 0 ? (
                    skills.filter((s: any) => !s.name.startsWith('[S] ')).map((s: any) => (
                      <Badge key={s.id} variant="secondary" className="text-xs bg-primary/5 text-primary border-primary/20 px-3 py-1 gap-2">
                        {s.name.replace(/^\[[ST]\] /, '')}
                        <button onClick={() => handleDeleteSkill(s.id)} disabled={isSaving} className="hover:text-destructive opacity-50 hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">No technical skills added.</p>
                  )}
                </div>
                {addingSkillType === 'technical' && (
                  <div className="flex gap-2 mt-3">
                    <Input placeholder="Add technical skill..." value={newSkill} onChange={(e: any) => setNewSkill(e.target.value)} className="h-8 text-sm" 
                      onKeyDown={(e: any) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill('technical'))} />
                    <Button size="sm" className="h-8" onClick={() => handleAddSkill('technical')} disabled={isSaving}>
                      {isSaving ? '...' : <Check className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </Section>

              <Section title="Soft Skills" icon={MessageSquare} action={
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setAddingSkillType(addingSkillType === 'soft' ? null : 'soft')}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              }>
                <div className="flex flex-wrap gap-2">
                  {skills.filter((s: any) => s.name.startsWith('[S] ')).length > 0 ? (
                    skills.filter((s: any) => s.name.startsWith('[S] ')).map((s: any) => (
                      <Badge key={s.id} variant="secondary" className="text-xs bg-amber-500/5 text-amber-600 border-amber-500/20 px-3 py-1 gap-2">
                        {s.name.replace(/^\[[ST]\] /, '')}
                        <button onClick={() => handleDeleteSkill(s.id)} disabled={isSaving} className="hover:text-destructive opacity-50 hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">No soft skills added.</p>
                  )}
                </div>
                {addingSkillType === 'soft' && (
                  <div className="flex gap-2 mt-3">
                    <Input placeholder="Add soft skill..." value={newSkill} onChange={(e: any) => setNewSkill(e.target.value)} className="h-8 text-sm" 
                      onKeyDown={(e: any) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill('soft'))} />
                    <Button size="sm" className="h-8" onClick={() => handleAddSkill('soft')} disabled={isSaving}>
                      {isSaving ? '...' : <Check className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </Section>
            </div>
          </TabsContent>

          {/* ─── ACTIVITY ─── */}
          <TabsContent value="activity">
            <div className="grid gap-4">
              <Section title="Activity & Progress" icon={Target}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Tests Attempted', value: activity.testsAttempted, icon: ClipboardCheck, color: 'bg-primary/10 text-primary' },
                    { label: 'Mock Interviews', value: activity.mockInterviews, icon: Mic, color: 'bg-amber-500/10 text-amber-600' },
                    { label: 'Notes Completed', value: activity.notesCompleted, icon: BookOpen, color: 'bg-emerald-500/10 text-emerald-600' },
                    { label: 'Tasks Completed', value: activity.tasksCompleted, icon: MessageSquare, color: 'bg-blue-500/10 text-blue-600' },
                  ].map(stat => (
                    <div key={stat.label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 text-center">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xl font-bold">{stat.value}</span>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Achievements & Badges" icon={Trophy}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {mockBadges.map(badge => (
                    <div key={badge.label} className={`flex flex-col items-center gap-2 p-4 rounded-xl ${badge.color} text-center`}>
                      <span className="text-2xl">{badge.icon}</span>
                      <span className="text-xs font-medium">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

export default StudentProfile;
