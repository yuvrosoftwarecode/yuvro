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
  proctoring_enabled?: boolean;
  tab_switch_threshold?: number;
  violation_threshold?: number;
  initial_violations?: number;
  initial_tab_switches?: number;
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
  onSubmit?: (assessmentId: string, submissionId: string, answers: any, explanations: any, q_ids: string[], timeSpent?: Record<string, number>) => Promise<any>;
  assessmentType?: 'skill-tests' | 'certification-exams' | 'contests' | 'mock-interviews' | 'job-tests';
  screenStream?: MediaStream | null;
  preExamCameraStream?: MediaStream | null;
}

const AssessmentInterface: React.FC<AssessmentInterfaceProps> = ({
  assessment,
  questions: propQuestions,
  submissionId,
  onComplete,
  onBack,
  onSubmit,
  assessmentType = 'skill-tests',
  screenStream,
  preExamCameraStream
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

  const [explanations, setExplanations] = useState<{ [key: string]: string }>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(40); // % width
  const [isDragging, setIsDragging] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const startDrag = () => setIsDragging(true);
  const stopDrag = () => setIsDragging(false);

  const [codingSubmitted, setCodingSubmitted] = useState<Set<string>>(new Set());
  const [showExamples, setShowExamples] = useState(false);
  const [cameraAlert, setCameraAlert] = useState(false);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [showFullscreenDialog, setShowFullscreenDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [isCodeEditorFullscreen, setIsCodeEditorFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isSubmittingRef = useRef(false);
  const [hasMediaAccess, setHasMediaAccess] = useState(true);
  const [videoTrackEnabled, setVideoTrackEnabled] = useState(true);
  const [audioTrackEnabled, setAudioTrackEnabled] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [questionPage, setQuestionPage] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(assessment.initial_tab_switches ?? 0);

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

  const proctoringQuestionId = currentQuestionData?.id;
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});

  const [violationCount, setViolationCount] = useState(assessment.initial_violations ?? 0);

  const handleProctoringViolation = React.useCallback((type: string, data?: any) => {
    if (type === 'tab_switch') {
      setTabSwitchCount(prev => prev + 1);
      setViolationCount(prev => prev + 1);
    } else if (type === 'fullscreen_exit') {
      setShowFullscreenDialog(true);
    } else if (
      type === 'face_not_detected' ||
      type === 'multiple_faces_detected' ||
      ['copy_detected', 'paste_detected', 'cut_detected', 'right_click_detected', 'keyboard_shortcut'].includes(type) ||
      type === 'forbidden_platform' ||
      type === 'screen_share_stopped'
    ) {
      setViolationCount(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    if (assessment.proctoring_enabled && screenStream) {
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        const handleEnded = () => {
          handleProctoringViolation('screen_share_stopped');
        };
        videoTrack.addEventListener('ended', handleEnded);
        return () => {
          videoTrack.removeEventListener('ended', handleEnded);
        };
      }
    }
  }, [assessment.proctoring_enabled, screenStream, handleProctoringViolation]);



  // Single unified useProctoring hook — handles both submission-level and question-level
  // (passing questionId for coding questions scopes logs to question activity)
  const { logActivity } = useProctoring({
    assessmentId: assessment.id,
    assessmentType: assessmentType as any,
    enabled: assessment.proctoring_enabled ?? false,
    questionId: proctoringQuestionId,
    mediaStream: mediaStream,
    onViolation: handleProctoringViolation,
    onAutoSubmit: () => handleProctoringViolation('auto_submitted'),
  });

  const currentQuestionIdRef = useRef<string | null>(null);
  const prevQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentQuestionIdRef.current = currentQuestionData?.id || null;
  }, [currentQuestionData?.id]);

  useEffect(() => {
    if (currentQuestionData?.id) {
      const newQId = currentQuestionData.id;
      const prevQId = prevQuestionIdRef.current;
      
      if (prevQId === newQId) return;
      
      if (prevQId) {
        logActivity('question_left', { question_id: prevQId });
      }
      
      logActivity('question_viewed', { question_id: newQId });
      prevQuestionIdRef.current = newQId;
    }
  }, [currentQuestionData?.id, logActivity]);



  const onDrag = (e: MouseEvent) => {
    if (!isDragging || !splitContainerRef.current) return;

    const rect = splitContainerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const containerWidth = rect.width;

    // Calculate new width relative to left
    const newWidth = (relativeX / containerWidth) * 100;

    // Clamp between 20% and 80%
    if (newWidth >= 20 && newWidth <= 80) {
      setLeftPanelWidth(newWidth);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    }

    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [isDragging]);


  const screenStreamRef = useRef(screenStream);
  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // Centralized camera cleanup function
  const cleanupCamera = React.useCallback(() => {
    console.log('cleanupCamera called');
    if (streamRef.current) {
      console.log('Stopping media tracks...');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Camera/microphone track stopped:', track.kind);
      });
      streamRef.current = null;
      setMediaStream(null);
      setVideoTrackEnabled(false);
      setAudioTrackEnabled(false);
      console.log('Camera cleanup completed');
    } else {
      console.log('No stream to cleanup');
    }

    if (screenStreamRef.current) {
      console.log('Stopping screen share tracks...');
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Screen share track stopped:', track.kind);
      });
    }
  }, []);

  useEffect(() => {
    // Only request camera/mic when proctoring is actually enabled
    if (!assessment.proctoring_enabled) return;

    const initializeMedia = async () => {
      try {
        const isStreamActive = (s: MediaStream | null | undefined) => {
          if (!s || !s.active) return false;
          const tracks = s.getTracks();
          return tracks.length > 0 && tracks.every(track => track.readyState === 'live');
        };

        const stream = isStreamActive(preExamCameraStream)
          ? preExamCameraStream!
          : await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            });

        streamRef.current = stream;
        setMediaStream(stream);
        setHasMediaAccess(true);
        setVideoTrackEnabled(true);
        setAudioTrackEnabled(true);
        setCameraAlert(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Let autoPlay handle the playback to prevent AbortError
        }

      } catch (err) {
        console.error('Media init error', err);
        setHasMediaAccess(false);
        setMediaStream(null);
        setVideoTrackEnabled(false);
        setAudioTrackEnabled(false);
        setCameraAlert(true);
      }
    };

    initializeMedia();

    return () => {
      cleanupCamera();
    };
  }, [assessment.proctoring_enabled, cleanupCamera, preExamCameraStream]);

  // Rebind stream
  useEffect(() => {
    if (hasMediaAccess && mediaStream && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== mediaStream) {
        console.log('useProctoring [ycode-web]: Rebinding video stream to HTML element');
        video.srcObject = mediaStream;
        video.play().catch(() => {
          window.setTimeout(() => { video.play().catch(console.error); }, 150);
        });
      }
    }
  });

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

      const activeQId = currentQuestionIdRef.current;
      if (activeQId) {
        setQuestionTimes(prev => ({
          ...prev,
          [activeQId]: (prev[activeQId] || 0) + 1
        }));
      }
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
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
    }

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
        await onSubmit(assessment.id, submissionId, answers, explanations, q_ids, questionTimes);
      } else {
        await submitSkillTest(assessment.id, submissionId, answers, explanations, q_ids, questionTimes);
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
    } finally {
      isSubmittingRef.current = false;
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
                    <div key={idx} className="bg-white p-2 rounded border-l-2 border-saffron-400 text-xs font-mono grid grid-cols-2 gap-2">
                      <div><span className="text-gray-500">Input:</span> {tc.input}</div>
                      <div><span className="text-gray-500">Output:</span> {tc.output}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={isCodeEditorFullscreen ? 'flex-1' : 'h-[500px]'}>
              <CodeEditor
                key={question.id}
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
                proctoringEnabled={assessment.proctoring_enabled || assessment.topicId === 'job-assessment'}
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
    <div className="min-h-screen bg-gray-50/50 flex flex-col">

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

      <div className="absolute inset-x-0 top-0 h-1 z-50 overflow-hidden pointer-events-none">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 relative z-30 px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {assessment.proctoring_enabled && (
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
            {!assessment.proctoring_enabled && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="hidden"
              />
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-800">{assessment.title}</h1>
              <Badge variant="secondary" className="text-xs font-normal">{assessment.course}</Badge>
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
                <Button size="sm" className="h-9 px-6 bg-gradient-to-r from-blue-600 to-saffron-600 hover:from-blue-700 hover:to-saffron-700 text-white shadow-md transition-all active:scale-95 text-xs font-bold uppercase tracking-wider rounded-lg">
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
                      className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-saffron-600 hover:from-blue-700 hover:to-saffron-700 text-white font-bold rounded-xl shadow-lg border-none transition-all active:scale-95"
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
        <div className={`border-r border-gray-200 bg-white relative z-20 transition-all duration-300 overflow-hidden ${isSidebarCollapsed ? 'w-20' : 'w-80'
          }`}>
          <div className={`h-full flex flex-col ${isSidebarCollapsed ? 'px-2 py-4' : 'px-6 py-6'}`}>

            {/* Top */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              {!isSidebarCollapsed && <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Question Navigator</h3>}
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-sm">
                {isSidebarCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            <div className={`mt-2 flex-1 ${isSidebarCollapsed ? 'flex flex-col items-center overflow-y-auto no-scrollbar pb-20 w-full' : 'overflow-y-auto pr-2 custom-scrollbar'}`}>
              {isSidebarCollapsed && (
                <div className="flex flex-col w-full items-center gap-3 py-2">
                  {questions.map((q, index) => {
                    const status = getQuestionStatus(q.id);
                    const isCurrent = index === currentQuestion;

                    return (
                      <Button
                        key={q.id}
                        variant="ghost"
                        size="sm"
                        className={`h-9 w-9 p-0 text-xs font-bold rounded-lg transition-all ${isCurrent ? 'bg-gray-900 text-white shadow-md z-10' : getStatusColor(status)}`}
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
                          <div className="grid grid-cols-5 gap-2 justify-items-center">
                            {groupQuestions.map(q => {
                              const status = getQuestionStatus(q.id);
                              const isCurrent = q.globalIndex === currentQuestion;
                              return (
                                <Button
                                  key={q.id}
                                  variant="ghost"
                                  size="sm"
                                  className={`h-9 w-9 p-0 rounded-lg transition-all shadow-sm hover:shadow ${getStatusColor(status)} ${isCurrent ? 'ring-2 ring-offset-2 ring-gray-900 z-10' : ''}`}
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
                    <h4 className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                      <span className="flex items-center"><Shield className="h-3 w-3 mr-1.5" /> Proctoring</span>
                      {/* Live violation counter badge */}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        violationCount === 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : violationCount < 3
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {violationCount === 0 ? 'Clean' : `${violationCount} Violation${violationCount > 1 ? 's' : ''}`}
                      </span>
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
                      <div className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                        <span className="text-muted-foreground">Total Violations</span>
                        <Badge variant="outline" className={
                          violationCount === 0
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : violationCount < 3
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                        }>
                          {violationCount}
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
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50">
          <div className="p-6">

            {questions.length > 0 && (
              currentQuestionData.type === 'coding' ? (
                <div className="h-[calc(100vh-140px)] flex flex-col">
                  <div className="flex-1 flex flex-col min-h-0 bg-white" ref={splitContainerRef}>
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsDescriptionCollapsed(!isDescriptionCollapsed)}
                          className={`h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all ${isDescriptionCollapsed ? 'rotate-180' : ''}`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="text-sm font-bold text-gray-900">{currentQuestionData.title}</h3>
                        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {currentQuestionData.marks} marks
                        </span>
                      </div>

                      {/* Coding Navigation */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100 mr-2">
                          <Button variant="ghost" size="sm" onClick={handlePreviousQuestion} disabled={currentQuestion === 0} className="h-7 w-7 p-0 rounded-md text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="w-px h-4 bg-gray-200 mx-1" />
                          <Button variant="ghost" size="sm" onClick={handleNextQuestion} disabled={currentQuestion === questions.length - 1} className="h-7 w-7 p-0 rounded-md text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleSkipQuestion} disabled={currentQuestion === questions.length - 1} className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:bg-gray-50 h-8 px-3 rounded-lg">
                          Skip
                        </Button>
                        <Button
                          variant={flagged.has(currentQuestionData.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleFlagQuestion(currentQuestionData.id)}
                          className={`h-8 px-3 text-xs font-bold uppercase tracking-widest rounded-lg border-0 ${flagged.has(currentQuestionData.id)
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                        >
                          <Flag className={`h-3.5 w-3.5 mr-1.5 ${flagged.has(currentQuestionData.id) ? 'fill-current' : ''}`} />
                          {flagged.has(currentQuestionData.id) ? 'Flagged' : 'Flag'}
                        </Button>
                      </div>
                    </div>

                    {/* Split View Content */}
                    <div className={`flex-1 flex overflow-hidden ${isDragging ? 'select-none pointer-events-none' : ''}`}>
                      {/* LEFT PANEL: Description & Test Cases */}
                      {!isDescriptionCollapsed && (
                        <div
                          className="h-full flex flex-col border-r border-gray-100 bg-white overflow-hidden relative"
                          style={{ width: `${leftPanelWidth}%` }}
                        >
                          <div className="flex-1 overflow-y-auto p-6">
                            <div className="prose prose-slate max-w-none text-sm">
                              <div dangerouslySetInnerHTML={{ __html: currentQuestionData.content || '' }} />
                            </div>

                            {/* Test Cases display if available in question data */}
                            {currentQuestionData.test_cases_basic && currentQuestionData.test_cases_basic.length > 0 && (
                              <div className="mt-8 pt-8 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Sample Test Cases</h4>
                                <div className="space-y-4">
                                  {currentQuestionData.test_cases_basic.slice(0, 2).map((tc: any, idx: number) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Input</div>
                                          <code className="text-xs font-mono text-gray-700 block bg-white p-2 rounded border border-gray-200">
                                            {typeof tc.input === 'object' ? JSON.stringify(tc.input) : tc.input}
                                          </code>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Output</div>
                                          <code className="text-xs font-mono text-gray-700 block bg-white p-2 rounded border border-gray-200">
                                            {typeof tc.expected_output === 'object' ? JSON.stringify(tc.expected_output) : tc.expected_output}
                                          </code>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Drag Handle */}
                      {!isDescriptionCollapsed && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            startDrag();
                          }}
                          className="w-4 -ml-2 h-full z-10 cursor-col-resize flex flex-col justify-center items-center hover:bg-blue-50/50 transition-colors group"
                        >
                          <div className="w-1 h-8 bg-gray-200 rounded-full group-hover:bg-blue-400 transition-colors" />
                        </div>
                      )}

                      {/* RIGHT PANEL: Editor */}
                      <div className="flex-1 h-full min-w-0 bg-white">
                        <div className="h-full flex flex-col">
                          <div className="flex-1 overflow-hidden relative">
                            <CodeEditor
                              key={currentQuestionData.id}
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
                              proctoringEnabled={assessment.proctoring_enabled || assessment.topicId === 'job-assessment'}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-8 h-full overflow-y-auto">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <div className="flex items-center space-x-3 mb-4">
                          <h2 className="text-2xl font-bold text-gray-900">{currentQuestionData.title}</h2>
                        </div>

                        <div className="flex items-center gap-2 mb-6">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            Question {currentQuestion + 1} of {questions.length}
                          </span>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            {currentQuestionData.marks} marks
                          </span>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 capitalize">
                            {currentQuestionData.type.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="prose prose-slate max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: currentQuestionData.content || '' }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={handlePreviousQuestion} disabled={currentQuestion === 0} className="h-8 w-8 rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNextQuestion} disabled={currentQuestion === questions.length - 1} className="h-8 w-8 rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleSkipQuestion} disabled={currentQuestion === questions.length - 1} className="text-gray-500 hover:text-gray-900 hidden sm:inline-flex text-xs font-bold uppercase tracking-wider">
                          Skip
                        </Button>

                        <Button
                          variant={flagged.has(currentQuestionData.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleFlagQuestion(currentQuestionData.id)}
                          className={`h-8 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border-0 ${flagged.has(currentQuestionData.id)
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          <Flag className={`h-3.5 w-3.5 mr-1.5 ${flagged.has(currentQuestionData.id) ? 'fill-current' : ''}`} />
                          {flagged.has(currentQuestionData.id) ? 'Flagged' : 'Flag'}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-8">
                      {renderQuestion(currentQuestionData)}
                    </div>
                  </div>
                </div>
              )
            )}

          </div>
        </div>

      </div>

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

      <AlertDialog open={showFullscreenDialog} onOpenChange={() => { }}>
        <AlertDialogContent className="border-0 rounded-2xl max-w-md bg-white shadow-2xl p-0 overflow-hidden shadow-red-500/10">
          <div className="h-1.5 bg-gradient-to-r from-red-600 to-rose-400 w-full" />
          <div className="p-8">
            <AlertDialogHeader className="pb-4">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-red-50 rounded-full ring-8 ring-red-50/50">
                  <AlertTriangle className="h-8 w-8 text-red-600 animate-pulse" />
                </div>
                <AlertDialogTitle className="text-2xl font-bold text-slate-900">
                  Fullscreen Exited
                </AlertDialogTitle>
              </div>
            </AlertDialogHeader>
            
            <div className="py-2 text-center">
              <AlertDialogDescription className="text-slate-600 text-base leading-relaxed">
                A potential violation was detected. You <span className="text-red-600 font-bold uppercase tracking-tight underline decoration-red-200 underline-offset-4">must remain</span> in fullscreen mode during the assessment. 
                <br /><br />
                Please return to fullscreen immediately, or your test session will be terminated.
              </AlertDialogDescription>
            </div>
            
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-8 sm:mt-8 w-full border-t border-slate-100 pt-6">
              <AlertDialogCancel 
                onClick={() => {
                  logActivity('fullscreen_exit_dialog_ended_test');
                  handleSubmitAssessment();
                }}
                className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:text-red-600 hover:bg-neutral-50 transition-all border-slate-200 sm:order-1"
              >
                End Test
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  logActivity('fullscreen_exit_dialog_returned_fullscreen');
                  setShowFullscreenDialog(false);
                  if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(e => console.warn(e));
                  }
                }}
                className="flex-1 h-12 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 transition-all sm:order-2"
              >
                Return to Fullscreen
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </div >
  );
};

export default AssessmentInterface;
