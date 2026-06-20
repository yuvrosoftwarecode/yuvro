import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Code, BrainCircuit, Mic, Trophy, Users, Coins } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { AssessmentsPerformance } from './AssessmentsPerformance';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';
import { mockInterviewService } from '@/services/mockInterviewService';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSubjects, fetchSubjectsByCollege } from '@/services/subjectService';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function AssessmentDashboard() {
  const { user } = useAuth();
  const location = useLocation();

  const isAssessmentsPath = location.pathname.includes('/student/assessments');
  const effectiveProductType = isAssessmentsPath || user?.college_product_type === 'assessments' ? 'assessments' : 'campus';

  const { data: testPerformance } = useQuery({
    queryKey: ['testPerformance', effectiveProductType, user?.id],
    queryFn: () => studentDashboardService.getTestPerformance(effectiveProductType),
    enabled: !!user
  });

  const { data: practiceTests } = useQuery({
    queryKey: ['practiceTests', effectiveProductType, user?.id],
    queryFn: async () => {
      try {
        const res = await restApiAuthUtil.get<any>('/assessment/skill-tests/?test_type=practice');
        return Array.isArray(res) ? res : res?.results || [];
      } catch (e) {
        return [];
      }
    },
    enabled: !!user
  });

  const { data: assessments } = useQuery({
    queryKey: ['assessmentsOverview', effectiveProductType, user?.id],
    queryFn: () => studentDashboardService.getAssessments(effectiveProductType),
    enabled: !!user
  });

  const { data: myInterviews } = useQuery({
    queryKey: ['myInterviews', user?.id],
    queryFn: () => mockInterviewService.getMyInterviews(),
    enabled: !!user
  });

  const { data: dsaSubjects } = useQuery({
    queryKey: ['dsaSubjects', user?.id, user?.college_id],
    queryFn: async () => {
      try {
        let fetched = [];
        if (user?.college_id) {
          fetched = await fetchSubjectsByCollege(user.college_id);
        } else {
          fetched = await fetchSubjects();
        }
        return fetched.filter((s: any) => s.short_code === 'DSA100' || s.subject_code === 'DSA100');
      } catch (e) {
        return [];
      }
    },
    enabled: !!user
  });

  const solvedProblems = dsaSubjects
    ? dsaSubjects.reduce((sum: number, s: any) => sum + (s.solved_problems || 0), 0)
    : 0;

  const totalProblems = dsaSubjects
    ? dsaSubjects.reduce((sum: number, s: any) => sum + (s.total_problems || 0), 0) || 0
    : 0;

  const completedInterviews = myInterviews
    ? myInterviews.filter((i: any) => i.status === 'completed' || i.status === 'evaluated')
    : [];

  const interviewScores = completedInterviews
    .map((i: any) => i.overall_score || i.score || 0)
    .filter((s: number) => s > 0);

  const interviewAvgScore = interviewScores.length > 0
    ? Math.round(interviewScores.reduce((a: number, b: number) => a + b, 0) / interviewScores.length)
    : 0;

  const codePracticeProgress = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;
  const aptitudeProgress = assessments?.avgScore || 0;

  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    const isAssessmentsPath = location.pathname.includes('/student/assessments');
    const targetPath = isAssessmentsPath ? '/student/assessments/upgrade' : '/student/campus/upgrade';
    navigate(targetPath);
  };

  const creditsAction = (
    <Button 
      onClick={handleUpgradeClick}
      variant="outline"
      className="gap-2 font-semibold text-xs border-[hsl(174,64%,33%)]/20 hover:border-[hsl(174,64%,33%)] hover:bg-[hsl(174,64%,33%)]/5 transition-all text-[hsl(174,64%,33%)] rounded-xl h-9 px-3.5 shadow-sm"
    >
      <Coins className="h-4 w-4 text-amber-500 animate-pulse" />
      <span>Credits: 55</span>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Assessment Dashboard Overview" 
        subtitle="Monitor your progress across Code Practice, Skill Tests, Aptitude & Reasoning, and Mock Interviews" 
        actions={creditsAction}
      />

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-blue-500/10 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Code Practice</CardTitle>
            <Code className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{solvedProblems} / {totalProblems}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Problems Solved</p>
            <Progress value={codePracticeProgress} className="h-2 [&>div]:bg-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Skill Tests</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testPerformance?.avgScore || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Average Score</p>
            <Progress value={testPerformance?.avgScore || 0} className="h-2 [&>div]:bg-green-500" />
            <div className="text-[10px] text-muted-foreground mt-2">
              {testPerformance?.completed || 0} / {practiceTests?.length || 0} Tests Completed
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aptitude & Reasoning</CardTitle>
            <BrainCircuit className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessments?.avgScore || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Average Score</p>
            <Progress value={aptitudeProgress} className="h-2 [&>div]:bg-yellow-500" />
            <div className="text-[10px] text-muted-foreground mt-2">
              {assessments?.completed || 0} / 50 Assessments Completed
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mock Interviews</CardTitle>
            <Mic className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewAvgScore}%</div>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Average Score</p>
            <Progress value={interviewAvgScore} className="h-2 [&>div]:bg-purple-500" />
            <div className="text-[10px] text-muted-foreground mt-2">
              {myInterviews?.length || 0} / 15 Interviews Attended
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Assessments and Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssessmentsPerformance />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">#1</div>
                  <div>
                    <p className="font-medium text-sm">Alex Johnson</p>
                    <p className="text-xs text-muted-foreground">Score: 2450</p>
                  </div>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">#2</div>
                  <div>
                    <p className="font-medium text-sm">Sarah Williams</p>
                    <p className="text-xs text-muted-foreground">Score: 2380</p>
                  </div>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground">#15</div>
                  <div>
                    <p className="font-medium text-sm">You</p>
                    <p className="text-xs text-muted-foreground">Score: {1000 + solvedProblems * 50}</p>
                  </div>
                </div>
                <Trophy className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
