import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import profileService from '@/services/profileService';
import studentDashboardService from '@/services/studentDashboardService';
import {
  User, Mail, Phone, MapPin, Linkedin, Upload, FileText,
  GraduationCap, Code, Trophy, TrendingUp, Brain,
  Plus, Pencil, Check, X, ExternalLink, Github, Sparkles,
  BookOpen, ClipboardCheck, Mic, MessageSquare, Target, Award,
  ChevronRight, Star, Zap, AlertTriangle, Trash2
} from 'lucide-react';

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

const defaultEducation = {
  tenth: { school: 'Delhi Public School', board: 'CBSE', year: '2019', percentage: '92.4' },
  twelfth: { school: 'Sri Chaitanya Junior College', stream: 'MPC', year: '2021', percentage: '88.6' },
  graduation: { college: 'JNTU Hyderabad', degree: 'B.Tech', branch: 'CSE', year: '2025', cgpa: '8.4' },
};

const defaultProjects = [
  { id: 1, title: 'E-Commerce Platform', description: 'Full-stack e-commerce app with payment integration', tech: ['React', 'Node.js', 'MongoDB'], github: 'github.com/rahul/ecom', live: 'ecom-demo.vercel.app' },
  { id: 2, title: 'AI Chatbot', description: 'NLP-based chatbot for customer support', tech: ['Python', 'Flask', 'TensorFlow'], github: 'github.com/rahul/chatbot', live: '' },
];

const mockSkills = {
  technical: ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'DSA', 'System Design', 'Git'],
  soft: ['Communication', 'Teamwork', 'Problem Solving', 'Leadership', 'Time Management'],
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

// --- Project Form ---
const ProjectForm = ({
  form, setForm, onSave, onCancel, newTechTag, setNewTechTag, onAddTag, onRemoveTag
}: {
  form: typeof defaultProjects[0];
  setForm: React.Dispatch<React.SetStateAction<typeof defaultProjects[0]>>;
  onSave: () => void;
  onCancel: () => void;
  newTechTag: string;
  setNewTechTag: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (t: string) => void;
}) => (
  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
    <Input placeholder="Project Title" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="h-9 text-sm" />
    <Textarea placeholder="Description" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="text-sm min-h-[60px]" />
    <div className="flex flex-wrap gap-1.5">
      {form.tech.map(t => (
        <Badge key={t} variant="secondary" className="text-[10px] bg-primary/10 text-primary gap-1 pr-1">
          {t}
          <button onClick={() => onRemoveTag(t)} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
        </Badge>
      ))}
      <div className="flex gap-1">
        <Input placeholder="Add tech..." value={newTechTag} onChange={e => setNewTechTag(e.target.value)} className="h-7 w-28 text-xs"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAddTag())} />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAddTag}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Input placeholder="GitHub URL" value={form.github} onChange={e => setForm(prev => ({ ...prev, github: e.target.value }))} className="h-8 text-xs" />
      <Input placeholder="Live URL" value={form.live} onChange={e => setForm(prev => ({ ...prev, live: e.target.value }))} className="h-8 text-xs" />
    </div>
    <div className="flex gap-2 justify-end">
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel}>Cancel</Button>
      <Button size="sm" className="h-8 text-xs gap-1" onClick={onSave}><Check className="h-3 w-3" /> Save</Button>
    </div>
  </div>
);

