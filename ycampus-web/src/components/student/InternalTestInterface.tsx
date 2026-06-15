import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  Camera,
  CameraOff,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Loader2,
  Shield,
} from 'lucide-react';
import CodeEditor from '@/components/ui/code-editor';
import { startSkillTest, submitSkillTest } from '@/services/skillTestService';
import { useProctoring } from '@/hooks/useProctoring';
import { useToast } from '@/hooks/use-toast';

interface Assessment {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
}

interface Question {
  id: string;
  type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
  title?: string;
  content: string;
  mcq_options?: string[] | { option_text: string; text?: string }[];
  marks: number;
}

interface InternalTestInterfaceProps {
  assessment: Assessment;
  onComplete: (stats?: { answeredCount: number; totalQuestions: number; timeSpent: number }) => void;
  onBack: () => void;
}

const DEFAULT_CODING_TEMPLATES = [
  '// Write your JavaScript code here\nfunction solution() {\n    // Your code\n}\n',
  '# Write your Python code here\ndef solution():\n    # Your code\n    pass\n',
  '// Write your Java code here\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code\n    }\n}\n',
  '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code\n    return 0;\n}\n',
  '// Write your code here\n',
].map((t) => t.trim());

const InternalTestInterface: React.FC<InternalTestInterfaceProps> = ({ assessment, onComplete, onBack }) => {
  const isCampus = !window.location.pathname.includes('/student/assessments');
  const { toast } = useToast();

  // Questions & submission state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadPromiseRef = useRef<Promise<any> | null>(null);

  // Answer state
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [explanations, setExplanations] = useState<{ [key: string]: string }>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  // UI state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const currentQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentQuestionIdRef.current = questions[currentQuestion]?.id || null;
  }, [currentQuestion, questions]);

  const [questionPage, setQuestionPage] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [testDuration, setTestDuration] = useState(assessment.duration * 60);
  const [timeLeft, setTimeLeft] = useState(assessment.duration * 60);

  // Proctoring UI state
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);
  const [showTabWarningDialog, setShowTabWarningDialog] = useState(false);
  const [showTabSwitchDialog, setShowTabSwitchDialog] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  const [videoTrackEnabled, setVideoTrackEnabled] = useState(true);
  const [audioTrackEnabled, setAudioTrackEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const managedStreamsRef = useRef<Set<MediaStream>>(new Set());
  const isSubmittingRef = useRef(false);

  // ── Load questions from backend ────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const loadTest = async () => {
      try {
        setIsLoadingTest(true);
        setLoadError(null);
        if (!loadPromiseRef.current) {
          loadPromiseRef.current = startSkillTest(assessment.id);
        }
        const response = await loadPromiseRef.current;
        if (!cancelled) {
          setSubmissionId(response.submission_id);
          const normalized: Question[] = (response.questions || []).map((q: any) => ({
            id: String(q.id),
            type: q.type || 'mcq_single',
            title: q.title,
            content: q.content || q.question || '',
            mcq_options: q.mcq_options || [],
            marks: q.marks || 1,
          }));
          setQuestions(normalized);
          if (response.duration) {
            setTimeLeft(response.duration * 60);
            setTestDuration(response.duration * 60);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message || `Failed to load ${isCampus ? 'internal test' : 'assessment'} questions. Please try again.`;
          cleanupCamera();
          loadPromiseRef.current = null;
          sessionStorage.setItem('toast_error', msg);
          window.location.reload();
        }
      } finally {
        if (!cancelled) setIsLoadingTest(false);
      }
    };
    loadTest();
    return () => { cancelled = true; };
  }, [assessment.id]);

  // ── Camera / Microphone ────────────────────────────────────────────────────

  const stopMediaMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    managedStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    managedStreamsRef.current.clear();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setVideoTrackEnabled(false);
    setAudioTrackEnabled(false);
    setHasMediaAccess(false);
  };

  useEffect(() => {
    let isActive = true;
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isActive || isSubmittingRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (streamRef.current && streamRef.current !== stream) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          managedStreamsRef.current.delete(streamRef.current);
        }
        managedStreamsRef.current.add(stream);
        streamRef.current = stream;
        setHasMediaAccess(true);
        setVideoTrackEnabled(true);
        setAudioTrackEnabled(true);
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(console.error); }
      } catch {
        setHasMediaAccess(false);
        setVideoTrackEnabled(false);
        setAudioTrackEnabled(false);
      }
    };
    initMedia();
    return () => { isActive = false; stopMediaMonitoring(); };
  }, []);

  // Rebind stream when needed
  useEffect(() => {
    if (hasMediaAccess && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        console.log('useProctoring [ycampus-web]: Rebinding video stream to HTML element');
        video.srcObject = streamRef.current;
        video.play().catch(() => setTimeout(() => video.play().catch(console.error), 150));
      }
    }
  });

  // ── Proctoring via shared hook ─────────────────────────────────────────────

  const handleProctoringViolation = useCallback((type: string) => {
    if (type === 'tab_switch') {
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        setTabSwitchAlert(true);
        if (next >= 2) {
          setShowTabWarningDialog(false);
          setShowTabSwitchDialog(true);
        } else {
          setShowTabWarningDialog(true);
        }
        return next;
      });
    }
  }, []);

  const { logActivity } = useProctoring({
    assessmentId: assessment.id,
    assessmentType: 'skill-tests',
    enabled: !!submissionId,
    submissionId,
    questionId: questions[currentQuestion]?.id,
    mediaStream: streamRef.current,
    onViolation: handleProctoringViolation,
  });

  const prevQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (submissionId && questions.length > 0 && questions[currentQuestion]?.id) {
      const newQId = questions[currentQuestion].id;
      const prevQId = prevQuestionIdRef.current;

      if (prevQId && prevQId !== newQId) {
        logActivity('question_left', { question_id: prevQId });
      }

      logActivity('question_viewed', { question_id: newQId });
      prevQuestionIdRef.current = newQId;
    }
  }, [currentQuestion, questions, submissionId, logActivity]);

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoadingTest || questions.length === 0) return;
    if (timeLeft <= 0) { handleSubmitAssessment(); return; }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
      const activeQId = currentQuestionIdRef.current;
      if (activeQId) {
        setQuestionTimes(prev => ({
          ...prev,
          [activeQId]: (prev[activeQId] || 0) + 1
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isLoadingTest, questions.length]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const getDefaultCode = (lang: string) => {
    const templates: Record<string, string> = {
      javascript: DEFAULT_CODING_TEMPLATES[0],
      python: DEFAULT_CODING_TEMPLATES[1],
      java: DEFAULT_CODING_TEMPLATES[2],
      cpp: DEFAULT_CODING_TEMPLATES[3],
    };
    return templates[lang] || DEFAULT_CODING_TEMPLATES[4];
  };

  const getMcqOptions = (q: Question): string[] => {
    if (!q.mcq_options || q.mcq_options.length === 0) return [];
    if (typeof q.mcq_options[0] === 'string') return q.mcq_options as string[];
    return (q.mcq_options as any[]).map((o) => o.text || o.option_text || '');
  };

  const isCodingAnswered = (answer: any) => {
    const s = answer?.toString().trim() || '';
    return s.length > 0 && !DEFAULT_CODING_TEMPLATES.includes(s);
  };

  const isQuestionAnswered = (question: Question) => {
    const answer = answers[question.id];
    if (question.type === 'mcq_single') return Boolean(answer);
    if (question.type === 'mcq_multiple') return Array.isArray(answer) && answer.length > 0;
    if (question.type === 'coding') return isCodingAnswered(answer);
    return Boolean(answer?.toString().trim());
  };

  const getQuestionStatus = (index: number, qId: string) => {
    const q = questions.find((x) => x.id === qId);
    if (q && isQuestionAnswered(q)) return 'answered';
    if (flagged.has(qId)) return 'flagged';
    if (index === currentQuestion) return 'current';
    return 'unanswered';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-green-500 text-white border-green-500';
      case 'flagged': return 'bg-yellow-500 text-white border-yellow-500';
      case 'current': return 'bg-primary text-white border-primary';
      default: return 'bg-muted text-muted-foreground border';
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmitAssessment = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    stopMediaMonitoring();

    const answeredCount = questions.filter(isQuestionAnswered).length;
    const timeSpent = testDuration - timeLeft;

    if (submissionId) {
      try {
        const all_question_ids = questions.map((q) => q.id);
        await submitSkillTest(assessment.id, submissionId, answers, explanations, all_question_ids, questionTimes);
      } catch (err) {
        console.error('Submit error:', err);
      }
    }

    onComplete({ answeredCount, totalQuestions: questions.length, timeSpent });
  };

  const handleTabSwitchDialogClose = () => handleSubmitAssessment();
  const handleContinueAssessment = () => setShowTabWarningDialog(false);
  const handleCancelAssessment = () => { setShowTabWarningDialog(false); handleSubmitAssessment(); };

  // ── Pagination ─────────────────────────────────────────────────────────────

  const questionsPerPage = 10;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startQuestion = questionPage * questionsPerPage;
  const endQuestion = Math.min(startQuestion + questionsPerPage, questions.length);
  const paginatedQuestions = questions.slice(startQuestion, endQuestion);

  // ── Render question content ────────────────────────────────────────────────

  const renderQuestion = () => {
    const currentQ = questions[currentQuestion];
    if (!currentQ) return null;
    const options = getMcqOptions(currentQ);

    switch (currentQ.type) {
      case 'mcq_single':
        return (
          <div className="space-y-6">
            <RadioGroup
              value={answers[currentQ.id] || ''}
              onValueChange={(value) => setAnswers((prev) => ({ ...prev, [currentQ.id]: value }))}
            >
              {options.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`opt-${i}`} />
                  <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Explain your answer (required)</Label>
              <Textarea
                placeholder="Explain why you chose this answer..."
                value={explanations[currentQ.id] || ''}
                onChange={(e) => setExplanations((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                className="min-h-32"
              />
            </div>
          </div>
        );

      case 'mcq_multiple':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              {options.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Checkbox
                    id={`opt-${i}`}
                    checked={(answers[currentQ.id] || []).includes(option)}
                    onCheckedChange={(checked) => {
                      const curr = answers[currentQ.id] || [];
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQ.id]: checked ? [...curr, option] : curr.filter((a: string) => a !== option),
                      }));
                    }}
                  />
                  <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{option}</Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Explain your answer (required)</Label>
              <Textarea
                placeholder="Explain why you chose these answers..."
                value={explanations[currentQ.id] || ''}
                onChange={(e) => setExplanations((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                className="min-h-32"
              />
            </div>
          </div>
        );

      case 'coding':
        return (
          <div className="space-y-4">
            <Select value={selectedLanguage} onValueChange={(lang) => { setSelectedLanguage(lang); setAnswers((prev) => ({ ...prev, [currentQ.id]: getDefaultCode(lang) })); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
              </SelectContent>
            </Select>
            <CodeEditor
              initialCode={answers[currentQ.id] || getDefaultCode(selectedLanguage)}
              language={selectedLanguage}
              onCodeChange={(code) => setAnswers((prev) => ({ ...prev, [currentQ.id]: code }))}
              showRunButton={false}
              showLanguageSelector={false}
            />
          </div>
        );

      case 'descriptive':
        return (
          <Textarea
            placeholder="Enter your answer here..."
            value={answers[currentQ.id] || ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
            className="min-h-40"
          />
        );

      default:
        return null;
    }
  };

  // ── Loading / Error States ─────────────────────────────────────────────────

  if (isLoadingTest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading your {isCampus ? 'internal test' : 'assessment'} questions...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8">
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Could Not Load {isCampus ? 'Internal Test' : 'Assessment'}</h2>
          <p className="text-muted-foreground">{loadError}</p>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8">
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-xl font-bold">No Questions Available</h2>
          <p className="text-muted-foreground">This {isCampus ? 'internal test' : 'assessment'} has no questions assigned yet.</p>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = questions.filter(isQuestionAnswered).length;
  const flaggedCount = flagged.size;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Tab switch toast alert */}
      <div className="flex justify-center">
        {tabSwitchAlert && (
          <Alert className="m-4 w-[60%] border-orange-200 bg-orange-50">
            <AlertDescription className="flex items-center justify-between">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div className="flex items-center justify-between flex-1 ml-4">
                <span className="text-orange-700 font-medium">
                  Tab switching detected! This has been logged. ({tabSwitchCount} violation{tabSwitchCount !== 1 ? 's' : ''})
                </span>
                <Button variant="ghost" size="sm" onClick={() => setTabSwitchAlert(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {submissionId && (
              <div className="fixed top-20 left-4 z-[9999] w-32 h-24 sm:w-40 sm:h-30 rounded-2xl overflow-hidden shadow-2xl border-2 border-white bg-slate-950 flex items-center justify-center group transition-all duration-300 hover:scale-[1.03]">
                {hasMediaAccess ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md backdrop-blur-sm animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      LIVE
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                    <CameraOff className="h-6 w-6 mb-1 text-rose-500" />
                    <span className="text-[9px] font-bold">No Camera Access</span>
                  </div>
                )}
              </div>
            )}
            {!submissionId && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="hidden"
              />
            )}

            <div>
              <h1 className="text-xl font-bold">{assessment.title}</h1>
              <Badge variant="outline" className="mt-1">{assessment.course}</Badge>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Proctoring status */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">Proctored</span>
              {tabSwitchCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {tabSwitchCount} violation{tabSwitchCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Timer */}
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className={`font-mono text-xl font-semibold ${timeLeft < 300 ? 'text-red-600' : 'text-foreground'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Submit */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 px-8">
                  Submit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit {isCampus ? 'Internal Test' : 'Assessment'}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit? You won't be able to make changes after submission.
                    <br /><br />
                    <strong>Summary:</strong>
                    <br />• Answered: {answeredCount}/{questions.length} questions
                    <br />• Flagged: {flaggedCount} questions
                    <br />• Time remaining: {formatTime(timeLeft)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitAssessment}>Submit {isCampus ? 'Internal Test' : 'Assessment'}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`bg-card border-r transition-all duration-300 flex-shrink-0 ${isSidebarCollapsed ? 'w-16' : 'w-80'}`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              {!isSidebarCollapsed && <h3 className="font-semibold">Questions</h3>}
              <Button variant="ghost" size="sm" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                {isSidebarCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            {!isSidebarCollapsed ? (
              <>
                {/* Pagination controls */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Q{startQuestion + 1}–{endQuestion}</span>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setQuestionPage(questionPage - 1)} disabled={questionPage === 0} className="h-6 w-6 p-0">
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setQuestionPage(questionPage + 1)} disabled={questionPage === totalPages - 1} className="h-6 w-6 p-0">
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {paginatedQuestions.map((q, idx) => {
                      const actualIdx = startQuestion + idx;
                      const status = getQuestionStatus(actualIdx, q.id);
                      return (
                        <Button
                          key={q.id}
                          variant="outline"
                          size="sm"
                          className={`h-10 w-10 p-0 ${getStatusColor(status)}`}
                          onClick={() => setCurrentQuestion(actualIdx)}
                        >
                          {actualIdx + 1}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Progress</span>
                      <span>{currentQuestion + 1}/{questions.length}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Answered</span><span className="text-green-600 font-semibold">{answeredCount}</span></div>
                    <div className="flex justify-between"><span>Flagged</span><span className="text-yellow-600 font-semibold">{flaggedCount}</span></div>
                    <div className="flex justify-between"><span>Remaining</span><span className="text-muted-foreground">{questions.length - answeredCount}</span></div>
                  </div>
                </div>

                {/* Monitoring status */}
                <div className="mt-6 p-3 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" /> Monitoring
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span>Camera</span><span className={videoTrackEnabled ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{videoTrackEnabled ? 'Active' : 'Inactive'}</span></div>
                    <div className="flex justify-between"><span>Microphone</span><span className={audioTrackEnabled ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{audioTrackEnabled ? 'Active' : 'Inactive'}</span></div>
                    <div className="flex justify-between"><span>Tab Violations</span><span className={tabSwitchCount > 0 ? 'text-orange-600 font-semibold' : 'text-muted-foreground'}>{tabSwitchCount}</span></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                {paginatedQuestions.map((q, idx) => {
                  const actualIdx = startQuestion + idx;
                  const status = getQuestionStatus(actualIdx, q.id);
                  return (
                    <Button key={q.id} variant="outline" size="sm" className={`w-8 h-8 p-0 text-xs ${getStatusColor(status)}`} onClick={() => setCurrentQuestion(actualIdx)}>
                      {actualIdx + 1}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-5xl mx-auto">
            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge variant="outline" className="text-base px-3 py-1">
                        Question {currentQuestion + 1} of {questions.length}
                      </Badge>
                      <Badge variant="secondary" className="text-base px-3 py-1">{currentQ.marks} marks</Badge>
                      <Badge variant="outline" className="capitalize text-base px-3 py-1">
                        {currentQ.type === 'mcq_single' ? 'MCQ (Single)'
                          : currentQ.type === 'mcq_multiple' ? 'MCQ (Multiple)'
                          : currentQ.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl leading-relaxed">{currentQ.content}</CardTitle>
                    {currentQ.title && <p className="text-sm text-muted-foreground mt-1">{currentQ.title}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFlagged((prev) => { const s = new Set(prev); s.has(currentQ.id) ? s.delete(currentQ.id) : s.add(currentQ.id); return s; })}
                    className={flagged.has(currentQ.id) ? 'text-yellow-500' : ''}
                  >
                    <Flag className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {renderQuestion()}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
              <Button variant="outline" onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))} disabled={currentQuestion === questions.length - 1}>
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab switch warning dialog (first violation) */}
      <AlertDialog open={showTabWarningDialog} onOpenChange={() => {}}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Tab Switch Detected</AlertDialogTitle>
            <AlertDialogDescription>
              You switched tabs during the {isCampus ? 'internal test' : 'assessment'}. This action has been logged and reported to your faculty.
              Continuing may lead to {isCampus ? 'internal test' : 'assessment'} termination on further violations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleContinueAssessment}>Continue {isCampus ? 'Internal Test' : 'Assessment'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAssessment}>Submit & Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assessment ended dialog (repeated violations) */}
      <AlertDialog open={showTabSwitchDialog} onOpenChange={() => {}}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isCampus ? 'Internal Test' : 'Assessment'} Ended</AlertDialogTitle>
            <AlertDialogDescription>
              The {isCampus ? 'internal test' : 'assessment'} has been automatically submitted due to multiple security violations.
              Your responses up to this point have been recorded and reported.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleTabSwitchDialogClose}>Acknowledge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InternalTestInterface;