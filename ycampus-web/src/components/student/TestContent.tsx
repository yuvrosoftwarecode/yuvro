import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, BookOpen, Play, CheckCircle, AlertCircle, Code, Database, Filter, BarChart3 } from 'lucide-react';
import TestInterface from '@/components/student/TestInterface';
import TestInstructions from '@/components/student/TestInstructions';
import PermissionDialog from '@/components/student/PermissionDialog';
import TestPreInstructions from '@/components/student/TestPreInstructions';
import TestResultsScreen from '@/components/student/TestResultsScreen';

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  topics: Topic[];
}

interface Topic {
  id: string;
  name: string;
  duration: number;
  questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: number;
  questions: number;
  color: string;
  description: string;
}

// Mock data
const mockCourses: Course[] = [
  {
    id: '1',
    name: 'Mathematics',
    description: 'Advanced mathematical concepts and problem solving',
    color: 'bg-blue-500',
    topics: [
      { id: '1', name: 'Calculus Fundamentals', duration: 60, questions: 15, difficulty: 'Medium' },
      { id: '2', name: 'Linear Algebra', duration: 45, questions: 12, difficulty: 'Hard' },
      { id: '3', name: 'Statistics', duration: 30, questions: 10, difficulty: 'Easy' }
    ]
  },
  {
    id: '2',
    name: 'Computer Science',
    description: 'Programming and algorithmic thinking',
    color: 'bg-green-500',
    topics: [
      { id: '4', name: 'Data Structures', duration: 90, questions: 20, difficulty: 'Hard' },
      { id: '5', name: 'Algorithms', duration: 75, questions: 18, difficulty: 'Medium' },
      { id: '6', name: 'Object-Oriented Programming', duration: 60, questions: 15, difficulty: 'Medium' }
    ]
  },
  {
    id: '3',
    name: 'Physics',
    description: 'Classical and modern physics principles',
    color: 'bg-purple-500',
    topics: [
      { id: '7', name: 'Mechanics', duration: 50, questions: 12, difficulty: 'Medium' },
      { id: '8', name: 'Thermodynamics', duration: 40, questions: 10, difficulty: 'Easy' },
      { id: '9', name: 'Quantum Physics', duration: 80, questions: 16, difficulty: 'Hard' }
    ]
  }
];

// Subject problems data
const subjectProblems: Record<string, Problem[]> = {
  Java: [
    {
      id: 'j1',
      title: 'Array Manipulation',
      difficulty: 'Easy',
      duration: 30,
      questions: 5,
      color: 'from-orange-400 to-red-500',
      description: 'Basic array operations and manipulations'
    },
    {
      id: 'j2', 
      title: 'String Processing',
      difficulty: 'Medium',
      duration: 45,
      questions: 8,
      color: 'from-blue-400 to-purple-500',
      description: 'String algorithms and pattern matching'
    },
    {
      id: 'j3',
      title: 'Object Oriented Design',
      difficulty: 'Hard',
      duration: 60,
      questions: 10,
      color: 'from-green-400 to-blue-500',
      description: 'Advanced OOP concepts and design patterns'
    }
  ],
  Python: [
    {
      id: 'p1',
      title: 'List Comprehensions',
      difficulty: 'Easy',
      duration: 25,
      questions: 6,
      color: 'from-yellow-400 to-orange-500',
      description: 'Python list operations and comprehensions'
    },
    {
      id: 'p2',
      title: 'Data Analysis',
      difficulty: 'Medium', 
      duration: 50,
      questions: 12,
      color: 'from-green-400 to-cyan-500',
      description: 'NumPy, Pandas and data manipulation'
    },
    {
      id: 'p3',
      title: 'Web Scraping',
      difficulty: 'Hard',
      duration: 75,
      questions: 15,
      color: 'from-purple-400 to-pink-500',
      description: 'Advanced web scraping techniques'
    }
  ],
  'Data structures': [
    {
      id: 'd1',
      title: 'Linked Lists',
      difficulty: 'Easy',
      duration: 40,
      questions: 8,
      color: 'from-indigo-400 to-blue-500',
      description: 'Singly and doubly linked list operations'
    },
    {
      id: 'd2',
      title: 'Trees and Graphs',
      difficulty: 'Medium',
      duration: 60,
      questions: 12,
      color: 'from-green-400 to-teal-500',
      description: 'Binary trees, BST, and graph algorithms'
    },
    {
      id: 'd3',
      title: 'Dynamic Programming',
      difficulty: 'Hard',
      duration: 90,
      questions: 18,
      color: 'from-red-400 to-purple-500',
      description: 'Advanced DP problems and optimization'
    }
  ],
  Javascript: [
    {
      id: 'js1',
      title: 'DOM Manipulation',
      difficulty: 'Easy',
      duration: 35,
      questions: 7,
      color: 'from-yellow-400 to-green-500',
      description: 'JavaScript DOM operations and events'
    },
    {
      id: 'js2',
      title: 'Promises & Async',
      difficulty: 'Medium',
      duration: 55,
      questions: 10,
      color: 'from-blue-400 to-indigo-500',
      description: 'Asynchronous JavaScript and API calls'
    },
    {
      id: 'js3',
      title: 'Advanced Closures',
      difficulty: 'Hard',
      duration: 70,
      questions: 14,
      color: 'from-purple-400 to-red-500',
      description: 'Complex closure patterns and scope'
    }
  ]
};

const TestContent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [activeSubject, setActiveSubject] = useState('Java');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showPreInstructions, setShowPreInstructions] = useState(false);
  const [pendingTopic, setPendingTopic] = useState<Topic | null>(null);
  const [showPracticeView, setShowPracticeView] = useState(true);
  const [completedTests, setCompletedTests] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [selectedTestForResults, setSelectedTestForResults] = useState<Problem | null>(null);

  // Initialize state from URL parameters on mount
  useEffect(() => {
    const subject = searchParams.get('subject') || 'Java';
    const view = searchParams.get('view');
    const problemId = searchParams.get('problemId');
    const difficulty = (searchParams.get('difficulty') as 'All' | 'Easy' | 'Medium' | 'Hard') || 'All';

    setActiveSubject(subject);
    setDifficultyFilter(difficulty);

    if (view === 'results' && problemId) {
      const problem = subjectProblems[subject]?.find(p => p.id === problemId);
      if (problem) {
        setSelectedTestForResults(problem);
        setShowResults(true);
        setCompletedTests(prev => new Set([...prev, problemId]));
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

  const subjectItems = [
    { name: 'Java', icon: Code },
    { name: 'Python', icon: Code },
    { name: 'Data structures', icon: Database },
    { name: 'Javascript', icon: Code },
  ];

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
  };

  const handleTopicSelect = (topic: Topic) => {
    setPendingTopic(topic);
    setShowPermissionDialog(true);
  };

  const handlePermissionGranted = () => {
    if (pendingTopic) {
      setSelectedTopic(pendingTopic);
      setShowInstructions(true);
      setShowPermissionDialog(false);
      setPendingTopic(null);
    }
  };

  const handlePermissionCancelled = () => {
    setShowPermissionDialog(false);
    setPendingTopic(null);
  };

  const handleStartInstructions = () => {
    setShowInstructions(false);
    setShowPreInstructions(true);
  };

  const handleStartTest = () => {
    setShowPreInstructions(false);
    setShowTest(true);
  };

  const handleTestComplete = () => {
    if (selectedTopic) {
      setCompletedTests(prev => new Set([...prev, selectedTopic.id]));
    }
    setShowTest(false);
    setShowPreInstructions(false);
    setSelectedTopic(null);
    setSelectedCourse(null);
  };

  const handleViewResults = (problem: Problem) => {
    setSelectedTestForResults(problem);
    setShowResults(true);
    updateUrlParams({ view: 'results', problemId: problem.id });
  };

  const handleBackToTests = () => {
    setShowResults(false);
    setSelectedTestForResults(null);
    updateUrlParams({ view: null, problemId: null });
  };

  const handleTryAgain = () => {
    if (selectedTestForResults) {
      setCompletedTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedTestForResults.id);
        return newSet;
      });
      setShowResults(false);
      setSelectedTestForResults(null);
      updateUrlParams({ view: null, problemId: null });
    }
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSelectedTopic(null);
    setShowInstructions(false);
    setShowPreInstructions(false);
    setShowTest(false);
  };

  if (showResults && selectedTestForResults) {
    return (
      <TestResultsScreen
        testName={selectedTestForResults.title}
        subject={activeSubject}
        difficulty={selectedTestForResults.difficulty}
        totalQuestions={selectedTestForResults.questions}
        timeTaken={selectedTestForResults.duration * 60}
        onTryAgain={handleTryAgain}
        onBackToTests={handleBackToTests}
      />
    );
  }

  if (showTest && selectedTopic) {
    return (
      <TestInterface
        topic={selectedTopic}
        course={selectedCourse}
        onComplete={handleTestComplete}
        onBack={handleBackToCourses}
      />
    );
  }

  if (showPreInstructions && selectedTopic) {
    return (
      <TestPreInstructions
        topic={selectedTopic}
        course={selectedCourse}
        onStart={handleStartTest}
        onBack={() => setShowPreInstructions(false)}
      />
    );
  }

  if (showInstructions && selectedTopic) {
    return (
      <TestInstructions
        topic={selectedTopic}
        course={selectedCourse}
        onStart={handleStartInstructions}
        onBack={() => setShowInstructions(false)}
      />
    );
  }

  return (
    <div>
      <PermissionDialog
        open={showPermissionDialog}
        onConfirm={handlePermissionGranted}
        onCancel={handlePermissionCancelled}
      />
      
      {/* Subject Tabs */}
      <div className="border-b bg-muted/10">
        <div className="flex items-center gap-1 px-6 py-3">
          {subjectItems.map((subject) => (
            <Button
              key={subject.name}
              variant={activeSubject === subject.name ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveSubject(subject.name);
                updateUrlParams({ subject: subject.name, view: null, problemId: null });
              }}
              className="flex items-center gap-2"
            >
              <subject.icon className="h-4 w-4" />
              {subject.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{activeSubject} Practice Problems</h1>
          <p className="text-muted-foreground">Solve coding problems and improve your {activeSubject} skills</p>
        </div>

        {/* Filter and View Results */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={difficultyFilter} onValueChange={(value: 'All' | 'Easy' | 'Medium' | 'Hard') => {
              setDifficultyFilter(value);
              updateUrlParams({ difficulty: value });
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Difficulties</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">View Results</h3>
                  <p className="text-sm opacity-90">Check your performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectProblems[activeSubject]?.filter(problem => 
            difficultyFilter === 'All' || problem.difficulty === difficultyFilter
          ).map((problem) => (
            <Card 
              key={problem.id} 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 group overflow-hidden"
            >
              <div className={`h-2 bg-gradient-to-r ${problem.color}`} />
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="group-hover:text-primary transition-colors text-lg">
                    {problem.title}
                  </CardTitle>
                  <Badge variant={
                    problem.difficulty === 'Easy' ? 'secondary' : 
                    problem.difficulty === 'Medium' ? 'default' : 'destructive'
                  }>
                    {problem.difficulty}
                  </Badge>
                </div>
                <CardDescription>{problem.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {problem.duration} min
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {problem.questions} questions
                    </div>
                  </div>

                  <Button 
                    className={`w-full bg-gradient-to-r ${problem.color} hover:opacity-90 text-white border-0`}
                    onClick={() => {
                      const topicData: Topic = {
                        id: problem.id,
                        name: problem.title,
                        duration: problem.duration,
                        questions: problem.questions,
                        difficulty: problem.difficulty
                      };
                      
                      if (completedTests.has(problem.id)) {
                        handleViewResults(problem);
                      } else {
                        handleTopicSelect(topicData);
                      }
                    }}
                  >
                    {completedTests.has(problem.id) ? (
                      <>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Results
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Challenge
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestContent;
