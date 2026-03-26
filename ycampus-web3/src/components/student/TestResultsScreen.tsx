import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare,
  Code,
  Clock,
  Target,
  Star,
  Bot,
  Send,
  FileText,
  Award,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react';

interface TestResultsScreenProps {
  testName: string;
  subject: string;
  difficulty: string;
  totalQuestions: number;
  timeTaken: number;
  onTryAgain: () => void;
  onBackToTests: () => void;
}

interface QuestionResult {
  id: number;
  question: string;
  type: 'mcq' | 'coding' | 'short-answer';
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

const TestResultsScreen: React.FC<TestResultsScreenProps> = ({
  testName,
  subject,
  difficulty,
  totalQuestions,
  timeTaken,
  onTryAgain,
  onBackToTests
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(0);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'ai',
      message: "Hello! I'm your AI assistant. I can help clarify doubts about any question or explain concepts you found challenging. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  // Mock test results data
  const testData = {
    testName,
    subject,
    difficulty,
    totalQuestions,
    timeTaken,
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
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      correctAnswer: "O(log n)",
      studentAnswer: "O(log n)",
      isCorrect: true,
      explanation: "Binary search divides the search space in half with each iteration, resulting in logarithmic time complexity O(log n).",
      points: 2,
      maxPoints: 2
    },
    {
      id: 2,
      question: "Which data structure uses LIFO (Last In First Out) principle?",
      type: 'mcq',
      options: ["Queue", "Stack", "Array", "Linked List"],
      correctAnswer: "Stack",
      studentAnswer: "Queue",
      isCorrect: false,
      explanation: "Stack follows LIFO principle where the last element added is the first one to be removed. Queue follows FIFO (First In First Out) principle.",
      points: 0,
      maxPoints: 2
    },
    {
      id: 3,
      question: "Explain the difference between abstract class and interface in Java.",
      type: 'short-answer',
      correctAnswer: "Abstract classes can have both abstract and concrete methods, while interfaces can only have abstract methods (prior to Java 8). Abstract classes are inherited using 'extends', interfaces are implemented using 'implements'.",
      studentAnswer: "Abstract classes have some methods implemented, interfaces don't have any implementation.",
      isCorrect: false,
      explanation: "Your answer is partially correct but incomplete. Abstract classes can contain both abstract and concrete methods, constructors, and instance variables. Interfaces (prior to Java 8) could only contain abstract methods and constants. From Java 8+, interfaces can have default and static methods.",
      points: 1,
      maxPoints: 3
    },
    {
      id: 4,
      question: "What is polymorphism in object-oriented programming?",
      type: 'short-answer',
      correctAnswer: "Polymorphism allows objects of different types to be treated as objects of a common base type. It enables a single interface to represent different underlying forms (data types).",
      studentAnswer: "",
      isCorrect: false,
      explanation: "This question was not attempted. Polymorphism is a fundamental OOP concept that allows one interface to be used for different underlying data types.",
      points: 0,
      maxPoints: 3
    },
    {
      id: 5,
      question: "Write a function to reverse a string in Java.",
      type: 'coding',
      correctAnswer: `public String reverseString(String str) {
    return new StringBuilder(str).reverse().toString();
}`,
      studentAnswer: `public String reverseString(String str) {
    String result = "";
    for(int i = str.length()-1; i >= 0; i--) {
        result += str.charAt(i);
    }
    return result;
}`,
      isCorrect: true,
      explanation: "Your solution is correct and demonstrates a good understanding of string manipulation. However, string concatenation in loops is inefficient. Consider using StringBuilder for better performance.",
      points: 4,
      maxPoints: 5
    }
  ];

  // Calculate statistics
  const correctAnswers = questionResults.filter(q => q.isCorrect).length;
  const wrongAnswers = questionResults.filter(q => !q.isCorrect && q.studentAnswer.trim() !== '').length;
  const notAttempted = questionResults.filter(q => q.studentAnswer.trim() === '').length;
  const totalScore = questionResults.reduce((sum, q) => sum + q.points, 0);
  const maxScore = questionResults.reduce((sum, q) => sum + q.maxPoints, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  const performanceMetrics = {
    accuracy: Math.round((correctAnswers / totalQuestions) * 100),
    speed: Math.round((totalQuestions / (timeTaken / 60)) * 10) / 10, // questions per minute
    completionRate: Math.round(((totalQuestions - notAttempted) / totalQuestions) * 100)
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

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: chatMessages.length + 2,
        type: 'ai',
        message: generateAIResponse(newMessage),
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);

    setNewMessage('');
  };

  const generateAIResponse = (message: string) => {
    const lowerMessage = message.toLowerCase();
    const currentQuestion = selectedQuestion !== null ? questionResults[selectedQuestion] : null;
    
    if (lowerMessage.includes('explain') && currentQuestion) {
      return `Let me explain question ${currentQuestion.id}: ${currentQuestion.explanation}. Would you like me to elaborate on any specific part?`;
    } else if (lowerMessage.includes('why') && lowerMessage.includes('wrong') && currentQuestion) {
      if (!currentQuestion.isCorrect) {
        return `Your answer was incorrect because: ${currentQuestion.explanation}. The correct answer is: ${currentQuestion.correctAnswer}`;
      }
    } else if (lowerMessage.includes('improve') || lowerMessage.includes('study')) {
      return "Based on your performance, I recommend focusing on: 1) OOP concepts (polymorphism, abstract classes vs interfaces), 2) Algorithm time complexity analysis, 3) String manipulation best practices. Practice more coding problems and review theoretical concepts.";
    } else if (lowerMessage.includes('score') || lowerMessage.includes('performance')) {
      return `You scored ${totalScore}/${maxScore} points (${percentage}%). Your accuracy was ${performanceMetrics.accuracy}% with ${correctAnswers} correct answers out of ${totalQuestions} questions.`;
    }
    
    return "I'm here to help! You can ask me about specific questions, concepts, or how to improve your performance. What would you like to know?";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (score >= 60) return <Target className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBackToTests}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tests
          </Button>
          <Button onClick={onTryAgain} className="bg-blue-600 hover:bg-blue-700">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>

        {/* Report Download Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Test Report</h2>
                <p className="text-sm text-muted-foreground mt-1">Your detailed test analysis and performance</p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="overall" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overall">Performance Analysis</TabsTrigger>
            <TabsTrigger value="questions">Question-wise Analysis</TabsTrigger>
          </TabsList>

          {/* Performance Analysis Tab */}
          <TabsContent value="overall">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Test Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Test Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <div className="font-semibold">{testData.subject}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Test Name:</span>
                      <div className="font-semibold">{testData.testName}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Difficulty:</span>
                      <div className="font-semibold">
                        <Badge variant={difficulty === 'Easy' ? 'secondary' : difficulty === 'Medium' ? 'default' : 'destructive'}>
                          {testData.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time Taken:</span>
                      <div className="font-semibold">{formatTime(testData.timeTaken)}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed On:</span>
                    <div className="font-semibold">{testData.completedOn}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Overall Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-4xl font-bold flex items-center justify-center gap-2 mb-2">
                    <span className={getScoreColor(percentage)}>{percentage}%</span>
                    {getScoreIcon(percentage)}
                  </div>
                  <p className="text-muted-foreground mb-4">{totalScore}/{maxScore} Points</p>
                  <div className="text-center">
                    <p className="font-medium text-lg">
                      {percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good Performance!' : 'Needs Improvement'}
                    </p>
                    <p className="text-muted-foreground">
                      {percentage >= 80 ? 'Outstanding result' : percentage >= 60 ? 'Above average performance' : 'Keep practicing'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Question Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Question Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Correct</span>
                      </div>
                      <span className="font-bold text-green-600">{correctAnswers}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium">Wrong</span>
                      </div>
                      <span className="font-bold text-red-600">{wrongAnswers}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium">Not Attempted</span>
                      </div>
                      <span className="font-bold text-orange-600">{notAttempted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Accuracy</span>
                        <span className="text-muted-foreground text-sm">{performanceMetrics.accuracy}%</span>
                      </div>
                      <Progress value={performanceMetrics.accuracy} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Completion Rate</span>
                        <span className="text-muted-foreground text-sm">{performanceMetrics.completionRate}%</span>
                      </div>
                      <Progress value={performanceMetrics.completionRate} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Speed</span>
                        <span className="text-muted-foreground text-sm">{performanceMetrics.speed} q/min</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {correctAnswers > 0 && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Strong performance in algorithmic concepts</span>
                      </li>
                    )}
                    {questionResults.some(q => q.type === 'coding' && q.isCorrect) && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Good coding implementation skills</span>
                      </li>
                    )}
                    {performanceMetrics.completionRate > 80 && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">High completion rate shows good time management</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {wrongAnswers > 0 && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Review incorrect concepts and practice similar problems</span>
                      </li>
                    )}
                    {notAttempted > 0 && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Improve time management to attempt all questions</span>
                      </li>
                    )}
                    {questionResults.some(q => !q.isCorrect && q.type === 'short-answer') && (
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">Focus on theoretical concepts and detailed explanations</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Question-wise Analysis Tab */}
          <TabsContent value="questions">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Question Analysis */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="h-[700px] flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-6 flex-wrap">
                      {questionResults.map((result, index) => (
                        <Button
                          key={index}
                          variant={selectedQuestion === index ? "default" : "outline"}
                          onClick={() => setSelectedQuestion(index)}
                          className="w-12 h-12 rounded-full relative"
                        >
                          <span className="text-sm font-medium">Q{index + 1}</span>
                          {result.isCorrect ? (
                            <CheckCircle className="w-3 h-3 text-green-600 absolute -top-1 -right-1" />
                          ) : result.studentAnswer.trim() === '' ? (
                            <AlertCircle className="w-3 h-3 text-orange-600 absolute -top-1 -right-1" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600 absolute -top-1 -right-1" />
                          )}
                        </Button>
                      ))}
                    </div>

                    <ScrollArea className="flex-1 pr-2">
                      {selectedQuestion !== null && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="font-semibold mb-2">Question {selectedQuestion + 1}</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              {questionResults[selectedQuestion].question}
                            </p>
                            
                            {questionResults[selectedQuestion].options && (
                              <div className="mb-4">
                                <p className="font-medium text-sm mb-2">Options:</p>
                                <ul className="space-y-1">
                                  {questionResults[selectedQuestion].options!.map((option, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground">
                                      {String.fromCharCode(65 + idx)}. {option}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <Tabs defaultValue="answer" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="answer">Your Answer</TabsTrigger>
                              <TabsTrigger value="correct">Correct Answer</TabsTrigger>
                              <TabsTrigger value="explanation">Explanation</TabsTrigger>
                            </TabsList>

                            <TabsContent value="answer" className="space-y-4">
                              <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  {questionResults[selectedQuestion].isCorrect ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : questionResults[selectedQuestion].studentAnswer.trim() === '' ? (
                                    <AlertCircle className="w-4 h-4 text-orange-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className="font-medium text-sm">
                                    {questionResults[selectedQuestion].isCorrect
                                      ? 'Correct'
                                      : questionResults[selectedQuestion].studentAnswer.trim() === ''
                                      ? 'Not Attempted'
                                      : 'Incorrect'}
                                  </span>
                                </div>
                                <p className="text-sm">
                                  {questionResults[selectedQuestion].studentAnswer || 'No answer provided'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Points: {questionResults[selectedQuestion].points}/{questionResults[selectedQuestion].maxPoints}
                                </p>
                              </div>
                            </TabsContent>

                            <TabsContent value="correct" className="space-y-4">
                              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="font-medium text-sm">Correct Answer</span>
                                </div>
                                <p className="text-sm">
                                  {questionResults[selectedQuestion].correctAnswer}
                                </p>
                              </div>
                            </TabsContent>

                            <TabsContent value="explanation" className="space-y-4">
                              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <BookOpen className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium text-sm">Explanation</span>
                                </div>
                                <p className="text-sm">
                                  {questionResults[selectedQuestion].explanation}
                                </p>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* AI Assistant */}
              <Card className={`transition-all duration-300 ${showChatbot ? 'h-[700px]' : 'h-auto'} flex flex-col`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-600" />
                      AI Assistant
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChatbot(!showChatbot)}
                    >
                      {showChatbot ? 'Minimize' : 'Expand'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className={`${showChatbot ? 'flex-1 flex flex-col' : ''} p-4 pt-0`}>
                  {!showChatbot ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        Get help with any question or concept
                      </p>
                      <Button onClick={() => setShowChatbot(true)} className="w-full">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Start Conversation
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ScrollArea className="flex-1 mb-4 pr-2">
                        <div className="space-y-4">
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.type === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-[85%] p-3 rounded-lg text-sm ${
                                  message.type === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
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
                          placeholder="Ask about any question..."
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="flex-1"
                        />
                        <Button onClick={handleSendMessage} size="sm">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TestResultsScreen;