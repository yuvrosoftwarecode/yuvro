import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Trophy, Target, Clock, Brain, CheckCircle2, Zap, Shield, Cpu, Terminal } from 'lucide-react';
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

        const totalSubmissions = submissions.length;
        const successfulSubmissions = submissions.filter(s => s.status === 'completed').length;
        const totalScore = submissions.reduce((sum, s) => sum + (s.test_cases_passed * 10), 0);
        const averageScore = totalSubmissions > 0 ? totalScore / totalSubmissions : 0;

        const executionTimes = submissions.filter(s => s.execution_time > 0).map(s => s.execution_time);
        const averageExecutionTime = executionTimes.length > 0
          ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
          : 0;

        const languageDistribution: Record<string, number> = {};
        submissions.forEach(s => {
          languageDistribution[s.language] = (languageDistribution[s.language] || 0) + 1;
        });

        const difficultyBreakdown: Record<string, { solved: number; total: number }> = {
          Easy: { solved: 0, total: 0 },
          Medium: { solved: 0, total: 0 },
          Hard: { solved: 0, total: 0 },
        };

        submissions.forEach(s => {
          const difficulty = s.question_difficulty || 'Medium';
          const diffKey = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();

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
        toast.error('Neural analytics sync failed');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Medium': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Hard': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'error': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'timeout': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex-1 p-10 space-y-10 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           {[...Array(4)].map((_, i) => (
             <div key={i} className="h-32 bg-slate-100 rounded-[2.5rem]"></div>
           ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {[...Array(2)].map((_, i) => (
             <div key={i} className="h-64 bg-slate-100 rounded-[3rem]"></div>
           ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 border-4 border-white shadow-2xl">
           <Shield size={48} />
        </div>
        <div className="space-y-4">
           <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">No Signal Detected</h3>
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest max-w-xs leading-loose">Initialize combat modules to generate calibration metrics.</p>
        </div>
        <Button onClick={onBack} className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95">Return to Deck</Button>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 overflow-y-auto space-y-12 p-8 pt-0 custom-scrollbar animate-in fade-in duration-700">
       <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <Button variant="ghost" onClick={onBack} className="h-12 w-12 p-0 rounded-2xl border-2 border-slate-100 hover:bg-slate-900 hover:text-white transition-all">
                <ChevronLeft size={20} strokeWidth={3} />
             </Button>
             <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Neural Performance Log</h2>
          </div>
          <Button onClick={onViewInsights} className="h-14 px-10 bg-indigo-600 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-100 transition-all active:scale-95 gap-3">
             <Brain className="w-4 h-4 shadow-sm" /> Generate Cognitive Insights
          </Button>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { icon: <Target />, label: 'Total Vectors', value: stats.totalSubmissions, color: 'indigo' },
          { icon: <CheckCircle2 />, label: 'Neural Sync Rate', value: `${stats.totalSubmissions > 0 ? Math.round((stats.successfulSubmissions / stats.totalSubmissions) * 100) : 0}%`, color: 'emerald' },
          { icon: <Trophy />, label: 'Net Points yield', value: stats.totalScore, color: 'amber' },
          { icon: <Clock />, label: 'Avg Latency', value: `${stats.averageExecutionTime.toFixed(2)}ms`, color: 'rose' },
        ].map((stat, i) => (
          <Card key={i} className="group overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
            <CardContent className="p-8 flex items-center gap-6">
               <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                  {stat.icon}
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-800 tracking-tight leading-none">{stat.value}</p>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="rounded-[3rem] border border-slate-100 bg-white shadow-xl overflow-hidden p-10 space-y-10">
          <CardHeader className="p-0 border-0 flex flex-row items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white"><Terminal size={14} /></div>
                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800 italic">Logic Protocol Distribution</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-0 space-y-8">
             {Object.entries(stats.languageDistribution).map(([language, count]) => {
                const percentage = (count / stats.totalSubmissions) * 100;
                return (
                  <div key={language} className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{language}</span>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 border border-slate-50 overflow-hidden shadow-inner">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-1000 shadow-sm"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
             })}
          </CardContent>
        </Card>

        <Card className="rounded-[3rem] border border-slate-100 bg-white shadow-xl overflow-hidden p-10 space-y-10">
          <CardHeader className="p-0 border-0 flex flex-row items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white"><Zap size={14} /></div>
                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800 italic">Sector Difficulty Breakdown</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-0 space-y-6">
             {Object.entries(stats.difficultyBreakdown).map(([difficulty, data]) => (
                <div key={difficulty} className="flex items-center justify-between p-6 rounded-[1.75rem] border-2 border-slate-50 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all group">
                   <div className="flex items-center gap-4">
                      <Badge className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${getDifficultyStyles(difficulty)}`}>
                         {difficulty}
                      </Badge>
                      <span className="text-lg font-black text-slate-800 tracking-tight">{data.solved} <span className="text-xs text-slate-400 font-bold">/ {data.total}</span></span>
                   </div>
                   <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      {data.total > 0 ? Math.round((data.solved / data.total) * 100) : 0}% EFFICIENCY
                   </div>
                </div>
             ))}
          </CardContent>
        </Card>

        <Card className="rounded-[3rem] border border-slate-100 bg-white shadow-xl overflow-hidden lg:col-span-2">
          <CardHeader className="p-10 pb-4 border-0 flex flex-row items-center justify-between bg-gradient-to-br from-white to-slate-50/50">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white"><Cpu size={14} /></div>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800 italic">Temporal Logic History</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-10 pt-4">
             <div className="grid grid-cols-1 gap-4">
                {stats.recentSubmissions.map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between p-6 rounded-[2rem] border-2 border-slate-50 hover:bg-white hover:shadow-2xl hover:border-indigo-100 transition-all group">
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <Badge className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 shrink-0 ${getStatusStyles(submission.status)}`}>
                        {submission.status}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-base font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{submission.problem_title}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                          {submission.language} <span className="mx-2 text-slate-200">|</span> {submission.test_cases_passed} / {submission.total_test_cases} VECTORS DETECTED
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{new Date(submission.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1.5">{submission.execution_time?.toFixed(2)}ms LATENCY</p>
                    </div>
                  </div>
                ))}
                
                {stats.recentSubmissions.length === 0 && (
                  <div className="text-center py-20 text-slate-300 flex flex-col items-center gap-4">
                    <Shield className="h-16 w-16 opacity-10" />
                    <p className="text-xs font-black uppercase tracking-widest">No verified logic paths recorded.</p>
                  </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScoreAnalytics;
