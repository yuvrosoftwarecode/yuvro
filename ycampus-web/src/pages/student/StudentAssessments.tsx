import { useEffect, useState, useMemo } from 'react';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchSkillTests, startSkillTest, SkillTest } from '@/services/skillTestService';
import { fetchSubjects } from '@/services/subjectService';
import AssessmentInterface from '@/components/student/AssessmentInterface';
import TestResults from '@/components/student/skill-test/TestResults';
import TestInstructions from '@/components/student/skill-test/TestInstructions';
import { toast } from 'sonner';
import { Clock, FileText, BarChart3, Play, CheckCircle, Timer } from 'lucide-react';

type AssessmentStatus = 'all' | 'pending' | 'completed';
type View = 'list' | 'instructions' | 'test' | 'results';

// ── Mock data shown while real data loads / for dev ──────────────────────────
const MOCK_ASSESSMENTS: (SkillTest & { my_submissions: any[] })[] = [
  {
    id: 'mock-1',
    title: 'Data Structures & Algorithms',
    description: 'Comprehensive assessment covering arrays, linked lists, trees, graphs, and algorithm analysis.',
    instructions: '',
    difficulty: 'hard',
    duration: 90,
    total_marks: 100,
    passing_marks: 60,
    enable_proctoring: true,
    max_attempts: 1,
    questions_config: { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] },
    questions_random_config: { mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 },
    publish_status: 'active',
    test_type: 'assessment',
    total_questions: 30,
    subject: 'sub-1',
    unit: undefined,
    participants_count: 0,
    created_by: '',
    created_at: '',
    updated_at: '',
    my_submissions: [],
  },
  {
    id: 'mock-2',
    title: 'Object-Oriented Programming',
    description: 'Assessment on OOP concepts, inheritance, polymorphism, and design patterns.',
    instructions: '',
    difficulty: 'medium',
    duration: 60,
    total_marks: 80,
    passing_marks: 48,
    enable_proctoring: true,
    max_attempts: 1,
    questions_config: { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] },
    questions_random_config: { mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 },
    publish_status: 'active',
    test_type: 'assessment',
    total_questions: 20,
    subject: 'sub-2',
    unit: undefined,
    participants_count: 0,
    created_by: '',
    created_at: '',
    updated_at: '',
    my_submissions: [{ id: 'sub-1', status: 'completed', marks: 72 }],
  },
  {
    id: 'mock-3',
    title: 'Database Management Systems',
    description: 'SQL queries, normalization, indexing, and database design principles.',
    instructions: '',
    difficulty: 'medium',
    duration: 75,
    total_marks: 90,
    passing_marks: 54,
    enable_proctoring: true,
    max_attempts: 1,
    questions_config: { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] },
    questions_random_config: { mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 },
    publish_status: 'active',
    test_type: 'assessment',
    total_questions: 30,
    subject: 'sub-3',
    unit: undefined,
    participants_count: 0,
    created_by: '',
    created_at: '',
    updated_at: '',
    my_submissions: [],
  },
  {
    id: 'mock-4',
    title: 'Calculus I — Final Assessment',
    description: 'Comprehensive assessment covering limits, derivatives, integrals, and applications.',
    instructions: '',
    difficulty: 'hard',
    duration: 120,
    total_marks: 100,
    passing_marks: 60,
    enable_proctoring: true,
    max_attempts: 1,
    questions_config: { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] },
    questions_random_config: { mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 },
    publish_status: 'active',
    test_type: 'assessment',
    total_questions: 25,
    subject: 'sub-4',
    unit: undefined,
    participants_count: 0,
    created_by: '',
    created_at: '',
    updated_at: '',
    my_submissions: [{ id: 'sub-2', status: 'completed', marks: 88 }],
  },
  {
    id: 'mock-5',
    title: 'Linear Algebra Quiz',
    description: 'Vectors, matrices, and linear transformations.',
    instructions: '',
    difficulty: 'easy',
    duration: 45,
    total_marks: 50,
    passing_marks: 30,
    enable_proctoring: false,
    max_attempts: 1,
    questions_config: { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] },
    questions_random_config: { mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 },
    publish_status: 'active',
    test_type: 'assessment',
    total_questions: 15,
    subject: 'sub-4',
    unit: undefined,
    participants_count: 0,
    created_by: '',
    created_at: '',
    updated_at: '',
    my_submissions: [],
  },
] as (SkillTest & { my_submissions: any[] })[];

const MOCK_SUBJECTS = [
  { id: 'sub-1', name: 'Data Structures & Algorithms' },
  { id: 'sub-2', name: 'Object-Oriented Programming' },
  { id: 'sub-3', name: 'Database Management Systems' },
  { id: 'sub-4', name: 'Mathematics' },
];

export default function StudentAssessments() {
  const [assessments, setAssessments] = useState<(SkillTest & { my_submissions: any[] })[]>(MOCK_ASSESSMENTS);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>(MOCK_SUBJECTS);
  const [loading, setLoading] = useState(false);

  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus>('all');

  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<SkillTest | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [tests, subs] = await Promise.all([
        fetchSkillTests({ test_type: 'assessment' }),
        fetchSubjects(),
      ]);
      if (tests.length > 0) {
        setAssessments(tests as any);
        setSubjects(subs.map((s: any) => ({ id: s.id, name: s.subject_name || s.name })));
      }
      // if API returns empty, mock data stays visible
    } catch {
      // silently keep mock data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getStatus = (test: SkillTest): 'pending' | 'completed' => {
    const subs: any[] = (test as any).my_submissions || [];
    return subs.some(s => s.status === 'completed' || s.status === 'submitted') ? 'completed' : 'pending';
  };

  const getLatestSubmission = (test: SkillTest) => {
    const subs: any[] = (test as any).my_submissions || [];
    return subs.find(s => s.status === 'completed' || s.status === 'submitted') || null;
  };

  const subjectName = (test: SkillTest) =>
    subjects.find(s => s.id === test.subject)?.name || '';

  const filtered = useMemo(() => assessments.filter(t => {
    if (subjectFilter !== 'all' && t.subject !== subjectFilter) return false;
    if (statusFilter !== 'all' && getStatus(t) !== statusFilter) return false;
    return true;
  }), [assessments, subjectFilter, statusFilter]);

  const handleStart = (test: SkillTest) => { setSelected(test); setView('instructions'); };

  const handleBeginTest = async () => {
    if (!selected) return;
    try {
      const tid = toast.loading('Starting assessment...');
      const res = await startSkillTest(selected.id);
      toast.dismiss(tid);
      if (res.status === 'started' || res.status === 'in_progress') {
        setQuestions(res.questions);
        setSubmissionId(res.submission_id);
        setView('test');
      } else {
        toast.error('Unable to start assessment.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to start assessment', { duration: 8000 });
    }
  };

  const handleComplete = async () => { await load(); setView('results'); };
  const handleViewResults = (test: SkillTest) => { setSelected(test); setView('results'); };
  const handleBackToList = async () => { await load(); setSelected(null); setView('list'); };

  // ── Non-list views ────────────────────────────────────────────────────────
  if (view === 'instructions' && selected) {
    const used = ((selected as any).my_submissions || []).filter((s: any) => s.status === 'completed' || s.status === 'submitted').length;
    return (
      <div className="h-screen bg-gray-50 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <TestInstructions
            test={{
              id: selected.id,
              title: selected.title,
              subjectName: subjectName(selected),
              duration: selected.duration,
              totalQuestions: selected.total_questions || 0,
              difficulty: (selected.difficulty.charAt(0).toUpperCase() + selected.difficulty.slice(1)) as any,
              description: selected.description,
              marks: selected.total_marks,
              testType: 'assessment',
              maxAttempts: selected.max_attempts,
              attemptsUsed: used,
            }}
            onStart={handleBeginTest}
            onBack={handleBackToList}
          />
        </div>
      </div>
    );
  }

  if (view === 'test' && selected) {
    return (
      <div className="h-screen bg-gray-50 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <AssessmentInterface
            assessment={{
              id: selected.id,
              title: selected.title,
              subjectName: subjectName(selected),
              duration: selected.duration,
              totalQuestions: selected.total_questions || 0,
              topicId: selected.unit || selected.subject,
            }}
            questions={questions}
            submissionId={submissionId || ''}
            onComplete={handleComplete}
            onBack={() => setView('instructions')}
          />
        </div>
      </div>
    );
  }

  if (view === 'results' && selected) {
    const latest = getLatestSubmission(selected);
    return (
      <div className="h-screen bg-gray-50 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <TestResults
            test={{
              id: selected.id,
              title: selected.title,
              subjectName: subjectName(selected),
              duration: selected.duration,
              totalQuestions: selected.total_questions || 0,
              marks: selected.total_marks,
            }}
            submissionId={submissionId || latest?.id || ''}
            onBackToList={handleBackToList}
          />
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <RoleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleHeader
          title="Assessments"
          subtitle="Complete your assigned assessments and track your progress"
        />

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Filters card — borderless, shadow only */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground mb-2 block">Subject</label>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={v => setStatusFilter(v as AssessmentStatus)}>
                    <SelectTrigger>
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
            </CardContent>
          </Card>

          {/* Section label */}
          <h3 className="text-lg font-semibold text-foreground">
            Available Assessments {statusFilter !== 'all' && `(${statusFilter})`}
          </h3>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No assessments found</h3>
                  <p className="text-muted-foreground">No assessments match your current filters.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessment cards */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((test) => {
                const status = getStatus(test);
                const latest = getLatestSubmission(test);
                const diffLabel = test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1);

                return (
                  <Card
                    key={test.id}
                    className="group relative border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 transition-all duration-200 rounded-xl overflow-hidden flex flex-col"
                  >

                    <div className="p-6 flex flex-col flex-1 space-y-4">
                      {/* Title + status badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-foreground leading-snug group-hover:text-orange-600 transition-colors">
                          {test.title}
                        </h3>
                        <Badge
                          className={status === 'completed'
                            ? 'shrink-0 bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100'
                            : 'shrink-0 bg-orange-100 text-orange-700 border-0 hover:bg-orange-100'}
                        >
                          {status === 'completed'
                            ? <><CheckCircle className="h-3 w-3 mr-1" />Completed</>
                            : <><Timer className="h-3 w-3 mr-1" />Pending</>}
                        </Badge>
                      </div>

                      {/* Description */}
                      {test.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{test.description}</p>
                      )}

                      {/* Meta info */}
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{test.duration} mins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{test.total_questions || 0} questions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>{test.total_marks} marks</span>
                        </div>
                      </div>
                      {/* Difficulty + score */}
                      <div className="flex items-center justify-between">
                        <Badge
                          className={
                            test.difficulty === 'easy'
                              ? 'bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100'
                              : test.difficulty === 'medium'
                              ? 'bg-cyan-100 text-cyan-700 border-0 hover:bg-cyan-100'
                              : 'bg-rose-100 text-rose-700 border-0 hover:bg-rose-100'
                          }
                        >
                          {diffLabel}
                        </Badge>
                        {status === 'completed' && latest?.marks != null && (
                          <Badge variant="secondary" className="font-bold">
                            Score: {latest.marks}/{test.total_marks}
                          </Badge>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-auto pt-2">
                        {status === 'pending' ? (
                          <Button
                            onClick={() => handleStart(test)}
                            className="w-full h-11 bg-gradient-to-r from-[#FFB300] to-[#FF6B00] hover:from-[#FF8800] hover:to-[#FF5500] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Start Assessment
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => handleViewResults(test)}
                            className="w-full h-11 flex items-center justify-between px-4 rounded-xl border-slate-200 hover:border-orange-200 hover:bg-orange-50/50 transition-all group/res"
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-orange-50 rounded-lg group-hover/res:bg-orange-100 transition-colors">
                                <BarChart3 className="h-3.5 w-3.5 text-orange-600" />
                              </div>
                              <span className="text-sm font-semibold text-slate-700">View Results</span>
                            </div>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
