import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  FileText,
  Calendar,
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
  Briefcase,
  Zap,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { mockInterviewService } from '@/services/mockInterviewService';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportsScreenProps {
  role: { title: string; level: string };
  _difficulty: string;
  duration: string;
  sessionId?: string | null;
  onTryAgain: () => void;
  onBackToLibrary: () => void;
}

interface ReportData {
  overall_score: number;
  feedback_summary: string;
  performance_metrics: Record<string, number>;
  skill_analysis: Record<string, { score: number; feedback: string }>;
  question_analysis: any[];
  key_takeaways: { strengths: string[]; improvements: string[] };
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
    user?: { username: string; email: string };
    [key: string]: any;
  };
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-rose-500';
};

const getScoreBadge = (score: number) => {
  if (score >= 80)
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0';
  if (score >= 60)
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-0';
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  return 'Needs Work';
};

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// ── Score Ring ────────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 48;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor"
          strokeWidth="10" className="text-muted/30" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          className={getScoreColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-foreground">{Math.round(score)}</span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">Score</span>
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const ReportsScreen: React.FC<ReportsScreenProps> = ({
  role,
  duration,
  sessionId,
  onTryAgain,
  onBackToLibrary,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handleDownloadPDF = () => toast.info('PDF download is being prepared…');

  useEffect(() => {
    const fetchReport = async () => {
      if (!sessionId) { setError('No session ID provided.'); setLoading(false); return; }
      try {
        let attempts = 0;
        const maxAttempts = 10;
        const poll = async () => {
          try {
            const sessionData = await mockInterviewService.getInterviewSession(sessionId);
            if (sessionData.report) {
              setReport({ ...sessionData.report, interview_session: { ...sessionData, report: undefined } });
              setLoading(false);
            } else if (sessionData.status === 'completed' && !sessionData.report) {
              setError('Report generation encountered an error. Please try again.');
              setLoading(false);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(poll, 2000);
            } else {
              setError('Report generation timed out. Please check back later.');
              setLoading(false);
            }
          } catch (err) {
            console.error(err);
            setError('Failed to fetch report data.');
            setLoading(false);
          }
        };
        poll();
      } catch { setError('Failed to initialise report fetching.'); setLoading(false); }
    };
    fetchReport();
  }, [sessionId]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          <div className="absolute inset-2 border-r-2 border-primary/40 rounded-full animate-spin [animation-direction:reverse]" />
          <Bot className="absolute inset-0 m-auto w-6 h-6 text-muted-foreground animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">Generating Analysis</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Evaluating technical depth, communication clarity, and problem-solving approach.
          </p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !report) {
    return (
      <div className="flex items-center justify-center py-32">
        <Card className="max-w-sm w-full border">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Analysis Failed</p>
              <p className="text-xs text-muted-foreground mt-1">{error || 'Unable to retrieve report data.'}</p>
            </div>
            <Button onClick={onBackToLibrary} variant="outline" size="sm" className="w-full">
              Return to Library
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const radarData = Object.entries(report.performance_metrics || {}).map(([key, value]) => ({
    subject: key,
    A: value,
    fullMark: 100,
  }));

  return (
    <div className="w-full space-y-6 pb-8 px-6 pt-6">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between gap-6 pb-4 border-b">

        {/* Left: Back + Title */}
        <div className="flex items-center gap-4 min-w-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 shrink-0 rounded-full"
            onClick={onBackToLibrary}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 border-l border-border shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{role.title} — Report</h1>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> {role.level}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {report.interview_session.actual_duration_display || `${duration} mins`}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(report.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={onTryAgain}>
            <RotateCcw className="h-3.5 w-3.5" /> Try Again
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleCopyLink}>
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDownloadPDF}>
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
        </div>
      </div>


      {/* ── Hero: Score + AI Summary ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Score card */}
        <Card className="border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Overall Score
              <Badge className={`${getScoreBadge(report.overall_score)} text-[10px] px-2 py-0.5`}>
                {getScoreLabel(report.overall_score)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 space-y-6 flex flex-col items-center justify-center min-h-[220px]">
            <ScoreRing score={report.overall_score} />
            <p className="text-xs text-center text-muted-foreground">
              Better than{' '}
              <span className="font-semibold text-foreground">72%</span> of candidates
            </p>
          </CardContent>
        </Card>

        {/* AI Summary card */}
        <Card className="md:col-span-2 border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-8 space-y-5 min-h-[220px] flex flex-col justify-between">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {report.feedback_summary || 'An analysis of your interview performance is shown below.'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Top Strength */}
              <div className="p-5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30">
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Top Strength
                  </p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {report.key_takeaways?.strengths?.[0] || 'Communicated technical concepts clearly.'}
                </p>
              </div>

              {/* Primary Focus */}
              <div className="p-5 rounded-lg bg-amber-50/70 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30">
                <div className="flex items-center gap-2 mb-2.5">
                  <Target className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Primary Focus
                  </p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {report.key_takeaways?.improvements?.[0] || 'Improve edge case handling.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="questions" className="w-full">
        <div className="flex justify-center mb-2">
          <TabsList>
            <TabsTrigger value="skills" className="text-xs px-5">Skills &amp; Growth</TabsTrigger>
            <TabsTrigger value="questions" className="text-xs px-5">Question Analysis</TabsTrigger>
            <TabsTrigger value="transcript" className="text-xs px-5">Transcript</TabsTrigger>
          </TabsList>
        </div>

        {/* ── SKILLS TAB ─────────────────────────────────────────────────────── */}
        <TabsContent value="skills" className="mt-4 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Radar */}
            <Card className="border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm">Competency Map</CardTitle>
              </CardHeader>
              <CardContent className="h-64 px-3 pb-4 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Skill Level"
                      dataKey="A"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.15}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Skill cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(report.skill_analysis || {}).map(([skill, data]: [string, any], idx) => {
                const score = data.score as number;
                const isLow = score < 7;
                return (
                  <Card key={idx} className="border hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3 border-b">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{skill}</CardTitle>
                        <Badge className={`${getScoreBadge(score * 10)} text-[10px] px-2 py-0.5`}>
                          {score}/10
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <Progress value={score * 10} className="h-2" />
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {data.feedback}
                      </p>
                      {isLow ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8 gap-2"
                          onClick={() =>
                            window.open(
                              `https://yuvro.in/student/learn?q=${encodeURIComponent(skill)}`,
                              '_blank'
                            )
                          }
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Learn {skill}
                          <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                        </Button>
                      ) : (
                        <div className="h-8 flex items-center justify-center text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-200 dark:border-emerald-900/30 gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5" /> Strong Proficiency
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── QUESTIONS TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="questions" className="mt-4">
          <div className="space-y-3">
            {report.question_analysis?.map((q, idx) => {
              const isOpen = expandedQuestion === idx;
              return (
                <Card
                  key={idx}
                  className={`border overflow-hidden transition-shadow ${isOpen ? 'shadow-md border-primary/30' : 'hover:shadow-sm'}`}
                >
                  {/* Header row */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedQuestion(isOpen ? null : idx)}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border transition-colors ${
                        isOpen
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {q.question}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`${getScoreBadge(q.ai_score)} text-[10px] px-2 py-0.5`}>
                            {q.ai_score}%
                          </Badge>
                          {isOpen
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize mt-1 inline-block">
                        {q.type}
                      </span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="border-t bg-muted/10">
                      <div className="px-5 py-5 space-y-4">

                        {/* User answer */}
                        <div className="rounded-lg border bg-background p-4">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <User className="h-3 w-3" /> Your Response
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">
                            {q.user_answer || 'No answer recorded.'}
                          </p>
                        </div>

                        {/* Feedback columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/60 dark:bg-emerald-950/10 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Good Points</p>
                            </div>
                            <ul className="space-y-2">
                              {q.what_went_well?.map((item: string, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">
                                  <span className="text-emerald-500 shrink-0 mt-0.5">•</span> {item}
                                </li>
                              )) || <li className="text-xs text-muted-foreground">None detected</li>}
                            </ul>
                          </div>

                          <div className="rounded-lg border border-rose-200 dark:border-rose-900/30 bg-rose-50/60 dark:bg-rose-950/10 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                              <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Areas for Growth</p>
                            </div>
                            <ul className="space-y-2">
                              {q.what_could_be_better?.map((item: string, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">
                                  <span className="text-rose-500 shrink-0 mt-0.5">•</span> {item}
                                </li>
                              )) || <li className="text-xs text-muted-foreground">None detected</li>}
                            </ul>
                          </div>
                        </div>

                        {/* AI Suggestion */}
                        {q.recommended_response && (
                          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-amber-500" />
                              <p className="text-xs font-bold text-foreground">AI Suggested Answer</p>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {q.recommended_response}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TRANSCRIPT TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="transcript" className="mt-4">
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Interview Transcript
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="px-6 py-5 space-y-4 max-w-3xl mx-auto">
                {report.interview_session?.transcript
                  ?.filter((m) => m.message_type !== 'system')
                  .map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.message_type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                          msg.message_type === 'user'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {msg.message_type === 'user'
                          ? <User className="h-4 w-4" />
                          : <Bot className="h-4 w-4" />}
                      </div>
                      <div
                        className={`max-w-[72%] px-4 py-3 rounded-xl text-sm leading-relaxed border ${
                          msg.message_type === 'user'
                            ? 'bg-primary text-primary-foreground border-primary rounded-tr-none'
                            : 'bg-muted/40 text-foreground border-border rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        <span
                          className={`text-[10px] mt-2 block ${
                            msg.message_type === 'user'
                              ? 'text-primary-foreground/60 text-right'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  )) || (
                  <div className="text-center py-20 text-muted-foreground space-y-3">
                    <FileText className="h-10 w-10 mx-auto opacity-20" />
                    <p className="text-xs">No transcript available for this session.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsScreen;