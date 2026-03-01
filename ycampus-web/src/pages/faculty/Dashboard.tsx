// src/pages/faculty/Dashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import {
  BookOpen, Users, ClipboardCheck, CheckSquare, Plus, Calendar, MessageSquare, CheckCircle, Clock, Play, Loader2
} from 'lucide-react';
import { getFacultyAssignments, SectionSubjectFaculty } from '../../services/subjectService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Mock topics data per subject — replace with real API data when available
const topicsData: Record<string, {
  overallProgress: number; currentStep: number; totalSteps: number; subjectName: string;
  modules: { id: string; name: string; progress: number; currentStep: number; totalSteps: number; topics: { id: string; name: string; status: string; step: number }[] }[];
}> = {
  default: {
    overallProgress: 92, currentStep: 4, totalSteps: 5, subjectName: 'Physics Lab',
    modules: [
      {
        id: 'm1', name: 'Classical Mechanics', progress: 100, currentStep: 3, totalSteps: 3,
        topics: [
          { id: 't1', name: "Newton's Laws", status: 'completed', step: 1 },
          { id: 't2', name: 'Motion in 2D', status: 'completed', step: 2 },
          { id: 't3', name: 'Energy and Work', status: 'completed', step: 3 },
        ]
      },
      {
        id: 'm2', name: 'Thermodynamics', progress: 75, currentStep: 2, totalSteps: 3,
        topics: [
          { id: 't4', name: 'Heat and Temperature', status: 'completed', step: 4 },
          { id: 't5', name: 'First Law', status: 'in-progress', step: 5 },
          { id: 't6', name: 'Second Law', status: 'pending', step: 6 },
        ]
      },
    ]
  }
};

const getStepCircleClass = (status: string, isCurrent: boolean) => {
  if (status === 'completed') return 'bg-primary text-primary-foreground border-primary';
  if (status === 'in-progress' || isCurrent) return 'bg-blue-500 text-white border-blue-500';
  return 'bg-muted border-muted-foreground/30 text-muted-foreground';
};

const getStepIcon = (status: string) => {
  if (status === 'completed') return <CheckCircle className="h-4 w-4" />;
  if (status === 'in-progress') return <Play className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  useEffect(() => { fetchAssignments(); }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await getFacultyAssignments();
      setAssignments(data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const uniqueDepartments = useMemo(() => {
    const acc: { id: string; name: string }[] = [];
    assignments.forEach(curr => {
      const deptId = curr.semester_subject_details?.department_id;
      const deptName = curr.semester_subject_details?.department_name;
      if (deptId && deptName && !acc.find(d => d.id === String(deptId)))
        acc.push({ id: String(deptId), name: deptName });
    });
    return acc;
  }, [assignments]);

  const uniqueSubjects = useMemo(() => {
    if (!selectedDepartment) return [];
    const acc: { id: string; name: string }[] = [];
    assignments
      .filter(a => String(a.semester_subject_details?.department_id) === selectedDepartment)
      .forEach(curr => {
        const subjectId = String(curr.semester_subject_details?.subject_details?.id);
        if (!acc.find(s => s.id === subjectId))
          acc.push({ id: subjectId, name: curr.semester_subject_details?.subject_details?.subject_name || 'Unknown' });
      });
    return acc;
  }, [assignments, selectedDepartment]);

  const availableSections = useMemo(() => {
    if (!selectedDepartment || !selectedSubject) return [];
    return assignments.filter(a =>
      String(a.semester_subject_details?.department_id) === selectedDepartment &&
      String(a.semester_subject_details?.subject_details?.id) === selectedSubject
    );
  }, [assignments, selectedDepartment, selectedSubject]);

  const courseData = selectedSubject ? topicsData.default : null;
  const allTopics = courseData ? courseData.modules.flatMap(m => m.topics) : [];
  const selectedSubjectName = uniqueSubjects.find(s => s.id === selectedSubject)?.name || courseData?.subjectName || '';

  const stats = [
    { title: 'My Courses', value: '8', icon: BookOpen, change: 'Active' },
    { title: 'Students', value: selectedSubject ? '45' : '156', icon: Users, change: 'Enrolled' },
    { title: 'Assessments', value: selectedSubject ? '3' : '12', icon: ClipboardCheck, change: 'Pending' },
    { title: 'Attendance', value: selectedSubject ? '92%' : '87%', icon: CheckSquare, change: 'Average' },
  ];

  const quickActions = [
    { title: 'Create Task', icon: Plus, description: 'Assign new task to students', path: '/faculty/task' },
    { title: 'Take Attendance', icon: CheckCircle, description: "Mark today's attendance", path: '/faculty/attendance' },
    { title: 'Schedule Class', icon: Calendar, description: 'Schedule upcoming class', path: '/faculty/schedule' },
    { title: 'Send Announcement', icon: MessageSquare, description: 'Notify students', path: '/faculty/announcements' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <RoleSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <RoleSidebar />
      <div className="flex-1">
        <RoleHeader
          title={`Welcome back, ${user?.first_name || 'Professor'}!`}
          subtitle="Here's an overview of your classes and activities."
        />

        <div className="p-6 space-y-6">

          {/* Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Department</label>
              <Select value={selectedDepartment} onValueChange={v => { setSelectedDepartment(v); setSelectedSubject(''); }}>
                <SelectTrigger className="border-0 shadow-sm bg-white">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDepartments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedDepartment}>
                <SelectTrigger className="border-0 shadow-sm bg-white">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Section</label>
              <Select disabled={!selectedSubject}>
                <SelectTrigger className="border-0 shadow-sm bg-white">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map(a => <SelectItem key={a.section} value={String(a.section)}>{a.section_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground text-gray-500">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <Badge variant="secondary" className="mt-2 text-gray-500">{stat.change}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions + Stepper */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Quick Actions */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription className="text-gray-500">Common tasks and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      className="w-full justify-start h-auto p-3"
                      onClick={() => navigate(action.path)}
                    >
                      <action.icon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-500" />
                      <div className="text-left">
                        <p className="font-medium text-gray-800">{action.title}</p>
                        <p className="text-xs text-gray-500">{action.description}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Topics Progress Stepper */}
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Topics Progress Stepper</CardTitle>
                    <CardDescription className="text-gray-500">
                      {courseData
                        ? `Step ${courseData.currentStep} of ${courseData.totalSteps} · ${selectedSubjectName}`
                        : 'Select course and batch to view progress'}
                    </CardDescription>
                  </div>
                  {courseData && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">{courseData.overallProgress}%</div>
                      <div className="text-sm text-gray-500">Overall Progress</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {courseData ? (
                  <Tabs defaultValue="stepper" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="stepper">Stepper View</TabsTrigger>
                      <TabsTrigger value="modules">Modules</TabsTrigger>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                    </TabsList>

                    {/* Stepper View */}
                    <TabsContent value="stepper" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Course Progress Stepper</h3>
                        <Badge variant="outline">Step {courseData.currentStep} of {courseData.totalSteps}</Badge>
                      </div>
                      <div className="space-y-3">
                        {allTopics.map((topic, index) => (
                          <div key={topic.id} className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getStepCircleClass(topic.status, topic.step === courseData.currentStep)}`}>
                                {getStepIcon(topic.status)}
                              </div>
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-muted-foreground">Step {topic.step}</span>
                                  <span className="font-medium">{topic.name}</span>
                                  {topic.step === courseData.currentStep && (
                                    <Badge variant="secondary" className="text-xs">Current</Badge>
                                  )}
                                </div>
                                <Badge
                                  variant={topic.status === 'completed' ? 'default' : topic.status === 'in-progress' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {topic.status}
                                </Badge>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${topic.status === 'completed' ? 'bg-primary' : topic.status === 'in-progress' ? 'bg-blue-500' : 'bg-muted'}`}
                                  style={{ width: topic.status === 'completed' ? '100%' : topic.status === 'in-progress' ? '60%' : '0%' }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Modules View */}
                    <TabsContent value="modules" className="space-y-4 mt-4">
                      {courseData.modules.map(module => (
                        <div key={module.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{module.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Step {module.currentStep} of {module.totalSteps}</Badge>
                              <span className="text-sm font-medium">{module.progress}%</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {module.topics.map(topic => (
                              <div key={topic.id} className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${getStepCircleClass(topic.status, topic.step === courseData.currentStep)}`}>
                                    {getStepIcon(topic.status)}
                                  </div>
                                </div>
                                <div className="flex-grow">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-muted-foreground">Step {topic.step}</span>
                                      <p className="text-sm font-medium">{topic.name}</p>
                                    </div>
                                    <Badge
                                      variant={topic.status === 'completed' ? 'default' : topic.status === 'in-progress' ? 'secondary' : 'outline'}
                                      className="text-xs"
                                    >{topic.status}</Badge>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-300 ${topic.status === 'completed' ? 'bg-primary' : topic.status === 'in-progress' ? 'bg-blue-500' : 'bg-muted'}`}
                                      style={{ width: topic.status === 'completed' ? '100%' : topic.status === 'in-progress' ? '60%' : '0%' }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    {/* Overview */}
                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Course Progress</span>
                          <span className="text-sm text-muted-foreground">{courseData.overallProgress}%</span>
                        </div>
                        <Progress value={courseData.overallProgress} className="h-3" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courseData.modules.map(module => (
                          <div key={module.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium text-sm">{module.name}</h4>
                              <Badge variant="outline" className="text-xs">{module.progress}%</Badge>
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
                  <div className="text-center py-8 text-muted-foreground text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a course to view topic progress stepper</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription className="text-gray-500">Latest updates from your courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'New assignment submitted by Student A',
                  'Assessment results published',
                  'Attendance marked for Math 101',
                ].map((text, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    <p className="text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
