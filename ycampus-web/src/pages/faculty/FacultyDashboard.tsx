import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  ClipboardCheck, 
  Users, 
  CheckSquare, 
  Plus, 
  Calendar, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Play,
  Loader2
} from 'lucide-react';
import subjectService, { SectionSubjectFaculty, UnitBasic } from '@/services/subjectService';
import { facultyDashboardService, FacultyActivity } from '@/services/facultyDashboardService';
import { useAuth } from '@/contexts/AuthContext';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter State
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
  const [statsData, setStatsData] = useState({
    total_courses: 0,
    total_students: 0,
    total_assessments: 0,
    average_attendance: 0
  });
  const [activities, setActivities] = useState<FacultyActivity[]>([]);
  const [currentUnits, setCurrentUnits] = useState<UnitBasic[]>([]);

  // Backwards compatibility for stats call
  const selectedAssignmentId = useMemo(() => {
    if (!selectedDept || !selectedSubject || !selectedBatch || !selectedSection) return '';
    const found = assignments.find(a => 
      String(a.semester_subject_details?.department_id) === selectedDept &&
      String(a.semester_subject_details?.subject_details?.id) === selectedSubject &&
      a.semester_subject_details?.batch_name === selectedBatch &&
      (a.section_name || String(a.section)) === selectedSection
    );
    return found ? String(found.id) : '';
  }, [assignments, selectedDept, selectedSubject, selectedBatch, selectedSection]);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [selectedDept, selectedSubject, selectedBatch, selectedSection, assignments]);

  useEffect(() => {
    if (selectedSubject) {
      fetchSubjectUnits(selectedSubject);
    } else {
      setCurrentUnits([]);
    }
  }, [selectedSubject]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, activityData] = await Promise.all([
        subjectService.getFacultyAssignments(),
        facultyDashboardService.getRecentActivity()
      ]);
      setAssignments(assignmentsData);
      setActivities(activityData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params: any = {};
      
      if (selectedDept) params.department_id = selectedDept;
      if (selectedSubject) params.subject_id = selectedSubject;
      
      // Only resolve and send section_id if a section is selected
      if (selectedSection) {
        const assignment = assignments.find(a => 
          String(a.semester_subject_details?.department_id) === selectedDept &&
          String(a.semester_subject_details?.subject_details?.id) === selectedSubject &&
          a.semester_subject_details?.batch_name === selectedBatch &&
          (a.section_name || String(a.section)) === selectedSection
        );
        if (assignment?.section) {
          params.section_id = String(assignment.section);
        }
      }

      console.log('Fetching stats with params:', params);
      const data = await subjectService.fetchFacultyStats(params);
      
      if (data) {
        setStatsData(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSubjectUnits = async (subjectId: string) => {
    try {
      const units = await subjectService.getUnits(subjectId);
      setCurrentUnits(units || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const uniqueDepartments = useMemo(() => {
    const acc: { id: string; name: string }[] = [];
    assignments.forEach(curr => {
      const deptId = String(curr.semester_subject_details?.department_id);
      const deptName = curr.semester_subject_details?.department_name;
      if (deptId && deptName && !acc.find(d => d.id === deptId)) {
        acc.push({ id: deptId, name: deptName });
      }
    });
    return acc;
  }, [assignments]);

  const uniqueSubjects = useMemo(() => {
    if (!selectedDept) return [];
    const acc: { id: string; name: string }[] = [];
    assignments
      .filter(a => String(a.semester_subject_details?.department_id) === selectedDept)
      .forEach(curr => {
        const subjectId = String(curr.semester_subject_details?.subject_details?.id);
        const subjectName = curr.semester_subject_details?.subject_details?.subject_name;
        if (subjectId && subjectName && !acc.find(s => s.id === subjectId)) {
          acc.push({ id: subjectId, name: subjectName });
        }
      });
    return acc;
  }, [assignments, selectedDept]);

  const uniqueBatches = useMemo(() => {
    if (!selectedDept || !selectedSubject) return [];
    const acc: string[] = [];
    assignments
      .filter(a => 
        String(a.semester_subject_details?.department_id) === selectedDept &&
        String(a.semester_subject_details?.subject_details?.id) === selectedSubject
      )
      .forEach(curr => {
        const batchName = curr.semester_subject_details?.batch_name;
        if (batchName && !acc.includes(batchName)) {
          acc.push(batchName);
        }
      });
    return acc;
  }, [assignments, selectedDept, selectedSubject]);

  const uniqueSections = useMemo(() => {
    if (!selectedDept || !selectedSubject || !selectedBatch) return [];
    return assignments
      .filter(a => 
        String(a.semester_subject_details?.department_id) === selectedDept &&
        String(a.semester_subject_details?.subject_details?.id) === selectedSubject &&
        a.semester_subject_details?.batch_name === selectedBatch
      )
      .map(a => a.section_name || String(a.section));
  }, [assignments, selectedDept, selectedSubject, selectedBatch]);

  const stats = [
    { title: 'Subjects', value: statsData.total_courses.toString(), icon: BookOpen, change: 'Active' },
    { title: 'Students', value: statsData.total_students.toString(), icon: Users, change: 'Enrolled' },
    { title: 'Assessments', value: statsData.total_assessments.toString(), icon: ClipboardCheck, change: 'Pending' },
    { title: 'Attendance', value: `${statsData.average_attendance}%`, icon: CheckSquare, change: 'Average' },
  ];

  const quickActions = [
    { title: 'Create Task', icon: Plus, description: 'Assign new task to students', path: '/faculty/task' },
    { title: 'Take Attendance', icon: CheckSquare, description: 'Mark today\'s attendance', path: '/faculty/attendance' },
    { title: 'Schedule Class', icon: Calendar, description: 'Schedule upcoming class', path: '/faculty/schedule' },
    { title: 'Send Announcement', icon: MessageSquare, description: 'Notify students', path: '/faculty/announcements' },
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

  // Map real units to the topicsData structure expected by the UI
  const selectedCourseData = useMemo(() => {
      if (!selectedSubject || currentUnits.length === 0) return null;
      
      return {
          overallProgress: 0, // Should be calculated or fetched
          currentStep: 1,
          totalSteps: currentUnits.length,
          modules: currentUnits.map((unit, idx) => ({
              id: unit.id,
              name: unit.name,
              progress: 0,
              currentStep: 0,
              totalSteps: 1,
              topics: [
                  { id: `t-${unit.id}`, name: `Overview of ${unit.name}`, status: 'pending', step: idx + 1 }
              ]
          }))
      };
  }, [selectedSubject, currentUnits]);

  const allTopics = selectedCourseData ? selectedCourseData.modules.flatMap(module => module.topics) : [];

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col h-[70vh] items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <p className="font-semibold text-xs text-slate-500  tracking-widest animate-pulse">Initializing Dashboard...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back, {user?.first_name || 'Professor'}!</h2>
          <p className="text-muted-foreground">Here's an overview of your classes and activities.</p>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Department</label>
            <Select value={selectedDept} onValueChange={(value) => {
              setSelectedDept(value);
              setSelectedSubject('');
              setSelectedBatch('');
              setSelectedSection('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subject</label>
            <Select 
              value={selectedSubject} 
              onValueChange={(value) => {
                setSelectedSubject(value);
                setSelectedBatch('');
                setSelectedSection('');
              }}
              disabled={!selectedDept}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                {uniqueSubjects.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Batch</label>
            <Select 
              value={selectedBatch} 
              onValueChange={(value) => {
                setSelectedBatch(value);
                setSelectedSection('');
              }}
              disabled={!selectedSubject}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                {uniqueBatches.map((batch) => (
                  <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Section</label>
            <Select 
              value={selectedSection} 
              onValueChange={setSelectedSection}
              disabled={!selectedBatch}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                {uniqueSections.map((section) => (
                  <SelectItem key={section} value={section}>Section {section}</SelectItem>
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
                  onClick={() => action.path && navigate(action.path)}
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
                <CardTitle>Sub-Units Progress Stepper</CardTitle>
            <CardDescription>
              {selectedSubject && selectedAssignmentId 
                    ? `Step ${selectedCourseData?.currentStep} of ${selectedCourseData?.totalSteps} - ${uniqueSubjects.find(c => c.id === selectedSubject)?.name}`
                : 'Select Subject and section to view progress'
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
                  <TabsTrigger value="modules">Units</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stepper" className="space-y-6">
                  {/* Main Stepper */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Subject Progress Stepper</h3>
                      <Badge variant="outline">
                        Step {selectedCourseData.currentStep} of {selectedCourseData.totalSteps}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      {allTopics.map((topic, _index) => (
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
                          {_index < allTopics.length - 1 && (
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
                        {module.topics.map((topic, _index) => (
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
                      <span className="text-sm font-medium">Subject Progress</span>
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
                <p>Select a Subject to view Sub-Unit progress stepper</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your Subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.length > 0 ? (
                activities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-sm">
                            <span className="font-bold">{activity.action}</span> {activity.target}
                            <span className="text-xs text-muted-foreground ml-2 italic">({activity.time})</span>
                        </p>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground italic">No recent activity recorded.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

  return (
    <FacultyLayout>
      {renderDashboardContent()}
    </FacultyLayout>
  );
};

export default FacultyDashboard;