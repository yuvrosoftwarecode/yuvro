import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, AlertTriangle, CheckCircle2, TrendingUp, 
  ArrowUpRight, Clock, Bell, Settings, Filter, Search, Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const PlannerAnalyticsTab = () => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'students' | 'alerts'>('overview');

  const stats = [
    { label: 'Active Students', value: '458', icon: Users, change: '+12%', color: 'text-blue-600' },
    { label: 'Avg. Readiness', value: '62%', icon: TrendingUp, change: '+5%', color: 'text-green-600' },
    { label: 'Tasks Completed', value: '2.4k', icon: CheckCircle2, change: '+18%', color: 'text-purple-600' },
    { label: 'Urgent Alerts', value: '14', icon: AlertTriangle, change: '-2', color: 'text-red-600' },
  ];

  const studentProgress = [
    { name: 'Rahul Kumar', target: 'Amazon SDE', progress: 72, readiness: 68, lastActive: '2 hours ago', status: 'On Track' },
    { name: 'Sneha Gupta', target: 'Google SWE', progress: 45, readiness: 52, lastActive: '1 day ago', status: 'Falling Behind' },
    { name: 'Amit Singh', target: 'TCS Digital', progress: 88, readiness: 82, lastActive: '30 mins ago', status: 'Ready' },
    { name: 'Priya Sharma', target: 'Microsoft SDE', progress: 12, readiness: 24, lastActive: '3 days ago', status: 'At Risk' },
  ];

  const alerts = [
    { student: 'Priya Sharma', message: 'Inactive for 3+ days', type: 'High', date: '2024-04-04' },
    { student: 'Sneha Gupta', message: 'Failed 2 consecutive mock interviews', type: 'Medium', date: '2024-04-03' },
    { student: 'Vikram Das', message: 'Coding accuracy dropped below 40%', type: 'Medium', date: '2024-04-02' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Planner Analytics</h2>
          <p className="text-muted-foreground mt-1">Monitor how students are progressing through their preparation roadmaps.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" /> Alert Rules
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/60 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</p>
                <h3 className={`text-2xl font-bold ${stat.color}`}>{stat.value}</h3>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">
                  <span className="text-green-600 font-bold">{stat.change}</span> vs last week
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 border-b border-border/60">
        {['overview', 'students', 'alerts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab as any)}
            className={`pb-3 px-1 text-sm font-bold uppercase tracking-widest transition-all relative ${
              activeSubTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            {activeSubTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeSubTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Readiness Distribution</CardTitle>
                <CardDescription>Number of students by readiness level.</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-end justify-between gap-2 px-6 pb-8">
                  {[
                    { h: '20%', label: '<40%' },
                    { h: '45%', label: '40-60%' },
                    { h: '85%', label: '60-80%' },
                    { h: '30%', label: '>80%' }
                  ].map((b, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary/10 rounded-t-lg relative group transition-all hover:bg-primary/20" style={{ height: b.h }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-bold transition-opacity">{b.h}</div>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">{b.label}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Recent Alerts</CardTitle>
                  <Button variant="link" className="text-xs p-0 h-auto">View All</Button>
                </div>
                <CardDescription>Critically lagging students.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {alerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${alert.type === 'High' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                      <div>
                        <p className="text-sm font-bold">{alert.student}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7"><ArrowUpRight className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSubTab === 'students' && (
          <Card className="border-border/60 shadow-sm">
            <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search students..." className="pl-9 h-9" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/5">
                    <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Student</th>
                    <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Target</th>
                    <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Plan Progress</th>
                    <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Readiness</th>
                    <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {studentProgress.map((s, i) => (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="font-bold">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {s.lastActive}</div>
                      </td>
                      <td className="p-4 font-medium text-muted-foreground">{s.target}</td>
                      <td className="p-4 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold"><span>{s.progress}%</span></div>
                          <Progress value={s.progress} className="h-1.5" />
                        </div>
                      </td>
                      <td className="p-4">
                          <Badge variant="outline" className={`font-black ${
                            s.readiness > 75 ? 'text-green-600 border-green-200 bg-green-50' : 
                            s.readiness > 50 ? 'text-amber-600 border-amber-200 bg-amber-50' : 
                            'text-red-600 border-red-200 bg-red-50'
                          }`}>{s.readiness}%</Badge>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          s.status === 'On Track' ? 'text-green-600' :
                          s.status === 'Ready' ? 'text-blue-600' :
                          s.status === 'Falling Behind' ? 'text-amber-600' : 'text-red-600'
                        }`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeSubTab === 'alerts' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Alert Rules Configuration</h3>
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Define New Rule</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'Inactivity Warning', rule: '> 3 days inactive', status: 'Enabled' },
                  { title: 'Performance Drop', rule: 'Test score < 40%', status: 'Enabled' },
                  { title: 'Mock Failure', rule: 'Fail score twice', status: 'Disabled' }
                ].map((r, i) => (
                  <Card key={i} className="border-border/60 shadow-sm relative overflow-hidden group">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
                              <Bell className="h-4 w-4 text-primary" />
                            </div>
                            <Badge variant={r.status === 'Enabled' ? 'default' : 'outline'}>{r.status}</Badge>
                        </div>
                        <h4 className="font-bold text-sm">{r.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-4 italic">Condition: {r.rule}</p>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="sm" className="h-7 text-[10px]">Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive">Disable</Button>
                        </div>
                      </CardContent>
                  </Card>
                ))}
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlannerAnalyticsTab;
