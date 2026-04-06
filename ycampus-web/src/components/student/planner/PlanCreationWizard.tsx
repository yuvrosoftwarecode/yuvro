import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrainCircuit, Sparkles, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from "sonner";
import { 
  Company, 
  Role, 
  PrepTimeline, 
  StudyTime,
  fetchCompanies,
  fetchRoles,
  fetchPrepTimelines,
  fetchStudyTimes,
  createStudentPlan
} from '@/services/plannerService';
import { useAuth } from '@/contexts/AuthContext';
import studentService, { Student } from '@/services/studentService';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const getBranchShortForm = (name: string) => {
  if (!name) return "...";
  const commonMap: Record<string, string> = {
    "Computer Science Engineering": "CSE",
    "Computer Science and Engineering": "CSE",
    "Electronics and Communication Engineering": "ECE",
    "Electronics & Communication Engineering": "ECE",
    "Information Technology": "IT",
    "Mechanical Engineering": "MECH",
    "Civil Engineering": "CIVIL",
    "Electrical and Electronics Engineering": "EEE",
  };
  if (commonMap[name]) return commonMap[name];
  return name
    .split(/\s+/)
    .filter(w => !["and", "&", "of"].includes(w.toLowerCase()))
    .map(w => w.charAt(0))
    .join("")
    .toUpperCase();
};

interface PlanCreationWizardProps {
  onPlanCreated: (plan: any) => void;
}

export default function PlanCreationWizard({ onPlanCreated }: PlanCreationWizardProps) {
  const { user } = useAuth();
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [timelines, setTimelines] = useState<PrepTimeline[]>([]);
  const [studyTimes, setStudyTimes] = useState<StudyTime[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form State
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [timeline, setTimeline] = useState('');
  const [hours, setHours] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [focus, setFocus] = useState<string[]>([]);

  useEffect(() => {
    loadOptions();
    if (user?.id) {
       loadStudentProfile(userIdToString(user.id));
    }
  }, [user]);

  const loadStudentProfile = async (userId: string) => {
    try {
      const res = await studentService.getStudents({ user: userId });
      if (res.results && res.results.length > 0) {
        setStudentProfile(res.results[0]);
      }
    } catch (error) {
      console.error("Failed to fetch student profile", error);
    }
  };

  const userIdToString = (id: string | number) => id.toString();

  useEffect(() => {
    if (company) {
      loadRoles(company);
    }
  }, [company]);

  const loadOptions = async () => {
    try {
      const [comps, times, hrs] = await Promise.all([
        fetchCompanies(),
        fetchPrepTimelines(),
        fetchStudyTimes()
      ]);
      setCompanies(comps);
      setTimelines(times.sort((a, b) => a.days - b.days));
      setStudyTimes(hrs.sort((a, b) => a.hours - b.hours));
    } catch (error) {
      toast.error("Failed to load options");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async (companyId: string) => {
    try {
      const resp = await fetchRoles(companyId);
      setRoles(resp);
    } catch (error) {
      toast.error("Failed to load roles");
    }
  };

  const toggleFocus = (f: string) =>
    setFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleStart = async () => {
    if (!company || !role || !timeline || !hours || focus.length === 0) {
      toast.error("Please fill in all options");
      return;
    }

    setCreating(true);
    try {
      // Find the specific duration and study hours
      const plan = await createStudentPlan({
        company: company,
        role: role,
        duration_days: parseInt(timeline),
        daily_hours: parseInt(hours),
      });
      onPlanCreated(plan);
    } catch (error) {
      toast.error("Failed to generate plan");
    } finally {
      setCreating(false);
    }
  };

  const canStart = company && role && timeline && hours && focus.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 ">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center">
          <BrainCircuit className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Interview Planner</h1>
          <p className="text-sm text-muted-foreground">Set your target and get a personalized preparation roadmap</p>
        </div>
      </div>

      {/* Student snapshot */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Profile Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
               <span className="text-muted-foreground">Name</span>
               <p className="font-medium">
                 {studentProfile ? `${studentProfile.user_details.first_name} ${studentProfile.user_details.last_name}` : user?.username || 'Loading...'}
               </p>
            </div>
            <div>
               <span className="text-muted-foreground">Department</span>
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <p className="font-medium  decoration-muted-foreground/50">
                       {getBranchShortForm(studentProfile?.department_name || 'CSE')}
                     </p>
                   </TooltipTrigger>
                   <TooltipContent>
                     <p>{studentProfile?.department_name || 'Computer Science Engineering'}</p>
                   </TooltipContent>
                 </Tooltip>
               </TooltipProvider>
            </div>
            <div>
               <span className="text-muted-foreground">Semester</span>
               <p className="font-medium">{studentProfile?.semester_number || '5'}</p>
            </div>
            <div><span className="text-muted-foreground">Performance Index</span><p className="font-medium">72</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground mr-1">Strong:</span>
            {['Arrays', 'Sorting Algorithms', 'Basic DBMS'].map(a => <Badge key={a} className="bg-green-100 text-green-700 border-green-200 text-xs">{a}</Badge>)}
            <span className="text-xs text-muted-foreground ml-2 mr-1">Weak:</span>
            {['Dynamic Programming', 'Graph Algorithms', 'Operating Systems'].map(a => <Badge key={a} variant="outline" className="text-xs border-red-200 text-red-600">{a}</Badge>)}
          </div>
        </CardContent>
      </Card>

      {/* Setup form */}
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-base">Preparation Setup</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Company</label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Role</label>
              <Select value={role} onValueChange={setRole} disabled={!company}>
                <SelectTrigger><SelectValue placeholder={company ? "Select role" : "Select company first"} /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Preparation Timeline</label>
              <Select value={timeline} onValueChange={setTimeline}>
                <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                <SelectContent>
                  {timelines.map(t => <SelectItem key={t.id} value={t.days.toString()}>{t.days} Days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Daily Study Time</label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger><SelectValue placeholder="Select hours" /></SelectTrigger>
                <SelectContent>
                  {studyTimes.map(h => <SelectItem key={h.id} value={h.hours.toString()}>{h.hours} Hours</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Interview Type</label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {['Product Company', 'Service Company', 'Startup'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Focus areas */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Focus Areas</label>
            <div className="flex flex-wrap gap-3">
              {['DSA', 'Core Subjects', 'Coding Practice', 'System Design', 'HR Interview'].map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={focus.includes(f)} onCheckedChange={() => toggleFocus(f)} />
                  <span className="text-sm">{f}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={!canStart || creating}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />} 
            Generate Preparation Plan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
