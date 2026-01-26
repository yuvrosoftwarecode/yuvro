import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  Camera,
  Mic,
  CameraOff,
  MicOff,
  Eye,
  EyeOff,
  Maximize,
  Shield,
  CheckCircle,
} from 'lucide-react';
import CodeEditor from '@/components/code-editor/CodeEditor';
import { submitSkillTest } from "@/services/skillTestService";
import { toast } from "sonner";
import { useProctoring } from '@/hooks/useProctoring';

interface Assessment {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
  topicId: string;
}

interface Question {
  id: string;
  type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
  title: string;
  content: string;
  mcq_options?: { text: string; is_correct: boolean }[];
  marks: number;
  test_cases_basic?: any;
  test_cases_advanced?: any;
}


interface AssessmentInterfaceProps {
  assessment: Assessment;
  questions: Question[];
  submissionId: string;
  onComplete: (stats?: { answeredCount: number; totalQuestions: number; timeSpent: number }) => void;
  onBack: () => void;
  onSubmit?: (assessmentId: string, submissionId: string, answers: any, explanations: any, q_ids: string[]) => Promise<any>;
  assessmentType?: 'skill-tests' | 'certification-exams' | 'contests' | 'mock-interviews';
}

const AssessmentInterface: React.FC<AssessmentInterfaceProps> = ({
  assessment,
  questions: propQuestions,
  submissionId,
  onComplete,
  onBack,
  onSubmit,
  assessmentType = 'skill-tests'
}) => {
  const [questions, setQuestions] = useState<Question[]>(() => {
    const order: Record<string, number> = {
      mcq_single: 1,
      mcq_multiple: 1,
      coding: 2,
      descriptive: 3
    };
    return [...propQuestions].sort((a, b) => (order[a.type] || 99) - (order[b.type] || 99));
  });

  useEffect(() => {
    const order: Record<string, number> = {
      mcq_single: 1,
      mcq_multiple: 1,
      coding: 2,
      descriptive: 3
    };
    const sorted = [...propQuestions].sort((a, b) => (order[a.type] || 99) - (order[b.type] || 99));
    setQuestions(sorted);
  }, [propQuestions]);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(assessment.duration * 60);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(false);

  const currentQuestionData = questions[currentQuestion];

  useEffect(() => {
    if (currentQuestionData?.id) {
      setViewed(prev => {
        const next = new Set(prev);
        next.add(currentQuestionData.id);
        return next;
      });
    }
  }, [currentQuestionData?.id]);

  const isCodingQuestion = currentQuestionData?.type === 'coding';
  const proctoringQuestionId = isCodingQuestion ? currentQuestionData?.id : undefined;

  useProctoring({
    assessmentId: assessment.id,
    assessmentType: assessmentType,
    enabled: true,
    questionId: undefined
  });

  useProctoring({
    assessmentId: assessment.id,
    assessmentType: assessmentType,
    enabled: isCodingQuestion,
    questionId: proctoringQuestionId
  });

  const [explanations, setExplanations] = useState<{ [key: string]: string }>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [codingSubmitted, setCodingSubmitted] = useState<Set<string>>(new Set());
  const [showExamples, setShowExamples] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [cameraAlert, setCameraAlert] = useState(false);
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);
  const [showTabSwitchDialog, setShowTabSwitchDialog] = useState(false);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [isCodeEditorFullscreen, setIsCodeEditorFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasMediaAccess, setHasMediaAccess] = useState(true);
  const [videoTrackEnabled, setVideoTrackEnabled] = useState(true);
  const [audioTrackEnabled, setAudioTrackEnabled] = useState(true);

  const [questionPage, setQuestionPage] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Centralized camera cleanup function
  const cleanupCamera = () => {
    console.log('cleanupCamera called');
    if (streamRef.current) {
      console.log('Stopping media tracks...');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Camera/microphone track stopped:', track.kind);
      });
      streamRef.current = null;
      setVideoTrackEnabled(false);
      setAudioTrackEnabled(false);
      console.log('Camera cleanup completed');
    } else {
      console.log('No stream to cleanup');
    }
  };

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        streamRef.current = stream;
        setHasMediaAccess(true);
        setVideoTrackEnabled(true);
        setAudioTrackEnabled(true);
        setCameraAlert(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }

      } catch (err) {
        console.error("Media init error", err);
        setHasMediaAccess(false);
        setVideoTrackEnabled(false);
        setAudioTrackEnabled(false);
        setCameraAlert(true);
      }
    };

    initializeMedia();

    return () => {
      console.log('AssessmentInterface component unmounting - cleaning up camera');
      cleanupCamera();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          console.log('Timer expired - cleaning up camera');
          cleanupCamera(); // Ensure camera is stopped when time runs out
          handleSubmitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle browser navigation/close events
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('beforeunload event - cleaning up camera');
      cleanupCamera();

      // Show confirmation dialog
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    const handlePopState = () => {
      console.log('popstate event - cleaning up camera');
      cleanupCamera();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleExplanationChange = (questionId: string, explanation: string) => {
    setExplanations(prev => ({ ...prev, [questionId]: explanation }));
  };

  const handleFlagQuestion = (questionId: string) => {
    setFlagged(prev => {
      const n = new Set(prev);
      n.has(questionId) ? n.delete(questionId) : n.add(questionId);
      return n;
    });
  };

  const handleBack = () => {
    console.log('handleBack called - cleaning up camera');
    cleanupCamera();
    onBack();
  };

  const handleSubmitAssessment = async () => {
    const answeredCount = questions.filter(q => {
      const ans = answers[q.id];
      const exp = explanations[q.id]?.trim();
      if (q.type === 'descriptive' || q.type === 'coding') {
        return ans?.trim();
      }
      if (Array.isArray(ans)) {
        return ans.length > 0 && exp;
      }
      return ans && exp;
    }).length;

    const flaggedCount = questions.filter(q => flagged.has(q.id)).length;
    const timeSpent = (assessment.duration * 60) - timeLeft;
    const q_ids = questions.map(q => q.id);

    // Stop camera and microphone FIRST before any async operations
    console.log('handleSubmitAssessment called - cleaning up camera');
    cleanupCamera();

    try {
      const loadingToast = toast.loading("Submitting assessment...");

      if (onSubmit) {
        await onSubmit(assessment.id, submissionId, answers, explanations, q_ids);
      } else {
        await submitSkillTest(assessment.id, submissionId, answers, explanations, q_ids);
      }

      toast.dismiss(loadingToast);
      toast.success("Assessment submitted successfully!");

      onComplete({
        answeredCount,
        totalQuestions: questions.length,
        timeSpent
      });
    } catch (err) {
      toast.error("Failed to submit assessment. Please try again.");
      console.error("Submit error", err);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionData.type.includes('mcq')) {
      const hasAnswer = answers[currentQuestionData.id];
      const hasExplanation = explanations[currentQuestionData.id]?.trim();

      if (!hasAnswer || !hasExplanation) {
        toast.error("Explanation and answer is mandatory. If you don't want to answer, please click on skip.");
        return;
      }
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitAssessment();
    }
  };

  const handleSkipQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitAssessment();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      const n = currentQuestion - 1;
      setCurrentQuestion(n);
      const newPage = Math.floor(n / 10);
      if (newPage !== questionPage) setQuestionPage(newPage);
    }
  };

  const questionsPerPage = 10;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startQuestion = questionPage * questionsPerPage;
  const endQuestion = Math.min(startQuestion + questionsPerPage, questions.length);
  const paginatedQuestions = questions.slice(startQuestion, endQuestion);

  const handleQuestionClick = (index: number) => {
    const actualIndex = startQuestion + index;
    setCurrentQuestion(actualIndex);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setQuestionPage(newPage);
    }
  };

  const getQuestionStatus = (questionId: string) => {
    if (flagged.has(questionId)) return 'flagged';

    const q = questions.find(q => q.id === questionId);
    if (!q) return 'unanswered';

    const ans = answers[q.id];
    const exp = explanations[q.id]?.trim();

    const isAnswered = q.type === 'descriptive'
      ? !!ans?.trim()
      : q.type === 'coding'
        ? codingSubmitted.has(q.id)
        : Array.isArray(ans)
          ? ans.length > 0 && !!exp
          : !!ans && !!exp;

    if (isAnswered) return 'answered';
    if (viewed.has(questionId)) return 'viewed';
    return 'unanswered';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'viewed': return 'bg-blue-400 text-white hover:bg-blue-500';
      case 'flagged': return 'bg-orange-500 text-white hover:bg-orange-600';
      case 'answered': return 'bg-emerald-500 text-white hover:bg-emerald-600';
      default: return 'bg-white text-gray-700 border border-slate-200 hover:bg-slate-50';
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'mcq_single':
        return (
          <div className="space-y-4">
            <RadioGroup
              value={answers[question.id] || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
              className="grid gap-3"
            >
              {question.mcq_options?.map((option, index) => {
                const isSelected = answers[question.id] === option.text;
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-4 rounded-2xl transition-all cursor-pointer border-2 ${isSelected ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-100 shadow-sm hover:bg-slate-50 hover:border-slate-200'}`}
                    onClick={() => handleAnswerChange(question.id, option.text)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center justify-center w-6">
                        {isSelected ? (
                          <CheckCircle className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <RadioGroupItem
                            value={option.text}
                            id={`option-${index}`}
                            className="h-5 w-5 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        )}
                      </div>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer font-semibold text-lg text-slate-700">
                        {option.text}
                      </Label>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>

            <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-4 w-1 bg-amber-500 rounded-full"></div>
                <Label htmlFor={`explanation-${question.id}`} className="text-sm font-bold text-slate-800">
                  Explain your answer (required)
                </Label>
              </div>
              <Textarea
                id={`explanation-${question.id}`}
                placeholder="Type your explanation here..."
                value={explanations[question.id] || ''}
                onChange={(e) => handleExplanationChange(question.id, e.target.value)}
                className="min-h-[140px] bg-white border-slate-200 focus:border-emerald-500 rounded-xl resize-none"
              />
            </div>
          </div>
        );

      case 'mcq_multiple':
        return (
          <div className="space-y-4">
            <div className="grid gap-3">
              {question.mcq_options?.map((option, index) => {
                const isSelected = answers[question.id]?.includes(option.text);
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-4 rounded-2xl transition-all cursor-pointer border-2 ${isSelected ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-100 shadow-sm hover:bg-slate-50 hover:border-slate-200'}`}
                    onClick={() => {
                      const current = answers[question.id] || [];
                      const newAns = current.includes(option.text)
                        ? current.filter((a: string) => a !== option.text)
                        : [...current, option.text];
                      handleAnswerChange(question.id, newAns);
                    }}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center justify-center w-6">
                        {isSelected ? (
                          <CheckCircle className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <Checkbox
                            id={`option-${index}`}
                            checked={false}
                            className="h-5 w-5 border-slate-300 rounded focus:ring-emerald-500"
                          />
                        )}
                      </div>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer font-semibold text-lg text-slate-700">
                        {option.text}
                      </Label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-4 w-1 bg-amber-500 rounded-full"></div>
                <Label htmlFor={`explanation-${question.id}`} className="text-sm font-bold text-slate-800">
                  Explain your answer (required)
                </Label>
              </div>
              <Textarea
                id={`explanation-${question.id}`}
                placeholder="Type your explanation here..."
                value={explanations[question.id] || ''}
                onChange={(e) => handleExplanationChange(question.id, e.target.value)}
                className="min-h-[140px] bg-white border-slate-200 focus:border-emerald-500 rounded-xl resize-none"
              />
            </div>
          </div>
        );

      case 'coding':
        return (
          <div className={`space-y-4 ${isCodeEditorFullscreen ? 'fixed inset-0 z-50 bg-background p-6 flex flex-col' : ''}`}>

            {isCodeEditorFullscreen && (
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{question.title} (Fullscreen)</h2>
                <Button variant="outline" size="sm" onClick={() => setIsCodeEditorFullscreen(false)}>
                  <Maximize className="h-4 w-4 mr-2" /> Exit Fullscreen
                </Button>
              </div>
            )}

            {!isCodeEditorFullscreen && question.test_cases_basic && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg shadow-sm">
                <h4 className="font-semibold text-sm mb-2 text-slate-700">Test Cases</h4>
                <div className="space-y-2">
                  {question.test_cases_basic.map((tc: any, idx: number) => (
                    <div key={idx} className="bg-white p-2 rounded border-l-2 border-indigo-400 text-xs font-mono grid grid-cols-2 gap-2">
                      <div><span className="text-gray-500">Input:</span> {tc.input}</div>
                      <div><span className="text-gray-500">Output:</span> {tc.output}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={isCodeEditorFullscreen ? 'flex-1' : 'h-[500px]'}>
              <CodeEditor
                initialCode={answers[question.id] || ''}
                onCodeChange={(code) => handleAnswerChange(question.id, code)}
                initialLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                problemTitle={question.title}
                problemId={question.id}
                testCases={question.test_cases_basic || []}
                isFullscreen={isCodeEditorFullscreen}
                onFullscreenChange={setIsCodeEditorFullscreen}
                onSubmissionComplete={() => {
                  setCodingSubmitted(prev => {
                    const next = new Set(prev);
                    next.add(question.id);
                    return next;
                  });
                }}
                className="h-full border-0 shadow-lg"
              />
            </div>
          </div>
        );

      case 'descriptive':
        return (
          <Textarea
            placeholder="Type your answer here..."
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="min-h-32"
          />
        );

      default:
        return null;
    }
  };

  const progress = questions.length ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const answeredCount = questions.filter(q => {
    const ans = answers[q.id];
    const exp = explanations[q.id]?.trim();
    if (q.type === 'descriptive') {
      return ans?.trim();
    }
    if (q.type === 'coding') {
      return codingSubmitted.has(q.id);
    }
    if (Array.isArray(ans)) {
      return ans.length > 0 && exp;
    }
    return ans && exp;
  }).length;

  const flaggedCount = flagged.size;
  const viewedCount = viewed.size;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <div className="flex justify-center">
        {cameraAlert && (
          <Alert className="m-4 w-[60%] border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {!hasMediaAccess
                  ? "Camera and microphone access are required for this assessment. Please enable permissions."
                  : "Camera or microphone has been disabled. Please re-enable to continue."
                }
              </span>
              <Button variant="ghost" size="sm" onClick={() => setCameraAlert(false)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-center">
        {tabSwitchAlert && (
          <Alert className="m-4 w-[60%] border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Tab switching detected! ({tabSwitchCount} violations)</span>
              <Button variant="ghost" size="sm" onClick={() => setTabSwitchAlert(false)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="absolute inset-x-0 top-0 h-1 z-50 overflow-hidden pointer-events-none">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bg-card shadow-lg relative z-30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative h-14 w-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover scale-x-[-1] transition-opacity duration-500 ${videoTrackEnabled ? 'opacity-100' : 'opacity-0'}`}
              />
              {!videoTrackEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <CameraOff className="h-6 w-6 text-slate-500" />
                </div>
              )}
              <div className="absolute bottom-1 right-1 flex space-x-1">
                {videoTrackEnabled ?
                  <Camera className="h-2 w-2 text-green-400" /> :
                  <CameraOff className="h-2 w-2 text-red-400" />}
                {audioTrackEnabled ?
                  <Mic className="h-2 w-2 text-green-400" /> :
                  <MicOff className="h-2 w-2 text-red-400" />}
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold">{assessment.title}</h1>
              <Badge variant="outline">{assessment.course}</Badge>
            </div>
          </div>

          <div className="flex items-center space-x-4 mr-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-slate-400" />
              <div className={`text-2xl font-black tabular-nums transition-colors ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="default" className="w-32 h-12 text-lg font-bold bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-md transition-all active:scale-95">
                  Finish
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md bg-white border-none shadow-2xl p-0 overflow-hidden ring-0 outline-none">
                <div className="p-8">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold text-center text-slate-800">Finish Assessment?</AlertDialogTitle>
                    <div className="text-base pt-4 text-center text-slate-600">
                      Are you sure you want to finish the assessment? Your progress will be recorded.
                      <div className="mt-8 grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50 border border-blue-100">
                          <div className="text-xl font-black text-blue-600">{viewedCount}</div>
                          <div className="font-bold text-blue-500 uppercase tracking-wider text-[8px] text-center">Viewed</div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                          <div className="text-xl font-black text-emerald-600">{answeredCount}</div>
                          <div className="font-bold text-emerald-500 uppercase tracking-wider text-[8px] text-center">Answered</div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-orange-50 border border-orange-100">
                          <div className="text-xl font-black text-orange-600">{flaggedCount}</div>
                          <div className="font-bold text-orange-500 uppercase tracking-wider text-[8px] text-center">Flagged</div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="text-xl font-black text-slate-600">{questions.length - answeredCount}</div>
                          <div className="font-bold text-slate-500 uppercase tracking-wider text-[8px] text-center">Left</div>
                        </div>
                      </div>
                    </div>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-10 flex flex-row sm:justify-center gap-4">
                    <AlertDialogCancel className="flex-1 h-12 border-none bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSubmitAssessment}
                      className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg border-none transition-all active:scale-95"
                    >
                      Finish
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>

        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className={`bg-card shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)] relative z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-80'
          }`}>
          <div className="p-4">

            {/* Top */}
            <div className="flex items-center justify-between mb-4">
              {!isSidebarCollapsed && <h3 className="font-semibold">Questions</h3>}
              <Button variant="ghost" size="sm" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                {isSidebarCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            <div className={`mt-4 ${isSidebarCollapsed ? 'flex flex-col items-center h-[calc(100vh-160px)] overflow-y-auto no-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-20' : 'h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar'}`}>
              {isSidebarCollapsed && (
                <div className="flex flex-col w-full items-center gap-4 py-4">
                  {questions.map((q, index) => {
                    const status = getQuestionStatus(q.id);
                    const isCurrent = index === currentQuestion;

                    return (
                      <Button
                        key={q.id}
                        variant="ghost"
                        size="sm"
                        className={`h-10 w-10 p-0 text-xs font-bold rounded-xl transition-all border-none outline-none ring-0 ${isCurrent ? 'bg-black text-white hover:bg-slate-800 shadow-lg scale-110 z-10' : getStatusColor(status)}`}
                        onClick={() => setCurrentQuestion(index)}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </div>
              )}

              {!isSidebarCollapsed && (
                <>
                  <div className="mb-6">
                    {/* Progress Stats */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="bg-blue-50 p-2 rounded-lg text-center shadow-sm">
                        <div className="text-md font-bold text-blue-700">{viewedCount}</div>
                        <div className="text-[8px] font-semibold text-blue-600 uppercase text-center leading-tight">Viewed</div>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-lg text-center shadow-sm">
                        <div className="text-md font-bold text-emerald-700">{answeredCount}</div>
                        <div className="text-[8px] font-semibold text-emerald-600 uppercase text-center leading-tight">Answered</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded-lg text-center shadow-sm">
                        <div className="text-md font-bold text-orange-700">{flaggedCount}</div>
                        <div className="text-[8px] font-semibold text-orange-600 uppercase text-center leading-tight">Flagged</div>
                      </div>

                      <div className="bg-gray-50 p-2 rounded-lg text-center shadow-sm">
                        <div className="text-md font-bold text-gray-700">{questions.length - answeredCount}</div>
                        <div className="text-[8px] font-semibold text-gray-500 uppercase text-center leading-tight">Left</div>
                      </div>
                    </div>

                    {[
                      { label: 'Multiple Choice', types: ['mcq_single', 'mcq_multiple'] },
                      { label: 'Coding Challenges', types: ['coding'] },
                      { label: 'Descriptive', types: ['descriptive'] }
                    ].map(group => {
                      const groupQuestions = questions.map((q, i) => ({ ...q, globalIndex: i }))
                        .filter(q => group.types.includes(q.type));

                      if (groupQuestions.length === 0) return null;

                      return (
                        <div key={group.label} className="mb-6">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                            {group.label}
                            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{groupQuestions.length}</span>
                          </h4>
                          <div className="grid grid-cols-5 gap-2">
                            {groupQuestions.map(q => {
                              const status = getQuestionStatus(q.id);
                              const isCurrent = q.globalIndex === currentQuestion;
                              return (
                                <Button
                                  key={q.id}
                                  variant="ghost"
                                  size="sm"
                                  className={`h-10 w-10 p-0 rounded-lg transition-all border-none outline-none ring-0 shadow-sm hover:shadow-md ${getStatusColor(status)} ${isCurrent ? 'bg-black text-white hover:bg-gray-800' : ''}`}
                                  onClick={() => setCurrentQuestion(q.globalIndex)}
                                >
                                  {q.globalIndex + 1}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Proctoring Section */}
                  <div className="mt-6 border-t pt-6">
                    <h4 className="flex items-center text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                      <Shield className="h-3 w-3 mr-1.5" /> Proctoring
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                        <span className="text-muted-foreground">Camera</span>
                        <Badge variant="outline" className={videoTrackEnabled ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                          {videoTrackEnabled ? "Active" : "Off"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                        <span className="text-muted-foreground">Microphone</span>
                        <Badge variant="outline" className={audioTrackEnabled ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                          {audioTrackEnabled ? "Active" : "Off"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                        <span className="text-muted-foreground">Tab Switches</span>
                        <Badge variant="outline" className={tabSwitchCount > 0 ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>
                          {tabSwitchCount}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Main Question Area */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          <div className="p-6">

            {questions.length > 0 && (
              currentQuestionData.type === 'coding' ? (
                <div className="h-[calc(100vh-140px)] flex flex-col">
                  {/* Top Header Row (Outside Description) */}
                  <div className="flex justify-between items-center mb-4 px-1">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h2 className="text-xl font-bold line-clamp-1">{currentQuestionData.title}</h2>
                        <Badge variant="outline">Q{currentQuestion + 1}/{questions.length}</Badge>
                        <Badge variant="secondary">{currentQuestionData.marks} marks</Badge>
                        <Badge variant="outline" className="capitalize">{currentQuestionData.type}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handlePreviousQuestion} disabled={currentQuestion === 0}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleNextQuestion} disabled={currentQuestion === questions.length - 1}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleSkipQuestion} disabled={currentQuestion === questions.length - 1} className="text-muted-foreground hidden sm:inline-flex">
                        Skip
                      </Button>

                      <Button
                        variant={flagged.has(currentQuestionData.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFlagQuestion(currentQuestionData.id)}
                        className={flagged.has(currentQuestionData.id)
                          ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
                          : 'text-muted-foreground hover:text-foreground'
                        }
                      >
                        <Flag className={`h-4 w-4 mr-2 ${flagged.has(currentQuestionData.id) ? 'fill-current' : ''}`} />
                        {flagged.has(currentQuestionData.id) ? 'Flagged' : 'Flag'}
                      </Button>
                    </div>
                  </div>

                  {/* Split Content Area */}
                  <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border-0 shadow-lg bg-card text-card-foreground my-1 overflow-hidden">
                    {/* LEFT PANEL: Description & Test Cases */}
                    <ResizablePanel
                      defaultSize={40}
                      minSize={20}
                      className={`bg-white transition-all duration-300 ${isDescriptionCollapsed ? 'hidden' : ''}`}
                    >
                      <div className="h-full overflow-y-auto p-6 relative">
                        <div className="absolute top-2 right-2 z-10">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsDescriptionCollapsed(true)} title="Collapse Description">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Description */}
                        <div className="prose prose-sm max-w-none mb-8 mt-2">
                          <div dangerouslySetInnerHTML={{ __html: currentQuestionData.content || '' }} />
                        </div>

                        {/* Test Cases */}
                        {currentQuestionData.test_cases_basic && (
                          <div className="mb-8">
                            <h4 className="font-semibold text-sm mb-3 text-slate-800">Sample Test Cases</h4>
                            <div className="space-y-3">
                              {currentQuestionData.test_cases_basic.map((tc: any, idx: number) => (
                                <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 grid grid-cols-2 gap-4 text-xs font-mono">
                                  <div>
                                    <div className="font-semibold text-slate-500 mb-1">Input</div>
                                    <div className="bg-white p-2 rounded border border-slate-200">{tc.input}</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-500 mb-1">Output</div>
                                    <div className="bg-white p-2 rounded border border-slate-200">{tc.output}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ResizablePanel>

                    {/* Collapsed Sidebar Ghost */}
                    {isDescriptionCollapsed && (
                      <div className="w-10 bg-slate-50 border-r flex flex-col items-center py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsDescriptionCollapsed(false)}>
                        <div className="rotate-180 mb-4">
                          <ChevronLeft className="h-4 w-4 text-slate-500" />
                        </div>
                        <span className="writing-vertical-rl text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                          Description
                        </span>
                      </div>
                    )}

                    {!isDescriptionCollapsed && <ResizableHandle />}

                    {/* RIGHT PANEL: Editor */}
                    <ResizablePanel defaultSize={60}>
                      <div className="h-full flex flex-col bg-white">
                        <div className="flex-1 overflow-hidden relative">
                          <CodeEditor
                            initialCode={answers[currentQuestionData.id] || ''}
                            onCodeChange={(code) => handleAnswerChange(currentQuestionData.id, code)}
                            initialLanguage={selectedLanguage}
                            onLanguageChange={setSelectedLanguage}
                            problemTitle={currentQuestionData.title}
                            problemId={currentQuestionData.id}
                            testCases={currentQuestionData.test_cases_basic || []}
                            isFullscreen={isCodeEditorFullscreen}
                            onFullscreenChange={setIsCodeEditorFullscreen}
                            onSubmissionComplete={() => {
                              setCodingSubmitted(prev => {
                                const next = new Set(prev);
                                next.add(currentQuestionData.id);
                                return next;
                              });
                            }}
                            className="h-full border-0"
                          />
                        </div>
                        {/* Footer Removed */}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h2 className="text-xl font-bold line-clamp-1">{currentQuestionData.title}</h2>

                          <Badge variant="outline">
                            Question {currentQuestion + 1} of {questions.length}
                          </Badge>
                          <Badge variant="secondary">
                            {currentQuestionData.marks} marks
                          </Badge>
                          <Badge variant="outline">{currentQuestionData.type}</Badge>
                        </div>


                        <div className="mt-4 prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: currentQuestionData.content || '' }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePreviousQuestion} disabled={currentQuestion === 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleNextQuestion} disabled={currentQuestion === questions.length - 1}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleSkipQuestion} disabled={currentQuestion === questions.length - 1} className="text-muted-foreground hidden sm:inline-flex">
                          Skip
                        </Button>

                        <Button
                          variant={flagged.has(currentQuestionData.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleFlagQuestion(currentQuestionData.id)}
                          className={flagged.has(currentQuestionData.id)
                            ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
                            : 'text-muted-foreground hover:text-foreground'
                          }
                        >
                          <Flag className={`h-4 w-4 mr-2 ${flagged.has(currentQuestionData.id) ? 'fill-current' : ''}`} />
                          {flagged.has(currentQuestionData.id) ? 'Flagged' : 'Flag'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {renderQuestion(currentQuestionData)}


                  </CardContent>
                </Card>
              )
            )}

          </div>
        </div>

      </div>

      <AlertDialog open={showTabSwitchDialog} onOpenChange={() => { }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assessment Terminated</AlertDialogTitle>
            <AlertDialogDescription>
              Too many tab switches. Your responses are recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSubmitAssessment}>Finish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              You cannot return once you exit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitAssessment}>Finish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default AssessmentInterface;
