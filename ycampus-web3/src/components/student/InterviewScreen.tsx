import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, RotateCcw, LogOut, User, Bot, Code } from 'lucide-react';
import { CodeEditor } from '@/components/ui/code-editor';

interface Role {
  id: number;
  title: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface InterviewScreenProps {
  role: Role;
  difficulty: string;
  duration: string;
  interviewer: string;
  mediaStream: MediaStream;
  onExit: () => void;
  onInterviewComplete: (role: Role, difficulty: string, duration: string) => void;
}

interface Question {
  content: string;
  type: 'behavioral' | 'coding';
  language?: string;
}

interface Message {
  type: 'ai' | 'user';
  content: string;
  timestamp: string;
  questionType?: 'behavioral' | 'coding';
  codeSubmission?: string;
}

const InterviewScreen: React.FC<InterviewScreenProps> = ({
  role,
  difficulty,
  duration,
  interviewer,
  mediaStream,
  onExit,
  onInterviewComplete
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentUserAnswer, setCurrentUserAnswer] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Mock questions based on role (mix of behavioral and coding questions)
  const questions: Question[] = [
    {
      content: `Tell me about your experience with ${role.title} and what interests you about this field.`,
      type: 'behavioral' as const
    },
    {
      content: "Can you write a function that reverses a string? Please code this solution.",
      type: 'coding' as const,
      language: 'javascript'
    },
    {
      content: "How do you approach problem-solving in challenging situations?",
      type: 'behavioral' as const
    },
    {
      content: "Write a function to find the maximum element in an array. Show your implementation.",
      type: 'coding' as const,
      language: 'python'
    },
    {
      content: "Describe a project you're proud of and your role in its success.",
      type: 'behavioral' as const
    }
  ];

  // Convert duration to seconds
  const getDurationInSeconds = (durationStr: string): number => {
    const match = durationStr.match(/(\d+)\s*mins?/i);
    return match ? parseInt(match[1]) * 60 : 300; // Default 5 minutes
  };

  // Initialize timer
  useEffect(() => {
    const seconds = getDurationInSeconds(duration);
    setTimeLeft(seconds);
  }, [duration]);

  const handleEndInterview = () => {
    // Stop media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    
    onExit();
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleEndInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  // Set up video feed
  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(console.error);
    }

    return () => {
      // Cleanup will be handled by parent component
    };
  }, [mediaStream]);

  // Initialize conversation
  useEffect(() => {
    if (questions.length > 0) {
      const firstQuestion = questions[0];
      setCurrentQuestion(firstQuestion);
      setShowCodeEditor(firstQuestion.type === 'coding');
      setConversation([{
        type: 'ai',
        content: firstQuestion.content,
        timestamp: new Date().toLocaleTimeString(),
        questionType: firstQuestion.type
      }]);
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setCurrentUserAnswer(prev => {
          const baseText = prev.replace(/\[interim\].*$/, '');
          return baseText + finalTranscript + (interimTranscript ? ` [interim]${interimTranscript}` : '');
        });
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
      
      recognitionRef.current.onend = () => {
        if (isRecording) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch (error) {
              console.error('Error restarting speech recognition:', error);
            }
          }, 100);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
    };
  }, [isRecording]);

  // Auto scroll conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isUserTyping, isAITyping]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = () => {
    if (!isRecording) {
      // Start recording
      setIsRecording(true);
      setIsUserTyping(true);
      setCurrentUserAnswer('');
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting speech recognition:', error);
          // Fallback for demo purposes
          setTimeout(() => {
            setCurrentUserAnswer('Thank you for the question. I believe...');
            setIsUserTyping(false);
          }, 2000);
        }
      }
    } else {
      // Stop recording and submit answer
      setIsRecording(false);
      setIsUserTyping(false);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
      
      // Clean up answer and add to conversation
      const cleanAnswer = currentUserAnswer.replace(/\[interim\].*$/, '').trim();
      const userMessage: Message = {
        type: 'user',
        content: cleanAnswer || 'Thank you for the question. I appreciate the opportunity to share my thoughts.',
        timestamp: new Date().toLocaleTimeString(),
        questionType: currentQuestion?.type,
        codeSubmission: showCodeEditor ? currentCode : undefined
      };
      
      setConversation(prev => [...prev, userMessage]);
      setCurrentUserAnswer('');
      setCurrentCode('');
      
      // Show AI typing and generate next question
      setIsAITyping(true);
      setTimeout(() => {
        setIsAITyping(false);
        const nextQuestionIndex = currentQuestionIndex + 1;
        
        if (nextQuestionIndex < questions.length) {
          const nextQuestion = questions[nextQuestionIndex];
          setCurrentQuestion(nextQuestion);
          setShowCodeEditor(nextQuestion.type === 'coding');
          
          const aiMessage: Message = {
            type: 'ai',
            content: nextQuestion.content,
            timestamp: new Date().toLocaleTimeString(),
            questionType: nextQuestion.type
          };
          
          setConversation(prev => [...prev, aiMessage]);
          setCurrentQuestionIndex(nextQuestionIndex);
        } else {
          // Interview completed
          const aiMessage: Message = {
            type: 'ai',
            content: 'Thank you for your responses. The interview is now complete.',
            timestamp: new Date().toLocaleTimeString(),
            questionType: 'behavioral'
          };
          
          setConversation(prev => [...prev, aiMessage]);
          setTimeout(() => {
            onInterviewComplete(role, difficulty, duration);
          }, 3000);
        }
       }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold">Mock Interview - {role.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{difficulty}</Badge>
              <Badge variant="outline">{interviewer}</Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-lg font-mono">
              {formatTime(timeLeft)}
            </div>
            <Button variant="destructive" onClick={handleEndInterview}>
              <LogOut className="h-4 w-4 mr-2" />
              Exit Interview
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Conversation */}
        <div className="flex-1 flex flex-col bg-card m-4 rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Interview Conversation</h2>
              <Button variant="ghost" size="sm">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversation.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'ai' 
                    ? 'bg-muted text-muted-foreground' 
                    : 'bg-primary text-primary-foreground'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {message.type === 'ai' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                   <span className="text-xs opacity-70">
                      {message.type === 'ai' ? 'AI Interviewer' : 'You'} • {message.timestamp}
                    </span>
                    {message.questionType === 'coding' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        <Code className="h-3 w-3 mr-1" />
                        Coding
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Show code submission for user messages */}
                  {message.type === 'user' && message.codeSubmission && (
                    <div className="mt-2 p-2 bg-background/20 rounded border">
                      <div className="text-xs opacity-70 mb-1">Code Submission:</div>
                      <pre className="text-xs overflow-x-auto">
                        <code>{message.codeSubmission}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* User typing indicator */}
            {isUserTyping && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg p-3 bg-primary text-primary-foreground">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-xs opacity-70">You • {new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm">
                    {currentUserAnswer ? (
                      <span>
                        {currentUserAnswer.replace(/\[interim\].*$/, '')}
                        {currentUserAnswer.includes('[interim]') && (
                          <span className="opacity-60">
                            {currentUserAnswer.match(/\[interim\](.*)/)?.[1] || ''}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="animate-pulse">●</span>
                        <span className="animate-pulse">●</span>
                        <span className="animate-pulse">●</span>
                        Listening...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* AI typing indicator */}
            {isAITyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-muted text-muted-foreground">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4" />
                    <span className="text-xs opacity-70">AI Interviewer • {new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse">●</span>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={conversationEndRef} />
          </div>
          
          {/* Code Editor for coding questions */}
          {showCodeEditor && currentQuestion?.type === 'coding' && (
            <div className="p-4 border-t">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Code Editor</h4>
                <Badge variant="secondary" className="text-xs">
                  {currentQuestion.language || 'javascript'}
                </Badge>
              </div>
              <CodeEditor
                language={currentQuestion.language || 'javascript'}
                onCodeChange={setCurrentCode}
                className="mb-3"
                maxHeight="200px"
                showLanguageSelector={false}
                showRunButton={false}
                showFullscreenToggle={false}
              />
            </div>
          )}

          {/* Recording Controls */}
          <div className="p-4 border-t">
            <Button 
              onClick={handleToggleRecording}
              className={`w-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
              size="lg"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  End Answer
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  {showCodeEditor ? 'Start Answer (Voice + Code)' : 'Start Answer'}
                </>
              )}
            </Button>
            {showCodeEditor && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Provide verbal explanation while coding your solution
              </p>
            )}
          </div>
        </div>

        {/* Right Panel - Video Feeds */}
        <div className="w-80 p-4 space-y-4">
          {/* AI Interviewer */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">AI Interviewer ({interviewer})</h3>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-4xl">🤖</div>
              </div>
            </CardContent>
          </Card>
          
          {/* Student Video */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">You</h3>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewScreen;