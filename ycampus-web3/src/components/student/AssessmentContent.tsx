import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, FileText, Users, Calendar, Play, BarChart3, CheckCircle, Timer } from 'lucide-react';
import AssessmentInstructions from './AssessmentInstructions';
import AssessmentInterface from './AssessmentInterface';
import AssessmentResults from './AssessmentResults';
import AssessmentThankYou from './AssessmentThankYou';

interface Assessment {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
  status: 'pending' | 'completed';
  dueDate: string;
  createdDate: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  marks: number;
  completedDate?: string;
  score?: number;
}

interface Course {
  id: string;
  name: string;
}

const mockCourses: Course[] = [
  { id: '1', name: 'Computer Science' },
  { id: '2', name: 'Mathematics' },
  { id: '3', name: 'Physics' },
  { id: '4', name: 'Chemistry' },
  { id: '5', name: 'Biology' }
];

const mockAssessments: Assessment[] = [
  {
    id: '1',
    title: 'Data Structures & Algorithms',
    course: 'Computer Science',
    duration: 90,
    totalQuestions: 30,
    status: 'pending',
    dueDate: '2024-01-20',
    createdDate: '2024-01-10',
    difficulty: 'Hard',
    description: 'Comprehensive assessment covering arrays, linked lists, trees, graphs, and algorithm analysis.',
    marks: 100
  },
  {
    id: '2',
    title: 'Object-Oriented Programming',
    course: 'Computer Science',
    duration: 60,
    totalQuestions: 20,
    status: 'completed',
    dueDate: '2024-01-15',
    createdDate: '2024-01-05',
    difficulty: 'Medium',
    description: 'Assessment on OOP concepts, inheritance, polymorphism, and design patterns.',
    marks: 80,
    completedDate: '2024-01-14',
    score: 72
  },
  {
    id: '3',
    title: 'Database Management Systems',
    course: 'Computer Science',
    duration: 75,
    totalQuestions: 30,
    status: 'pending',
    dueDate: '2024-01-25',
    createdDate: '2024-01-12',
    difficulty: 'Medium',
    description: 'SQL queries, normalization, indexing, and database design principles.',
    marks: 90
  },
  {
    id: '4',
    title: 'Calculus I - Final Assessment',
    course: 'Mathematics',
    duration: 120,
    totalQuestions: 15,
    status: 'completed',
    dueDate: '2024-01-18',
    createdDate: '2024-01-08',
    difficulty: 'Hard',
    description: 'Comprehensive assessment covering limits, derivatives, and integrals.',
    marks: 120,
    completedDate: '2024-01-17',
    score: 98
  },
  {
    id: '5',
    title: 'Linear Algebra Quiz',
    course: 'Mathematics',
    duration: 45,
    totalQuestions: 10,
    status: 'pending',
    dueDate: '2024-01-22',
    createdDate: '2024-01-13',
    difficulty: 'Easy',
    description: 'Vectors, matrices, and linear transformations.',
    marks: 50
  }
];

interface AssessmentContentProps {
  // Add any props if needed
}

const AssessmentContent: React.FC<AssessmentContentProps> = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'list' | 'instructions' | 'assessment' | 'results' | 'thankyou'>('list');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [assessmentStats, setAssessmentStats] = useState<{
    answeredCount: number;
    totalQuestions: number;
    timeSpent: number;
  } | null>(null);

  // Initialize state from URL parameters on mount
  useEffect(() => {
    const view = searchParams.get('view') as 'list' | 'instructions' | 'assessment' | 'results' | 'thankyou' || 'list';
    const assessmentId = searchParams.get('assessmentId');
    const course = searchParams.get('course') || 'all';
    const status = searchParams.get('status') || 'all';

    setCurrentView(view);
    setSelectedCourse(course);
    setStatusFilter(status);

    if (assessmentId) {
      const assessment = mockAssessments.find(a => a.id === assessmentId);
      if (assessment) {
        setSelectedAssessment(assessment);
      }
    }

    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, [searchParams]);

  const updateUrlParams = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  const filteredAssessments = mockAssessments.filter(assessment => {
    if (selectedCourse !== 'all' && assessment.course !== selectedCourse) return false;
    if (statusFilter !== 'all' && assessment.status !== statusFilter) return false;
    return true;
  });

  const handleStartAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setCurrentView('instructions');
    updateUrlParams({ view: 'instructions', assessmentId: assessment.id });
  };

  const handleViewResults = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setCurrentView('results');
    updateUrlParams({ view: 'results', assessmentId: assessment.id });
  };

  const handleBeginAssessment = () => {
    setCurrentView('assessment');
    updateUrlParams({ view: 'assessment' });
  };

  const handleAssessmentComplete = (stats?: { answeredCount: number; totalQuestions: number; timeSpent: number }) => {
    if (stats) {
      setAssessmentStats(stats);
    }
    setCurrentView('thankyou');
    updateUrlParams({ view: 'thankyou' });
  };

  const handleThankYouComplete = () => {
    // Update assessment status to completed
    if (selectedAssessment) {
      selectedAssessment.status = 'completed';
      selectedAssessment.completedDate = new Date().toISOString().split('T')[0];
      selectedAssessment.score = Math.floor(Math.random() * 20) + 70; // Mock score
    }
    handleBackToList();
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedAssessment(null);
    updateUrlParams({ view: 'list', assessmentId: null });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (currentView === 'instructions' && selectedAssessment) {
    return (
      <AssessmentInstructions
        assessment={selectedAssessment}
        onStart={handleBeginAssessment}
        onBack={handleBackToList}
      />
    );
  }

  if (currentView === 'assessment' && selectedAssessment) {
    return (
      <AssessmentInterface
        assessment={selectedAssessment}
        onComplete={handleAssessmentComplete}
        onBack={handleBackToList}
      />
    );
  }

  if (currentView === 'thankyou' && selectedAssessment && assessmentStats) {
    return (
      <AssessmentThankYou
        assessment={selectedAssessment}
        answeredCount={assessmentStats.answeredCount}
        totalQuestions={assessmentStats.totalQuestions}
        timeSpent={assessmentStats.timeSpent}
        onBackToAssessment={handleThankYouComplete}
      />
    );
  }

  if (currentView === 'results' && selectedAssessment) {
    return (
      <AssessmentResults
        assessment={selectedAssessment}
        onBackToList={handleBackToList}
        onTryAgain={() => handleStartAssessment(selectedAssessment)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Assessments</h2>
        <p className="text-muted-foreground">Complete your assigned assessments and track your progress</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Subjects
              </label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {mockCourses.map((course) => (
                    <SelectItem key={course.id} value={course.name}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Results */}
      {selectedCourse && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Available Assessments {statusFilter && `(${statusFilter})`}
          </h3>
          
          {filteredAssessments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No assessments found</h3>
                  <p className="text-muted-foreground">
                    No assessments match your current filters.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessments.map((assessment, index) => (
                <Card 
                  key={assessment.id} 
                  className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in border-border/50"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{assessment.title}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(assessment.status)}
                      >
                        {assessment.status === 'completed' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
                        ) : (
                          <><Timer className="h-3 w-3 mr-1" /> Pending</>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {assessment.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{assessment.duration} mins</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>{assessment.totalQuestions} questions</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span>{assessment.marks} marks</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>Due {new Date(assessment.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={getDifficultyColor(assessment.difficulty)}
                      >
                        {assessment.difficulty}
                      </Badge>
                      
                      {assessment.status === 'completed' && assessment.score && (
                        <Badge variant="secondary">
                          Score: {assessment.score}/{assessment.marks}
                        </Badge>
                      )}
                    </div>

                    <div className="pt-2">
                      {assessment.status === 'pending' ? (
                        <Button 
                          onClick={() => handleStartAssessment(assessment)}
                          className="w-full bg-[image:var(--gradient-saffron)] text-white hover:opacity-90 hover:scale-105 transition-all duration-200 border-0 shadow-md hover:shadow-lg"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Assessment
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          onClick={() => handleViewResults(assessment)}
                          className="w-full hover:scale-105 transition-all duration-200"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedCourse && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select a Course</h3>
              <p className="text-muted-foreground">
                Please select a course from the dropdown above to view available assessments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssessmentContent;