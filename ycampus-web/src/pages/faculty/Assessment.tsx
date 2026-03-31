import React, { useState, useEffect } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Clock, FileText, Users, Edit, Trash2, Eye, Send, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QuestionSetup } from '@/components/admin/test-questions/QuestionSetup';
import { QuestionManager } from '@/components/admin/test-questions/QuestionManager';
import { QuestionForm } from '@/components/admin/test-questions/QuestionForm';
import { QuestionPreview } from '@/components/admin/test-questions/QuestionPreview';
import { TestSettings } from '@/components/admin/test-questions/TestSettings';

interface Assessment {
  id: string;
  title: string;
  description: string;
  numberOfQuestions: number;
  duration: number; // in minutes
  numberOfResponses: number;
  status: 'Draft' | 'Sent';
  createdDate: string;
  courseId: string;
  batchId: string;
}

interface StudentResponse {
  id: string;
  rollNo: string;
  name: string;
  score: number;
  totalMarks: number;
  submissionDate: string;
  correctAnswers: number;
  wrongAnswers: number;
  notAttempted: number;
  answers: { questionId: string; answer: string | string[]; isCorrect: boolean }[];
}

interface Question {
  id: string;
  questionText: string;
  type: 'mcq' | 'coding' | 'short-answer' | 'true-false';
  options?: string[];
  correctAnswer: string | string[];
  marks: number;
  courseId: string;
  batchId: string;
  moduleId: string;
  topicId: string;
  isMultipleAnswer?: boolean;
  testSettings?: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    duration: number;
  };
}

const Assessment: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [viewingAssessment, setViewingAssessment] = useState<Assessment | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Assessment | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null);
  const [responseSearchQuery, setResponseSearchQuery] = useState<string>('');
  const [assessmentToSend, setAssessmentToSend] = useState<Assessment | null>(null);
  const { toast } = useToast();

  // Mock data
  const courses = [
    { id: '1', name: 'React Development' },
    { id: '2', name: 'Node.js Backend' },
    { id: '3', name: 'Database Design' }
  ];

  const batches = selectedCourse ? [
    { id: '1', name: 'Batch A', courseId: selectedCourse },
    { id: '2', name: 'Batch B', courseId: selectedCourse },
    { id: '3', name: 'Batch C', courseId: selectedCourse }
  ] : [];

  const mockAssessments: Assessment[] = [
    {
      id: '1',
      title: 'React Fundamentals Quiz',
      description: 'Test your knowledge of React basics including components, props, and state',
      numberOfQuestions: 15,
      duration: 30,
      numberOfResponses: 8,
      status: 'Sent',
      createdDate: '2024-01-15',
      courseId: '1',
      batchId: '1'
    },
    {
      id: '2',
      title: 'JavaScript ES6 Assessment',
      description: 'Comprehensive test on modern JavaScript features and syntax',
      numberOfQuestions: 20,
      duration: 45,
      numberOfResponses: 0,
      status: 'Draft',
      createdDate: '2024-01-20',
      courseId: '1',
      batchId: '1'
    },
    {
      id: '3',
      title: 'CSS and Styling Test',
      description: 'Assessment covering CSS fundamentals, Flexbox, and Grid',
      numberOfQuestions: 12,
      duration: 25,
      numberOfResponses: 0,
      status: 'Draft',
      createdDate: '2024-01-25',
      courseId: '1',
      batchId: '1'
    },
    {
      id: '4',
      title: 'API Integration Quiz',
      description: 'Test knowledge of REST APIs, HTTP methods, and data handling',
      numberOfQuestions: 18,
      duration: 35,
      numberOfResponses: 5,
      status: 'Sent',
      createdDate: '2024-01-30',
      courseId: '1',
      batchId: '1'
    }
  ];

  // Mock questions for assessments
  const mockQuestions: { [assessmentId: string]: Question[] } = {
    '1': [
      {
        id: 'q1',
        questionText: 'What is JSX?',
        type: 'mcq',
        options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML', 'None of the above'],
        correctAnswer: 'JavaScript XML',
        marks: 2,
        courseId: '1',
        batchId: '1',
        moduleId: 'm1',
        topicId: 't1'
      },
      {
        id: 'q2',
        questionText: 'Which hook is used for state management in functional components?',
        type: 'mcq',
        options: ['useEffect', 'useState', 'useContext', 'useReducer'],
        correctAnswer: 'useState',
        marks: 2,
        courseId: '1',
        batchId: '1',
        moduleId: 'm1',
        topicId: 't1'
      },
      {
        id: 'q3',
        questionText: 'What is the virtual DOM?',
        type: 'short-answer',
        correctAnswer: 'A JavaScript representation of the real DOM that React uses to optimize updates',
        marks: 5,
        courseId: '1',
        batchId: '1',
        moduleId: 'm1',
        topicId: 't1'
      }
    ],
    '4': [
      {
        id: 'q4',
        questionText: 'What does REST stand for?',
        type: 'mcq',
        options: ['Representational State Transfer', 'Remote State Transfer', 'Real State Transfer', 'None of the above'],
        correctAnswer: 'Representational State Transfer',
        marks: 2,
        courseId: '1',
        batchId: '1',
        moduleId: 'm2',
        topicId: 't2'
      },
      {
        id: 'q5',
        questionText: 'Which HTTP method is used to create a new resource?',
        type: 'mcq',
        options: ['GET', 'POST', 'PUT', 'DELETE'],
        correctAnswer: 'POST',
        marks: 2,
        courseId: '1',
        batchId: '1',
        moduleId: 'm2',
        topicId: 't2'
      }
    ]
  };

  // Mock student responses
  const mockStudentResponses: { [assessmentId: string]: StudentResponse[] } = {
    '1': [
      {
        id: 'r1',
        rollNo: 'CSE001',
        name: 'John Doe',
        score: 8,
        totalMarks: 9,
        submissionDate: '2024-01-16',
        correctAnswers: 2,
        wrongAnswers: 1,
        notAttempted: 0,
        answers: [
          { questionId: 'q1', answer: 'JavaScript XML', isCorrect: true },
          { questionId: 'q2', answer: 'useState', isCorrect: true },
          { questionId: 'q3', answer: 'A representation of DOM', isCorrect: false }
        ]
      },
      {
        id: 'r2',
        rollNo: 'CSE002',
        name: 'Jane Smith',
        score: 9,
        totalMarks: 9,
        submissionDate: '2024-01-16',
        correctAnswers: 3,
        wrongAnswers: 0,
        notAttempted: 0,
        answers: [
          { questionId: 'q1', answer: 'JavaScript XML', isCorrect: true },
          { questionId: 'q2', answer: 'useState', isCorrect: true },
          { questionId: 'q3', answer: 'A JavaScript representation of the real DOM that React uses to optimize updates', isCorrect: true }
        ]
      },
      {
        id: 'r3',
        rollNo: 'CSE003',
        name: 'Mike Johnson',
        score: 4,
        totalMarks: 9,
        submissionDate: '2024-01-17',
        correctAnswers: 1,
        wrongAnswers: 1,
        notAttempted: 1,
        answers: [
          { questionId: 'q1', answer: 'Java Syntax Extension', isCorrect: false },
          { questionId: 'q2', answer: 'useState', isCorrect: true },
          { questionId: 'q3', answer: '', isCorrect: false }
        ]
      }
    ],
    '4': [
      {
        id: 'r4',
        rollNo: 'CSE004',
        name: 'Sarah Wilson',
        score: 4,
        totalMarks: 4,
        submissionDate: '2024-02-01',
        correctAnswers: 2,
        wrongAnswers: 0,
        notAttempted: 0,
        answers: [
          { questionId: 'q4', answer: 'Representational State Transfer', isCorrect: true },
          { questionId: 'q5', answer: 'POST', isCorrect: true }
        ]
      }
    ]
  };

  useEffect(() => {
    if (selectedCourse && selectedBatch) {
      // Mock API call to fetch assessments
      setAssessments(mockAssessments.filter(assessment => 
        assessment.courseId === selectedCourse && assessment.batchId === selectedBatch
      ));
    } else {
      setAssessments([]);
    }
  }, [selectedCourse, selectedBatch]);

  // Filter assessments based on search query
  const filteredAssessments = assessments.filter(assessment =>
    assessment.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedBatch('');
    setAssessments([]);
  };

  const handleCreateAssessment = (assessmentData: { title: string; description: string; numberOfQuestions: number; duration: number }) => {
    const newAssessment: Assessment = {
      id: Date.now().toString(),
      title: assessmentData.title,
      description: assessmentData.description,
      numberOfQuestions: assessmentData.numberOfQuestions,
      duration: assessmentData.duration,
      numberOfResponses: 0,
      status: 'Draft',
      createdDate: new Date().toISOString().split('T')[0],
      courseId: selectedCourse,
      batchId: selectedBatch
    };
    
    setAssessments(prev => [...prev, newAssessment]);
    setShowCreateForm(false);
    
    toast({
      title: "Assessment Created",
      description: "New assessment has been created successfully.",
    });
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    setAssessments(prev => prev.filter(assessment => assessment.id !== assessmentId));
    
    toast({
      title: "Assessment Deleted",
      description: "Assessment has been deleted successfully.",
    });
  };

  const handleDeleteClick = (assessment: Assessment) => {
    setAssessmentToDelete(assessment);
  };

  const handleConfirmDelete = () => {
    if (assessmentToDelete) {
      handleDeleteAssessment(assessmentToDelete.id);
      setAssessmentToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setAssessmentToDelete(null);
  };

  const handleEditAssessment = (assessment: Assessment) => {
    setEditingAssessment(assessment);
  };

  const handleCancelEdit = () => {
    setEditingAssessment(null);
  };

  const handleViewAssessment = (assessment: Assessment) => {
    setViewingAssessment(assessment);
  };

  const handleViewResponses = (assessment: Assessment) => {
    setViewingResponses(assessment);
  };

  const handleBackToAssessments = () => {
    setViewingAssessment(null);
    setViewingResponses(null);
    setSelectedStudent(null);
  };

  const handleSendClick = (assessment: Assessment) => {
    setAssessmentToSend(assessment);
  };

  const handleConfirmSend = () => {
    if (assessmentToSend) {
      handleSendAssessment(assessmentToSend.id);
      setAssessmentToSend(null);
    }
  };

  const handleCancelSend = () => {
    setAssessmentToSend(null);
  };

  const handleSendAssessment = (assessmentId: string) => {
    setAssessments(prev => prev.map(assessment => 
      assessment.id === assessmentId ? { ...assessment, status: 'Sent' as const } : assessment
    ));
    
    toast({
      title: "Assessment Sent",
      description: "Assessment has been sent to students successfully.",
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Custom Assessment Question Setup Component (without dropdowns)
  const AssessmentQuestionSetup = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [showQuestionForm, setShowQuestionForm] = useState(true);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [assessmentTitle, setAssessmentTitle] = useState('');
    const [assessmentDescription, setAssessmentDescription] = useState('');
    const [testSettings, setTestSettings] = useState({
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '10:00',
      duration: 1
    });

    const handleQuestionSave = (question: Question) => {
      const newQuestion = {
        ...question,
        id: Date.now().toString(),
        courseId: selectedCourse,
        batchId: selectedBatch,
        testSettings: testSettings,
      };
      
      setQuestions(prev => [...prev, newQuestion]);
      toast({
        title: "Success",
        description: "Question created successfully!",
      });
    };

    const handleQuestionDelete = (questionId: string) => {
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      toast({
        title: "Success",
        description: "Question deleted successfully!",
      });
    };

    const handleQuestionEdit = (question: Question) => {
      setEditingQuestion(question);
      setShowEditForm(true);
      setShowQuestionForm(false);
    };

    const handleCancelEdit = () => {
      setEditingQuestion(null);
      setShowEditForm(false);
      setShowQuestionForm(true);
    };

    const handleUpdateQuestion = (updatedQuestionData: Question) => {
      if (editingQuestion) {
        const updatedQuestion = {
          ...updatedQuestionData,
          id: editingQuestion.id,
          courseId: editingQuestion.courseId,
          batchId: editingQuestion.batchId,
          testSettings: editingQuestion.testSettings,
        };
        
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? updatedQuestion : q));
        setEditingQuestion(null);
        setShowEditForm(false);
        setShowQuestionForm(true);
        
        toast({
          title: "Success",
          description: "Question updated successfully!",
        });
      }
    };

    const handleTestSettingsChange = (newSettings: {
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
      duration: number;
    }) => {
      setTestSettings(newSettings);
    };

    const handleSaveAssessment = () => {
      if (!assessmentTitle.trim()) {
        toast({
          title: "Error",
          description: "Please enter an assessment title.",
          variant: "destructive",
        });
        return;
      }

      if (questions.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one question to the assessment.",
          variant: "destructive",
        });
        return;
      }

      // Create the assessment
      const newAssessment: Assessment = {
        id: Date.now().toString(),
        title: assessmentTitle,
        description: assessmentDescription,
        numberOfQuestions: questions.length,
        duration: testSettings.duration * 60, // Convert hours to minutes
        numberOfResponses: 0,
        status: 'Draft',
        createdDate: new Date().toISOString().split('T')[0],
        courseId: selectedCourse,
        batchId: selectedBatch
      };
      
      setAssessments(prev => [...prev, newAssessment]);
      setShowCreateForm(false);
      
      toast({
        title: "Assessment Created",
        description: "New assessment has been created successfully.",
      });
    };

    return (
      <div className="space-y-6">
        {/* Assessment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Assessment Title *
              </label>
              <Input
                type="text"
                placeholder="Enter assessment title..."
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Description
              </label>
              <textarea
                placeholder="Enter assessment description..."
                value={assessmentDescription}
                onChange={(e) => setAssessmentDescription(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Settings */}
        <TestSettings
          settings={testSettings}
          onSettingsChange={handleTestSettingsChange}
        />

        {/* Question Form */}
        {showQuestionForm && (
          <QuestionForm onSave={handleQuestionSave} />
        )}

        {/* Edit Form */}
        {showEditForm && editingQuestion && (
          <QuestionForm
            onSave={handleUpdateQuestion}
            initialData={editingQuestion}
            isEditing={true}
            onCancel={handleCancelEdit}
          />
        )}

        {/* Questions Preview */}
        {questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">Created Questions ({questions.length})</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Success",
                      description: `${questions.length} questions saved successfully!`,
                    });
                    setQuestions([]);
                  }}
                >
                  Clear Questions
                </Button>
                <Button onClick={handleSaveAssessment}>
                  Create Assessment
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {questions.map((question) => (
                <QuestionPreview
                  key={question.id}
                  question={question}
                  onDelete={() => handleQuestionDelete(question.id)}
                  onEdit={() => handleQuestionEdit(question)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <FacultyLayout>
      {showCreateForm ? (
        // Test Questions UI (Admin-style) - Create Mode
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateForm(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Assessments
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Assessment</h1>
              <p className="text-muted-foreground">
                {courses.find(c => c.id === selectedCourse)?.name} - {batches.find(b => b.id === selectedBatch)?.name}
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <AssessmentQuestionSetup />
            </CardContent>
          </Card>
        </div>
      ) : editingAssessment ? (
        // Edit Assessment Mode
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleCancelEdit}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Assessments
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Edit Assessment: {editingAssessment.title}</h1>
          </div>

          <Card>
            <CardContent className="p-6">
              <QuestionManager />
            </CardContent>
          </Card>
        </div>
      ) : viewingAssessment ? (
        // View Assessment Mode - Questions View Only
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToAssessments}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Assessments
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">View Assessment: {viewingAssessment.title}</h1>
              <p className="text-muted-foreground">{viewingAssessment.description}</p>
            </div>
          </div>

          {/* Assessment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="font-medium">{viewingAssessment.numberOfQuestions}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{formatDuration(viewingAssessment.duration)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Responses</p>
                    <p className="font-medium">{viewingAssessment.numberOfResponses}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Questions</h2>
            {mockQuestions[viewingAssessment.id] ? (
              <div className="space-y-4">
                {mockQuestions[viewingAssessment.id].map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-foreground">{question.questionText}</p>
                      
                      {question.type === 'mcq' && question.options && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Options:</p>
                          <div className="space-y-1">
                            {question.options.map((option, optIndex) => (
                              <div 
                                key={optIndex} 
                                className={`p-2 rounded-md border ${
                                  option === question.correctAnswer 
                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                                {option}
                                {option === question.correctAnswer && (
                                  <span className="ml-2 text-green-600 font-medium">(Correct Answer)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {question.type === 'short-answer' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Correct Answer:</p>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-green-800">{question.correctAnswer}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <Badge variant="outline">
                          {question.type === 'mcq' ? 'Multiple Choice' : 
                           question.type === 'short-answer' ? 'Short Answer' : 
                           question.type === 'true-false' ? 'True/False' : 'Coding'}
                        </Badge>
                        <div className="text-sm font-medium text-blue-600">
                          {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No questions found for this assessment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : viewingResponses ? (
        // View Responses Mode
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToAssessments}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Assessments
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Student Responses: {viewingResponses.title}</h1>
              <p className="text-muted-foreground">View and analyze student performance</p>
            </div>
          </div>

          {selectedStudent ? (
            // Individual Student Report View
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedStudent(null)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Responses
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Individual Report: {selectedStudent.name}</h2>
                  <p className="text-muted-foreground">Roll No: {selectedStudent.rollNo}</p>
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
                      <div className="text-2xl font-bold text-blue-600">{selectedStudent.score}/{selectedStudent.totalMarks}</div>
                      <p className="text-sm text-muted-foreground">Final Score</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedStudent.correctAnswers}</div>
                      <p className="text-sm text-muted-foreground">Correct</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{selectedStudent.wrongAnswers}</div>
                      <p className="text-sm text-muted-foreground">Wrong</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{selectedStudent.notAttempted}</div>
                      <p className="text-sm text-muted-foreground">Not Attempted</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Submitted on: {new Date(selectedStudent.submissionDate).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Question-wise Analysis */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Question-wise Analysis</h3>
                {mockQuestions[viewingResponses.id] && (
                  <div className="space-y-4">
                    {mockQuestions[viewingResponses.id].map((question, index) => {
                      const studentAnswer = selectedStudent.answers.find(ans => ans.questionId === question.id);
                      return (
                        <Card key={question.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                              <Badge variant={studentAnswer?.isCorrect ? 'default' : studentAnswer?.answer ? 'destructive' : 'secondary'}>
                                {studentAnswer?.isCorrect ? 'Correct' : studentAnswer?.answer ? 'Wrong' : 'Not Attempted'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-foreground">{question.questionText}</p>
                            
                            {question.type === 'mcq' && question.options && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Options:</p>
                                <div className="space-y-1">
                                  {question.options.map((option, optIndex) => (
                                    <div 
                                      key={optIndex} 
                                      className={`p-2 rounded-md border ${
                                        option === question.correctAnswer 
                                          ? 'bg-green-50 border-green-200 text-green-800' 
                                          : option === studentAnswer?.answer
                                          ? 'bg-red-50 border-red-200 text-red-800'
                                          : 'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                                      {option}
                                      {option === question.correctAnswer && (
                                        <span className="ml-2 text-green-600 font-medium">(Correct Answer)</span>
                                      )}
                                      {option === studentAnswer?.answer && option !== question.correctAnswer && (
                                        <span className="ml-2 text-red-600 font-medium">(Student's Answer)</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {question.type === 'short-answer' && (
                              <div className="space-y-3">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Correct Answer:</p>
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-green-800">{question.correctAnswer}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Student's Answer:</p>
                                  <div className={`p-3 border rounded-md ${
                                    studentAnswer?.isCorrect 
                                      ? 'bg-green-50 border-green-200 text-green-800'
                                      : studentAnswer?.answer
                                      ? 'bg-red-50 border-red-200 text-red-800'
                                      : 'bg-gray-50 border-gray-200 text-gray-600'
                                  }`}>
                                    <p>{studentAnswer?.answer || 'Not answered'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-2 border-t">
                              <Badge variant="outline">
                                {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                              </Badge>
                              <div className="text-sm font-medium">
                                Earned: {studentAnswer?.isCorrect ? question.marks : 0} / {question.marks}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Student Responses Table View
            <div className="space-y-6">
              {/* Search and Bulk Actions */}
              <div className="flex items-center justify-between">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search students..."
                    value={responseSearchQuery}
                    onChange={(e) => setResponseSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Download Report (Bulk)
                </Button>
              </div>

              {/* Responses Table */}
              {mockStudentResponses[viewingResponses.id] ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Student Responses ({mockStudentResponses[viewingResponses.id].length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">Roll No</th>
                            <th className="text-left py-3 px-4 font-medium">Name</th>
                            <th className="text-left py-3 px-4 font-medium">Score</th>
                            <th className="text-left py-3 px-4 font-medium">Submission Date</th>
                            <th className="text-left py-3 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockStudentResponses[viewingResponses.id]
                            .filter(student => 
                              student.name.toLowerCase().includes(responseSearchQuery.toLowerCase()) ||
                              student.rollNo.toLowerCase().includes(responseSearchQuery.toLowerCase())
                            )
                            .map(student => (
                            <tr 
                              key={student.id} 
                              className="border-b hover:bg-gray-50 cursor-pointer"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <td className="py-3 px-4">{student.rollNo}</td>
                              <td className="py-3 px-4">{student.name}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{student.score}/{student.totalMarks}</span>
                                  <Badge 
                                    variant={student.score / student.totalMarks >= 0.8 ? 'default' : 
                                            student.score / student.totalMarks >= 0.6 ? 'secondary' : 'destructive'}
                                  >
                                    {Math.round((student.score / student.totalMarks) * 100)}%
                                  </Badge>
                                </div>
                              </td>
                              <td className="py-3 px-4">{new Date(student.submissionDate).toLocaleDateString()}</td>
                              <td className="py-3 px-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle individual download
                                  }}
                                >
                                  Download Report
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No student responses found for this assessment.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      ) : (
        // Main Assessment Management UI
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">Assessment Management</h1>
            {selectedCourse && selectedBatch && (
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Assessment
              </Button>
            )}
          </div>

          {/* Course and Batch Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Subject & Batch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Subject</label>
                  <Select value={selectedCourse} onValueChange={handleCourseSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Batch</label>
                  <Select 
                    value={selectedBatch} 
                    onValueChange={setSelectedBatch}
                    disabled={!selectedCourse}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Cards */}
          {assessments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-foreground">Assessments</h2>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search assessments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssessments.map(assessment => (
                  <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{assessment.title}</CardTitle>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assessment.description}
                          </p>
                        </div>
                        <Badge 
                          variant={assessment.status === 'Sent' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {assessment.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Assessment Details */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="flex flex-col items-center">
                          <FileText className="h-5 w-5 text-blue-500 mb-1" />
                          <span className="text-sm font-medium">{assessment.numberOfQuestions}</span>
                          <span className="text-xs text-muted-foreground">Questions</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Clock className="h-5 w-5 text-green-500 mb-1" />
                          <span className="text-sm font-medium">{formatDuration(assessment.duration)}</span>
                          <span className="text-xs text-muted-foreground">Duration</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Users className="h-5 w-5 text-purple-500 mb-1" />
                          <span className="text-sm font-medium">{assessment.numberOfResponses}</span>
                          <span className="text-xs text-muted-foreground">Responses</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           className="flex items-center gap-1"
                           onClick={() => handleViewAssessment(assessment)}
                         >
                           <Eye className="h-3 w-3" />
                           View
                         </Button>
                        
                        {assessment.status === 'Draft' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => handleEditAssessment(assessment)}
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteClick(assessment)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => handleSendClick(assessment)}
                            >
                              <Send className="h-3 w-3" />
                              Send
                            </Button>
                          </>
                        ) : (
                           <Button
                             variant="default"
                             size="sm"
                             className="flex items-center gap-1"
                             onClick={() => handleViewResponses(assessment)}
                           >
                             <Users className="h-3 w-3" />
                             View Responses
                           </Button>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(assessment.createdDate).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {filteredAssessments.length === 0 && searchQuery && (
                <div className="text-center text-muted-foreground py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assessments found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {selectedCourse && selectedBatch && assessments.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No assessments found for this Subject and batch.</p>
                <p className="text-sm text-muted-foreground mt-2">Click "Create Assessment" to add your first assessment.</p>
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation Dialog */}
          {assessmentToDelete && (
            <AlertDialog open={!!assessmentToDelete} onOpenChange={(open) => !open && setAssessmentToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your assessment.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Send Confirmation Dialog */}
          {assessmentToSend && (
            <AlertDialog open={!!assessmentToSend} onOpenChange={(open) => !open && setAssessmentToSend(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently send your assessment to students.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleCancelSend}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmSend}>Send</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </FacultyLayout>
  );
};

export default Assessment; 
