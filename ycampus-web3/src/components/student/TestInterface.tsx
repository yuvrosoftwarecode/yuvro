import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
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
  Mic,
  CameraOff,
  MicOff,
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

const TestInterface: React.FC<TestInterfaceProps> = ({
  topic,
  course,
  onComplete,
  onBack
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(topic.duration * 60);
  const [answers, setAnswers] = useState<{[key: string]: any}>({});
  const [explanations, setExplanations] = useState<{[key: string]: string}>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasMediaAccess, setHasMediaAccess] = useState(true);
  const [videoTrackEnabled, setVideoTrackEnabled] = useState(true);
  const [audioTrackEnabled, setAudioTrackEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [questionPage, setQuestionPage] = useState(0);

  // Initialize camera and microphone
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

    // Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    const answeredCount = Object.keys(answers).filter(key => {
      const answer = answers[key];
      return answer !== null && answer !== undefined && answer !== '';
    }).length;
    
    const timeSpent = (topic.duration * 60) - timeLeft;
    
    onComplete({
      answeredCount,
      totalQuestions: mockQuestions.length,
      timeSpent
    });
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

  const handleNextQuestion = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      const newQuestion = currentQuestion + 1;
      setCurrentQuestion(newQuestion);
      const newPage = Math.floor(newQuestion / 10);
      if (newPage !== questionPage) {
        setQuestionPage(newPage);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      const newQuestion = currentQuestion - 1;
      setCurrentQuestion(newQuestion);
      const newPage = Math.floor(newQuestion / 10);
      if (newPage !== questionPage) {
        setQuestionPage(newPage);
      }
    }
  };

  const getQuestionStatus = (index: number, questionId: string) => {
    if (answers[questionId]) return 'answered';
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
            
            {currentQ.requiresExplanation && (
              <div className="space-y-2">
                <Label htmlFor="explanation" className="text-sm font-medium">
                  Explain your answer {currentQ.requiresExplanation && '(required)'}
                </Label>
                <Textarea
                  id="explanation"
                  placeholder="Explain why you chose this answer..."
                  value={explanations[currentQ.id] || ''}
                  onChange={(e) => handleExplanationChange(currentQ.id, e.target.value)}
                  className="min-h-32"
                />
              </div>
            )}
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
  const answeredCount = Object.keys(answers).filter(key => {
    const answer = answers[key];
    return answer !== null && answer !== undefined && answer !== '';
  }).length;
  const flaggedCount = flagged.size;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              <CardContent className="p-8">
                {renderQuestion()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestInterface;
