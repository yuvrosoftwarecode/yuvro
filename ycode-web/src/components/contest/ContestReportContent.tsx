import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, Target, Clock, TrendingUp, 
  Award, Lightbulb, BookOpen, Sparkles, AlertCircle,
  FileText, CheckCircle2, BarChart3,
  ShieldCheck, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ContestReportContentProps {
  analytics: any;
}

const ContestReportContent = ({ analytics }: ContestReportContentProps) => {
  const { contest_info, performance_overview, topic_performance, difficulty_analysis, time_analysis, ai_insights, question_breakdown, behavioral_insights, submission_details } = analytics;

  // Calculate quick summary stats from question_breakdown
  const totalQuestions = question_breakdown?.length || 0;
  const attemptedQuestions = question_breakdown?.filter((q: any) => q.student_answer != null)?.length || 0;
  const unattemptedQuestions = totalQuestions - attemptedQuestions;
  const correctQuestions = question_breakdown?.filter((q: any) => q.is_correct)?.length || 0;
  const accuracy = attemptedQuestions > 0 ? (correctQuestions / attemptedQuestions * 100) : 0;
  
  // Best and weakest topics
  const bestTopic = topic_performance?.length > 0 ? topic_performance[0] : null;
  const weakestTopic = topic_performance?.length > 1 ? topic_performance[topic_performance.length - 1] : null;

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

  // Top percentage (inverse of percentile)
  const topPercentage = performance_overview?.percentile > 0
    ? (100 - (performance_overview?.percentile || 0))
    : null;

  return (
    <>
      {/* Report Title — with contest name + date */}
      <div className="bg-[#F97316] rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">
          <FileText className="h-4 w-4" />
          CONTEST PERFORMANCE REPORT
        </div>
        <h1 className="text-3xl font-bold mb-1">
          {contest_info?.title || 'Contest Analytics'}
        </h1>
        <p className="text-white/70">
          {contest_info?.start_time && (
            <span>{new Date(contest_info.start_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          )}
          {contest_info?.duration_minutes && (
            <span> &middot; {contest_info.duration_minutes} min</span>
          )}
          {contest_info?.total_marks && (
            <span> &middot; {contest_info.total_marks} marks</span>
          )}
          {!contest_info && (
            <span>Detailed analysis of performance and insights for improvement</span>
          )}
        </p>
        <div className="flex gap-3 mt-4">
          <Badge className="bg-white/20 text-white border-0">
            Score: {performance_overview?.score}/{performance_overview?.max_score}
          </Badge>
          <Badge className="bg-white/20 text-white border-0">
            Rank: {performance_overview?.rank != null ? `#${performance_overview?.rank}` : '—'}
          </Badge>
          {topPercentage != null && (
            <Badge className="bg-white/20 text-white border-0">
              Top {topPercentage.toFixed(0)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Section 1: Scoreboard Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { 
            label: 'Score', 
            value: `${performance_overview?.percentage?.toFixed(1)}%`,
            subtext: `${performance_overview?.score}/${performance_overview?.max_score}`,
            icon: Trophy,
            color: 'text-[#F97316]'
          },
          { 
            label: 'Rank', 
            value: performance_overview?.rank != null ? `#${performance_overview?.rank}` : '—',
            subtext: `of ${performance_overview?.total_participants} participants`,
            icon: Target,
            color: 'text-slate-600'
          },
          { 
            label: 'Standing', 
            value: topPercentage != null ? `Top ${topPercentage.toFixed(0)}%` : '—',
            subtext: `Score percentile: ${performance_overview?.percentile?.toFixed(1)}%`,
            icon: TrendingUp,
            color: 'text-slate-600'
          },
          { 
            label: 'Time Taken', 
            value: `${(time_analysis?.total_time_minutes > 0 ? time_analysis?.total_time_minutes : performance_overview?.time_taken_minutes)?.toFixed(0) ?? 0}m`,
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

      {/* Comparison Stats — Enhanced */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-slate-800">
              {performance_overview?.vs_contest_avg > 0 ? '+' : ''}{performance_overview?.vs_contest_avg?.toFixed(1)} pts
            </p>
            <p className="text-xs text-slate-500">
              vs Contest Avg ({performance_overview?.contest_average?.toFixed(1)})
            </p>
          </CardContent>
        </Card>
        {performance_overview?.college_rank && (
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-slate-800">
                #{performance_overview?.college_rank}
              </p>
              <p className="text-xs text-slate-500">
                College Rank{performance_overview?.college_total_participants ? ` of ${performance_overview.college_total_participants}` : ''}
              </p>
            </CardContent>
          </Card>
        )}
        {performance_overview?.vs_college_avg != null && (
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-slate-800">
                {performance_overview?.vs_college_avg > 0 ? '+' : ''}{performance_overview?.vs_college_avg?.toFixed(1)} pts
              </p>
              <p className="text-xs text-slate-500">vs College Avg</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Summary Box */}
      <Card className="border-2 border-slate-200 bg-slate-50 mb-8">
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#F97316]" /> Quick Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Attempted</span>
              <p className="font-semibold text-slate-900">{attemptedQuestions}/{totalQuestions} questions</p>
              {unattemptedQuestions > 0 && (
                <p className="text-xs text-orange-500 mt-0.5">{unattemptedQuestions} unattempted</p>
              )}
            </div>
            <div>
              <span className="text-slate-500">Correct</span>
              <p className="font-semibold text-slate-900">{correctQuestions}/{attemptedQuestions} attempted</p>
              <p className="text-xs text-slate-400 mt-0.5">{accuracy.toFixed(1)}% accuracy</p>
            </div>
            <div>
              <span className="text-slate-500">Avg per Question</span>
              <p className="font-semibold text-slate-900">
                {time_analysis?.avg_time_per_question_minutes
                  ? `${time_analysis.avg_time_per_question_minutes.toFixed(1)} min`
                  : '—'}
              </p>
            </div>
            {bestTopic && (
              <div>
                <span className="text-slate-500">Best Topic</span>
                <p className="font-semibold text-green-700">{bestTopic.topic}</p>
                <p className="text-xs text-slate-400 mt-0.5">{bestTopic.score_percentage?.toFixed(0)}%</p>
              </div>
            )}
            {weakestTopic && weakestTopic.topic !== bestTopic?.topic && (
              <div>
                <span className="text-slate-500">Weakest Topic</span>
                <p className="font-semibold text-orange-600">{weakestTopic.topic}</p>
                <p className="text-xs text-slate-400 mt-0.5">{weakestTopic.score_percentage?.toFixed(0)}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <Award className="h-4 w-4" /> Strengths
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

            {/* What To Do Next */}
            <div className="bg-white/60 rounded-lg p-4">
              <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> What To Do Next
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
                <BookOpen className="h-4 w-4" /> Learning Path
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
                <Bar dataKey="score" fill="#F97316" name="Score %" />
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

      {/* Topic Performance Table — with Verdict column */}
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
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Score %</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Avg %</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {topic_performance.map((topic: any, idx: number) => {
                    const diff = topic.score_percentage - topic.contest_avg_percentage;
                    let verdict = { label: '🟡 Needs work', color: 'text-yellow-600' };
                    if (diff > 10) verdict = { label: '🟢 Strong', color: 'text-green-600' };
                    else if (diff >= 0) verdict = { label: '🟢 Above avg', color: 'text-green-600' };
                    else if (diff >= -10) verdict = { label: '🟡 Needs work', color: 'text-yellow-600' };
                    else verdict = { label: '🔴 Focus area', color: 'text-red-500' };

                    return (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="py-3 px-3 font-medium text-slate-900">{topic.topic}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{topic.questions_correct}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{topic.questions_attempted}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-[#F97316]">{topic.score_percentage?.toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {topic.contest_avg_percentage?.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-xs font-semibold ${verdict.color}`}>{verdict.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Breakdown */}
      {question_breakdown && question_breakdown.length > 0 && (
        <Card className="border border-slate-200 shadow-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
              <FileText className="h-5 w-5 text-slate-500" />
              Per-Question Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Question</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Topic</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Difficulty</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Marks</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Your Answer</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Correct Answer</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Time</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {question_breakdown.map((q: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-50">
                      <td className="py-3 px-3 font-medium text-slate-900 max-w-[200px]" title={q.title}>
                        <span className="block truncate">{q.title}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">{q.topic}</Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge className="text-xs bg-slate-100 text-slate-700">{q.difficulty}</Badge>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-[#F97316]">{q.marks_obtained}/{q.max_marks}</td>
                      <td className="py-3 px-3 text-center text-xs text-slate-600 max-w-[120px]" title={q.student_answer != null ? String(Array.isArray(q.student_answer) ? q.student_answer.join(', ') : q.student_answer) : undefined}>
                        {q.student_answer != null
                          ? <span className="block truncate">{Array.isArray(q.student_answer) ? q.student_answer.join(', ') : String(q.student_answer)}</span>
                          : <span className="text-orange-400 italic">Not Attempted</span>}
                      </td>
                      <td className="py-3 px-3 text-center text-xs max-w-[120px]" title={q.correct_answer != null ? String(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer) : undefined}>
                        {q.correct_answer != null ? (
                          <span className="text-green-700 font-medium block truncate">
                            {Array.isArray(q.correct_answer)
                              ? q.correct_answer.join(', ')
                              : String(q.correct_answer)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 text-xs">
                        {q.time_spent_seconds > 0
                          ? q.time_spent_seconds >= 60
                            ? `${Math.floor(q.time_spent_seconds / 60)}m ${q.time_spent_seconds % 60}s`
                            : `${q.time_spent_seconds}s`
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-semibold ${q.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Details */}
      {submission_details && (
        <Card className="border border-slate-200 shadow-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
              <Clock className="h-5 w-5 text-slate-500" />
              Submission Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Badge variant={submission_details.status === 'completed' || submission_details.status === 'submitted' ? 'default' : 'secondary'}>
                  {submission_details.status}
                </Badge>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Started At</p>
                <p className="text-sm font-medium text-slate-800">
                  {submission_details.started_at ? new Date(submission_details.started_at).toLocaleString() : '-'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Submitted At</p>
                <p className="text-sm font-medium text-slate-800">
                  {submission_details.submitted_at ? new Date(submission_details.submitted_at).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrity Note — Minimal, non-punitive */}
      {behavioral_insights && (
        <Card className="border border-slate-200 shadow-sm mb-8">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <ShieldCheck className={`h-8 w-8 ${behavioral_insights.integrity_score >= 90 ? 'text-green-500' : behavioral_insights.integrity_score >= 70 ? 'text-yellow-500' : 'text-red-500'}`} />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Exam Integrity: {behavioral_insights.integrity_score}/100
                </p>
                <p className="text-xs text-slate-500">
                  {behavioral_insights.integrity_score >= 90
                    ? '✅ Clean — No significant issues detected'
                    : behavioral_insights.integrity_score >= 70
                      ? '⚠️ Minor flags detected — contact instructor if needed'
                      : '🚩 Flagged — please contact instructor for details'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ContestReportContent;