// --- Main Component ---
const StudentProfile = () => {
  const { user } = useAuth();
  
  // Real Data Queries
  const { data: profileDetail, isLoading: profileLoading } = useQuery({
    queryKey: ['profileDetail'],
    queryFn: profileService.fetchProfileDetail,
  });

  const { data: testPerf } = useQuery({
    queryKey: ['testPerformance'],
    queryFn: () => studentDashboardService.getTestPerformance(),
  });

  const { data: tasksStats } = useQuery({
    queryKey: ['tasksSummary'],
    queryFn: () => studentDashboardService.getTasksSummary(),
  });

  const { data: assessmentsStats } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => studentDashboardService.getAssessments(),
  });

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingEducation, setEditingEducation] = useState(false);
  
  // States initialized with mock data, but will be updated by useEffect when real data arrives
  const [education, setEducation] = useState(defaultEducation);
  const [projects, setProjects] = useState(defaultProjects);
  const [skills, setSkills] = useState(mockSkills);
  const [activity, setActivity] = useState(mockActivity);

  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState(defaultProjects[0]);
  const [addingProject, setAddingProject] = useState(false);
  const [newTechTag, setNewTechTag] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [addingSkillType, setAddingSkillType] = useState<'technical' | 'soft' | null>(null);

  // Sync real data to state
  useEffect(() => {
    if (profileDetail) {
      // Map profile education
      if (profileDetail.education && profileDetail.education.length > 0) {
        // Simple mapping for now, assuming order or matching by degree
        const grad = profileDetail.education.find(e => e.degree.toLowerCase().includes('b.tech') || e.degree.toLowerCase().includes('be'));
        if (grad) {
          setEducation(prev => ({
            ...prev,
            graduation: {
              college: grad.institution,
              degree: grad.degree,
              branch: grad.field,
              year: grad.end_year?.toString() || prev.graduation.year,
              cgpa: grad.cgpa || prev.graduation.cgpa
            }
          }));
        }
      }

      // Map profile projects
      if (profileDetail.projects && profileDetail.projects.length > 0) {
        setProjects(profileDetail.projects.map((p: any, idx: number) => ({
          id: idx + 1, // local id for mock UI
          title: p.title,
          description: p.description,
          tech: p.tech_stack || [],
          github: p.github_link || '',
          live: p.live_link || ''
        })));
      }

      // Map profile skills
      if (profileDetail.skills && profileDetail.skills.length > 0) {
        setSkills((prev: any) => ({
          ...prev,
          technical: profileDetail.skills.map((s: any) => s.name)
        }));
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

  const handleEducationChange = (level: 'tenth' | 'twelfth' | 'graduation', field: string, value: string) => {
    setEducation(prev => ({ ...prev, [level]: { ...prev[level], [field]: value } }));
  };

  const startEditProject = (project: typeof defaultProjects[0]) => {
    setEditingProjectId(project.id);
    setProjectForm({ ...project });
    setAddingProject(false);
  };

  const startAddProject = () => {
    const newId = Math.max(0, ...projects.map(p => p.id)) + 1;
    setProjectForm({ id: newId, title: '', description: '', tech: [], github: '', live: '' });
    setAddingProject(true);
    setEditingProjectId(null);
  };

  const saveProject = () => {
    if (!projectForm.title.trim()) return;
    if (addingProject) {
      setProjects(prev => [...prev, projectForm]);
    } else {
      setProjects(prev => prev.map(p => p.id === projectForm.id ? projectForm : p));
    }
    setEditingProjectId(null);
    setAddingProject(false);
  };

  const cancelProjectEdit = () => {
    setEditingProjectId(null);
    setAddingProject(false);
  };

  const addTechTag = () => {
    if (newTechTag.trim() && !projectForm.tech.includes(newTechTag.trim())) {
      setProjectForm(prev => ({ ...prev, tech: [...prev.tech, newTechTag.trim()] }));
      setNewTechTag('');
    }
  };

  const removeTechTag = (tag: string) => {
    setProjectForm(prev => ({ ...prev, tech: prev.tech.filter(t => t !== tag) }));
  };

  const initials = (user?.name || mockProfile.name).split(' ').map(n => n[0]).join('');

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
        {/* ─── PROFILE HEADER ─── */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10" />
          <CardContent className="relative pt-0 pb-5 px-5">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-10">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors">
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">
                  {profileDetail?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : mockProfile.name)}
                </h1>
                <p className="text-sm text-muted-foreground">{profileDetail?.id ? `ID: ${profileDetail.id}` : mockProfile.rollNo}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{profileDetail?.title || mockProfile.department}</Badge>
                  <span className="text-xs text-muted-foreground">Location: {profileDetail?.location || '—'}</span>
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
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {mockProfile.phone}</div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Linkedin className="h-3.5 w-3.5" /> {profileDetail?.links?.linkedin || mockProfile.linkedin}</div>
              {profileLoading && <span className="text-xs text-muted-foreground animate-pulse ml-auto">Loading...</span>}
              <Button variant="outline" size="sm" className={profileLoading ? "hidden" : "ml-auto h-8 text-xs gap-1.5"}><Upload className="h-3 w-3" /> Upload Resume</Button>
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
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setEditingPersonal(!editingPersonal)}>
                {editingPersonal ? <><Check className="h-3 w-3" /> Save</> : <><Pencil className="h-3 w-3" /> Edit</>}
              </Button>
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', value: profileDetail?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : mockProfile.name), icon: User },
                  { label: 'Email', value: profileDetail?.links?.email || user?.email || mockProfile.email, icon: Mail },
                  { label: 'Phone', value: mockProfile.phone, icon: Phone },
                  { label: 'About', value: profileDetail?.about || '—', icon: FileText },
                  { label: 'Gender', value: profileDetail?.gender || mockProfile.gender, icon: User },
                  { label: 'Location', value: profileDetail?.location || mockProfile.location, icon: MapPin },
                ].map((field) => (
                  <div key={field.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <field.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      {editingPersonal ? (
                        <Input defaultValue={field.value} className="h-8 mt-1 text-sm" />
                      ) : (
                        <p className="text-sm font-medium truncate">{field.value}</p>
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
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setEditingEducation(!editingEducation)}>
                {editingEducation ? <><Check className="h-3 w-3" /> Save</> : <><Pencil className="h-3 w-3" /> Edit</>}
              </Button>
            }>
              <div className="space-y-4">
                {/* 10th */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">10th</Badge>
                    <span className="text-xs text-muted-foreground">{education.tenth.year}</span>
                  </div>
                  {editingEducation ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-xs text-muted-foreground mb-1">School</p><Input value={education.tenth.school} onChange={e => handleEducationChange('tenth', 'school', e.target.value)} className="h-8 text-sm" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">Board</p><Input value={education.tenth.board} onChange={e => handleEducationChange('tenth', 'board', e.target.value)} className="h-8 text-sm" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">Year</p><Input value={education.tenth.year} onChange={e => handleEducationChange('tenth', 'year', e.target.value)} className="h-8 text-sm" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">Percentage</p><Input value={education.tenth.percentage} onChange={e => handleEducationChange('tenth', 'percentage', e.target.value)} className="h-8 text-sm" /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-xs text-muted-foreground">School</p><p className="text-sm font-medium">{education.tenth.school}</p></div>
                      <div><p className="text-xs text-muted-foreground">Board</p><p className="text-sm font-medium">{education.tenth.board}</p></div>
                      <div><p className="text-xs text-muted-foreground">Year</p><p className="text-sm font-medium">{education.tenth.year}</p></div>
                      <div><p className="text-xs text-muted-foreground">Percentage</p><p className="text-sm font-medium text-emerald-600">{education.tenth.percentage}%</p></div>
                    </div>
                  )}
                </div>
                {/* 12th */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-amber-500/10 text-amber-600 border-0 text-xs">12th</Badge>
                    <span className="text-xs text-muted-foreground">{education.twelfth.year}</span>
                  </div>
                  {editingEducation ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-xs text-muted-foreground mb-1">School</p><Input value={education.twelfth.school} onChange={e => handleEducationChange('twelfth', 'school', e.target.value)} className="h-8 text-sm" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">Stream</p><Input value={education.twelfth.stream} onChange={e => handleEducationChange('twelfth', 'stream', e.target.value)} className="h-8 text-sm" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">Year</p><Input value={education.twelfth.year} onChange={e => handleEducationChange('twelfth', 'year', e.target.value)} className="h-8 text-sm" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">Percentage</p><Input value={education.twelfth.percentage} onChange={e => handleEducationChange('twelfth', 'percentage', e.target.value)} className="h-8 text-sm" /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-xs text-muted-foreground">School</p><p className="text-sm font-medium">{education.twelfth.school}</p></div>
                      <div><p className="text-xs text-muted-foreground">Stream</p><p className="text-sm font-medium">{education.twelfth.stream}</p></div>
                      <div><p className="text-xs text-muted-foreground">Year</p><p className="text-sm font-medium">{education.twelfth.year}</p></div>
                      <div><p className="text-xs text-muted-foreground">Percentage</p><p className="text-sm font-medium text-emerald-600">{education.twelfth.percentage}%</p></div>
                    </div>
                  )}
                </div>
                {/* Graduation */}
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs">Graduation</Badge>
                    <span className="text-xs text-muted-foreground">{education.graduation.year}</span>
                  </div>
                  {editingEducation ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-xs text-muted-foreground mb-1">College</p><Input value={education.graduation.college} onChange={e => handleEducationChange('graduation', 'college', e.target.value)} className="h-8 text-sm" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">Degree / Branch</p>
                        <div className="flex gap-1">
                          <Input value={education.graduation.degree} onChange={e => handleEducationChange('graduation', 'degree', e.target.value)} className="h-8 text-sm" placeholder="Degree" />
                          <Input value={education.graduation.branch} onChange={e => handleEducationChange('graduation', 'branch', e.target.value)} className="h-8 text-sm" placeholder="Branch" />
                        </div>
                      </div>
                      <div><p className="text-xs text-muted-foreground mb-1">Year</p><Input value={education.graduation.year} onChange={e => handleEducationChange('graduation', 'year', e.target.value)} className="h-8 text-sm" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">CGPA</p><Input value={education.graduation.cgpa} onChange={e => handleEducationChange('graduation', 'cgpa', e.target.value)} className="h-8 text-sm" /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><p className="text-xs text-muted-foreground">College</p><p className="text-sm font-medium">{education.graduation.college}</p></div>
                      <div><p className="text-xs text-muted-foreground">Degree / Branch</p><p className="text-sm font-medium">{education.graduation.degree} – {education.graduation.branch}</p></div>
                      <div><p className="text-xs text-muted-foreground">Year</p><p className="text-sm font-medium">{education.graduation.year}</p></div>
                      <div><p className="text-xs text-muted-foreground">CGPA</p><p className="text-sm font-medium text-emerald-600">{education.graduation.cgpa}</p></div>
                    </div>
                  )}
                </div>
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
                    />
                  ) : (
                    <div key={project.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold">{project.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{project.description}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {project.tech.map(t => (
                              <Badge key={t} variant="secondary" className="text-[10px] bg-primary/5 text-primary border-0">{t}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => startEditProject(project)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => setProjects(prev => prev.filter(p => p.id !== project.id))}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-3 pt-3 border-t border-border/30">
                        {project.github && (
                          <a href="#" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <Github className="h-3 w-3" /> GitHub
                          </a>
                        )}
                        {project.live && (
                          <a href="#" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
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
                  {skills.technical.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs bg-primary/5 text-primary border-primary/20 px-3 py-1">{s}</Badge>
                  ))}
                </div>
                {addingSkillType === 'technical' && (
                  <div className="flex gap-2 mt-3">
                    <Input placeholder="Add skill..." value={newSkill} onChange={e => setNewSkill(e.target.value)} className="h-8 text-sm" />
                    <Button size="sm" className="h-8" onClick={() => {
                      if (newSkill.trim()) {
                        setSkills(prev => ({ ...prev, technical: [...prev.technical, newSkill.trim()] }));
                        setNewSkill('');
                      }
                    }}><Check className="h-3 w-3" /></Button>
                  </div>
                )}
              </Section>
              <Section title="Soft Skills" icon={MessageSquare} action={
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setAddingSkillType(addingSkillType === 'soft' ? null : 'soft')}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              }>
                <div className="flex flex-wrap gap-2">
                  {skills.soft.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs bg-amber-500/5 text-amber-600 border-amber-500/20 px-3 py-1">{s}</Badge>
                  ))}
                </div>
                {addingSkillType === 'soft' && (
                  <div className="flex gap-2 mt-3">
                    <Input placeholder="Add skill..." value={newSkill} onChange={e => setNewSkill(e.target.value)} className="h-8 text-sm" />
                    <Button size="sm" className="h-8" onClick={() => {
                      if (newSkill.trim()) {
                        setSkills(prev => ({ ...prev, soft: [...prev.soft, newSkill.trim()] }));
                        setNewSkill('');
                      }
                    }}><Check className="h-3 w-3" /></Button>
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
