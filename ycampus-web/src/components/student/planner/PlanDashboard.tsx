import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BrainCircuit, Clock, CheckCircle2, Circle, AlertTriangle,
  TrendingUp, RotateCcw, Pause, Play, Settings2, ChevronDown, ChevronRight,
  Mic, Code, Users, FileText, Calendar, Sparkles, ArrowRight, Loader2
} from 'lucide-react';
import { toast } from "sonner";
import { 
  StudentPlan, 
  StudentPlanTask, 
  fetchPlanTasks, 
  updateTaskStatus 
} from '@/services/plannerService';

interface PlanDashboardProps {
  plan: StudentPlan;
  onReset: () => void;
}

// ─── Status helpers ───
const statusIcon = (completed: boolean) => {
  if (completed) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};
const statusBadge = (completed: boolean) => {
  if (completed) return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Completed</Badge>;
  return <Badge variant="outline" className="text-xs">Pending</Badge>;
};

export default function PlanDashboard({ plan, onReset }: PlanDashboardProps) {
  const [tasks, setTasks] = useState<StudentPlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, [plan.id]);

  const loadData = async () => {
    try {
      const data = await fetchPlanTasks(plan.id);
      setTasks(data.sort((a, b) => a.day_number - b.day_number));
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      await updateTaskStatus(taskId, !currentStatus);
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, is_completed: !currentStatus } : t
      ));
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const renderDayCard = (day: string, dayTasks: StudentPlanTask[]) => {
    const dayNum = parseInt(day);
    const open = expandedDay === dayNum;
    const completed = dayTasks.filter(t => t.is_completed).length;
    const pct = Math.round((completed / dayTasks.length) * 100);
    
    return (
      <Card key={day} className={`border-border/60 transition-all ${open ? 'shadow-sm bg-background/50' : ''}`}>
        <button
          onClick={() => setExpandedDay(open ? null : dayNum)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm
              ${pct === 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              D{day}
            </div>
            <div>
              <p className="font-semibold text-sm">Day {day}</p>
              <p className="text-[10px] text-muted-foreground  tracking-tight">{completed}/{dayTasks.length} Task Progress</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
               <span className="text-[10px] text-muted-foreground font-bold">{pct}%</span>
               <Progress value={pct} className="w-16 h-1.5" />
            </div>
            {open ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
        {open && (
          <CardContent className="border-t pt-4 space-y-4">
            <div className="space-y-2">
               {dayTasks.map(task => (
                 <div key={task.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 group hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleToggleTask(task.id, task.is_completed)}>
                       {statusIcon(task.is_completed)}
                       <span className={`text-sm font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <Badge variant="outline" className="text-[10px]  font-bold text-muted-foreground bg-background">{task.task_type}</Badge>
                       {statusBadge(task.is_completed)}
                    </div>
                 </div>
               ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // Group tasks by day
  const tasksByDay = tasks.reduce((acc, task) => {
    if (!acc[task.day_number]) acc[task.day_number] = [];
    acc[task.day_number].push(task);
    return acc;
  }, {} as Record<number, StudentPlanTask[]>);
  
  // Group days by week
  const tasksByWeek = Object.entries(tasksByDay).reduce((acc, [day, dayTasks]) => {
    const weekNum = Math.ceil(parseInt(day) / 7);
    if (!acc[weekNum]) acc[weekNum] = {};
    acc[weekNum][parseInt(day)] = dayTasks;
    return acc;
  }, {} as Record<number, Record<number, StudentPlanTask[]>>);

  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>Loading your roadmap...</p>
      </div>
    );
  }

  return (
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
              {plan.company_name} · {plan.role_title} · {plan.duration_days} Days
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
            <div><span className="text-muted-foreground">Company</span><p className="font-medium">{plan.company_name}</p></div>
            <div><span className="text-muted-foreground">Role</span><p className="font-medium">{plan.role_title}</p></div>
            <div><span className="text-muted-foreground">Timeline</span><p className="font-medium">{plan.duration_days} Days</p></div>
            <div><span className="text-muted-foreground">Daily Hours</span><p className="font-medium">{plan.daily_hours} Hours</p></div>
          </CardContent>
        </Card>
      )}

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Preparation', value: `${progressPercent}%`, sub: `${completedCount} of ${totalCount} tasks`, color: 'text-amber-600' },
          { label: 'Interview Readiness', value: '63%', sub: `${plan.company_name} ${plan.role_title}`, color: 'text-green-600' },
          { label: 'Topics Completed', value: '8', sub: 'of 12 topics', color: 'text-blue-600' },
          { label: 'Remaining Tasks', value: `${totalCount - completedCount}`, sub: '4 tests · 1 mock', color: 'text-foreground' },
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
            <span className="text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
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

        <TabsContent value="roadmap" className="space-y-3">
          {plan.duration_days >= 7 ? (
            /* WEEKS VIEW */
            Object.entries(tasksByWeek)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([week, weekDays]) => {
                const weekNum = parseInt(week);
                const isWeekOpen = expandedWeek === weekNum;
                
                // Calculate week-wide progress
                const weekTasks = Object.values(weekDays).flat();
                const totalTasksInWeek = weekTasks.length;
                const completedTasksInWeek = weekTasks.filter(t => t.is_completed).length;
                const weekPct = totalTasksInWeek > 0 ? Math.round((completedTasksInWeek / totalTasksInWeek) * 100) : 0;

                return (
                  <div key={week} className="space-y-3">
                    <Card className={`border-border/60 overflow-hidden transition-all ${isWeekOpen ? 'ring-1 ring-primary/20 bg-primary/5 shadow-sm' : ''}`}>
                      <button
                        onClick={() => setExpandedWeek(isWeekOpen ? null : weekNum)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-inner
                            ${weekPct === 100 ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                            W{week}
                          </div>
                          <div>
                            <p className="font-bold text-base">Week {week} Overview</p>
                            <p className="text-xs text-muted-foreground font-medium  tracking-wider">
                              {completedTasksInWeek} / {totalTasksInWeek} Tasks Completed
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          <div className="hidden sm:flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">{weekPct}%</span>
                            <Progress value={weekPct} className="w-24 h-2 shadow-sm" />
                          </div>
                          {isWeekOpen ? <ChevronDown className="h-5 w-5 text-primary" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </button>
                    </Card>

                    {isWeekOpen && (
                      <div className="pl-6 space-y-3 border-l-2 border-primary/20 ml-6 pt-2 pb-4">
                        {Object.entries(weekDays)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([day, dayTasks]) => (
                            renderDayCard(day, dayTasks)
                          ))}
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            /* DIRECT DAYS VIEW */
            Object.entries(tasksByDay)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([day, dayTasks]) => renderDayCard(day, dayTasks))
          )}
        </TabsContent>

        <TabsContent value="today" className="space-y-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" /> Today's Tasks
              </CardTitle>
              <CardDescription>Tasks scheduled for today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.filter(t => t.day_number === 1).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {statusIcon(t.is_completed)}
                    <span className="text-sm">{t.title}</span>
                  </div>
                  {statusBadge(t.is_completed)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-3">
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 shrink-0 text-green-600" />
              <p className="text-sm">Your coding accuracy improved by 12% in the last 7 days.</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-400">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm">Dynamic Programming requires additional practice.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mock" className="space-y-3">
           <p className="text-sm text-muted-foreground">Recommended based on your weak areas:</p>
           {[
             { type: 'Coding Interview', focus: 'Dynamic Programming', icon: Code },
             { type: 'Technical Interview', focus: 'Operating Systems', icon: FileText },
             { type: 'HR Interview', focus: 'Behavioral Preparation', icon: Users },
           ].map((m, i) => (
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

        <TabsContent value="notifications" className="space-y-3">
          <Card className="border-l-4 border-l-blue-400">
             <CardContent className="pt-4 pb-3">
                <p className="text-sm font-medium">Daily Reminder</p>
                <p className="text-sm text-muted-foreground">You have tasks scheduled for {plan.company_name} preparation.</p>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
