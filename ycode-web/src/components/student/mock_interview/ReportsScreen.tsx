import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  FileText,
  Calendar,
  Loader2,
  Share2,
  Copy,
  Download,
  RotateCcw,
  Bot,
  CheckCircle,
  AlertCircle,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  Briefcase
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { mockInterviewService } from '@/services/mockInterviewService';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface ReportsScreenProps {
  role: {
    title: string;
    level: string;
  };
  difficulty: string;
  duration: string;
  sessionId?: string | null;
  onTryAgain: () => void;
  onBackToLibrary: () => void;
  isAdmin?: boolean;
}

interface ReportData {
  overall_score: number;
  feedback_summary: string;
  performance_metrics: Record<string, number>;
  skill_analysis: Record<string, { score: number; feedback: string }>;
  question_analysis: any[];
  key_takeaways: {
    strengths: string[];
    improvements: string[];
  };
  meta_stats: any;
  interview_session: {
    id: string;
    transcript: Array<{
      id: string;
      message_type: 'user' | 'assistant' | 'system';
      content: string;
      created_at: string;
    }>;
    actual_duration_display?: string | null;
    user?: {
        username: string;
        email: string;
    };
    [key: string]: any;
  };
  created_at: string;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({
  role,
  difficulty,
  duration,
  sessionId,
  onTryAgain,
  onBackToLibrary,
  isAdmin = false
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    const promise = new Promise(async (resolve, reject) => {
        try {
            const canvas = await html2canvas(reportRef.current!, {
                scale: 2,
                useCORS: true, 
                ignoreElements: (element) => element.hasAttribute('data-html2canvas-ignore')
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`MockInterviewReport_${sessionId || 'report'}.pdf`);
            resolve(true);
        } catch (e) {
            reject(e);
        }
    });

    toast.promise(promise, {
        loading: 'Generating PDF...',
        success: 'PDF downloaded successfully',
        error: 'Failed to generate PDF'
    });
  };

  const toggleQuestion = (idx: number) => {
    setExpandedQuestionIndex(expandedQuestionIndex === idx ? null : idx);
  };
  
  // Format date to dd/mm/yyyy
  const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
  };

  useEffect(() => {
    const fetchReport = async () => {
      if (!sessionId) {
        setError("No session ID provided.");
        setLoading(false);
        return;
      }

      try {
        let attempts = 0;
        const maxAttempts = 10;

        const poll = async () => {
          try {
            const sessionData = await mockInterviewService.getInterviewSession(sessionId);

            if (sessionData.report) {
              setReport({
                ...sessionData.report,
                interview_session: {
                  ...sessionData,
                  report: undefined
                }
              });
              setLoading(false);
            } else if (sessionData.status === 'completed' && !sessionData.report) {
                 // If the session is marked completed but has no report, generation likely failed server-side.
                 setError("Report generation system encountered an error. Please try again or check backend logs.");
                 setLoading(false);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(poll, 2000);
            } else {
              setError("Report generation timed out without completion. Please check back later.");
              setLoading(false);
            }
          } catch (err) {
            console.error(err);
            setError("Failed to fetch report data.");
            setLoading(false);
          }
        };
        poll();
      } catch (err) {
        console.error(err);
        setError("Failed to initialize report fetching.");
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-rose-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const handleLearnClick = (skill: string) => {
    window.open(`https://yuvro.in/student/learn?q=${encodeURIComponent(skill)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-t-4 border-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-r-4 border-purple-500 rounded-full animate-spin reverse-spin"></div>
          <Bot className="absolute inset-0 m-auto w-8 h-8 text-slate-400 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Generating Analysis</h2>
        <p className="text-slate-500 mt-2 max-w-md text-center">
          Our AI is evaluating your technical depth, communication clarity, and problem-solving approach.
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-red-100 shadow-xl shadow-red-50 rounded-2xl">
          <CardContent className="pt-8 text-center space-y-4">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Analysis Failed</h2>
            <p className="text-slate-500">{error || "Unable to retrieve report data."}</p>
            <Button onClick={onBackToLibrary} variant="outline" className="mt-4 w-full cursor-pointer rounded-xl">
              Return to {isAdmin ? 'Reports List' : 'Library'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const radarData = Object.entries(report.performance_metrics || {}).map(([key, value]) => ({
    subject: key,
    A: value,
    fullMark: 100
  }));

  return (
    <div ref={reportRef} className="min-h-screen font-sans text-slate-900 pb-20 selection:bg-blue-100 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">

      {/* Background Mesh (Subtle) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3"></div>
      </div>

      {/* Hero Header - Full Width */}
      <div className="bg-white/80 border-b border-slate-200/60 sticky top-0 z-30 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="w-full px-6 md:px-10 lg:px-14 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBackToLibrary} className="rounded-full hover:bg-slate-100/80 cursor-pointer transition-transform hover:-translate-x-1">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {role.title}
                <span className="text-slate-300 font-light text-2xl">|</span>
                <span className="text-slate-500 font-medium text-lg">Report</span>
                {isAdmin && report.interview_session.user && (
                    <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Candidate: {report.interview_session.user.username}
                    </span>
                )}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-blue-500" /> {role.level}</span>
                <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-500" /> 
                    {report.interview_session.actual_duration_display 
                        ? report.interview_session.actual_duration_display
                        : `${duration} mins`
                    }
                </span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-500" /> {formatDate(report.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3" data-html2canvas-ignore>
            {!isAdmin && (
                <Button variant="outline" onClick={onTryAgain} className="gap-2 cursor-pointer hover:bg-slate-50 transition-colors rounded-xl border-slate-200 shadow-sm">
                <RotateCcw className="w-4 h-4" /> Try Again
                </Button>
            )}
            <Button variant="outline" onClick={handleCopyLink} className="gap-2 cursor-pointer hover:bg-slate-50 transition-colors rounded-xl border-slate-200 shadow-sm">
              <Copy className="w-4 h-4" /> Copy Link
            </Button>
            <Button onClick={handleDownloadPDF} className="gap-2 bg-gradient-to-r from-blue-600 to-saffron-600 hover:from-blue-700 hover:to-saffron-700 shadow-lg shadow-blue-500/25 border-0 cursor-pointer transition-all hover:scale-105 active:scale-95 rounded-xl text-white font-medium">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Container */}
      <div className="w-full px-6 md:px-10 lg:px-14 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">

        {/* Top Summary Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Overall Score Card */}
          <Card className="xl:col-span-4 overflow-hidden relative border-0 shadow-xl shadow-slate-200/60 bg-white/70 backdrop-blur-sm group rounded-3xl transition-transform hover:-translate-y-1 duration-500">
            {/* Decorative blob */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-1000"></div>

            <CardHeader className="pb-0 relative z-10 pt-8 pl-8">
              <CardTitle className="text-slate-500 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4" /> Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8 relative z-10">
              <div className="relative w-56 h-56 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                {/* Background Circle */}
                <svg className="absolute w-full h-full transform -rotate-90 drop-shadow-lg">
                  <circle cx="112" cy="112" r="100" className="text-slate-100" strokeWidth="20" fill="none" stroke="currentColor" />
                  <circle
                    cx="112" cy="112" r="100"
                    className={`transition-all duration-1000 ease-out ${getScoreColor(report.overall_score)}`}
                    strokeWidth="20"
                    strokeDasharray={2 * Math.PI * 100}
                    strokeDashoffset={2 * Math.PI * 100 * (1 - report.overall_score / 100)}
                    strokeLinecap="round"
                    fill="none"
                    stroke="currentColor"
                  />
                </svg>
                <div className="absolute flex flex-col items-center text-center animate-in zoom-in duration-500 delay-150">
                  <span className="text-6xl font-black text-slate-800 tracking-tighter">{Math.round(report.overall_score)}</span>
                  <span className="text-sm font-bold text-slate-400 mt-1 tracking-widest uppercase">Score</span>
                </div>
              </div>

              <p className="mt-8 text-center text-slate-600 text-base font-medium px-4">
                Better than <strong className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded">72%</strong> of candidates.
              </p>
            </CardContent>
          </Card>

          {/* Executive Summary Card */}
          <div className="xl:col-span-8 flex flex-col h-full">
            <Card className="flex-1 border-0 shadow-2xl shadow-blue-900/10 bg-gradient-to-br from-slate-900 via-slate-800 to-saffron-900 text-white relative overflow-hidden transition-transform duration-500 hover:shadow-3xl rounded-3xl group">
              <div className="absolute top-0 right-0 p-12 opacity-10 transition-opacity group-hover:opacity-20 duration-700">
                <Bot className="w-80 h-80" />
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>

              <CardHeader className="pt-10 pl-10 relative z-10">
                <CardTitle className="flex items-center gap-3 text-blue-200 text-xl font-bold">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                    <Bot className="w-6 h-6" />
                  </div>
                  AI Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-10 pb-10 relative z-10 flex flex-col justify-between h-[calc(100%-100px)]">
                <p className="text-slate-200 leading-relaxed text-lg font-light tracking-wide">
                  {report.feedback_summary || "An analysis of your interview performance is shown below."}
                </p>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Strength */}
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 transition-all hover:bg-white/10 hover:border-white/20 group/item">
                    <div className="flex items-center gap-3 text-emerald-400 font-bold mb-3 uppercase tracking-wider text-xs">
                      <CheckCircle className="w-5 h-5 group-hover/item:scale-110 transition-transform" /> Top Strength
                    </div>
                    <p className="text-base text-slate-100 font-medium">
                      {report.key_takeaways?.strengths?.[0] || "Communicated technical concepts clearly."}
                    </p>
                  </div>
                  {/* Focus Area */}
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 transition-all hover:bg-white/10 hover:border-white/20 group/item">
                    <div className="flex items-center gap-3 text-amber-400 font-bold mb-3 uppercase tracking-wider text-xs">
                      <Target className="w-5 h-5 group-hover/item:scale-110 transition-transform" /> Primary Focus
                    </div>
                    <p className="text-base text-slate-100 font-medium">
                      {report.key_takeaways?.improvements?.[0] || "Could improve on specific edge case handling."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Analysis Tabs */}
        <div className="space-y-6">
          <Tabs defaultValue="questions" className="w-full">
            <div className="flex justify-center mb-10 sticky top-[80px] z-20 py-2">
              <TabsList className="bg-white/80 backdrop-blur-md border border-slate-200/50 p-1.5 rounded-full shadow-lg shadow-slate-200/40">
                <TabsTrigger value="skills" className="rounded-full px-8 py-2.5 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all cursor-pointer">
                  Skills & Growth
                </TabsTrigger>
                <TabsTrigger value="questions" className="rounded-full px-8 py-2.5 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all cursor-pointer">
                  Question Analysis
                </TabsTrigger>
                <TabsTrigger value="transcript" className="rounded-full px-8 py-2.5 text-sm font-medium data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all cursor-pointer">
                  Full Transcript
                </TabsTrigger>
              </TabsList>
            </div>

            {/* SKILLS TAB */}
            <TabsContent value="skills" className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Radar Chart */}
                <Card className="lg:col-span-1 shadow-lg shadow-slate-200/50 border-0 bg-white/80 backdrop-blur rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-800">Competency Map</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Skill Level"
                          dataKey="A"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fill="url(#radarGradient)"
                          fillOpacity={0.5}
                        />
                        <defs>
                          <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Skill Cards Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 auto-rows-max gap-5">
                  {Object.entries(report.skill_analysis || {}).map(([skill, data]: [string, any], idx) => {
                    const score = data.score; // Assuming out of 10
                    const isLowScore = score < 7;

                    return (
                      <Card key={idx} className="border-0 shadow-md shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-100/50 transition-all group duration-300 rounded-2xl bg-white/90 backdrop-blur">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{skill}</CardTitle>
                            <Badge variant="outline" className={`text-sm font-semibold px-3 py-0.5 rounded-full ${getScoreBg(score * 10)}`}>
                              {score}/10
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="relative h-2.5 w-full bg-slate-100 rounded-full mb-4 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${score >= 7 ? 'from-emerald-400 to-emerald-500' : 'from-blue-400 to-blue-600'}`}
                              style={{ width: `${score * 10}%` }}
                            ></div>
                          </div>

                          <p className="text-sm text-slate-600 line-clamp-2 h-10 mb-5 leading-relaxed">
                            {data.feedback}
                          </p>

                          {isLowScore ? (
                            <Button
                              variant="ghost"
                              className="w-full justify-between bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white group-hover:translate-x-1 transition-all duration-300 cursor-pointer rounded-xl h-11 border border-blue-100"
                              onClick={() => handleLearnClick(skill)}
                            >
                              <span className="flex items-center gap-2 font-medium">
                                <BookOpen className="w-4 h-4" /> Learn {skill}
                              </span>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          ) : (
                            <div className="h-11 flex items-center justify-center text-sm text-emerald-700 font-semibold bg-emerald-50 rounded-xl border border-emerald-100">
                              <CheckCircle className="w-4 h-4 mr-2" /> Strong Proficiency
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* QUESTIONS TAB - FULL WIDTH CARDS */}
            <TabsContent value="questions" className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
              <div className="w-full space-y-4 pb-20">
                {report.question_analysis?.map((q, idx) => {
                  const isExpanded = expandedQuestionIndex === idx;
                  return (
                    <div key={idx} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden
                           ${isExpanded
                        ? 'shadow-xl shadow-blue-900/5 border-blue-200 ring-1 ring-blue-100'
                        : 'shadow-sm border-slate-200 hover:shadow-md hover:border-slate-300'
                      }
                        `}>
                      {/* Card Header / Summary */}
                      <div
                        onClick={() => toggleQuestion(idx)}
                        className="p-6 flex items-start gap-6 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                      >
                        <div className={`
                                 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300 shadow-sm
                                 ${isExpanded ? 'bg-blue-600 text-white scale-110' : 'bg-slate-100 text-slate-500'}
                              `}>
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                            <h3 className={`text-lg font-bold transition-colors pr-8 leading-tight ${isExpanded ? 'text-blue-800' : 'text-slate-800'}`}>
                              {q.question}
                            </h3>
                            <Badge variant="secondary" className={`${getScoreBg(q.ai_score)} shrink-0 self-start md:self-center px-4 py-1 text-sm font-semibold rounded-lg`}>
                              {q.ai_score}% Match
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="capitalize font-semibold text-xs bg-slate-100 px-3 py-1 rounded-md text-slate-600 border border-slate-200 tracking-wide">{q.type}</span>
                            {isExpanded ? <ChevronUp className="w-5 h-5 ml-auto text-blue-500" /> : <ChevronDown className="w-5 h-5 ml-auto text-slate-400" />}
                          </div>
                        </div>
                      </div>

                      {/* EXPANDED CONTENT */}
                      <div className={`
                              overflow-hidden transition-all duration-500 ease-in-out
                              ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
                           `}>
                        <div className="p-8 pt-2 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">

                            {/* User Answer Column */}
                            <div className="xl:col-span-2 space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                                <User className="w-4 h-4 text-blue-500" /> Your Response
                              </h4>
                              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-slate-700 text-base leading-relaxed shadow-sm hover:shadow-md transition-shadow">
                                {q.user_answer || "No answer recorded."}
                              </div>
                            </div>

                            {/* Evaluation - Strengths */}
                            <div className="bg-emerald-50/60 p-6 rounded-2xl border border-emerald-100">
                              <h4 className="text-base font-bold text-emerald-800 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" /> Good Points
                              </h4>
                              <ul className="space-y-4">
                                {q.what_went_well?.map((item: string, i: number) => (
                                  <li key={i} className="text-sm text-emerald-900 flex items-start gap-3">
                                    <div className="bg-emerald-200/50 p-1 rounded-full shrink-0 mt-0.5">
                                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="leading-relaxed font-medium">{item}</span>
                                  </li>
                                )) || <li className="text-sm text-slate-400">None detected</li>}
                              </ul>
                            </div>

                            {/* Evaluation - Improvements */}
                            <div className="bg-rose-50/60 p-6 rounded-2xl border border-rose-100">
                              <h4 className="text-base font-bold text-rose-800 mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" /> Areas for Growth
                              </h4>
                              <ul className="space-y-4">
                                {q.what_could_be_better?.map((item: string, i: number) => (
                                  <li key={i} className="text-sm text-rose-900 flex items-start gap-3">
                                    <div className="bg-rose-200/50 p-1 rounded-full shrink-0 mt-0.5">
                                      <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                      </div>
                                    </div>
                                    <span className="leading-relaxed font-medium">{item}</span>
                                  </li>
                                )) || <li className="text-sm text-slate-400">None detected</li>}
                              </ul>
                            </div>

                            {/* Ideal Answer */}
                            <div className="xl:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200 p-8 rounded-3xl shadow-xl relative overflow-hidden group">
                              <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                                <Bot className="w-64 h-64" />
                              </div>
                              <h4 className="text-base font-bold text-blue-300 mb-4 flex items-center gap-2 relative z-10">
                                <Bot className="w-5 h-5" /> AI Suggested Answer
                              </h4>
                              <p className="text-base leading-loose font-light tracking-wide text-white/90 relative z-10 whitespace-pre-wrap">
                                {q.recommended_response || "No recommendation available."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* TRANSCRIPT TAB */}
            <TabsContent value="transcript" className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
              <Card className="h-[calc(100vh-250px)] flex flex-col border-0 shadow-xl shadow-slate-200/50 rounded-3xl bg-white/90 backdrop-blur overflow-hidden">
                <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-8">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Interview Transcript
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 p-8 bg-slate-50/30">
                  <div className="space-y-8 max-w-5xl mx-auto">
                    {report.interview_session?.transcript?.map((msg, idx) => (
                      msg.message_type !== 'system' && (
                        <div
                          key={idx}
                          className={`flex gap-6 ${msg.message_type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <div className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md border
                            ${msg.message_type === 'user'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-200'
                              : 'bg-white text-slate-700 border-slate-100 shadow-slate-200'
                            }
                          `}>
                            {msg.message_type === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6 text-blue-600" />}
                          </div>
                          <div className={`
                            max-w-[75%] p-6 rounded-3xl text-sm leading-relaxed shadow-sm
                            ${msg.message_type === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-200'
                              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-slate-100'
                            }
                          `}>
                            <p className="whitespace-pre-wrap text-base">{msg.content}</p>
                            <span className={`text-[11px] mt-3 block font-medium opacity-70 ${msg.message_type === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )
                    )) || (
                        <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-4">
                          <FileText className="w-12 h-12 opacity-20" />
                          <p>No transcript available for this session.</p>
                        </div>
                      )}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ReportsScreen;