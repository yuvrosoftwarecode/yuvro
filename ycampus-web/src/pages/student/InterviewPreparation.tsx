import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Code,
  Brain,
  Terminal,
  Mic,
  TrendingUp,
  TrendingDown,
  Flame,
  Trophy,
  ArrowRight,
  AlertTriangle,
  Star,
  Target,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MockInterviewSession from '@/components/student/MockInterviewSession';
import { fetchSubjects } from '@/services/subjectService';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

// Dummy data
const psBreakdown = {
  overall: 72,
  coreSubjects: 78,
  aptitude: 65,
  communication: 70,
  mockInterviews: 74,
};

const rankingData = {
  sectionRank: 12,
  sectionTotal: 60,
  sectionChange: 3,
  collegeRank: 145,
  collegeTotal: 1200,
  collegeChange: -5,
};

const streakData = {
  currentStreak: 6,
  badge: 'Consistent Learner',
  longestStreak: 14,
};

const moduleCards = [
  {
    title: 'DSA',
    icon: Code,
    progress: 68,
    stat1Label: 'Problems Solved',
    stat1Value: '142 / 250',
    stat2Label: 'Weak Topic',
    stat2Value: 'Dynamic Programming',
    cta: 'Start Practice',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    title: 'Aptitude & Reasoning',
    icon: Brain,
    progress: 55,
    stat1Label: 'Accuracy',
    stat1Value: '72%',
    stat2Label: 'Tests Attempted',
    stat2Value: '18 / 30',
    cta: 'Take Test',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    title: 'Python',
    icon: Terminal,
    progress: 80,
    stat1Label: 'Concepts Completed',
    stat1Value: '32 / 40',
    stat2Label: 'Practice Progress',
    stat2Value: '80%',
    cta: 'Continue Learning',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    title: 'Mock Interviews',
    icon: Mic,
    progress: 62,
    stat1Label: 'Interviews Taken',
    stat1Value: '8',
    stat2Label: 'Avg Score',
    stat2Value: '74 / 100',
    cta: 'Start Mock Interview',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
  },
];

const recommendations = [
  { text: 'Practice Binary Search problems', priority: 'High', module: 'DSA' },
  { text: 'Improve Logical Reasoning accuracy', priority: 'High', module: 'Aptitude' },
  { text: 'Attempt a Mock Interview this week', priority: 'Medium', module: 'Mock Interview' },
  { text: 'Revise DBMS & Normalization', priority: 'Medium', module: 'Core Subjects' },
  { text: 'Practice verbal communication drills', priority: 'High', module: 'Communication' },
];

const weeklyProgress = [
  { week: 'Week 1', ps: 58 },
  { week: 'Week 2', ps: 62 },
  { week: 'Week 3', ps: 64 },
  { week: 'Week 4', ps: 68 },
  { week: 'Week 5', ps: 70 },
  { week: 'Week 6', ps: 72 },
];

const sectionLeaderboard = [
  { rank: 1, name: 'Priya Sharma', ps: 92 },
  { rank: 2, name: 'Rahul Verma', ps: 88 },
  { rank: 3, name: 'Ankit Jain', ps: 85 },
  { rank: 4, name: 'Sneha Patel', ps: 82 },
  { rank: 5, name: 'Kiran Reddy', ps: 80 },
];

const collegeLeaderboard = [
  { rank: 1, name: 'Aditya Kumar', ps: 96 },
  { rank: 2, name: 'Meena Ravi', ps: 94 },
  { rank: 3, name: 'Priya Sharma', ps: 92 },
  { rank: 4, name: 'Vikash Singh', ps: 91 },
  { rank: 5, name: 'Neha Gupta', ps: 90 },
];

const weakAreas = [
  { area: 'Dynamic Programming', module: 'DSA', score: 35 },
  { area: 'Logical Reasoning', module: 'Aptitude', score: 42 },
  { area: 'Communication Skills', module: 'Communication', score: 48 },
  { area: 'System Design Basics', module: 'Core Subjects', score: 50 },
];

function getPsStatus(score: number) {
  if (score >= 85) return { label: 'Strong', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' };
  if (score >= 70) return { label: 'Good', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' };
  if (score >= 55) return { label: 'Needs Improvement', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' };
  return { label: 'Weak', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' };
}

const InterviewPreparation = () => {
  const navigate = useNavigate();
  const psStatus = getPsStatus(psBreakdown.overall);
  const [interviewConfig, setInterviewConfig] = useState<any>(null);
  const [dsaSubjectId, setDsaSubjectId] = useState<string | null>(null);
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(true);

  // DSA subject ID is fetched to allow direct navigation to the correct subject in Code Practice
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const fetchedSubjects = await fetchSubjects();
        
        // Find DSA subject
        const dsa = fetchedSubjects.find((s: any) => {
          const name = (s.subject_name || s.name || s.title || "").toLowerCase();
          const code = (s.short_code || "").toLowerCase();
          return name.includes("data structures") || name.includes("dsa") || code.includes("dsa");
        });
        
        if (dsa) {
          setDsaSubjectId(dsa.id.toString());
        }
      } catch (error) {
        console.error("Failed to fetch subjects in Interview Prep:", error);
      } finally {
        setIsSubjectsLoading(false);
      }
    };
    loadSubjects();
  }, []);

  const chartConfig = {
    ps: { label: 'PS Score', color: 'hsl(var(--primary))' },
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <PageHeader 
          title="Interview Preparation" 
          subtitle="Track your preparation, practice skills, and stay ahead." 
        />

        {/* ===== HERO SECTION ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PS Score Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">PS Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-4xl font-bold text-foreground">{psBreakdown.overall}</span>
                    <span className="text-lg text-muted-foreground">/100</span>
                  </div>
                </div>
                <Badge className={`${psStatus.color} border-0 text-xs`}>{psStatus.label}</Badge>
              </div>
              <Progress value={psBreakdown.overall} className="h-2" />
              <div className="space-y-2 pt-2">
                {[
                  { label: 'Core Subjects', value: psBreakdown.coreSubjects },
                  { label: 'Aptitude', value: psBreakdown.aptitude },
                  { label: 'Communication', value: psBreakdown.communication },
                  { label: 'Mock Interviews', value: psBreakdown.mockInterviews },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={item.value} className="h-1.5 w-20" />
                      <span className="text-foreground font-medium w-8 text-right">{item.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ranking Card */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              <p className="text-sm text-muted-foreground font-medium">Your Ranking</p>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Section Rank</span>
                    <div className="flex items-center gap-1">
                      {rankingData.sectionChange > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${rankingData.sectionChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {rankingData.sectionChange > 0 ? '+' : ''}{rankingData.sectionChange}
                      </span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    #{rankingData.sectionRank} <span className="text-sm font-normal text-muted-foreground">/ {rankingData.sectionTotal}</span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">College Rank</span>
                    <div className="flex items-center gap-1">
                      {rankingData.collegeChange > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${rankingData.collegeChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {rankingData.collegeChange > 0 ? '+' : ''}{rankingData.collegeChange}
                      </span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    #{rankingData.collegeRank} <span className="text-sm font-normal text-muted-foreground">/ {rankingData.collegeTotal}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Streak Card */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <Flame className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">{streakData.currentStreak}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0">
                <Star className="h-3 w-3 mr-1" />
                {streakData.badge}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Longest streak: {streakData.longestStreak} days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ===== CORE MODULES ===== */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Core Preparation Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {moduleCards.map((mod) => (
              <Card key={mod.title} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-9 w-9 rounded-lg ${mod.bgColor} flex items-center justify-center`}>
                      <mod.icon className={`h-4.5 w-4.5 ${mod.color}`} />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground">{mod.title}</h3>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-medium text-foreground">{mod.progress}%</span>
                  </div>
                  <Progress value={mod.progress} className="h-1.5" />
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{mod.stat1Label}</span>
                      <span className="text-foreground font-medium">{mod.stat1Value}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{mod.stat2Label}</span>
                      <span className="text-foreground font-medium">{mod.stat2Value}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs mt-1"
                    onClick={async () => {
                      if (mod.cta === 'Start Mock Interview') {
                        navigate('/student/mock-interview');
                      } else if (mod.cta === 'Take Test') {
                        navigate('/student/test');
                      } else if (mod.cta === 'Start Practice' || mod.cta === 'Continue Learning') {
                        // Use existing ID if available to avoid redundant fetch
                        let targetId = dsaSubjectId;
                        
                        // Small check if we need to fetch now (user clicked really fast)
                        if (!targetId && isSubjectsLoading) {
                          try {
                            const subjects = await fetchSubjects();
                            const dsa = subjects.find((s: any) => {
                              const name = (s.subject_name || s.name || s.title || "").toLowerCase();
                              return name.includes("data structures") || name.includes("dsa");
                            });
                            if (dsa) {
                              targetId = dsa.id.toString();
                              setDsaSubjectId(targetId);
                            }
                          } catch (e) {
                            console.error("On-demand fetch failed:", e);
                          }
                        }

                        if (targetId) {
                          navigate(`/student/code-practice/subjects/${targetId}`);
                        } else {
                          navigate('/student/code-practice');
                        }
                      }
                    }}
                    disabled={(mod.cta === 'Start Practice' || mod.cta === 'Continue Learning') && isSubjectsLoading}
                  >
                    {(mod.cta === 'Start Practice' || mod.cta === 'Continue Learning') && isSubjectsLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    ) : null}
                    {mod.cta} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ===== RECOMMENDED ACTIONS ===== */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Recommended for You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Zap className={`h-4 w-4 ${rec.priority === 'High' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{rec.text}</p>
                      <p className="text-xs text-muted-foreground">{rec.module}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${rec.priority === 'High' ? 'border-amber-300 text-amber-600 dark:text-amber-400' : 'border-muted-foreground/30'}`}
                    >
                      {rec.priority}
                    </Badge>
                     <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-xs"
                      onClick={() => {
                        if (rec.module === 'DSA') {
                          if (dsaSubjectId) {
                            navigate(`/student/code-practice/subjects/${dsaSubjectId}`);
                          } else {
                            navigate('/student/code-practice');
                          }
                        } else if (rec.module === 'Aptitude') {
                          navigate('/student/practice-tests');
                        } else if (rec.module === 'Mock Interview') {
                          navigate('/student/mock-interview');
                        } else if (rec.module === 'Core Subjects') {
                          navigate('/student/notes');
                        } else if (rec.module === 'Communication') {
                          navigate('/student/notes');
                        }
                      }}
                    >
                      Start <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ===== PROGRESS GRAPH + LEADERBOARD ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Progress Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">PS Progress</CardTitle>
              <p className="text-xs text-muted-foreground">Your PS improved from 58% to 72% over 6 weeks</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <LineChart data={weeklyProgress} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="ps"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Leaderboards */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Section Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-1.5">
                  {sectionLeaderboard.map((s) => (
                    <div
                      key={s.rank}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded text-sm ${
                        s.rank === 4 ? 'bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{s.rank}</span>
                        <span className="text-foreground text-sm">{s.name}</span>
                        {s.rank === 4 && <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5 py-0">You</Badge>}
                      </div>
                      <span className="font-semibold text-sm text-foreground">{s.ps}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-emerald-500" />
                  College Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-1.5">
                  {collegeLeaderboard.map((s) => (
                    <div key={s.rank} className="flex items-center justify-between px-2.5 py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{s.rank}</span>
                        <span className="text-foreground text-sm">{s.name}</span>
                      </div>
                      <span className="font-semibold text-sm text-foreground">{s.ps}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== WEAK AREAS ===== */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Weak Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {weakAreas.map((w) => (
                <div
                  key={w.area}
                  className="p-3 rounded-lg border bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{w.area}</p>
                    <span className="text-xs font-bold text-red-500">{w.score}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{w.module}</p>
                  <Progress value={w.score} className="h-1.5 mb-2" />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full text-xs h-7"
                    onClick={() => {
                      if (w.module === 'DSA') {
                        if (dsaSubjectId) {
                          navigate(`/student/code-practice/subjects/${dsaSubjectId}`);
                        } else {
                          navigate('/student/code-practice');
                        }
                      } else if (w.module === 'Aptitude') {
                        navigate('/student/practice-tests');
                      } else if (w.module === 'Communication') {
                        navigate('/student/notes');
                      } else if (w.module === 'Core Subjects') {
                        navigate('/student/notes');
                      }
                    }}
                  >
                    Improve Now <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </StudentLayout>
  );
};

export default InterviewPreparation;