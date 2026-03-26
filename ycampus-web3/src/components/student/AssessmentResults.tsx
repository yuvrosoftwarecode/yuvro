import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  RotateCcw, 
  MessageSquare,
  Bot,
  Send,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
  marks: number;
  score?: number;
}

interface AssessmentResultsProps {
  assessment: Assessment;
  onBackToList: () => void;
  onTryAgain: () => void;
}

interface QuestionResult {
  id: number;
  question: string;
  type: 'mcq' | 'coding' | 'descriptive';
  options?: string[];
  correctAnswer: string;
  studentAnswer: string;
  isCorrect: boolean;
  explanation: string;
  points: number;
  maxPoints: number;
}

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
}

const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  assessment,
  onBackToList,
  onTryAgain
}) => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'ai',
      message: "Hello! I'm your AI assistant. I can help clarify doubts about any question or explain concepts you found challenging. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  // Mock assessment results data
  const assessmentData = {
    ...assessment,
    score: assessment.score || Math.floor(Math.random() * 20) + 70,
    timeTaken: Math.floor(Math.random() * 30) + 45, // Random time between 45-75 minutes
    completedOn: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };

  const questionResults: QuestionResult[] = [
    {
      id: 1,
      question: "What is the time complexity of binary search algorithm?",
      type: 'mcq',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      correctAnswer: 'O(log n)',
      studentAnswer: 'O(log n)',
      isCorrect: true,
      explanation: "Binary search has O(log n) time complexity because it eliminates half of the remaining elements in each iteration.",
      points: 2,
      maxPoints: 2
    },
    {
      id: 2,
      question: "Write a function to find the maximum element in an array.",
      type: 'coding',
      correctAnswer: 'function findMax(arr) { return Math.max(...arr); }',
      studentAnswer: 'function findMax(arr) { let max = arr[0]; for(let i = 1; i < arr.length; i++) { if(arr[i] > max) max = arr[i]; } return max; }',
      isCorrect: true,
      explanation: "Your solution correctly iterates through the array to find the maximum element. Both approaches are valid.",
      points: 8,
      maxPoints: 10
    },
    {
      id: 3,
      question: "Explain the concept of object-oriented programming and its four main principles.",
      type: 'descriptive',
      correctAnswer: 'OOP principles: Encapsulation, Inheritance, Polymorphism, Abstraction',
      studentAnswer: 'OOP is a programming paradigm based on objects. The four principles are: 1) Encapsulation - bundling data and methods, 2) Inheritance - creating new classes from existing ones, 3) Polymorphism - same interface different implementations.',
      isCorrect: false,
      explanation: "Good explanation but you missed Abstraction. Abstraction is hiding complex implementation details while showing only essential features.",
      points: 6,
      maxPoints: 8
    },
    {
      id: 4,
      question: "Which of the following are valid HTTP methods?",
      type: 'mcq',
      options: ['GET', 'POST', 'FETCH', 'DELETE', 'UPDATE', 'PUT'],
      correctAnswer: 'GET, POST, DELETE, PUT',
      studentAnswer: 'GET, POST, DELETE',
      isCorrect: false,
      explanation: "You correctly identified GET, POST, and DELETE, but missed PUT. FETCH and UPDATE are not valid HTTP methods.",
      points: 2,
      maxPoints: 3
    },
    {
      id: 5,
      question: "Implement a function to check if a string is a palindrome.",
      type: 'coding',
      correctAnswer: 'function isPalindrome(str) { const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, ""); return cleaned === cleaned.split("").reverse().join(""); }',
      studentAnswer: 'function isPalindrome(str) { return str === str.split("").reverse().join(""); }',
      isCorrect: false,
      explanation: "Your solution doesn't handle case insensitivity or non-alphanumeric characters as specified in the question.",
      points: 4,
      maxPoints: 8
    }
  ];

  const correctAnswers = questionResults.filter(q => q.isCorrect).length;
  const wrongAnswers = questionResults.filter(q => !q.isCorrect).length;
  const notAttempted = assessment.totalQuestions - questionResults.length;
  
  const totalScore = questionResults.reduce((sum, q) => sum + q.points, 0);
  const maxScore = assessment.marks;
  const percentage = Math.round((totalScore / maxScore) * 100);

  const performanceMetrics = {
    accuracy: Math.round((correctAnswers / questionResults.length) * 100),
    speed: Math.round((assessmentData.timeTaken / assessment.duration) * 100),
    completionRate: Math.round((questionResults.length / assessment.totalQuestions) * 100)
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const userMessage: ChatMessage = {
      id: chatMessages.length + 1,
      type: 'user',
      message: newMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(newMessage);
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const generateAIResponse = (userMessage: string): ChatMessage => {
    const responses = [
      "I understand your concern about this question. Let me break it down for you...",
      "That's a great question! Here's how you can approach this concept...",
      "I can see why this might be confusing. The key point to remember is...",
      "Good observation! This topic often requires understanding the fundamentals of..."
    ];
    
    return {
      id: chatMessages.length + 2,
      type: 'ai',
      message: responses[Math.floor(Math.random() * responses.length)],
      timestamp: new Date()
    };
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Reset scroll to top on component mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={onBackToList}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">Assessment Results: {assessment.title}</h2>
            <p className="text-muted-foreground">{assessment.course} | Completed on {assessmentData.completedOn}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
        </div>

        {/* Student Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalScore}/{maxScore}</div>
                <p className="text-sm text-muted-foreground">Final Score</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{wrongAnswers}</div>
                <p className="text-sm text-muted-foreground">Wrong</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{notAttempted}</div>
                <p className="text-sm text-muted-foreground">Not Attempted</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Time Taken: </span>
                <span className="font-medium">{formatTime(assessmentData.timeTaken)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Accuracy: </span>
                <span className="font-medium">{performanceMetrics.accuracy}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Percentage: </span>
                <span className="font-medium">{percentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Analysis */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-foreground">Question Analysis</h3>

          {/* Question Numbers Navigation */}
          <div className="relative">
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2 px-1">
                {questionResults.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setSelectedQuestion(index)}
                    className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-all duration-200 hover:scale-105 ${
                      selectedQuestion === index
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : question.isCorrect
                        ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                        : question.studentAnswer
                        ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                        : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Selected Question Details */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Question {selectedQuestion + 1}</CardTitle>
                <Badge variant={questionResults[selectedQuestion].isCorrect ? 'default' : questionResults[selectedQuestion].studentAnswer ? 'destructive' : 'secondary'}>
                  {questionResults[selectedQuestion].isCorrect ? 'Correct' : questionResults[selectedQuestion].studentAnswer ? 'Wrong' : 'Not Attempted'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-4">
                  <p className="text-foreground">{questionResults[selectedQuestion].question}</p>
                  
                  {questionResults[selectedQuestion].type === 'mcq' && questionResults[selectedQuestion].options && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Options:</p>
                      <div className="space-y-1">
                        {questionResults[selectedQuestion].options!.map((option, optIndex) => (
                          <div 
                            key={optIndex} 
                            className={`p-2 rounded-md border ${
                              option === questionResults[selectedQuestion].correctAnswer 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : option === questionResults[selectedQuestion].studentAnswer
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                            {option}
                            {option === questionResults[selectedQuestion].correctAnswer && (
                              <span className="ml-2 text-green-600 font-medium">(Correct Answer)</span>
                            )}
                            {option === questionResults[selectedQuestion].studentAnswer && option !== questionResults[selectedQuestion].correctAnswer && (
                              <span className="ml-2 text-red-600 font-medium">(Your Answer)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(questionResults[selectedQuestion].type === 'descriptive' || questionResults[selectedQuestion].type === 'coding') && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Correct Answer:</p>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-green-800 font-mono text-sm">{questionResults[selectedQuestion].correctAnswer}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Your Answer:</p>
                        <div className={`p-3 border rounded-md ${
                          questionResults[selectedQuestion].isCorrect 
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : questionResults[selectedQuestion].studentAnswer
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}>
                          <p className="font-mono text-sm">{questionResults[selectedQuestion].studentAnswer || 'Not answered'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                    <p className="text-blue-700 text-sm">{questionResults[selectedQuestion].explanation}</p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <Badge variant="outline">
                      {questionResults[selectedQuestion].maxPoints} {questionResults[selectedQuestion].maxPoints === 1 ? 'mark' : 'marks'}
                    </Badge>
                    <div className="text-sm font-medium">
                      Earned: {questionResults[selectedQuestion].points} / {questionResults[selectedQuestion].maxPoints}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              
              {/* AI Assistant Button placed after the entire question container */}
              <div className="flex justify-start pt-4">
                <Button 
                  onClick={() => setShowChatbot(!showChatbot)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  {showChatbot ? 'Hide' : 'Show'} AI Assistant
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Assistant */}
          {showChatbot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3 overflow-x-hidden">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.type === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-3 rounded-lg text-sm break-words ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask a question about this assessment..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentResults;