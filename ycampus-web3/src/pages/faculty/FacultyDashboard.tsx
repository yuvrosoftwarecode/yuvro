import React, { useState } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, ClipboardCheck, Users, BarChart3, CheckSquare, Plus, FileText, Calendar, MessageSquare, CheckCircle, Clock, Target, TrendingUp, ArrowRight, Play } from 'lucide-react';

const FacultyDashboard = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');

  const courses = [
    { id: '1', name: 'Mathematics 101' },
    { id: '2', name: 'Physics Lab' },
    { id: '3', name: 'Computer Science' },
    { id: '4', name: 'Chemistry Basics' },
  ];

  const batches = selectedCourse ? [
    { id: '1', name: 'Batch A (Morning)' },
    { id: '2', name: 'Batch B (Afternoon)' },
    { id: '3', name: 'Batch C (Evening)' },
  ] : [];

  // Enhanced topics data with stepper-friendly structure
  const topicsData = {
    '1': { // Mathematics 101
      overallProgress: 68,
      currentStep: 7, // Current active step
      totalSteps: 12,
      modules: [
        {
          id: 'm1',
          name: 'Algebra Fundamentals',
          progress: 85,
          currentStep: 3,
          totalSteps: 4,
          topics: [
            { id: 't1', name: 'Introduction to Algebra', status: 'completed', step: 1 },
            { id: 't2', name: 'Linear Equations', status: 'completed', step: 2 },
            { id: 't3', name: 'Quadratic Functions', status: 'in-progress', step: 3 },
            { id: 't4', name: 'Polynomials', status: 'pending', step: 4 },
          ]
        },
        {
          id: 'm2',
          name: 'Calculus Basics',
          progress: 45,
          currentStep: 2,
          totalSteps: 4,
          topics: [
            { id: 't5', name: 'Limits and Continuity', status: 'completed', step: 5 },
            { id: 't6', name: 'Derivatives', status: 'in-progress', step: 6 },
            { id: 't7', name: 'Integration', status: 'pending', step: 7 },
            { id: 't8', name: 'Applications', status: 'pending', step: 8 },
          ]
        },
        {
          id: 'm3',
          name: 'Statistics',
          progress: 0,
          currentStep: 0,
          totalSteps: 3,
          topics: [
            { id: 't9', name: 'Descriptive Statistics', status: 'pending', step: 9 },
            { id: 't10', name: 'Probability', status: 'pending', step: 10 },
            { id: 't11', name: 'Hypothesis Testing', status: 'pending', step: 11 },
          ]
        }
      ]
    },
    '2': { // Physics Lab
      overallProgress: 92,
      currentStep: 4,
      totalSteps: 5,
      modules: [
        {
          id: 'm4',
          name: 'Classical Mechanics',
          progress: 100,
          currentStep: 3,
          totalSteps: 3,
          topics: [
            { id: 't12', name: 'Newton\'s Laws', status: 'completed', step: 1 },
            { id: 't13', name: 'Motion in 2D', status: 'completed', step: 2 },
            { id: 't14', name: 'Energy and Work', status: 'completed', step: 3 },
          ]
        },
        {
          id: 'm5',
          name: 'Thermodynamics',
          progress: 75,
          currentStep: 2,
          totalSteps: 3,
          topics: [
            { id: 't15', name: 'Heat and Temperature', status: 'completed', step: 4 },
            { id: 't16', name: 'First Law', status: 'in-progress', step: 5 },
            { id: 't17', name: 'Second Law', status: 'pending', step: 6 },
          ]
        }
      ]
    }
  };

  const stats = [
    { title: 'My Courses', value: '8', icon: BookOpen, change: 'Active' },
    { title: 'Students', value: selectedBatch ? '45' : '156', icon: Users, change: 'Enrolled' },
    { title: 'Assessments', value: selectedBatch ? '3' : '12', icon: ClipboardCheck, change: 'Pending' },
    { title: 'Attendance', value: selectedBatch ? '92%' : '87%', icon: CheckSquare, change: 'Average' },
  ];

  const quickActions = [
    { title: 'Create Task', icon: Plus, description: 'Assign new task to students' },
    { title: 'Take Attendance', icon: CheckSquare, description: 'Mark today\'s attendance' },
    { title: 'Schedule Class', icon: Calendar, description: 'Schedule upcoming class' },
    { title: 'Send Announcement', icon: MessageSquare, description: 'Notify students' },
  ];

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'completed': return 'text-primary';
      case 'in-progress': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStepIcon = (status: string, isCurrent: boolean = false) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4" />;
    if (status === 'in-progress' || isCurrent) return <Play className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getStepStyle = (status: string, isCurrent: boolean = false) => {
    if (status === 'completed') {
      return 'bg-primary border-primary text-primary-foreground';
    }
    if (status === 'in-progress' || isCurrent) {
      return 'bg-blue-500 border-blue-500 text-white animate-pulse';
    }
    return 'bg-muted border-muted-foreground text-muted-foreground';
  };

  const selectedCourseData = selectedCourse ? topicsData[selectedCourse as keyof typeof topicsData] : null;

  // Flatten all topics for the main stepper
  const allTopics = selectedCourseData ? selectedCourseData.modules.flatMap(module => module.topics) : [];

  const renderDashboardContent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back, Professor!</h2>
        <p className="text-muted-foreground">Here's an overview of your classes and activities.</p>
      </div>

      {/* Course and Batch Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Select Course</label>
          <Select value={selectedCourse} onValueChange={(value) => {
            setSelectedCourse(value);
            setSelectedBatch(''); // Reset batch when course changes
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Select Batch</label>
          <Select 
            value={selectedBatch} 
            onValueChange={setSelectedBatch}
            disabled={!selectedCourse}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <Badge variant="secondary" className="mt-2">
                {stat.change}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start h-auto p-3"
                >
                  <action.icon className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Topics Progress Stepper */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Topics Progress Stepper</CardTitle>
            <CardDescription>
              {selectedCourse && selectedBatch 
                    ? `Step ${selectedCourseData?.currentStep} of ${selectedCourseData?.totalSteps} - ${courses.find(c => c.id === selectedCourse)?.name}`
                : 'Select course and batch to view progress'
              }
            </CardDescription>
              </div>
              {selectedCourseData && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {selectedCourseData.overallProgress}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Progress</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedCourseData ? (
              <Tabs defaultValue="stepper" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="stepper">Stepper View</TabsTrigger>
                  <TabsTrigger value="modules">Modules</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stepper" className="space-y-6">
                  {/* Main Stepper */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Course Progress Stepper</h3>
                      <Badge variant="outline">
                        Step {selectedCourseData.currentStep} of {selectedCourseData.totalSteps}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      {allTopics.map((topic, index) => (
                        <div key={topic.id} className="flex items-center space-x-4">
                          {/* Step Circle */}
                  <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                              getStepStyle(topic.status, topic.step === selectedCourseData.currentStep)
                            }`}>
                              {getStepIcon(topic.status, topic.step === selectedCourseData.currentStep)}
                            </div>
                          </div>
                          
                          {/* Step Content */}
                          <div className="flex-grow">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Step {topic.step}
                                </span>
                                <span className={`font-medium ${getStepStatus(topic.status)}`}>
                                  {topic.name}
                                </span>
                                {topic.step === selectedCourseData.currentStep && (
                                  <Badge variant="secondary" className="text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <Badge 
                                variant={topic.status === 'completed' ? 'default' : topic.status === 'in-progress' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {topic.status}
                              </Badge>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  topic.status === 'completed' ? 'bg-primary' : 
                                  topic.status === 'in-progress' ? 'bg-blue-500' : 'bg-muted'
                                }`}
                                style={{ 
                                  width: topic.status === 'completed' ? '100%' : 
                                         topic.status === 'in-progress' ? '60%' : '0%' 
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Connector Line */}
                          {index < allTopics.length - 1 && (
                            <div className="absolute left-5 top-10 w-0.5 h-8 bg-muted-foreground/20" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="modules" className="space-y-4">
                  {selectedCourseData.modules.map((module) => (
                    <div key={module.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{module.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Step {module.currentStep} of {module.totalSteps}
                          </Badge>
                          <span className="text-sm font-medium">{module.progress}%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {module.topics.map((topic, index) => (
                          <div key={topic.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                                getStepStyle(topic.status, topic.step === selectedCourseData.currentStep)
                    }`}>
                                {getStepIcon(topic.status, topic.step === selectedCourseData.currentStep)}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-muted-foreground">Step {topic.step}</span>
                                  <p className={`text-sm font-medium ${getStepStatus(topic.status)}`}>
                        {topic.name}
                      </p>
                                </div>
                                <Badge 
                                  variant={topic.status === 'completed' ? 'default' : topic.status === 'in-progress' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {topic.status}
                                </Badge>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    topic.status === 'completed' ? 'bg-primary' : 
                                    topic.status === 'in-progress' ? 'bg-blue-500' : 'bg-muted'
                                  }`}
                                  style={{ 
                                    width: topic.status === 'completed' ? '100%' : 
                                           topic.status === 'in-progress' ? '60%' : '0%' 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="overview" className="space-y-4">
                  {/* Overall Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Course Progress</span>
                      <span className="text-sm text-muted-foreground">{selectedCourseData.overallProgress}%</span>
                    </div>
                    <Progress 
                      value={selectedCourseData.overallProgress} 
                      className="h-3"
                    />
                  </div>

                  {/* Module Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCourseData.modules.map((module) => (
                      <div key={module.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">{module.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {module.progress}%
                          </Badge>
                        </div>
                        <Progress value={module.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{module.topics.filter(t => t.status === 'completed').length} completed</span>
                          <span>{module.topics.length} total</span>
                  </div>
                </div>
              ))}
            </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a course to view topic progress stepper</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your courses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <p className="text-sm">New assignment submitted by Student A</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <p className="text-sm">Assessment results published</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <p className="text-sm">Attendance marked for Math 101</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <FacultyLayout>
      {renderDashboardContent()}
    </FacultyLayout>
  );
};

export default FacultyDashboard;