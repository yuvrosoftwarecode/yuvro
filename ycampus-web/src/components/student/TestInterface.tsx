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
  AlertTriangle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import CodeEditor from '@/components/ui/code-editor';

interface Topic {
  id: string;
  name: string;
  duration: number;
  questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface Course {
  id: string;
  name: string;
}

interface Question {
  id: string;
  type: 'mcq' | 'coding' | 'descriptive';
  question: string;
  options?: string[];
  multipleCorrect?: boolean;
  marks: number;
  requiresExplanation?: boolean;
}

interface TestInterfaceProps {
  topic: Topic;
  course: Course;
  onComplete: (stats: { answeredCount: number; totalQuestions: number; timeSpent: number }) => void;
  onBack: () => void;
}

// Mock questions data
const mockQuestions: Question[] = [
  {
    id: '1',
    type: 'mcq',
    question: 'What is the time complexity of binary search algorithm?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    multipleCorrect: false,
    marks: 2,
    requiresExplanation: true
  },
  {
    id: '2',
    type: 'coding',
    question: 'Write a function to reverse a string in your preferred language.',
    marks: 5
  },
  {
    id: '3',
    type: 'descriptive',
    question: 'Explain the concept of object-oriented programming and its main principles.',
    marks: 3
  },
  {
    id: '4',
    type: 'mcq',
    question: 'Which of the following are valid HTTP methods? (Select all that apply)',
    options: ['GET', 'POST', 'FETCH', 'DELETE', 'UPDATE', 'PUT'],
    multipleCorrect: true,
    marks: 4
  }
];

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
  onComplete
}) => {
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

  const stopMediaMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
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
    let isActive = true;

    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });

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
  }, []);

  // Tab switch detection with warning/termination flow.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) return;

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
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Rebind stream when the video element mounts after permission/state changes.
  useEffect(() => {
    if (!hasMediaAccess || !streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
    }

    video.play().catch(() => {
      // Retry once for browsers that delay autoplay after media permission prompts.
      window.setTimeout(() => {
        video.play().catch(console.error);
      }, 150);
    });
  }, [hasMediaAccess]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitTest();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleExplanationChange = (questionId: string, explanation: string) => {
    setExplanations(prev => ({
      ...prev,
      [questionId]: explanation
    }));
  };

  const handleFlagQuestion = (questionId: string) => {
    setFlagged(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }
      return newFlagged;
    });
  };

  const handleSubmitTest = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    stopMediaMonitoring();

    const answeredCount = mockQuestions.filter(isQuestionAnswered).length;
    
    const timeSpent = (topic.duration * 60) - timeLeft;
    
    onComplete({
      answeredCount,
      totalQuestions: mockQuestions.length,
      timeSpent
    });
  };

  const handleTabSwitchDialogClose = () => {
    handleSubmitTest();
  };

  const handleContinueTest = () => {
    setShowTabWarningDialog(false);
  };

  const handleCancelTest = () => {
    setShowTabWarningDialog(false);
    handleSubmitTest();
  };

  // Question navigation with pagination
  const questionsPerPage = 10;
  const totalPages = Math.ceil(mockQuestions.length / questionsPerPage);
  const startQuestion = questionPage * questionsPerPage;
  const endQuestion = Math.min(startQuestion + questionsPerPage, mockQuestions.length);
  const paginatedQuestions = mockQuestions.slice(startQuestion, endQuestion);

  const handleQuestionClick = (index: number) => {
    const actualIndex = startQuestion + index;
    setCurrentQuestion(actualIndex);
  };

  const handlePageChange = (newPage: number) => {
    setQuestionPage(newPage);
  };

  const isCodingAnswered = (answer: any) => {
    const normalizedAnswer = answer?.toString().trim() || '';
    if (!normalizedAnswer) return false;
    return !DEFAULT_CODING_TEMPLATES.includes(normalizedAnswer);
  };

  const isQuestionAnswered = (question: Question) => {
    const answer = answers[question.id];

    if (question.type === 'mcq') {
      const hasOptionSelected = Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
      const hasExplanation = Boolean(explanations[question.id]?.trim());
      return hasOptionSelected && hasExplanation;
    }

    if (question.type === 'coding') {
      return isCodingAnswered(answer);
    }

    return Boolean(answer?.toString().trim());
  };

  const getQuestionStatus = (index: number, questionId: string) => {
    const question = mockQuestions.find((q) => q.id === questionId);

    if (question && isQuestionAnswered(question)) {
      return 'answered';
    }

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
    const templates = {
      javascript: '// Write your JavaScript code here\nfunction solution() {\n    // Your code\n}\n',
      python: '# Write your Python code here\ndef solution():\n    # Your code\n    pass\n',
      java: '// Write your Java code here\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code\n    }\n}\n',
      cpp: '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code\n    return 0;\n}\n'
    };
    return templates[language as keyof typeof templates] || '// Write your code here\n';
  };

  // renderQuestion function
  const currentQ = mockQuestions[currentQuestion];
  
  useEffect(() => {
    if (currentQ.type === 'coding' && !answers[currentQ.id]) {
      handleAnswerChange(currentQ.id, getDefaultCodeForLanguage(selectedLanguage));
    }
  }, [selectedLanguage, currentQ.id, currentQ.type]);

  // Prevent copy/paste/cut for MCQ explanation, descriptive, and coding questions.
  useEffect(() => {
    if (currentQ.type !== 'mcq' && currentQ.type !== 'coding' && currentQ.type !== 'descriptive') return;

    const blockClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
    };

    const blockShortcutKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === 'c' || key === 'v' || key === 'x')) {
        event.preventDefault();
      }
    };

    document.addEventListener('copy', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('keydown', blockShortcutKeys);

    return () => {
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('keydown', blockShortcutKeys);
    };
  }, [currentQ.type]);

  const renderQuestion = () => {
    switch (currentQ.type) {
      case 'mcq':
        return (
          <div className="space-y-6">
            {currentQ.multipleCorrect ? (
              <div className="space-y-3">
                {currentQ.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`option-${index}`}
                      checked={answers[currentQ.id]?.includes(option) || false}
                      onCheckedChange={(checked) => {
                        const currentAnswers = answers[currentQ.id] || [];
                        if (checked) {
                          handleAnswerChange(currentQ.id, [...currentAnswers, option]);
                        } else {
                          handleAnswerChange(currentQ.id, currentAnswers.filter((a: string) => a !== option));
                        }
                      }}
                    />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <RadioGroup
                value={answers[currentQ.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
              >
                {currentQ.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="explanation" className="text-sm font-medium">
                Explain your answer (required)
              </Label>
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

      case 'coding':
        return (
          <div className="space-y-4">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
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

  const progress = ((currentQuestion + 1) / mockQuestions.length) * 100;
  const answeredCount = mockQuestions.filter(isQuestionAnswered).length;
  const flaggedCount = flagged.size;

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
            {/* Video Monitor */}
            <div className="relative bg-black rounded-lg overflow-hidden h-20 w-36">
              {hasMediaAccess && streamRef.current ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs">
                  <div className="text-center">
                    <Camera className="h-4 w-4 mx-auto mb-1 opacity-50" />
                    <p className="text-[10px]">Camera Not Available</p>
                  </div>
                </div>
              )}
            </div>
            
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

            {/* Submit Button */}
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
                    <br />• Answered: {answeredCount}/{mockQuestions.length} questions
                    <br />• Flagged: {flaggedCount} questions
                    <br />• Time remaining: {formatTime(timeLeft)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitTest}>
                    Submit Test
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`bg-card border-r transition-all duration-300 flex-shrink-0 ${
          isSidebarCollapsed ? 'w-16' : 'w-80'
        }`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              {!isSidebarCollapsed && (
                <h3 className="font-semibold">Questions</h3>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                {isSidebarCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            {!isSidebarCollapsed ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Questions {startQuestion + 1}-{endQuestion}
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePageChange(questionPage - 1)}
                        disabled={questionPage === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(questionPage + 1)}
                        disabled={questionPage === totalPages - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {paginatedQuestions.map((question, index) => {
                      const actualIndex = startQuestion + index;
                      const status = getQuestionStatus(actualIndex, question.id);
                      return (
                        <Button
                          key={question.id}
                          variant="outline"
                          size="sm"
                          className={`h-10 w-10 p-0 ${getStatusColor(status)}`}
                          onClick={() => handleQuestionClick(index)}
                        >
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
                      <span>{currentQuestion + 1}/{mockQuestions.length}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Answered</span>
                      <span className="text-green-600">{answeredCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flagged</span>
                      <span className="text-yellow-600">{flaggedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining</span>
                      <span className="text-muted-foreground">{mockQuestions.length - answeredCount}</span>
                    </div>
                  </div>
                </div>

                {/* Monitoring Status */}
                <div className="mt-6 p-3 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Monitoring Status</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Camera</span>
                      <span className={videoTrackEnabled ? 'text-green-600' : 'text-red-600'}>
                        {videoTrackEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Audio</span>
                      <span className={audioTrackEnabled ? 'text-green-600' : 'text-red-600'}>
                        {audioTrackEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tab Switches</span>
                      <span className="text-orange-600">{tabSwitchCount}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                {paginatedQuestions.map((question, index) => {
                  const actualIndex = startQuestion + index;
                  const status = getQuestionStatus(actualIndex, question.id);
                  return (
                    <Button
                      key={question.id}
                      variant="outline"
                      size="sm"
                      className={`w-8 h-8 p-0 text-xs ${getStatusColor(status)}`}
                      onClick={() => handleQuestionClick(index)}
                    >
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
                        Question {currentQuestion + 1} of {mockQuestions.length}
                      </Badge>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {currentQ.marks} marks
                      </Badge>
                      <Badge variant="outline" className="capitalize text-base px-3 py-1">
                        {currentQ.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl leading-relaxed">
                      {currentQ.question}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFlagQuestion(currentQ.id)}
                    className={flagged.has(currentQ.id) ? 'text-yellow-600' : ''}
                  >
                    <Flag className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {renderQuestion()}
              </CardContent>
            </Card>
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
