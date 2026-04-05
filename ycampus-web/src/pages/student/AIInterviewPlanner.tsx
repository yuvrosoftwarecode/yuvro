import React, { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BrainCircuit, Target, Clock, BookOpen, CheckCircle2, Circle, AlertTriangle,
  TrendingUp, RotateCcw, Pause, Play, Settings2, ChevronDown, ChevronRight,
  Lightbulb, Bell, Mic, Code, Users, FileText, Calendar, Sparkles, ArrowRight
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

// ─── Dummy student profile ───
const studentProfile = {
  name: 'Rahul Kumar',
  department: 'Computer Science Engineering',
  semester: 5,
  performanceIndex: 72,
  notesCompletion: 65,
  avgTestScore: 68,
  assessmentAvg: 70,
  taskCompletion: 82,
  attendance: 85,
  strongAreas: ['Arrays', 'Sorting Algorithms', 'Basic DBMS'],
  weakAreas: ['Dynamic Programming', 'Graph Algorithms', 'Operating Systems'],
};

// ─── Roadmap dummy data ───
const roadmapWeeks = [
  {
    week: 1, title: 'Data Structures', topics: [
      { name: 'Arrays', status: 'completed' as const, problems: 15, problemsDone: 15 },
      { name: 'Strings', status: 'in-progress' as const, problems: 12, problemsDone: 7 },
      { name: 'Hash Maps', status: 'pending' as const, problems: 10, problemsDone: 0 },
    ],
    tasks: ['Study Arrays concept notes', 'Solve 15 coding problems', 'Attempt Array practice test'],
    mockInterview: 'Coding interview simulation',
  },
  {
    week: 2, title: 'Algorithms', topics: [
      { name: 'Sorting', status: 'pending' as const, problems: 10, problemsDone: 0 },
      { name: 'Binary Search', status: 'pending' as const, problems: 12, problemsDone: 0 },
      { name: 'Recursion', status: 'pending' as const, problems: 8, problemsDone: 0 },
    ],
    tasks: ['Practice 20 coding problems', 'Take algorithm test', 'Review weak topics'],
    mockInterview: 'Algorithm problem-solving session',
  },
  {
    week: 3, title: 'Core Subjects', topics: [
      { name: 'DBMS', status: 'pending' as const, problems: 8, problemsDone: 0 },
      { name: 'Operating Systems', status: 'pending' as const, problems: 10, problemsDone: 0 },
      { name: 'Computer Networks', status: 'pending' as const, problems: 8, problemsDone: 0 },
    ],
    tasks: ['Review notes', 'Take subject quiz', 'Technical mock interview'],
    mockInterview: 'Technical interview simulation',
  },
  {
    week: 4, title: 'Interview Simulation', topics: [
      { name: 'Mock Coding', status: 'pending' as const, problems: 3, problemsDone: 0 },
      { name: 'System Design', status: 'pending' as const, problems: 1, problemsDone: 0 },
      { name: 'HR Practice', status: 'pending' as const, problems: 1, problemsDone: 0 },
    ],
    tasks: ['3 coding mock interviews', '1 system design interview', '1 HR interview practice'],
    mockInterview: 'Full-stack interview simulation',
  },
];

const todaysTasks = [
  { task: 'Practice Binary Search problems (5 questions)', status: 'pending' as const },
  { task: 'Review Recursion concept notes', status: 'in-progress' as const },
  { task: 'Attempt Algorithm practice test', status: 'pending' as const },
  { task: 'Review incorrect test answers', status: 'pending' as const },
];

const insights = [
  { icon: TrendingUp, text: 'Your coding accuracy improved by 12% in the last 7 days.', type: 'positive' as const },
  { icon: CheckCircle2, text: 'You are strong in Arrays and Sorting.', type: 'positive' as const },
  { icon: AlertTriangle, text: 'Dynamic Programming requires additional practice.', type: 'warning' as const },
  { icon: Mic, text: 'Recommended 2 more coding mock interviews before your target interview.', type: 'info' as const },
];

const notifications = [
  { title: 'Daily Reminder', message: 'You have 3 tasks scheduled today for Amazon interview preparation.', type: 'info' },
  { title: 'Missed Task Alert', message: "You missed yesterday's recursion practice task.", type: 'warning' },
  { title: 'Mock Interview Reminder', message: 'Technical mock interview scheduled tomorrow.', type: 'info' },
  { title: 'Weekly Report', message: 'Your interview readiness increased from 57% to 63% this week.', type: 'positive' },
];

const mockInterviewRecs = [
  { type: 'Coding Interview', focus: 'Dynamic Programming', icon: Code },
  { type: 'Technical Interview', focus: 'Operating Systems', icon: FileText },
  { type: 'HR Interview', focus: 'Behavioral Preparation', icon: Users },
];

// ─── Status helpers ───
const statusIcon = (s: string) => {
  if (s === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (s === 'in-progress') return <Clock className="h-4 w-4 text-amber-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};
const statusBadge = (s: string) => {
  if (s === 'completed') return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Completed</Badge>;
  if (s === 'in-progress') return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">In Progress</Badge>;
  return <Badge variant="outline" className="text-xs">Pending</Badge>;
};

// ═══════════════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════════════
function SetupScreen({ onStart }: { onStart: (cfg: any) => void }) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [timeline, setTimeline] = useState('');
  const [hours, setHours] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [focus, setFocus] = useState<string[]>([]);

  const toggleFocus = (f: string) =>
    setFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const canStart = company && role && timeline && hours && focus.length > 0;

  return (
    <StudentLayout>
      <div className="space-y-6">
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
              <div><span className="text-muted-foreground">Name</span><p className="font-medium">{studentProfile.name}</p></div>
              <div><span className="text-muted-foreground">Department</span><p className="font-medium">CSE</p></div>
              <div><span className="text-muted-foreground">Semester</span><p className="font-medium">{studentProfile.semester}</p></div>
              <div><span className="text-muted-foreground">Performance Index</span><p className="font-medium">{studentProfile.performanceIndex}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground mr-1">Strong:</span>
              {studentProfile.strongAreas.map(a => <Badge key={a} className="bg-green-100 text-green-700 border-green-200 text-xs">{a}</Badge>)}
              <span className="text-xs text-muted-foreground ml-2 mr-1">Weak:</span>
              {studentProfile.weakAreas.map(a => <Badge key={a} variant="outline" className="text-xs border-red-200 text-red-600">{a}</Badge>)}
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
                    {['Google', 'Amazon', 'Microsoft', 'TCS', 'Infosys'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {['Software Engineer', 'Backend Developer', 'Full Stack Developer', 'Data Analyst'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Preparation Timeline</label>
                <Select value={timeline} onValueChange={setTimeline}>
                  <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                  <SelectContent>
                    {['15 Days', '30 Days', '60 Days', '90 Days'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Daily Study Time</label>
                <Select value={hours} onValueChange={setHours}>
                  <SelectTrigger><SelectValue placeholder="Select hours" /></SelectTrigger>
                  <SelectContent>
                    {['1 Hour', '2 Hours', '3 Hours', '4 Hours'].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
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
              onClick={() => onStart({ company, role, timeline, hours, focus, interviewType })}
              disabled={!canStart}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Generate Preparation Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}

// ═══════════════════════════════════════════════
// PREPARATION DASHBOARD
// ═══════════════════════════════════════════════
function PreparationDashboard({ config, onReset }: { config: any; onReset: () => void }) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <StudentLayout>
      <div className="space-y-6 ">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Interview Planner</h1>
              <p className="text-xs text-muted-foreground">
                {config.company} · {config.role} · {config.timeline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <Play className="h-3.5 w-3.5 mr-1" /> : <Pause className="h-3.5 w-3.5 mr-1" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Settings
            </Button>
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">Company</span><p className="font-medium">{config.company}</p></div>
              <div><span className="text-muted-foreground">Role</span><p className="font-medium">{config.role}</p></div>
              <div><span className="text-muted-foreground">Timeline</span><p className="font-medium">{config.timeline}</p></div>
              <div><span className="text-muted-foreground">Daily Hours</span><p className="font-medium">{config.hours}</p></div>
            </CardContent>
          </Card>
        )}

        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Preparation', value: '48%', sub: '14 of 30 days', color: 'text-amber-600' },
            { label: 'Interview Readiness', value: '63%', sub: `${config.company} SDE`, color: 'text-green-600' },
            { label: 'Topics Completed', value: '8', sub: 'of 12 topics', color: 'text-blue-600' },
            { label: 'Remaining Tasks', value: '12', sub: '4 tests · 1 mock', color: 'text-foreground' },
          ].map(m => (
            <Card key={m.label} className="border-border/60">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress bar */}
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Preparation Progress</span>
              <span className="text-muted-foreground">48%</span>
            </div>
            <Progress value={48} className="h-2.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Topic Mastery: 62%</span>
              <span>Coding Accuracy: 71%</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="roadmap" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="mock">Mock Interviews</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
          </TabsList>

          {/* ── ROADMAP TAB ── */}
          <TabsContent value="roadmap" className="space-y-3">
            {roadmapWeeks.map(w => {
              const open = expandedWeek === w.week;
              const completed = w.topics.filter(t => t.status === 'completed').length;
              const pct = Math.round((completed / w.topics.length) * 100);
              return (
                <Card key={w.week} className="border-border/60">
                  <button
                    onClick={() => setExpandedWeek(open ? null : w.week)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold
                        ${pct === 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        W{w.week}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{w.title}</p>
                        <p className="text-xs text-muted-foreground">{completed}/{w.topics.length} topics · {w.tasks.length} tasks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="w-20 h-1.5" />
                      {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {open && (
                    <CardContent className="border-t pt-4 space-y-4">
                      {/* Topics */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">TOPICS</p>
                        <div className="space-y-2">
                          {w.topics.map(t => (
                            <div key={t.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-2">
                                {statusIcon(t.status)}
                                <span className="text-sm font-medium">{t.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{t.problemsDone}/{t.problems} problems</span>
                                {statusBadge(t.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Tasks */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">TASKS</p>
                        <ul className="space-y-1.5">
                          {w.tasks.map((t, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                              <ArrowRight className="h-3 w-3 text-orange-500" /> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Mock */}
                      <div className="flex items-center gap-2 text-sm">
                        <Mic className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Mock Interview:</span>
                        <span className="font-medium">{w.mockInterview}</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {/* ── TODAY TAB ── */}
          <TabsContent value="today" className="space-y-3">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" /> Today's Tasks
                </CardTitle>
                <CardDescription>4 tasks scheduled · 2 Hours study time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {todaysTasks.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      {statusIcon(t.status)}
                      <span className="text-sm">{t.task}</span>
                    </div>
                    {statusBadge(t.status)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── INSIGHTS TAB ── */}
          <TabsContent value="insights" className="space-y-3">
            {insights.map((ins, i) => (
              <Card key={i} className={`border-border/60 ${ins.type === 'warning' ? 'border-l-4 border-l-amber-400' : ins.type === 'positive' ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-blue-400'}`}>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <ins.icon className={`h-5 w-5 shrink-0 ${ins.type === 'warning' ? 'text-amber-500' : ins.type === 'positive' ? 'text-green-600' : 'text-blue-500'}`} />
                  <p className="text-sm">{ins.text}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── MOCK INTERVIEWS TAB ── */}
          <TabsContent value="mock" className="space-y-3">
            <p className="text-sm text-muted-foreground">Recommended based on your weak areas:</p>
            {mockInterviewRecs.map((m, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <m.icon className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.type}</p>
                      <p className="text-xs text-muted-foreground">Focus: {m.focus}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Start</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── NOTIFICATIONS TAB ── */}
          <TabsContent value="notifications" className="space-y-3">
            {notifications.map((n, i) => (
              <Card key={i} className={`border-border/60 ${n.type === 'warning' ? 'border-l-4 border-l-red-400' : n.type === 'positive' ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-blue-400'}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{n.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}

// ═══════════════════════════════════════════════
// MAIN PAGE – switches between setup & dashboard
// ═══════════════════════════════════════════════
export default function AIInterviewPlanner() {
  const [config, setConfig] = useState<any>(null);

  if (!config) return <SetupScreen onStart={setConfig} />;
  return <PreparationDashboard config={config} onReset={() => setConfig(null)} />;
}
