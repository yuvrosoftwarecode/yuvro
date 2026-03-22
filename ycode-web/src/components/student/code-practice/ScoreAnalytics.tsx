import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, TrendingUp, Trophy, Target, Clock, Brain, CheckCircle2 } from 'lucide-react';
import StatusBadge from '@/components/common/StatusBadge';
import codeEditorService from '@/services/codeEditorService';
import { toast } from 'sonner';

interface ScoreAnalyticsProps {
  onBack: () => void;
  onViewInsights: () => void;
}

interface SubmissionStats {
  totalSubmissions: number;
  successfulSubmissions: number;
  averageScore: number;
  totalScore: number;
  averageExecutionTime: number;
  languageDistribution: Record<string, number>;
  difficultyBreakdown: Record<string, { solved: number; total: number }>;
  recentSubmissions: any[];
}

const ScoreAnalytics = ({ onBack, onViewInsights }: ScoreAnalyticsProps) => {
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const submissions = await codeEditorService.getSubmissions();

        // Calculate statistics
        const totalSubmissions = submissions.length;
        const successfulSubmissions = submissions.filter(s => s.status === 'completed').length;
        const totalScore = submissions.reduce((sum, s) => sum + (s.test_cases_passed * 10), 0); // Assuming 10 points per test case
        const averageScore = totalSubmissions > 0 ? totalScore / totalSubmissions : 0;

        const executionTimes = submissions.filter(s => s.execution_time > 0).map(s => s.execution_time);
        const averageExecutionTime = executionTimes.length > 0
          ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
          : 0;

        // Language distribution
        const languageDistribution: Record<string, number> = {};
        submissions.forEach(s => {
          languageDistribution[s.language] = (languageDistribution[s.language] || 0) + 1;
        });

        // Calculate difficulty breakdown
        const difficultyBreakdown: Record<string, { solved: number; total: number }> = {
          Easy: { solved: 0, total: 0 },
          Medium: { solved: 0, total: 0 },
          Hard: { solved: 0, total: 0 },
        };

        submissions.forEach(s => {
          const difficulty = s.question_difficulty || 'Medium'; // Default to Medium if unknown
          const diffKey = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase(); // Normalize case like 'Easy', 'Medium'

          if (difficultyBreakdown[diffKey]) {
            difficultyBreakdown[diffKey].total += 1;
            if (s.status === 'completed') {
              difficultyBreakdown[diffKey].solved += 1;
            }
          }
        });

        const recentSubmissions = submissions
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);

        setStats({
          totalSubmissions,
          successfulSubmissions,
          averageScore,
          totalScore,
          averageExecutionTime,
          languageDistribution,
          difficultyBreakdown,
          recentSubmissions,
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'Hard':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };



  if (loading) {
    return (
      <div className="container mx-auto px-[1px] py-6 max-w-7xl">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-[1px] py-6 max-w-7xl">
        <div className="text-center py-12">
          <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">
            Start solving problems to see your analytics and progress.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-8 py-6">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 pl-0 hover:bg-transparent hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
              Code Practice
            </Button>
            <span>/</span>
            <span className="text-foreground font-medium">Analytics</span>
          </div>
          <Button onClick={onViewInsights} className="gap-1 items-right ml-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:opacity-90 shadow-md transition-transform hover:scale-105">
            <Brain className="h-4 w-4" />
            AI Insights
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Submissions - Blue */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-blue-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">{stats.totalSubmissions}</p>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">Total Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Rate - Green */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-green-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 text-green-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    {stats.totalSubmissions > 0
                      ? Math.round((stats.successfulSubmissions / stats.totalSubmissions) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-green-600 transition-colors">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Score - Purple */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-purple-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">{stats.totalScore}</p>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-purple-600 transition-colors">Total Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg Time - Amber */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-amber-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    {stats.averageExecutionTime.toFixed(2)}s
                  </p>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-amber-600 transition-colors">Avg. Execution Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Language Distribution */}
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <CardHeader>
              <CardTitle>Language Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.languageDistribution).map(([language, count]) => {
                  const percentage = (count / stats.totalSubmissions) * 100;
                  return (
                    <div key={language} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize">{language}</span>
                        <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Difficulty Breakdown */}
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <CardHeader>
              <CardTitle>Difficulty Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.difficultyBreakdown).map(([difficulty, data]) => (
                  <div key={difficulty} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={getDifficultyColor(difficulty)}>
                        {difficulty}
                      </Badge>
                      <span className="font-medium">{data.solved}/{data.total}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {data.total > 0 ? Math.round((data.solved / data.total) * 100) : 0}% solved
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentSubmissions.map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={submission.status} />
                      <div>
                        <p className="font-medium">{submission.problem_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {submission.language} • {submission.test_cases_passed}/{submission.total_test_cases} tests passed
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{new Date(submission.created_at).toLocaleDateString()}</p>
                      <p>{submission.execution_time?.toFixed(2)}s</p>
                    </div>
                  </div>
                ))}

                {stats.recentSubmissions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No submissions yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScoreAnalytics;