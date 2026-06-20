import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  Loader2
} from 'lucide-react';
import CodeEditor from '@/components/ui/code-editor';
import { startSkillTest, submitSkillTest, uploadSnapshot } from '@/services/skillTestService';
import { useProctoring } from '@/hooks/useProctoring';
import { useToast } from '@/hooks/use-toast';

interface Topic {
  id: string;
  name: string;
  duration: number;
  questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  enable_proctoring?: boolean;
}

interface Course {
  id: string;
  name: string;
}

interface Question {
  id: string;
  type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
  title?: string;
  content: string;
  mcq_options?: string[] | { option_text: string }[];
  marks: number;
}

interface TestInterfaceProps {
  topic: Topic;
  course: Course;
  onComplete: (stats: { answeredCount: number; totalQuestions: number; timeSpent: number }) => void;
  onBack: () => void;
  mediaStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  preExamPhotoBlob?: Blob | null;
  preExamScreenshotBlob?: Blob | null;
}

const DEFAULT_CODING_TEMPLATES = [
  '// Write your JavaScript code here\nfunction solution() {\n    // Your code\n}\n',
  '# Write your Python code here\ndef solution():\n    # Your code\n    pass\n',
  '// Write your Java code here\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code\n    }\n}\n',
  '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code\n    return 0;\n}\n',
  '// Write your code here\n'
].map((template) => template.trim());

const TestInterface: React.FC<TestInterfaceProps> = ({
  topic,
  course,
  onComplete,
  onBack,
  mediaStream,
  screenStream,
  preExamPhotoBlob,
  preExamScreenshotBlob
}) => {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(topic.duration * 60);
  const [answers, setAnswers] = useState<{[key: string]: any}>({});
  const [explanations, setExplanations] = useState<{[key: string]: string}>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  const [videoTrackEnabled, setVideoTrackEnabled] = useState(true);
  const [audioTrackEnabled, setAudioTrackEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const managedStreamsRef = useRef<Set<MediaStream>>(new Set());
  const isSubmittingRef = useRef(false);
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);
  const [showTabWarningDialog, setShowTabWarningDialog] = useState(false);
  const [showTabSwitchDialog, setShowTabSwitchDialog] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [questionPage, setQuestionPage] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const currentQuestionIdRef = useRef<string | null>(null);

  // Backend state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [proctoringEnabled, setProctoringEnabled] = useState(true);

  useEffect(() => {
    currentQuestionIdRef.current = questions[currentQuestion]?.id || null;
  }, [currentQuestion, questions]);

  const loadPromiseRef = useRef<Promise<any> | null>(null);

  // Load real questions on mount
  useEffect(() => {
    let cancelled = false;
    const loadTest = async () => {
      try {
        setIsLoadingTest(true);
        setLoadError(null);
        
        if (!loadPromiseRef.current) {
          loadPromiseRef.current = startSkillTest(topic.id);
        }
        
        const response = await loadPromiseRef.current;
        if (!cancelled) {
          setSubmissionId(response.submission_id);
          setProctoringEnabled(true);
          // Normalize question type field from backend
          const normalized: Question[] = (response.questions || []).map((q: any) => ({
            id: String(q.id),
            type: q.type || 'mcq_single',
            title: q.title,
            content: q.content || q.question || '',
            mcq_options: q.mcq_options || [],
            marks: q.marks || 1,
          }));
          setQuestions(normalized);
          // Update timer from backend duration
          if (response.duration) setTimeLeft(response.duration * 60);
        }
      } catch (err: any) {
        console.error('Test loading error:', err);
        if (!cancelled) {
          const msg = err?.message || 'Failed to load test questions. Please try again.';
          stopMediaMonitoring();
          loadPromiseRef.current = null; // Clear promise so user can retry
          sessionStorage.setItem('toast_error', msg);
          window.location.reload();
        }
      } finally {
        if (!cancelled) setIsLoadingTest(false);
      }
    };
    loadTest();
    return () => { cancelled = true; };
  }, [topic.id]);

  const stopMediaMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => { track.stop(); });
      streamRef.current = null;
    }
    managedStreamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    managedStreamsRef.current.clear();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setVideoTrackEnabled(false);
    setAudioTrackEnabled(false);
    setHasMediaAccess(false);
  };

  // Initialize camera and microphone
  useEffect(() => {
    if (!proctoringEnabled) return;

    if (mediaStream) {
      streamRef.current = mediaStream;
      setHasMediaAccess(true);
      setVideoTrackEnabled(true);
      setAudioTrackEnabled(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.error);
      }
      return;
    }

    let isActive = true;
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isActive || isSubmittingRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (streamRef.current && streamRef.current !== stream) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          managedStreamsRef.current.delete(streamRef.current);
        }
        managedStreamsRef.current.add(stream);
        streamRef.current = stream;
        setHasMediaAccess(true);
        setVideoTrackEnabled(true);
        setAudioTrackEnabled(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setHasMediaAccess(false);
        setVideoTrackEnabled(false);
        setAudioTrackEnabled(false);
      }
    };
    initializeMedia();
    return () => {
      isActive = false;
      stopMediaMonitoring();
    };
  }, [proctoringEnabled, mediaStream]);

  const handleProctoringViolation = React.useCallback((type: string, data?: any) => {
    if (type === 'tab_switch') {
      setTabSwitchCount((prev) => {
        const newCount = prev + 1;
        setTabSwitchAlert(true);
        if (newCount >= 2) {
          setShowTabWarningDialog(false);
          setShowTabSwitchDialog(true);
        } else {
          setShowTabWarningDialog(true);
        }
        return newCount;
      });
    } else if (type === 'forbidden_platform') {
      // Platform detection handled by backend, optional frontend warning
    }
  }, []);

  const { logActivity } = useProctoring({
    assessmentId: topic.id,
    assessmentType: 'skill-tests',
    enabled: proctoringEnabled && !!submissionId, // We enable proctoring once the test has officially started/resumed
    submissionId: submissionId,
    questionId: questions[currentQuestion]?.id,
    mediaStream: streamRef.current,
    screenStream: screenStream,
    onViolation: handleProctoringViolation
  });

  // Upload setup blobs once submissionId is active
  const hasUploadedSetupBlobs = useRef(false);
  useEffect(() => {
    if (proctoringEnabled && submissionId && !hasUploadedSetupBlobs.current) {
      hasUploadedSetupBlobs.current = true;
      const uploadSetupBlobs = async () => {
        if (preExamPhotoBlob) {
          await logActivity('passport_photo_captured', {}, preExamPhotoBlob);
        }
        if (preExamScreenshotBlob) {
          await logActivity('initial_screenshot_captured', {}, preExamScreenshotBlob);
        }
      };
      uploadSetupBlobs();
    }
  }, [proctoringEnabled, submissionId, preExamPhotoBlob, preExamScreenshotBlob, logActivity]);

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

  // Rebind stream
  useEffect(() => {
    if (hasMediaAccess && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        console.log('useProctoring [ycampus-web]: Rebinding video stream to HTML element');
        video.srcObject = streamRef.current;
        video.play().catch(() => {
          window.setTimeout(() => { video.play().catch(console.error); }, 150);
        });
      }
    }
  });

  // Timer
  useEffect(() => {
    if (isLoadingTest || questions.length === 0) return;
    if (timeLeft <= 0) { handleSubmitTest(); return; }
    const timer = setInterval(() => { 
      setTimeLeft(prev => prev - 1); 
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleExplanationChange = (questionId: string, explanation: string) => {
    setExplanations(prev => ({ ...prev, [questionId]: explanation }));
  };

  const handleFlagQuestion = (questionId: string) => {
    setFlagged(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(questionId)) { newFlagged.delete(questionId); } else { newFlagged.add(questionId); }
      return newFlagged;
    });
  };

  const handleSubmitTest = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    stopMediaMonitoring();

    const answeredCount = questions.filter(isQuestionAnswered).length;
    const timeSpent = (topic.duration * 60) - timeLeft;

    // Submit to backend if we have a submission ID
    if (submissionId) {
      try {
        const all_question_ids = questions.map(q => q.id);
        await submitSkillTest(topic.id, submissionId, answers, explanations, all_question_ids, questionTimes);
      } catch (err) {
        console.error('Error submitting test to backend:', err);
        // Still complete locally even if network call fails
      }
    }

    onComplete({ answeredCount, totalQuestions: questions.length, timeSpent });
  };

  const handleTabSwitchDialogClose = () => { handleSubmitTest(); };
  const handleContinueTest = () => { setShowTabWarningDialog(false); };
  const handleCancelTest = () => { setShowTabWarningDialog(false); handleSubmitTest(); };

  // Pagination
  const questionsPerPage = 10;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startQuestion = questionPage * questionsPerPage;
  const endQuestion = Math.min(startQuestion + questionsPerPage, questions.length);
  const paginatedQuestions = questions.slice(startQuestion, endQuestion);

  const handleQuestionClick = (index: number) => { setCurrentQuestion(startQuestion + index); };
  const handlePageChange = (newPage: number) => { setQuestionPage(newPage); };

  const isCodingAnswered = (answer: any) => {
    const normalizedAnswer = answer?.toString().trim() || '';
    if (!normalizedAnswer) return false;
    return !DEFAULT_CODING_TEMPLATES.includes(normalizedAnswer);
  };

  const isQuestionAnswered = (question: Question) => {
    const answer = answers[question.id];
    if (question.type === 'mcq_single') {
      const hasOptionSelected = Boolean(answer);
      const hasExplanation = Boolean(explanations[question.id]?.trim());
      return hasOptionSelected && hasExplanation;
    }
    if (question.type === 'mcq_multiple') {
      const hasOptionSelected = Array.isArray(answer) ? answer.length > 0 : false;
      const hasExplanation = Boolean(explanations[question.id]?.trim());
      return hasOptionSelected && hasExplanation;
    }
    if (question.type === 'coding') return isCodingAnswered(answer);
    return Boolean(answer?.toString().trim());
  };

  const getQuestionStatus = (index: number, questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && isQuestionAnswered(question)) return 'answered';
    if (flagged.has(questionId)) return 'flagged';
    if (index === currentQuestion) return 'current';
    return 'unanswered';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-green-500 text-white';
      case 'flagged': return 'bg-yellow-500 text-white';
      case 'current': return 'bg-primary text-white';
      default: return 'bg-muted text-muted-foreground border';
    }
  };

  const getDefaultCodeForLanguage = (language: string) => {
    const templates: Record<string, string> = {
      javascript: '// Write your JavaScript code here\nfunction solution() {\n    // Your code\n}\n',
      python: '# Write your Python code here\ndef solution():\n    # Your code\n    pass\n',
      java: '// Write your Java code here\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code\n    }\n}\n',
      cpp: '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code\n    return 0;\n}\n'
    };
    return templates[language] || '// Write your code here\n';
  };

  // Loading / error states
  if (isLoadingTest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading your test questions...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8">
        <div className="text-center space-y-3 max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Could Not Load Test</h2>
          <p className="text-slate-500">{loadError}</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8">
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-xl font-bold text-slate-800">No Questions Available</h2>
          <p className="text-slate-500">This test has no questions assigned yet. Please contact your instructor.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = questions.filter(isQuestionAnswered).length;
  const flaggedCount = flagged.size;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Get MCQ options as strings
  const getMcqOptions = (q: Question): string[] => {
    if (!q.mcq_options || q.mcq_options.length === 0) return [];
    if (typeof q.mcq_options[0] === 'string') return q.mcq_options as string[];
    return (q.mcq_options as any[]).map(o => o.text || o.option_text || '');
  };

  const renderQuestion = () => {
    const options = getMcqOptions(currentQ);
    switch (currentQ.type) {
      case 'mcq_single':
        return (
          <div className="space-y-6">
            <RadioGroup
              value={answers[currentQ.id] || ''}
              onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
            >
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
            <div className="space-y-2">
              <Label htmlFor="explanation" className="text-sm font-medium">Explain your answer (required)</Label>
              <Textarea
                id="explanation"
                placeholder="Explain why you chose this answer..."
                value={explanations[currentQ.id] || ''}
                onChange={(e) => handleExplanationChange(currentQ.id, e.target.value)}
                className="min-h-32"
              />
            </div>
          </div>
        );

      case 'mcq_multiple':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`option-${index}`}
                    checked={(answers[currentQ.id] || []).includes(option)}
                    onCheckedChange={(checked) => {
                      const curr = answers[currentQ.id] || [];
                      if (checked) {
                        handleAnswerChange(currentQ.id, [...curr, option]);
                      } else {
                        handleAnswerChange(currentQ.id, curr.filter((a: string) => a !== option));
                      }
                    }}
                  />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="explanation" className="text-sm font-medium">Explain your answer (required)</Label>
              <Textarea
                id="explanation"
                placeholder="Explain why you chose these answers..."
                value={explanations[currentQ.id] || ''}
                onChange={(e) => handleExplanationChange(currentQ.id, e.target.value)}
                className="min-h-32"
              />
            </div>
          </div>
        );

      case 'coding':
        return (
          <div className="space-y-4">
            <Select value={selectedLanguage} onValueChange={(lang) => {
              setSelectedLanguage(lang);
              handleAnswerChange(currentQ.id, getDefaultCodeForLanguage(lang));
            }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
              </SelectContent>
            </Select>
            <CodeEditor
              initialCode={answers[currentQ.id] || getDefaultCodeForLanguage(selectedLanguage)}
              language={selectedLanguage}
              onCodeChange={(code) => handleAnswerChange(currentQ.id, code)}
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
            onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
            className="min-h-32"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex justify-center">
        {tabSwitchAlert && (
          <Alert className="m-4 w-[60%] border-orange-200 bg-orange-50">
            <AlertDescription className="flex items-center justify-between">
              <AlertTriangle className="h-4 w-4" />
              <div className="flex items-center justify-between flex-1 ml-4">
                <span>Tab switching detected! This action has been logged. ({tabSwitchCount} violations)</span>
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
            {submissionId && proctoringEnabled && (
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
            {!submissionId && proctoringEnabled && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="hidden"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{topic.name}</h1>
              <Badge variant="outline">{course.name}</Badge>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className={`font-mono text-xl font-semibold ${timeLeft < 300 ? 'text-red-600' : 'text-foreground'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 px-8">
                  Submit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Test</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit your test? You won't be able to make changes after submission.
                    <br /><br />
                    <strong>Summary:</strong>
                    <br />• Answered: {answeredCount}/{questions.length} questions
                    <br />• Flagged: {flaggedCount} questions
                    <br />• Time remaining: {formatTime(timeLeft)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitTest}>Submit Test</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

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
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Questions {startQuestion + 1}-{endQuestion}</span>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handlePageChange(questionPage - 1)} disabled={questionPage === 0} className="h-6 w-6 p-0">
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handlePageChange(questionPage + 1)} disabled={questionPage === totalPages - 1} className="h-6 w-6 p-0">
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {paginatedQuestions.map((question, index) => {
                      const actualIndex = startQuestion + index;
                      const status = getQuestionStatus(actualIndex, question.id);
                      return (
                        <Button key={question.id} variant="outline" size="sm" className={`h-10 w-10 p-0 ${getStatusColor(status)}`} onClick={() => handleQuestionClick(index)}>
                          {actualIndex + 1}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Progress</span>
                      <span>{currentQuestion + 1}/{questions.length}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Answered</span><span className="text-green-600">{answeredCount}</span></div>
                    <div className="flex justify-between"><span>Flagged</span><span className="text-yellow-600">{flaggedCount}</span></div>
                    <div className="flex justify-between"><span>Remaining</span><span className="text-muted-foreground">{questions.length - answeredCount}</span></div>
                  </div>
                </div>

                {proctoringEnabled && (
                  <div className="mt-6 p-3 bg-muted/30 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Monitoring Status</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>Camera</span><span className={videoTrackEnabled ? 'text-green-600' : 'text-red-600'}>{videoTrackEnabled ? 'Active' : 'Inactive'}</span></div>
                      <div className="flex justify-between"><span>Audio</span><span className={audioTrackEnabled ? 'text-green-600' : 'text-red-600'}>{audioTrackEnabled ? 'Active' : 'Inactive'}</span></div>
                      <div className="flex justify-between"><span>Tab Switches</span><span className="text-orange-600">{tabSwitchCount}</span></div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1">
                {paginatedQuestions.map((question, index) => {
                  const actualIndex = startQuestion + index;
                  const status = getQuestionStatus(actualIndex, question.id);
                  return (
                    <Button key={question.id} variant="outline" size="sm" className={`w-8 h-8 p-0 text-xs ${getStatusColor(status)}`} onClick={() => handleQuestionClick(index)}>
                      {actualIndex + 1}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
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
                        {currentQ.type === 'mcq_single' ? 'MCQ (Single)' : currentQ.type === 'mcq_multiple' ? 'MCQ (Multiple)' : currentQ.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl leading-relaxed">{currentQ.content}</CardTitle>
                    {currentQ.title && <p className="text-sm text-muted-foreground mt-1">{currentQ.title}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleFlagQuestion(currentQ.id)} className={flagged.has(currentQ.id) ? 'text-yellow-600' : ''}>
                    <Flag className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
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

      <AlertDialog open={showTabWarningDialog} onOpenChange={() => {}}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Tab Switch Detected</AlertDialogTitle>
            <AlertDialogDescription>
              You switched tabs during the test. Continuing may lead to test termination on repeated violations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleContinueTest}>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelTest}>Cancel Test</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showTabSwitchDialog} onOpenChange={() => {}}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Test Ended</AlertDialogTitle>
            <AlertDialogDescription>
              The test has been ended due to excessive tab switching. Your responses up to this point have been recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleTabSwitchDialogClose}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TestInterface;
