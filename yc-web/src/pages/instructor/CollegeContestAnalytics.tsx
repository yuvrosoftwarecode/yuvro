import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestService } from '@/services/contestService';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Trophy, Target, Clock, TrendingUp, 
  Award, Lightbulb, BookOpen, Sparkles, AlertCircle,
  Download, FileText, CheckCircle2, BarChart3, Users,
  Building2, GraduationCap, ShieldCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CollegeContestAnalytics = () => {
  const { contestId, collegeId } = useParams<{ contestId: string; collegeId: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [contestId, collegeId]);

  const loadAnalytics = async () => {
    if (!contestId || !collegeId) return;
    
    try {
      setLoading(true);
      const data = await contestService.getCollegeAnalytics(contestId, collegeId, true);
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
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1 px-8 py-12">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              <div className="h-64 bg-slate-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1 px-8 py-12">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="mt-4 bg-slate-500 text-white px-4 py-2 rounded-md hover:bg-slate-600 transition-colors"
                >
                  Go Back
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { college_overview, department_breakdown, student_list, topic_performance, time_metrics, integrity_metrics, ai_insights } = analytics;

  const topicChartData = topic_performance?.map((t: any) => ({
    topic: t.topic,
    score: t.score_percentage,
    average: t.contest_avg_percentage
  })) || [];

  const departmentChartData = department_breakdown?.map((d: any) => ({
    name: d.department_name,
    avgScore: d.average_score,
    students: d.student_count
  })) || [];

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
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="College Analytics"
              subtitle="Institutional performance analysis and insights"
              actions={
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="bg-slate-500 text-white px-4 py-2 rounded-md hover:bg-slate-600 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handlePrint}
                    className="bg-[#F97316] text-white px-4 py-2 rounded-md hover:bg-[#EA580C] transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </button>
                </div>
              }
            />

            <div className="report-container px-6 py-6">
              {/* Report Title */}
              <div className="bg-[#F97316] rounded-2xl p-8 text-white mb-8">
                <div className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">
                  <FileText className="h-4 w-4" />
                  COLLEGE PERFORMANCE REPORT
                </div>
                <h1 className="text-3xl font-bold mb-1">{college_overview?.college_name}</h1>
                <p className="text-white/70">
                  Contest analytics and institutional insights
                </p>
                <div className="flex gap-3 mt-4">
                  <Badge className="bg-white/20 text-white border-0">
                    {college_overview?.total_students} Students
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0">
                    Rank: #{college_overview?.college_rank}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0">
                    Avg Score: {college_overview?.average_score?.toFixed(1)}
                  </Badge>
                </div>
              </div>

              {/* Section 1: College Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { 
                    label: 'Total Students', 
                    value: college_overview?.total_students,
                    subtext: `${college_overview?.completed_students} completed`,
                    icon: Users,
                    color: 'text-[#F97316]'
                  },
                  { 
                    label: 'College Rank', 
                    value: `#${college_overview?.college_rank}`,
                    subtext: `of ${college_overview?.total_colleges} colleges`,
                    icon: Trophy,
                    color: 'text-slate-600'
                  },
                  { 
                    label: 'Average Score', 
                    value: college_overview?.average_score?.toFixed(1),
                    subtext: `${college_overview?.vs_contest_avg > 0 ? '+' : ''}${college_overview?.vs_contest_avg?.toFixed(1)}% vs avg`,
                    icon: Target,
                    color: 'text-slate-600'
                  },
                  { 
                    label: 'Completion Rate', 
                    value: `${college_overview?.completion_rate?.toFixed(1)}%`,
                    subtext: `${college_overview?.completed_students}/${college_overview?.total_students}`,
                    icon: CheckCircle2,
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
                    <p className="text-lg font-bold text-slate-800">{college_overview?.contest_average?.toFixed(1)}</p>
                    <p className="text-xs text-slate-500">Contest Average</p>
                  </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-lg font-bold text-slate-800">{college_overview?.max_score}</p>
                    <p className="text-xs text-slate-500">Highest Score</p>
                  </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-lg font-bold text-slate-800">{college_overview?.min_score}</p>
                    <p className="text-xs text-slate-500">Lowest Score</p>
                  </CardContent>
                </Card>
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
                      AI-Powered Institutional Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Motivational Message */}
                    <div className="bg-white/80 rounded-lg p-4 border border-[#F97316]/20">
                      <p className="text-base leading-relaxed text-slate-700">{ai_insights.motivational_message}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Strengths */}
                      <div className="bg-white/60 rounded-lg p-4">
                        <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                          <Award className="h-4 w-4" /> Institutional Strengths
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
                          <Target className="h-4 w-4" /> Areas for Improvement
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

                    {/* Recommendations */}
                    <div className="bg-white/60 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" /> Recommendations
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
                        <BookOpen className="h-4 w-4" /> Action Plan
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
                  </CardContent>
                </Card>
              )}

              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Department Performance */}
                {department_breakdown && department_breakdown.length > 0 && (
                  <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                        <GraduationCap className="h-5 w-5 text-slate-500" />
                        Department Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={departmentChartData}>
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avgScore" fill="#F97316" name="Avg Score" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

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
                        <Bar dataKey="score" fill="#F97316" name="College %" />
                        <Bar dataKey="average" fill="#94a3b8" name="Contest Avg %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Department Breakdown Table */}
              {department_breakdown && department_breakdown.length > 0 && (
                <Card className="border border-slate-200 shadow-sm mb-8">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                      <Building2 className="h-5 w-5 text-slate-500" />
                      Department-wise Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
                            <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Students</th>
                            <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Completed</th>
                            <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Avg Score</th>
                            <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Completion %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {department_breakdown.map((dept: any, idx: number) => (
                            <tr key={idx} className="border-b border-slate-50">
                              <td className="py-3 px-3 font-medium text-slate-900">{dept.department_name}</td>
                              <td className="py-3 px-3 text-center text-slate-600">{dept.student_count}</td>
                              <td className="py-3 px-3 text-center text-slate-600">{dept.completed_count}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-bold text-[#F97316]">{dept.average_score?.toFixed(1)}</span>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-600">
                                {dept.completion_rate?.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Student List Table */}
              {student_list && student_list.length > 0 && (
                <Card className="border border-slate-200 shadow-sm mb-8">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                      <Users className="h-5 w-5 text-slate-500" />
                      Student Performance List
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Rank</th>
                            <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                            <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
                            <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Score</th>
                            <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student_list.slice(0, 20).map((student: any) => (
                            <tr key={student.user_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-3 px-3">
                                {student.rank <= 3 ? (
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${student.rank === 1 ? 'bg-[#F97316]' : student.rank === 2 ? 'bg-[#FB923C]' : 'bg-[#FDBA74]'}`}>
                                    {student.rank}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-medium pl-2">{student.rank}</span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-900">{student.name}</td>
                              <td className="py-3 px-3 text-slate-600">{student.department}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-bold text-[#F97316]">{student.score}</span>
                                <span className="text-slate-400 text-xs ml-1">({student.percentage?.toFixed(1)}%)</span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge variant={student.status === 'completed' ? 'default' : 'secondary'}>
                                  {student.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {student_list.length > 20 && (
                        <p className="text-center text-sm text-slate-500 mt-4">
                          Showing top 20 of {student_list.length} students
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Integrity Summary */}
              {integrity_metrics && (
                <Card className="border border-slate-200 shadow-sm mb-8">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                      <ShieldCheck className="h-5 w-5 text-slate-500" />
                      Integrity Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{integrity_metrics.clean_submissions}</p>
                        <p className="text-xs text-slate-500">Clean Submissions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{integrity_metrics.submissions_with_violations}</p>
                        <p className="text-xs text-slate-500">With Violations</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">{integrity_metrics.clean_percentage?.toFixed(1)}%</p>
                        <p className="text-xs text-slate-500">Clean Percentage</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">{integrity_metrics.average_violations_per_student?.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">Avg Violations/Student</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CollegeContestAnalytics;
