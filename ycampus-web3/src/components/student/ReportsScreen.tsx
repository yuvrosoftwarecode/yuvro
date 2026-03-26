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
  User
} from 'lucide-react';

interface ReportsScreenProps {
  role: {
    title: string;
    level: string;
  };
  difficulty: string;
  duration: string;
  onTryAgain: () => void;
  onBackToLibrary: () => void;
}

interface QuestionAnalysis {
  id: number;
  question: string;
  type: 'behavioral' | 'coding';
  userAnswer: string;
  aiScore: number;
  whatWentWell: string[];
  whatCouldBeBetter: string[];
  missingTerminologies: string[];
  recommendedResponse: string;
}

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({
  role,
  difficulty,
  duration,
  onTryAgain,
  onBackToLibrary
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [showChatbot, setShowChatbot] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'ai',
      message: "Hello! I'm here to help you understand your interview performance. Feel free to ask me any questions about your responses or how to improve.",
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  // Mock interview data
  const interviewData = {
    position: "HR Manager",
    round: "Behavioral",
    duration: "15 mins",
    interviewer: "AI Interviewer",
    practicedOn: "27th Jul, 2025 12:18 PM"
  };

  // Mock data for the report
  const overallScore = 75;
  const performanceMetrics = {
    communication: 80,
    technicalSkills: 70,
    problemSolving: 75,
    confidence: 78
  };

  const questionAnalysis: QuestionAnalysis[] = [
    {
      id: 1,
      question: "Can you give an example of how you have handled stress in a challenging academic or work situation?",
      type: 'behavioral',
      userAnswer: "I balance my stress, you know, um, noting down all the task which I have received from my manager and make a plan according to it. So, I take regular, you know, mid, mid intervals in between of my work. Um, and I always love to, you know, make a time table and work accordingly. That's how I release most, I cannot take most of the stress on me.",
      aiScore: 65,
      whatWentWell: [
        "You mentioned planning and task management as a way to handle stress, which is a practical approach.",
        "You touched upon the importance of taking breaks, indicating an awareness of the need for self-care."
      ],
      whatCouldBeBetter: [
        "You could have provided a specific example of a challenging situation and how you applied your strategies. For instance, describe a time when you had multiple deadlines and how your planning and breaks helped you manage the workload effectively.",
        "You could elaborate on the types of breaks you take and how they help you to de-stress. For example, do you meditate, take a walk, or engage in a hobby?",
        "You could have discussed additional stress-management techniques you use, such as mindfulness, exercise, or seeking support from colleagues or supervisors.",
        "You could have quantified the impact of your stress management techniques. For example, 'By implementing these strategies, I was able to complete all tasks on time and reduce my stress levels by X%'."
      ],
      missingTerminologies: [
        "Prioritization techniques (e.g. Eisenhower Matrix)",
        "Mindfulness",
        "Time management frameworks (e.g. Pomodoro Technique)",
        "Seeking support/delegation"
      ],
      recommendedResponse: "Situation: As an HR intern, I was coordinating a training program while the HR Director was unexpectedly absent due to a family emergency.\n\nTask: I had to manage the increased workload and tight deadlines for both the training program and the Director's responsibilities.\n\nAction: I created a prioritized task list using the Eisenhower Matrix, delegated simpler tasks to other team members, triaged emails based on urgency, scheduled meetings efficiently, implemented time-blocking techniques with 25-minute focused work sessions followed by 5-minute breaks, and used time-blocking techniques with 25-minute focused work sessions followed by 5-minute breaks.\n\nResult: The training program was executed successfully, the HR department ran smoothly, and I learned valuable lessons about prioritization, delegation, communication, and the benefits of short, focused breaks."
    },
    {
      id: 2,
      question: "Tell me about a time when you had to work under pressure.",
      type: 'behavioral',
      userAnswer: "During my final semester, I had three major projects due within a week. I created a detailed schedule, prioritized tasks based on complexity and deadlines, and worked systematically through each project.",
      aiScore: 78,
      whatWentWell: [
        "Good structure and organization in your approach",
        "You mentioned specific strategies like scheduling and prioritization"
      ],
      whatCouldBeBetter: [
        "Could provide more specific details about the outcome",
        "Missing quantifiable results of your approach"
      ],
      missingTerminologies: [
        "STAR method implementation",
        "Stress management techniques"
      ],
      recommendedResponse: "Using the STAR method: Situation - Faced three major projects in final semester. Task - Complete all within one week deadline. Action - Created detailed schedule, prioritized by complexity, allocated time blocks. Result - Successfully delivered all projects on time with high grades."
    }
  ];

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
    
    if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
      return "Based on your interview performance, I recommend focusing on using the STAR method for behavioral questions and providing more specific examples with quantifiable results. Practice articulating your experiences more clearly.";
    } else if (lowerMessage.includes('score') || lowerMessage.includes('performance')) {
      return "Your overall score of 75% shows good performance with room for improvement. Your communication skills are particularly strong at 80%, while technical skills could use some enhancement.";
    } else if (lowerMessage.includes('stress') || lowerMessage.includes('pressure')) {
      return "For stress management questions, try to include specific frameworks like the Eisenhower Matrix, mention mindfulness techniques, and always quantify your results. The STAR method works great for these behavioral questions.";
    }
    
    return "That's a great question! I'd recommend reviewing the detailed feedback for each question and focusing on the missing terminologies highlighted in your responses. Practice using the STAR method to structure your answers better.";
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Report Download Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Interview Report</h2>
                <p className="text-sm text-muted-foreground mt-1">Your detailed interview analysis and feedback</p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="overall" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overall">Overall Performance</TabsTrigger>
            <TabsTrigger value="questions">Question Based Performance</TabsTrigger>
          </TabsList>

          {/* Overall Performance Tab */}
          <TabsContent value="overall">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interview Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Interview Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Position:</span>
                      <div className="font-semibold">{interviewData.position}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Round:</span>
                      <div className="font-semibold">{interviewData.round}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <div className="font-semibold">{interviewData.duration}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interviewer:</span>
                      <div className="font-semibold">{interviewData.interviewer}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Practiced On:</span>
                    <div className="font-semibold">{interviewData.practicedOn}</div>
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
                    <span className={getScoreColor(overallScore)}>{overallScore}%</span>
                    {getScoreIcon(overallScore)}
                  </div>
                  <p className="text-muted-foreground mb-4">Overall Interview Score</p>
                  <div className="text-center">
                    <p className="font-medium text-lg">Good Performance!</p>
                    <p className="text-muted-foreground">Above average candidate</p>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(performanceMetrics).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize text-sm">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-muted-foreground text-sm">{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feedback and Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Key Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Key Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">Strong communication skills with clear articulation</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">Good understanding of behavioral question frameworks</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">Demonstrated problem-solving approach in responses</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">Showed confidence in handling challenging situations</span>
                    </li>
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
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">Use more specific examples with quantifiable results</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">Implement STAR method more consistently</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">Reduce filler words and improve articulation</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">Include more industry-specific terminologies</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Question Based Performance Tab */}
          <TabsContent value="questions">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Question Numbers and Analysis */}
              <div className="lg:col-span-2 space-y-6">
                {/* Question Numbers + Content in fixed-height card */}
                <Card className="h-[700px] flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                      {questionAnalysis.map((_, index) => (
                        <Button
                          key={index}
                          variant={selectedQuestion === index ? "default" : "outline"}
                          onClick={() => setSelectedQuestion(index)}
                          className="w-12 h-12 rounded-lg"
                        >
                          Q{index + 1}
                        </Button>
                      ))}
                    </div>

                    {/* Scrollable Question Content */}
                    <ScrollArea className="flex-1 pr-2">
                      {selectedQuestion !== null && (
                        <div className="space-y-6">
                          {/* Question */}
                          <div>
                            <h3 className="font-semibold mb-2">Q: {questionAnalysis[selectedQuestion].question}</h3>
                          </div>

                          {/* User Answer */}
                          <div>
                            <h4 className="font-medium mb-2 text-muted-foreground">Your Answer:</h4>
                            <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-blue-500">
                              <p className="text-sm leading-relaxed">{questionAnalysis[selectedQuestion].userAnswer}</p>
                            </div>
                          </div>

                          {/* Feedback Sections as separate cards */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* What went well */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm font-semibold">What went well</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2">
                                  {questionAnalysis[selectedQuestion].whatWentWell.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm">
                                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>

                            {/* What could be better */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm font-semibold">What could be better</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2">
                                  {questionAnalysis[selectedQuestion].whatCouldBeBetter.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm">
                                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>

                            {/* Missing Terminologies */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm font-semibold">Missing Terminologies</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2">
                                  {questionAnalysis[selectedQuestion].missingTerminologies.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm">
                                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>

                            {/* Recommended Response */}
                            <Card className="lg:col-span-2">
                              <CardHeader>
                                <CardTitle className="text-sm font-semibold">Recommended Response</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border-l-4 border-blue-500">
                                  <p className="text-sm leading-relaxed whitespace-pre-line">
                                    {questionAnalysis[selectedQuestion].recommendedResponse}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* AI Chatbot */}
              <div className="lg:col-span-1">
                <Card className={`transition-all duration-300 ${showChatbot ? 'h-[700px]' : 'h-16'}`}>
                  <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowChatbot(!showChatbot)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        AI Assistant
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        {showChatbot ? '−' : '+'}
                      </Button>
                    </div>
                  </CardHeader>
                  {showChatbot && (
                    <CardContent className="p-0 h-[calc(700px-64px)]">
                      <div className="flex flex-col h-full">
                        {/* Chat Messages */}
                        <ScrollArea className="flex-1 p-4">
                          <div className="space-y-4">
                            {chatMessages.map((message) => (
                              <div
                                key={message.id}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                                    message.type === 'user'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {message.message}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        {/* Chat Input */}
                        <div className="p-4 border-t">
                          <div className="flex gap-2">
                            <Input
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Ask about your performance..."
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSendMessage();
                                }
                              }}
                            />
                            <Button size="sm" onClick={handleSendMessage}>
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Back Button */}
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={onBackToLibrary}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Interview Library
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportsScreen;