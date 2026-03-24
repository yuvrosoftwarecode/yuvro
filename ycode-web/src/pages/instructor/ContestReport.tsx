import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestService } from '@/services/contestService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Download, Users, Target, CheckCircle2, TrendingUp,
    Building2, GraduationCap, ShieldCheck, Clock,
    Trophy, Star, BarChart3, FileText, AlertCircle
} from 'lucide-react';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';

interface ReportData {
    summary: {
        contest_title: string;
        organizer: string;
        type: string;
        difficulty: string;
        start_datetime: string;
        end_datetime: string;
        duration_minutes: number;
        total_marks: number;
        registered_count: number;
        attempted_count: number;
        completed_count: number;
        completion_rate: number;
        avg_marks: number;
        max_marks: number;
        min_marks: number;
    };
    top_performers: Array<{
        rank: number;
        user_id: string;
        name: string;
        college: string;
        department: string;
        marks: number;
        submitted_at: string;
    }>;
    college_breakdown: Array<{
        college: string;
        college_id?: string;
        participants: number;
        avg_marks: number;
        max_marks: number;
        min_marks: number;
        completion_rate: number;
    }>;
    department_comparison: Array<{
        department: string;
        participants: number;
        avg_marks: number;
        max_marks: number;
    }>;
    question_performance: Array<{
        question_title: string;
        type: string;
        difficulty: string;
        topic: string;
        max_marks: number;
        total_attempts: number;
        correct_percentage: number;
        avg_marks: number;
        avg_time_seconds: number;
    }>;
    integrity: {
        total_violations: number;
        clean_submissions: number;
        total_submissions: number;
        clean_percentage: number;
        proctoring_enabled: boolean;
        proctoring_techniques: string[];
    };
    ai_insights?: {
        quality_assessment?: string;
        strengths?: string[];
        areas_for_improvement?: string[];
        question_recommendations?: string[];
        future_suggestions?: string[];
        participation_insights?: string;
        ai_generated?: boolean;
        error?: string;
    };
}

export default function ContestReport() {
    const { contestId } = useParams<{ contestId: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (contestId) {
            contestService.getContestReport(contestId)
                .then(setReport)
                .catch(() => toast.error('Failed to load report'))
                .finally(() => setLoading(false));
        }
    }, [contestId]);

    const handlePrint = () => window.print();

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

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

    if (!report) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="flex">
                    <RoleSidebar />
                    <div className="flex-1 px-8 py-12 text-center">
                        <p className="text-slate-500">Report unavailable.</p>
                        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const { summary, top_performers, college_breakdown, department_comparison, question_performance, integrity } = report;

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
                            title="Contest Report"
                            subtitle="Post-contest analysis and insights"
                            actions={
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="bg-slate-500 text-white px-4 py-2 rounded-md hover:bg-slate-600 transition-colors"
                                    >
                                        ← Back to Analytics
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
                            {/* Header removed, now in RoleHeader */}


                            {/* Report Title */}
                            <div className="bg-[#F97316] rounded-2xl p-8 text-white mb-8">
                                <div className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">
                                    <FileText className="h-4 w-4" />
                                    POST-CONTEST REPORT
                                </div>
                                <h1 className="text-3xl font-bold mb-1">{summary.contest_title}</h1>
                                <p className="text-white/70">
                                    by {summary.organizer} · {formatDate(summary.start_datetime)} → {formatDate(summary.end_datetime)}
                                </p>
                                <div className="flex gap-3 mt-4">
                                    <Badge className="bg-white/20 text-white border-0">{summary.type}</Badge>
                                    <Badge className="bg-white/20 text-white border-0">{summary.difficulty}</Badge>
                                    <Badge className="bg-white/20 text-white border-0">{summary.duration_minutes} min</Badge>
                                    <Badge className="bg-white/20 text-white border-0">{summary.total_marks} marks</Badge>
                                </div>
                            </div>

                            {/* Section 1: Summary Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: 'Registered', value: summary.registered_count, icon: Users },
                                    { label: 'Attempted', value: summary.attempted_count, icon: Target },
                                    { label: 'Completed', value: summary.completed_count, icon: CheckCircle2 },
                                    { label: 'Completion Rate', value: `${summary.completion_rate}%`, icon: TrendingUp },
                                ].map(stat => (
                                    <Card key={stat.label} className="border border-slate-200 shadow-sm">
                                        <CardContent className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-slate-100">
                                                    <stat.icon className="h-5 w-5 text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <Card className="border border-slate-200 shadow-sm">
                                    <CardContent className="p-4 text-center">
                                        <p className="text-lg font-bold text-slate-800">{summary.max_marks}</p>
                                        <p className="text-xs text-slate-500">Highest Score</p>
                                    </CardContent>
                                </Card>
                                <Card className="border border-slate-200 shadow-sm">
                                    <CardContent className="p-4 text-center">
                                        <p className="text-lg font-bold text-slate-800">{summary.avg_marks}</p>
                                        <p className="text-xs text-slate-500">Average Score</p>
                                    </CardContent>
                                </Card>
                                <Card className="border border-slate-200 shadow-sm">
                                    <CardContent className="p-4 text-center">
                                        <p className="text-lg font-bold text-slate-800">{summary.min_marks}</p>
                                        <p className="text-xs text-slate-500">Lowest Score</p>
                                    </CardContent>
                                </Card>
                                <Card className="border border-slate-200 shadow-sm">
                                    <CardContent className="p-4 text-center">
                                        <p className="text-lg font-bold text-slate-800">{summary.attempted_count > 0 ? Math.round(summary.attempted_count / summary.registered_count * 100) : 0}%</p>
                                        <p className="text-xs text-slate-500">Attempt Rate</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Section 2: Top Performers */}
                            <Card className="border border-slate-200 shadow-sm mb-8">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                        <Trophy className="h-5 w-5 text-slate-500" />
                                        Top Performers
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Rank</th>
                                                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                                                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">College</th>
                                                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
                                                    <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Submitted At</th>
                                                    <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {top_performers.map(p => (
                                                    <tr key={p.rank} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                        <td className="py-3 px-3">
                                                            {p.rank <= 3 ? (
                                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${p.rank === 1 ? 'bg-[#F97316]' : p.rank === 2 ? 'bg-[#FB923C]' : 'bg-[#FDBA74]'}`}>
                                                                    {p.rank}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-500 font-medium pl-2">{p.rank}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3 font-medium text-slate-900">{p.name}</td>
                                                        <td className="py-3 px-3 text-slate-600">{p.college}</td>
                                                        <td className="py-3 px-3 text-slate-600">{p.department}</td>
                                                        <td className="py-3 px-3 text-center text-slate-500 text-xs">{formatDate(p.submitted_at)}</td>
                                                        <td className="py-3 px-3 text-right font-bold text-[#F97316]">{p.marks}/{summary.total_marks}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 3: College Breakdown */}
                            {college_breakdown.length > 0 && (
                                <Card className="border border-slate-200 shadow-sm mb-8 print-break">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                            <Building2 className="h-5 w-5 text-slate-500" />
                                            College-wise Breakdown
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-100">
                                                        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">College</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Students</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Avg Score</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Best</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Lowest</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Completion</th>
                                                        <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {college_breakdown.map(c => (
                                                        <tr key={c.college} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                            <td className="py-3 px-3 font-medium text-slate-900">{c.college}</td>
                                                            <td className="py-3 px-3 text-center text-slate-600">{c.participants}</td>
                                                            <td className="py-3 px-3 text-center font-semibold text-slate-800">{c.avg_marks}</td>
                                                            <td className="py-3 px-3 text-center font-medium text-slate-700">{c.max_marks}</td>
                                                            <td className="py-3 px-3 text-center font-medium text-slate-500">{c.min_marks}</td>
                                                            <td className="py-3 px-3 text-center">
                                                                <div className="flex items-center gap-2 justify-center">
                                                                    <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                                        <div className="h-full rounded-full bg-[#F97316]" style={{ width: `${c.completion_rate}%` }} />
                                                                    </div>
                                                                    <span className="text-xs text-slate-500">{c.completion_rate}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3 text-right">
                                                                {c.college_id && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => navigate(`/instructor/contests/${contestId}/college-analytics/${c.college_id}`)}
                                                                        className="text-xs"
                                                                    >
                                                                        <BarChart3 className="h-3 w-3 mr-1" />
                                                                        View Analytics
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Section 4: Department Comparison */}
                            {department_comparison.length > 0 && department_comparison[0].department !== 'Unknown' && (
                                <Card className="border border-slate-200 shadow-sm mb-8">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                            <GraduationCap className="h-5 w-5 text-slate-500" />
                                            Department Comparison
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {department_comparison.map(d => {
                                                const pct = summary.total_marks > 0 ? (d.avg_marks / summary.total_marks * 100) : 0;
                                                return (
                                                    <div key={d.department} className="flex items-center gap-4">
                                                        <div className="w-32 text-sm font-medium text-slate-700 truncate">{d.department}</div>
                                                        <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                                                            <div
                                                                className="h-full rounded-lg bg-[#F97316] transition-all duration-500"
                                                                style={{ width: `${Math.max(pct, 2)}%` }}
                                                            />
                                                            <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-600">
                                                                {d.avg_marks} avg · {d.participants} students
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Section 5: Skill Gap Analysis */}
                            {question_performance.length > 0 && (
                                <Card className="border border-slate-200 shadow-sm mb-8 print-break">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                            <BarChart3 className="h-5 w-5 text-slate-500" />
                                            Skill Gap Analysis
                                            <span className="text-xs font-normal text-slate-400 ml-2">sorted by weakest area first</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-100">
                                                        <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Question</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Topic</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Difficulty</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Correct %</th>
                                                        <th className="text-center py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Avg Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {question_performance.map((q, i) => (
                                                        <tr key={i} className="border-b border-slate-50">
                                                            <td className="py-3 px-3 font-medium text-slate-900 max-w-[200px] truncate">{q.question_title}</td>
                                                            <td className="py-3 px-3 text-center">
                                                                <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">{q.topic}</Badge>
                                                            </td>
                                                            <td className="py-3 px-3 text-center text-xs text-slate-500">{q.type.replace('_', ' ')}</td>
                                                            <td className="py-3 px-3 text-center">
                                                                <Badge className="text-xs bg-slate-100 text-slate-700">{q.difficulty}</Badge>
                                                            </td>
                                                            <td className="py-3 px-3 text-center">
                                                                <span className="font-bold text-base text-slate-800">
                                                                    {q.correct_percentage}%
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3 text-center text-slate-500">
                                                                {q.avg_time_seconds > 0 ? (
                                                                    <span className="flex items-center justify-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {q.avg_time_seconds >= 60
                                                                            ? `${Math.floor(q.avg_time_seconds / 60)}m ${q.avg_time_seconds % 60}s`
                                                                            : `${q.avg_time_seconds}s`
                                                                        }
                                                                    </span>
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Improvement Suggestions */}
                                        {question_performance.filter(q => q.correct_percentage < 50).length > 0 && (
                                            <div className="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-xl">
                                                <h4 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
                                                    <Star className="h-4 w-4" />
                                                    Improvement Suggestions
                                                </h4>
                                                <ul className="space-y-1.5">
                                                    {Array.from(
                                                        new Map(
                                                            question_performance
                                                                .filter(q => q.correct_percentage < 50)
                                                                .map(q => [`${q.topic}|${q.type}`, q])
                                                        ).values()
                                                    ).map((q, i) => (
                                                        <li key={i} className="text-sm text-slate-600">
                                                            <span className="font-medium text-slate-800">{q.topic}</span> ({q.type.replace('_', ' ')}) — only {q.correct_percentage}% correct.
                                                            {' '}Consider adding more practice material on this topic.
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Section 6: Integrity Certificate */}
                            <Card className="border border-slate-200 shadow-sm mb-8">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                        <ShieldCheck className="h-5 w-5 text-slate-500" />
                                        Integrity Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="text-center p-4 bg-slate-100 rounded-xl">
                                            <p className="text-3xl font-bold text-slate-800">{integrity.clean_percentage}%</p>
                                            <p className="text-sm text-slate-600 mt-1">Clean Submissions</p>
                                            <p className="text-xs text-slate-500">{integrity.clean_submissions} of {integrity.total_submissions}</p>
                                        </div>
                                        <div className="text-center p-4 bg-slate-100 rounded-xl">
                                            <p className="text-3xl font-bold text-slate-800">{integrity.total_violations}</p>
                                            <p className="text-sm text-slate-600 mt-1">Total Violations</p>
                                        </div>
                                        <div className="text-center p-4 bg-slate-100 rounded-xl">
                                            <p className="text-3xl font-bold text-slate-800">
                                                {integrity.proctoring_enabled ? 'Enabled' : 'Disabled'}
                                            </p>
                                            <p className="text-sm text-slate-600 mt-1">Proctoring Status</p>
                                            {integrity.proctoring_techniques.length > 0 && (
                                                <div className="flex flex-wrap gap-1 justify-center mt-2">
                                                    {integrity.proctoring_techniques.map(t => (
                                                        <Badge key={t} variant="outline" className="text-xs border-slate-300 text-slate-600">{t}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {integrity.clean_percentage === 100 && (
                                        <div className="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-xl text-center">
                                            <ShieldCheck className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                                            <p className="font-semibold text-slate-800">Zero Proctoring Violations</p>
                                            <p className="text-sm text-slate-600">All participants maintained academic integrity throughout the contest.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Section 7: AI-Powered Contest Insights */}
                            {report.ai_insights && report.ai_insights.error && (
                                <Card className="border-2 border-orange-200 bg-orange-50 mb-8">
                                    <CardContent className="py-8 text-center">
                                        <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                                        <p className="text-slate-700 font-medium">{report.ai_insights.error}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {report.ai_insights && !report.ai_insights.error && (
                                <Card className="border border-orange-200 shadow-sm mb-8 print-break">
                                    <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-white border-b border-orange-100">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                                <Star className="h-5 w-5 text-[#F97316]" />
                                                AI-Powered Contest Insights
                                            </CardTitle>
                                            {report.ai_insights.ai_generated && (
                                                <Badge className="bg-[#F97316] text-white border-0 text-xs">
                                                    AI Generated
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {/* Quality Assessment */}
                                        <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                                            <h4 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
                                                <Trophy className="h-4 w-4 text-[#F97316]" />
                                                Contest Quality Assessment
                                            </h4>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {report.ai_insights.quality_assessment}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            {/* Strengths */}
                                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    Strengths
                                                </h4>
                                                <ul className="space-y-2">
                                                    {report.ai_insights.strengths?.map((strength, i) => (
                                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                            <span className="text-emerald-600 mt-0.5">✓</span>
                                                            <span>{strength}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Areas for Improvement */}
                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                                <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-amber-600" />
                                                    Areas for Improvement
                                                </h4>
                                                <ul className="space-y-2">
                                                    {report.ai_insights.areas_for_improvement?.map((area, i) => (
                                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                            <span className="text-amber-600 mt-0.5">→</span>
                                                            <span>{area}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Question Recommendations */}
                                        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                            <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-600" />
                                                Question Recommendations
                                            </h4>
                                            <ul className="space-y-2">
                                                {report.ai_insights.question_recommendations?.map((rec, i) => (
                                                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                        <span className="text-blue-600 mt-0.5">•</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Future Suggestions */}
                                        <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                                            <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                                                <Target className="h-4 w-4 text-purple-600" />
                                                Future Contest Suggestions
                                            </h4>
                                            <ul className="space-y-2">
                                                {report.ai_insights.future_suggestions?.map((suggestion, i) => (
                                                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                        <span className="text-purple-600 mt-0.5">→</span>
                                                        <span>{suggestion}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Participation Insights */}
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                            <h4 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
                                                <Users className="h-4 w-4 text-slate-600" />
                                                Participation Insights
                                            </h4>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {report.ai_insights.participation_insights}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Footer */}
                            <div className="text-center text-xs text-slate-400 py-6 border-t border-slate-200">
                                Report generated by <span className="font-semibold text-[#F97316]">Yuvro</span> · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
