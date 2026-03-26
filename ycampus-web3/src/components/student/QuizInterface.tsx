import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import CodeEditor from '@/components/ui/code-editor';
import { Code, ChevronLeft, ChevronRight, CheckCircle, XCircle, RotateCcw, Check, ArrowLeft, MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Question {
  id: number;
  title: string;
  question: string;
  code?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizInterfaceProps {
  topicTitle: string;
  showCodeEditor: boolean;
  onToggleCodeEditor: () => void;
  code: string;
  onCodeChange: (code: string) => void;
  backendQuestions?: Question[];
}

const mockQuestions: Question[] = [
  {
    id: 1,
    title: 'MCQ - Variable Declaration',
    question: 'Which of the following is the correct way to declare a variable in Python?',
    code: 'x = 10\nprint(x)',
    options: [
      'var x = 10',
      'int x = 10',
      'x = 10',
      'let x = 10'
    ],
    correctAnswer: 2,
    explanation: 'In Python, variables are declared without any keyword. Simply assign a value to a name: x = 10'
  },
  {
    id: 2,
    title: 'MCQ - Conditional Statement',
    question: 'What will be the output of this code?',
    code: 'x = 15\nif x > 10:\n    print("Greater")\nelse:\n    print("Smaller")',
    options: [
      'Greater',
      'Smaller',
      'Error',
      'None'
    ],
    correctAnswer: 0,
    explanation: 'Since x = 15, which is greater than 10, the condition is True and "Greater" will be printed.'
  }
];

const QuizInterface: React.FC<QuizInterfaceProps> = ({ 
  topicTitle, 
  showCodeEditor, 
  onToggleCodeEditor,
  code,
  onCodeChange,
  backendQuestions
}) => {
  const questions = backendQuestions && backendQuestions.length > 0 ? backendQuestions : mockQuestions;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [submittedAnswers, setSubmittedAnswers] = useState<boolean[]>(Array(questions.length).fill(false));
  const [showResults, setShowResults] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [activeTab, setActiveTab] = useState('statement');

  React.useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers(Array(questions.length).fill(null));
    setSubmittedAnswers(Array(questions.length).fill(false));
    setShowResults(false);
    setShowThankYou(false);
    setActiveTab('statement');
  }, [backendQuestions]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswerSelect = (optionIndex: number) => {
    if (!submittedAnswers[currentQuestionIndex]) {
      const newAnswers = [...selectedAnswers];
      newAnswers[currentQuestionIndex] = optionIndex;
      setSelectedAnswers(newAnswers);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswers[currentQuestionIndex] !== null) {
      const newSubmitted = [...submittedAnswers];
      newSubmitted[currentQuestionIndex] = true;
      setSubmittedAnswers(newSubmitted);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setActiveTab('statement');
    } else if (submittedAnswers.every(submitted => submitted)) {
      calculateResults();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setActiveTab('statement');
    }
  };

  const calculateResults = () => {
    setShowResults(true);
  };

  const getScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === questions[index].correctAnswer) {
        correct++;
      }
    });
    return (correct / totalQuestions) * 100;
  };

  const handleRetake = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers(Array(questions.length).fill(null));
    setSubmittedAnswers(Array(questions.length).fill(false));
    setShowResults(false);
    setShowThankYou(false);
    setActiveTab('statement');
  };

  const handleFinish = () => {
    setShowThankYou(true);
  };

  const isAnswerCorrect = (questionIndex: number) => {
    return selectedAnswers[questionIndex] === questions[questionIndex].correctAnswer;
  };

  if (showThankYou) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-lg bg-white">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Congratulations!</h2>
            <p className="text-muted-foreground">
              You have successfully completed the quiz for {topicTitle}
            </p>
            <div className="pt-4">
              <p className="text-3xl font-bold text-green-600">{getScore().toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Final Score</p>
            </div>
            <Button onClick={handleRetake} className="w-full mt-6">
              Back to Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
    const score = getScore();
    const passed = score >= 80;

    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-center">Quiz Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {passed ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-600" />
                )}
              </div>
              <h3 className="text-2xl font-bold">
                {passed ? 'Congratulations! You Passed!' : 'You Did Not Pass'}
              </h3>
              <p className="text-3xl font-bold" style={{ color: passed ? '#16a34a' : '#dc2626' }}>
                {score.toFixed(0)}%
              </p>
              <p className="text-muted-foreground">
                {passed 
                  ? 'Great job! You scored above 80% and passed the quiz.'
                  : 'You need to score at least 80% to pass. Please retake the quiz.'}
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Summary:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                  <p className="text-2xl font-bold">{totalQuestions}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Correct Answers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedAnswers.filter((ans, idx) => ans === questions[idx].correctAnswer).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleRetake} variant="outline" className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
              {passed && (
                <Button onClick={handleFinish} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Finish
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderQuestionCard = () => (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <Card className="shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="statement" className="flex-1">Statement</TabsTrigger>
              <TabsTrigger value="ai-help" className="flex-1">AI Help</TabsTrigger>
            </TabsList>

            <TabsContent value="statement" className="space-y-4 mt-4">
              <div className="space-y-4">
                <p className="text-foreground">{currentQuestion.question}</p>
                
                {currentQuestion.code && (
                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    <pre className="text-sm font-mono">
                      <code>{currentQuestion.code}</code>
                    </pre>
                  </div>
                )}

                <div className="space-y-3">
                  <RadioGroup 
                    value={selectedAnswers[currentQuestionIndex]?.toString()}
                    onValueChange={(value) => handleAnswerSelect(parseInt(value))}
                    disabled={submittedAnswers[currentQuestionIndex]}
                  >
                    {currentQuestion.options?.map((option, index) => (
                      <div 
                        key={index}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                          submittedAnswers[currentQuestionIndex]
                            ? index === currentQuestion.correctAnswer
                              ? 'border-green-500 bg-green-50'
                              : selectedAnswers[currentQuestionIndex] === index
                                ? 'border-red-500 bg-red-50'
                                : 'border-border'
                            : selectedAnswers[currentQuestionIndex] === index
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                        {submittedAnswers[currentQuestionIndex] && index === currentQuestion.correctAnswer && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        {submittedAnswers[currentQuestionIndex] && 
                         selectedAnswers[currentQuestionIndex] === index && 
                         index !== currentQuestion.correctAnswer && (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {submittedAnswers[currentQuestionIndex] && (
                  <div className={`p-4 rounded-lg border-2 ${
                    isAnswerCorrect(currentQuestionIndex)
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}>
                    <p className="font-semibold mb-2" style={{ color: isAnswerCorrect(currentQuestionIndex) ? '#16a34a' : '#dc2626' }}>
                      {isAnswerCorrect(currentQuestionIndex) ? '✓ Correct!' : '✗ Incorrect'}
                    </p>
                    <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ai-help" className="mt-4">
              <div className="p-6 bg-muted/30 rounded-lg space-y-3">
                <h4 className="font-semibold">AI Assistant Hint</h4>
                <p className="text-sm text-muted-foreground">
                  This question tests your understanding of {currentQuestion.title.toLowerCase()}. 
                  Consider the basic syntax rules and common patterns used in programming.
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentQuestion.explanation}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {!submittedAnswers[currentQuestionIndex] ? (
            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={selectedAnswers[currentQuestionIndex] === null}
            >
              Submit Answer
            </Button>
          ) : (
            <div className="flex gap-3">
              {currentQuestionIndex > 0 && (
                <Button onClick={handlePrevious} variant="outline" className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              <Button onClick={handleNext} className="flex-1">
                {currentQuestionIndex === totalQuestions - 1 ? 'View Results' : 'Next'}
                {currentQuestionIndex < totalQuestions - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Embedded view (like video tab layout)
  if (!showCodeEditor) {
    return (
      <div className="space-y-6">
        {/* Code Editor Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Quiz Assessment</h2>
          <Button
            onClick={onToggleCodeEditor}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Code className="h-4 w-4" />
            <span>Show Code Editor</span>
          </Button>
        </div>
        
        {renderQuestionCard()}

        {/* AI Assistant Card */}
        <Card className="border-border bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              <span>AI Learning Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Need help with this question? The AI assistant can provide hints and explanations. 
                Switch to the "AI Help" tab above to see helpful information about the current question.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full page view with split panels (when code editor is shown)
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onToggleCodeEditor}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Normal View
          </Button>
          <div className="h-6 w-px bg-border" />
          <p className="text-sm text-muted-foreground">{topicTitle}</p>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                {renderQuestionCard()}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col bg-background">
              <div className="p-4 border-b border-border flex-shrink-0">
                <h3 className="font-semibold">Code Editor</h3>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <CodeEditor
                  initialCode={code}
                  language="python"
                  onCodeChange={onCodeChange}
                  onRun={(code) => console.log('Running code:', code)}
                  showLanguageSelector={true}
                  showRunButton={true}
                  showResetButton={true}
                  showCopyButton={true}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default QuizInterface;
