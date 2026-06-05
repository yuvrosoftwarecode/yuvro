import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, FileText, Play, BarChart3, 
  CheckCircle, AlertCircle, Loader2, Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSubjectsByCollege, Subject } from '@/services/subjectService';
import skillTestService from '@/services/skillTestService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import InternalTestInstructions from './InternalTestInstructions';
import InternalTestInterface from './InternalTestInterface';
import InternalTestResults from './InternalTestResults';
import InternalTestThankYou from './InternalTestThankYou';
import PageHeader from '@/components/common/PageHeader';

interface Assessment {
  id: string;
  title: string;
  course: string;
  courseId: string;
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

interface AssessmentContentProps {}

const InternalTestContent: React.FC<AssessmentContentProps> = () => {
  const { user } = useAuth();
  const isCampus = !window.location.pathname.includes('/student/assessments') && user?.college_product_type !== 'assessments';
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

  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!user?.college_id) return;
    
    setIsLoading(true);
    try {
      const [subjectsData, testsData] = await Promise.all([
        fetchSubjectsByCollege(user.college_id),
        skillTestService.getSkillTests({ 
          test_type: 'assessment', 
          publish_status: 'active' 
        })
      ]);

      const activeProductType = isCampus ? 'campus' : 'assessments';
      const filteredSubjectsData = subjectsData.filter(s => s.product_type === activeProductType);

      setSubjects(filteredSubjectsData);

      const mappedAssessments: Assessment[] = testsData
        .filter(test => filteredSubjectsData.some(s => s.id === test.subject))
        .map(test => {
          const subject = filteredSubjectsData.find(s => s.id === test.subject);
        
        let totalQuestions = test.total_questions || 0;
        if (totalQuestions === 0 && test.questions_config) {
          totalQuestions += Object.values(test.questions_config).reduce((acc: number, ids) => acc + (Array.isArray(ids) ? ids.length : 0), 0);
        }
        if (test.questions_random_config) {
          totalQuestions += Object.values(test.questions_random_config).reduce((acc: number, count) => acc + (Number(count) || 0), 0);
        }

        // Format date safely
        let formattedDueDate = 'No due date';
        if (test.end_time) {
          try {
            const date = new Date(test.end_time);
            if (!isNaN(date.getTime())) {
              formattedDueDate = date.toLocaleDateString();
            }
          } catch (e) {
            console.error('Error parsing date:', e);
          }
        }

        // Determine completion status from my_submissions (returned by backend per student)
        const mySubmissions: any[] = test.my_submissions || [];
        const latestSubmission = mySubmissions.find(
          (s: any) => s.status === 'submitted' || s.status === 'completed'
        ) || mySubmissions[0];
        const isCompleted = mySubmissions.some(
          (s: any) => s.status === 'submitted' || s.status === 'completed'
        );

        return {
          id: test.id,
          title: test.title,
          course: subject?.subject_name || 'General',
          courseId: String(test.subject),
          duration: test.duration,
          totalQuestions: totalQuestions,
          status: isCompleted ? 'completed' : 'pending',
          dueDate: formattedDueDate,
          createdDate: test.created_at || '',
          difficulty: (test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)) as any,
          description: test.description || '',
          marks: test.total_marks || 0,
          score: latestSubmission?.marks ?? undefined,
          completedDate: latestSubmission?.completed_at || latestSubmission?.created_at
        };
      });

      setAllAssessments(mappedAssessments);

      const assessmentId = searchParams.get('assessmentId');
      if (assessmentId) {
        const assessment = mappedAssessments.find(a => a.id === assessmentId);
        if (assessment) setSelectedAssessment(assessment);
      }
    } catch (error) {
      console.error('Failed to load assessment data:', error);
      toast.error(isCampus ? 'Failed to load internal tests' : 'Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.college_id]);

  useEffect(() => {
    const view = searchParams.get('view') as any || 'list';
    const course = searchParams.get('course') || 'all';
    const status = searchParams.get('status') || 'all';

    setCurrentView(view);
    setSelectedCourse(course);
    setStatusFilter(status);
  }, [searchParams]);

  const updateUrlParams = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) newParams.delete(key);
      else newParams.set(key, value);
    });
    setSearchParams(newParams);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedAssessment(null);
    updateUrlParams({ view: 'list', assessmentId: null });
  };

  const handleStartAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setAssessmentStats(null);
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
    if (stats) setAssessmentStats(stats);
    setCurrentView('thankyou');
    updateUrlParams({ view: 'thankyou', assessmentId: selectedAssessment?.id || null });
  };

  const handleThankYouComplete = () => {
    loadData(); // Reload to update status
    handleBackToList();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-600 border-none';
      case 'pending': return 'bg-orange-50 text-orange-600 border-none';
      default: return 'bg-gray-50 text-gray-600 border-none';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Hard': return 'bg-red-500 text-white';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredAssessments = allAssessments.filter(assessment => {
    if (selectedCourse !== 'all' && assessment.courseId !== selectedCourse) return false;
    if (statusFilter !== 'all' && assessment.status !== statusFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">
          {isCampus ? 'Loading internal tests...' : 'Loading assessments...'}
        </p>
      </div>
    );
  }

  if (currentView === 'instructions' && selectedAssessment) {
    return (
      <InternalTestInstructions
        assessment={selectedAssessment as any}
        onStart={handleBeginAssessment}
        onBack={handleBackToList}
      />
    );
  }

  if (currentView === 'assessment' && selectedAssessment) {
    return (
      <InternalTestInterface
        assessment={selectedAssessment as any}
        onComplete={handleAssessmentComplete}
        onBack={handleBackToList}
      />
    );
  }

  if (currentView === 'thankyou' && selectedAssessment) {
    const stats = assessmentStats || {
      answeredCount: 0,
      totalQuestions: selectedAssessment.totalQuestions,
      timeSpent: 0,
    };

    return (
      <InternalTestThankYou
        assessment={selectedAssessment as any}
        answeredCount={stats.answeredCount}
        totalQuestions={stats.totalQuestions}
        timeSpent={stats.timeSpent}
        onBackToAssessment={handleThankYouComplete}
      />
    );
  }

  if (currentView === 'results' && selectedAssessment) {
    return (
      <InternalTestResults
        assessment={selectedAssessment as any}
        onBackToList={handleBackToList}
        onTryAgain={() => handleStartAssessment(selectedAssessment)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isCampus ? "Internal Tests" : "Assessments"} 
        subtitle={isCampus ? "Complete your assigned internal tests and track your progress" : "Complete your assigned assessments and track your progress"} 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-[#1a1a1a]">Subjects</label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="h-12 bg-white border-[#e5e5e5] rounded-xl text-[#333333]">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.subject_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-[#1a1a1a]">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 bg-white border-[#e5e5e5] rounded-xl text-[#333333]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xl md:text-2xl font-bold text-[#1a1a1a]">
            {isCampus ? "Available Internal Tests" : "Available Assessments"} ({statusFilter === 'all' ? 'all' : statusFilter})
          </h3>
        </div>
        
        {filteredAssessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-border bg-card/50 text-center px-6">
            <div className="p-4 bg-muted rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {isCampus ? "No internal tests found" : "No assessments found"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {isCampus
                ? "Check back later or adjust your filters to see newly assigned tests."
                : "Check back later or adjust your filters to see newly assigned evaluations."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment) => (
              <Card 
                key={assessment.id} 
                className="hover:shadow-md transition-shadow duration-300 border border-gray-100 bg-card rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-lg font-bold leading-tight">
                      {assessment.title}
                    </CardTitle>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {assessment.course}
                    </p>
                  </div>
                  <Badge className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium flex items-center gap-1.5", getStatusColor(assessment.status))}>
                    {assessment.status === 'completed' ? (
                      <><CheckCircle className="h-3.5 w-3.5" /> Completed</>
                    ) : (
                      <><Clock className="h-3.5 w-3.5" /> Pending</>
                    )}
                  </Badge>
                </div>

                <div className="space-y-5">
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {assessment.description || 'No description provided.'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{assessment.duration} mins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span>{assessment.totalQuestions} questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{assessment.marks} marks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Due {assessment.dueDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge className={cn("rounded-full px-3 py-0.5 text-[11px] font-bold", getDifficultyColor(assessment.difficulty))}>
                      {assessment.difficulty}
                    </Badge>
                    
                    {assessment.status === 'completed' && assessment.score !== undefined && (
                      <Badge className="bg-blue-50 text-slate-700 rounded-full px-2.5 py-0.5 text-[11px] font-medium border-none">
                        Score: {assessment.score}/{assessment.marks}
                      </Badge>
                    )}
                  </div>

                  {assessment.status === 'pending' ? (
                    <Button 
                      className="w-full bg-black text-white hover:bg-black/90 rounded-lg h-10 text-sm font-medium flex items-center justify-center gap-2"
                      onClick={() => handleStartAssessment(assessment)}
                    >
                      <Play className="h-4 w-4" /> Start Assessment
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      className="w-full border-gray-200 text-slate-700 hover:bg-gray-50 rounded-lg h-10 text-sm font-medium flex items-center justify-center gap-2"
                      onClick={() => handleViewResults(assessment)}
                    >
                      <BarChart3 className="h-4 w-4" /> View Results
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalTestContent;