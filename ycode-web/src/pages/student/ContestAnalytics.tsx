import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestService } from '@/services/contestService';
import Navigation from '@/components/common/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Trophy, Target, Clock, TrendingUp, 
  Award, Lightbulb, BookOpen, Sparkles, AlertCircle,
  Download, FileText, Users, CheckCircle2, BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const ContestAnalytics = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [contestId]);

  const loadAnalytics = async () => {
    if (!contestId) return;
    
    try {
      setLoading(true);
      const data = await contestService.getStudentAnalytics(contestId, true);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
              <Button onClick={() => navigate(-1)} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { performance_overview, topic_performance, difficulty_analysis, time_analysis, ai_insights } = analytics;

  // Prepare chart data
  const topicChartData = topic_performance?.map((t: any) => ({
    topic: t.topic,
    score: t.score_percentage,
    average: t.contest_avg_percentage
  })) || [];

  const difficultyChartData = [
    { 
      name: 'Easy', 
      correct: difficulty_analysis?.easy?.correct || 0, 
      incorrect: (difficulty_analysis?.easy?.total || 0) - (difficulty_analysis?.easy?.correct || 0)
    },
    { 
      name: 'Medium', 
      correct: difficulty_analysis?.medium?.correct || 0, 
      incorrect: (difficulty_analysis?.medium?.total || 0) - (difficulty_analysis?.medium?.correct || 0)
    },
    { 
      name: 'Hard', 
      correct: difficulty_analysis?.hard?.correct || 0, 
      incorrect: (difficulty_analysis?.hard?.total || 0) - (difficulty_analysis?.hard?.correct || 0)
    },
  ];

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-before: always; }
          .report-container { padding: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">
        <Navigation />
        
        <div className="max-w-7xl mx-auto px-6 py-6 report-container">
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-6 no-print">
            <button
              onClick={() => navigate(-1)}
              className="bg-slate-500 text-white px-4 py-2 rounded-md hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#F97316] text-white px-4 py-2 rounded-md hover:bg-[#EA580C] transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
          </div>

          {/* Report Title */}
          <div className="bg-[#F97316] rounded-2xl p-8 text-white mb-8">
            <div className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">
              <FileText className="h-4 w-4" />
              YOUR CONTEST PERFORMANCE REPORT
            </div>
            <h1 className="text-3xl font-bold mb-1">Contest Analytics</h1>
            <p className="text-white/70">
              Detailed analysis of your performance and insights for improvement
            </p>
            <div className="flex gap-3 mt-4">
              <Badge className="bg-white/20 text-white border-0">
                Score: {performance_overview?.score}/{performance_overview?.max_score}
              </Badge>
              <Badge className="bg-white/20 text-white border-0">
                Rank: #{performance_overview?.rank}
              </Badge>
              <Badge className="bg-white/20 text-white border-0">
                Percentile: {performance_overview?.percentile?.toFixed(1)}%
              </Badge>
            </div>
          </div>

          {/* Section 1: Performance Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { 
                label: 'Your Score', 
                value: `${performance_overview?.percentage?.toFixed(1)}%`,
                subtext: `${performance_overview?.score}/${performance_overview?.max_score}`,
                icon: Trophy,
                color: 'text-[#F97316]'
              },
              { 
                label: 'Your Rank', 
                value: `#${performance_overview?.rank}`,
                subtext: `of ${performance_overview?.total_participants}`,
                icon: Target,
                color: 'text-slate-600'
              },
              { 
                label: 'Percentile', 
                value: `${performance_overview?.percentile?.toFixed(1)}%`,
                subtext: `Top ${(100 - (performance_overview?.percentile || 0))?.toFixed(0)}%`,
                icon: TrendingUp,
                color: 'text-slate-600'
              },
              { 
                label: 'Time Taken', 
                value: `${time_analysis?.total_time_minutes?.toFixed(0)}m`,
                subtext: `of ${time_analysis?.allocated_time_minutes}m`,
                icon: Clock,
                color: 'text-slate-600'
              },
            ].map(stat => (
              <Card key={stat.label} className="border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                      {stat.subtext && (
                        <p className="text-xs text-slate-400 mt-0.5">{stat.subtext}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-slate-800">{performance_overview?.contest_average?.toFixed(1)}</p>
                <p className="text-xs text-slate-500">Contest Average</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-slate-800">
                  {performance_overview?.vs_contest_avg > 0 ? '+' : ''}{performance_overview?.vs_contest_avg?.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500">vs Contest Avg</p>
              </CardContent>
            </Card>
            {performance_overview?.college_rank && (
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-slate-800">
                    #{performance_overview?.college_rank}
                  </p>
                  <p className="text-xs text-slate-500">College Rank</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Insights */}
          {ai_insights && ai_insights.error && (
            <Card className="border-2 border-orange-200 bg-orange-50 mb-8">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <p className="text-slate-700 font-medium">{ai_insights.error}</p>
              </CardContent>
            </Card>
          )}

          {ai_insights && !ai_insights.error && (
            <Card className="border-2 border-[#F97316]/20 bg-gradient-to-br from-[#F97316]/5 to-[#F97316]/10 mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                  <Sparkles className="h-5 w-5 text-[#F97316]" />
                  AI-Powered Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Why This Result */}
                {ai_insights.why_this_result && (
                  <div className="bg-white rounded-lg p-5 border-2 border-[#F97316]/30 shadow-sm">
                    <h3 className="font-bold text-[#F97316] mb-2 flex items-center gap-2 text-base">
                      <FileText className="h-5 w-5" /> Why This Result?
                    </h3>
                    <p className="text-base leading-relaxed text-slate-800">{ai_insights.why_this_result}</p>
                  </div>
                )}

                {/* Motivational Message */}
                <div className="bg-white/80 rounded-lg p-4 border border-[#F97316]/20">
                  <p className="text-base leading-relaxed text-slate-700 italic">{ai_insights.motivational_message}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4" /> Your Strengths
                    </h3>
                    <ul className="space-y-2">
                      {ai_insights.strengths?.map((strength: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-green-600 mt-0.5 font-bold">✓</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" /> Areas Needing Work
                    </h3>
                    <ul className="space-y-2">
                      {ai_insights.weaknesses?.map((weakness: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-orange-600 mt-0.5">→</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* What to Improve */}
                {ai_insights.what_to_improve && (
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> What to Improve
                    </h3>
                    <ul className="space-y-2">
                      {ai_insights.what_to_improve?.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-red-600 mt-0.5 font-semibold">{idx + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* How to Improve Timing */}
                {ai_insights.how_to_improve_timing && (
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Time Management Tips
                    </h3>
                    <ul className="space-y-2">
                      {ai_insights.how_to_improve_timing?.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-indigo-600 mt-0.5">⏱</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Integrity Feedback */}
                {ai_insights.integrity_feedback && (
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Academic Integrity
                    </h3>
                    <p className="text-sm text-slate-700">{ai_insights.integrity_feedback}</p>
                  </div>
                )}

                {/* Recommendations */}
                <div className="bg-white/60 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" /> Actionable Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {ai_insights.recommendations?.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-blue-600 mt-0.5 font-semibold">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Learning Path */}
                <div className="bg-white/60 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Your Learning Path
                  </h3>
                  <div className="space-y-3">
                    {ai_insights.learning_path?.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-sm pt-1 text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comparison Insight */}
                {ai_insights.comparison_insight && (
                  <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed">{ai_insights.comparison_insight}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Topic Performance */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                  <BarChart3 className="h-5 w-5 text-slate-500" />
                  Topic-wise Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topicChartData}>
                    <XAxis 
                      dataKey="topic" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#F97316" name="Your Score %" />
                    <Bar dataKey="average" fill="#94a3b8" name="Contest Avg %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Difficulty Analysis */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                  <Target className="h-5 w-5 text-slate-500" />
                  Difficulty Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={difficultyChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="correct" stackId="a" fill="#22c55e" name="Correct" />
                    <Bar dataKey="incorrect" stackId="a" fill="#ef4444" name="Incorrect" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Topic Performance Table */}
          {topic_performance && topic_performance.length > 0 && (
            <Card className="border border-slate-200 shadow-sm mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                  <CheckCircle2 className="h-5 w-5 text-slate-500" />
                  Detailed Topic Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Topic</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Correct</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Your %</th>
                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Avg %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topic_performance.map((topic: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-50">
                          <td className="py-3 px-3 font-medium text-slate-900">{topic.topic}</td>
                          <td className="py-3 px-3 text-center text-slate-600">{topic.correct}</td>
                          <td className="py-3 px-3 text-center text-slate-600">{topic.total}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-[#F97316]">{topic.score_percentage?.toFixed(1)}%</span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600">
                            {topic.contest_avg_percentage?.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default ContestAnalytics;
