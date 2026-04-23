import React, { useState, useEffect, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileText, Plus, Search, Loader2, Trophy, Clock, Users, Trash2, Edit,
  BarChart2, ArrowLeft, Settings, Calendar, CheckCircle2, BookOpen,
  TrendingUp, Eye, EyeOff, ClipboardList, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUnitsBySubject, fetchCollegeSubjects } from '@/services/subjectService';
import departmentService, { Department } from '@/services/departmentService';
import batchService, { Batch } from '@/services/batchService';
import skillTestService, { SkillTest, CreateSkillTestData } from '@/services/skillTestService';
import { fetchQuestionById, createQuestion, fetchQuestions } from '@/services/questionService';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

import { QuestionForm } from '@/components/admin/test-questions/QuestionForm';
import { QuestionPreview } from '@/components/admin/test-questions/QuestionPreview';
import AnalyticsStats from '@/components/college-admin/analytics/AnalyticsStats';
import CandidatesTable from '@/components/college-admin/analytics/CandidatesTable';
import SubmissionAnalyticsView from '@/components/college-admin/analytics/SubmissionAnalyticsView';
import QuestionBank from '@/components/common/QuestionBank';

type ViewMode = 'list' | 'create' | 'edit' | 'analytics' | 'submission-results';

// ─── Sub-components ──────────────────────────────────────────────────────────

const FilterSelect = ({
  label, value, options, values, onChange, disabled,
}: {
  label: string; value: string | null; options: string[]; values?: string[];
  onChange: (v: string) => void; disabled?: boolean;
}) => (
  <div className="space-y-1.5 flex-1 min-w-[180px]">
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="bg-background h-10 border-border hover:border-primary/40 transition-colors">
        <SelectValue placeholder={`Select ${label}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o, i) => (
          <SelectItem key={i} value={values ? values[i] : o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const difficultyConfig: Record<string, { label: string; className: string }> = {
  easy:   { label: 'Easy',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
  medium: { label: 'Medium', className: 'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-950/30  dark:text-amber-400'  },
  hard:   { label: 'Hard',   className: 'bg-red-50    text-red-700    border-red-200    dark:bg-red-950/30    dark:text-red-400'   },
};

interface AssessmentCardProps {
  test: SkillTest;
  onAnalytics: () => void;
  onEdit: () => Promise<void>;
  onDelete: () => void;
  onStatusToggle: () => void;
  isTogglingStatus: boolean;
}

const AssessmentCard = ({ test, onAnalytics, onEdit, onDelete, onStatusToggle, isTogglingStatus }: AssessmentCardProps) => {
  const isActive = test.publish_status === 'active';
  const diff = difficultyConfig[test.difficulty] ?? difficultyConfig.medium;

  const calculateTotalQuestions = (testConfig: SkillTest) => {
    if (typeof testConfig.total_questions === 'number' && testConfig.total_questions > 0) return testConfig.total_questions;
    
    let total = 0;
    if (testConfig.questions_config) {
      total += (testConfig.questions_config.mcq_single?.length || 0);
      total += (testConfig.questions_config.mcq_multiple?.length || 0);
      total += (testConfig.questions_config.coding?.length || 0);
      total += (testConfig.questions_config.descriptive?.length || 0);
    }
    if (testConfig.questions_random_config) {
      total += (Number(testConfig.questions_random_config.mcq_single) || 0);
      total += (Number(testConfig.questions_random_config.mcq_multiple) || 0);
      total += (Number(testConfig.questions_random_config.coding) || 0);
      total += (Number(testConfig.questions_random_config.descriptive) || 0);
    }
    return total;
  };

  const totalQuestions = calculateTotalQuestions(test);

  return (
    <Card className="group border-border bg-card hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Status accent bar */}
      <div className={`h-1 w-full transition-colors duration-300 ${isActive ? 'bg-primary' : 'bg-border'}`} />
      <CardContent className="p-4 flex items-center gap-4">
        {/* Icon */}
        <div className="shrink-0 p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
          <Trophy className="w-5 h-5 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h4 className="font-semibold text-foreground truncate">{test.title}</h4>
            <Badge variant="outline" className={`text-[10px]  font-semibold px-2 py-0 border ${diff.className}`}>
              {diff.label}
            </Badge>
            {/* Quick status badge */}
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold px-2 py-0 border cursor-pointer select-none transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
              onClick={(e) => { e.stopPropagation(); onStatusToggle(); }}
            >
              {isTogglingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : isActive ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {test.duration} min
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> {test.participants_count ?? 0} students
            </span>
            <span className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> {totalQuestions} questions
            </span>
          </div>
        </div>

        {/* Actions */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onStatusToggle} disabled={isTogglingStatus}
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                  {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{isActive ? 'Set to Draft' : 'Publish'}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onAnalytics}
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <BarChart2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Analytics</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onEdit}
                  className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Edit</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDelete}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Delete</p></TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

const LoadingPlaceholder = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-dashed border-border bg-card">
    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
    <p className="text-muted-foreground text-sm font-medium">{text}</p>
  </div>
);

const EmptyPlaceholder = ({ text, icon: Icon = AlertCircle }: { text: string; icon?: React.ElementType }) => (
  <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border bg-card text-center px-6">
    <div className="p-3.5 bg-muted rounded-full mb-4">
      <Icon className="w-6 h-6 text-muted-foreground" />
    </div>
    <p className="text-foreground font-medium mb-1">Nothing here yet</p>
    <p className="text-muted-foreground text-sm">{text}</p>
  </div>
);

const SelectionRequiredPlaceholder = () => (
  <div className="flex flex-col items-center justify-center py-32 rounded-xl border border-dashed border-border bg-card">
    <div className="p-4 bg-muted rounded-full mb-4">
      <BookOpen className="w-8 h-8 text-muted-foreground" />
    </div>
    <p className="text-lg font-semibold text-foreground mb-2">Select a Unit to Continue</p>
    <p className="text-muted-foreground text-sm max-w-xs text-center">
      Choose Batch → Department → Subject → Unit above to manage and create practice tests.
    </p>
  </div>
);

const DeleteDialog = ({ open, title, onCancel, onConfirm }: {
  open: boolean; title: string; onCancel: () => void; onConfirm: () => void;
}) => (
  <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent className="rounded-xl border-border max-w-md">
      <AlertDialogHeader className="space-y-2">
        <AlertDialogTitle className="text-xl font-bold text-foreground">Delete Practice Test?</AlertDialogTitle>
        <AlertDialogDescription className="text-muted-foreground">
          Are you sure you want to delete <span className="font-semibold text-foreground">"{title}"</span>? This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex justify-end gap-3 mt-4">
        <AlertDialogCancel className="border-border text-muted-foreground">Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);

const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string; value: string | number; icon: React.ElementType; colorClass: string }) => (
  <Card className="border-border bg-card">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CollegeAdminPracticeTest = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<ViewMode>('list');
  const [testsLoading, setTestsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [availableQuestionsCount, setAvailableQuestionsCount] = useState<Record<string, number>>({ mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 });
  const [averageDurations, setAverageDurations] = useState<Record<string, number>>({ mcq_single: 1, mcq_multiple: 2, coding: 30, descriptive: 15 });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [collegeSubjects, setCollegeSubjects] = useState<any[]>([]);
  const [semesterSubjects, setSemesterSubjects] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);
  const [selectedBatch, setSelectedBatch] = useState<string | undefined>(undefined);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);
  const [selectedUnit, setSelectedUnit] = useState<string | undefined>(undefined);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);

  const [practiceTests, setPracticeTests] = useState<SkillTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<SkillTest | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [testToDelete, setTestToDelete] = useState<SkillTest | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: 0,
    total_marks: 0,
    passing_marks: 0,
    enable_proctoring: false,
    publish_status: 'draft' as 'draft' | 'active' | 'inactive' | 'archived',
  });
  const [randomQuestionsConfig, setRandomQuestionsConfig] = useState({
    mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0,
  });
  const [currentFormTab, setCurrentFormTab] = useState('details');
  const [questions, setQuestions] = useState<any[]>([]);

  // ── Memos ────────────────────────────────────────────────────────────────

  const uniqueBatchNames = useMemo(() => {
    const names = new Set<string>();
    batches.forEach(b => { if (b.name) names.add(b.name); });
    return Array.from(names).sort();
  }, [batches]);

  const filteredDepartments = useMemo(() => {
    if (!selectedBatch) return [];
    const deptIds = new Set<string>();
    batches.forEach(b => {
      const dId = String((b as any).department?.id || b.department || '');
      if (b.name === selectedBatch && dId) deptIds.add(dId);
    });
    return departments.filter(d => deptIds.has(String(d.id)));
  }, [selectedBatch, departments, batches]);

  const filteredSubjects = useMemo(() => {
    if (!selectedDepartment) return [];
    const subjectIds = new Set<string | number>();
    semesterSubjects.forEach(ss => {
      if (String(ss.department_id) === String(selectedDepartment)) subjectIds.add(ss.subject);
    });
    if (subjectIds.size === 0) return collegeSubjects;
    return collegeSubjects.filter(cs => subjectIds.has(cs.subject));
  }, [selectedDepartment, semesterSubjects, collegeSubjects]);

  const filteredTests = practiceTests.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadInitialData = async (collegeId: string) => {
    try {
      setIsLoadingInitial(true);
      const [depts, bts, subs, semSubs] = await Promise.all([
        departmentService.getDepartments(collegeId),
        batchService.getBatches(),
        fetchCollegeSubjects(collegeId),
        restApiAuthUtil.get<any[]>('/course/semester-subjects/'),
      ]);
      setDepartments(depts);
      setBatches(bts);
      setCollegeSubjects(subs);

      const semesterToDeptMap: Record<string, string> = {};
      bts.forEach(b => {
        const dId = String((b as any).department?.id || b.department || '');
        if (dId && b.semesters) {
          b.semesters.forEach((s: any) => { semesterToDeptMap[String(s.id)] = dId; });
        }
      });
      setSemesterSubjects(semSubs.map(ss => ({ ...ss, department_id: semesterToDeptMap[String(ss.semester)] })));
    } catch {
      toast({ title: 'Error', description: 'Failed to load curriculum data.', variant: 'destructive' });
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const loadUnits = async (subjectId: string) => {
    try {
      const data = await fetchUnitsBySubject(subjectId);
      setUnits(data.map(u => ({ id: String(u.id), name: u.name })));
    } catch { /* ignore */ }
  };

  const loadPracticeTests = async (unitId: string) => {
    try {
      setTestsLoading(true);
      const data = await skillTestService.getSkillTestsByUnit(unitId, 'practice');
      setPracticeTests(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load practice tests.', variant: 'destructive' });
    } finally {
      setTestsLoading(false);
    }
  };

  const loadAnalytics = async (testId: string) => {
    try {
      setAnalyticsLoading(true);
      const data = await skillTestService.getSkillTestSubmissions(testId);
      setSubmissions(data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load analytics.', variant: 'destructive' });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadQuestions = async (test: SkillTest) => {
    try {
      if (!test.questions_config) return [];
      const allIds: string[] = [];
      Object.values(test.questions_config).forEach(ids => {
        if (Array.isArray(ids)) allIds.push(...ids);
      });
      if (allIds.length === 0) return [];
      const details = await Promise.all(allIds.map(id => fetchQuestionById(id).catch(() => null)));
      return details.filter(Boolean).map((q: any) => ({
        id: q.id,
        type: q.type,
        questionText: q.content,
        options: q.mcq_options?.map((o: any) => o.text || o.option_text),
        correctAnswer: q.type === 'mcq_multiple'
          ? q.mcq_options?.filter((o: any) => o.is_correct).map((o: any) => o.text || o.option_text)
          : q.mcq_options?.find((o: any) => o.is_correct)?.text || q.mcq_options?.find((o: any) => o.is_correct)?.option_text || q.reference_answer,
        marks: q.marks,
        duration: q.duration || 0,
        isMultipleAnswer: q.type === 'mcq_multiple',
      }));
    } catch {
      return [];
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if ((user as any)?.college_id) loadInitialData((user as any).college_id);
  }, [user]);

  useEffect(() => {
    if (selectedSubject) { loadUnits(selectedSubject); setSelectedUnit(''); }
    else { setUnits([]); setSelectedUnit(''); }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedUnit && view === 'list') loadPracticeTests(selectedUnit);
  }, [selectedUnit, view]);

  // Fetch available questions count based on filters to validate random config
  useEffect(() => {
    const fetchCounts = async () => {
      if (!selectedSubject) return;
      try {
        const qs = await fetchQuestions({
          subject: selectedSubject,
          unit: selectedUnit || undefined,
          categories: 'practice',
          difficulty: formData.difficulty
        });
        
        const counts: Record<string, number> = { mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 };
        const durationsPool: Record<string, number[]> = { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] };

        qs.forEach((q: any) => {
          const t = q.type;
          if (t in counts) {
            counts[t]++;
            if (q.duration) durationsPool[t].push(Number(q.duration));
          }
        });

        setAvailableQuestionsCount(counts);

        // Calculate actual averages from the bank for these specific filters
        const avgDurations = { ...averageDurations };
        Object.keys(durationsPool).forEach(type => {
          if (durationsPool[type].length > 0) {
            avgDurations[type] = Math.ceil(durationsPool[type].reduce((a, b) => a + b, 0) / durationsPool[type].length);
          }
        });
        setAverageDurations(avgDurations);
      } catch (err) {
        console.error('Failed to load available questions count', err);
      }
    };
    fetchCounts();
  }, [selectedSubject, selectedUnit, formData.difficulty]);

  // Auto-calculate test configuration based on questions and random config
  useEffect(() => {
    const getEstimate = (type: string) => {
      const diff = formData.difficulty;
      if (type === 'coding') return { marks: 10, duration: 30 };
      if (type === 'descriptive') return { marks: 5, duration: 15 };
      // MCQs
      if (diff === 'easy') return { marks: 1, duration: 1 };
      if (diff === 'hard') return { marks: 4, duration: 5 };
      return { marks: 2, duration: 2 }; // medium
    };

    // 1. Sum up fixed questions with placeholder sanitization
    let totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    let totalDuration = questions.reduce((sum, q) => {
      const qDur = Number(q.duration) || 0;
      // If duration is the 60min placeholder or 0, use difficulty estimate
      if (qDur === 60 || qDur === 0) {
        const est = getEstimate(q.type || 'mcq_single');
        return sum + est.duration;
      }
      return sum + qDur;
    }, 0);
    
    // 2. Add estimates for random pool based on difficulty
    Object.entries(randomQuestionsConfig).forEach(([type, count]) => {
      if (count > 0) {
        const est = getEstimate(type);
        // For MCQs, always use the difficulty-based estimate to avoid bank noise
        // For Coding/Descriptive, use the bank average only if it's not the 60min placeholder
        const useBankAvg = type === 'coding' || type === 'descriptive';
        let finalDurationPerQ = est.duration;
        
        if (useBankAvg && averageDurations[type] && averageDurations[type] !== 60) {
          finalDurationPerQ = averageDurations[type];
        }
        
        totalMarks += (count * est.marks);
        totalDuration += (count * finalDurationPerQ);
      }
    });
    
    setFormData(prev => ({
      ...prev,
      total_marks: totalMarks,
      duration: totalDuration,
      passing_marks: Math.ceil(totalMarks * 0.4)
    }));
  }, [questions, randomQuestionsConfig, formData.difficulty, averageDurations]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAnalytics = (test: SkillTest) => {
    setSelectedTest(test);
    loadAnalytics(test.id);
    setView('analytics');
  };

  const handleCreate = () => {
    setFormData({ title: '', description: '', instructions: '', difficulty: 'medium', duration: 0, total_marks: 0, passing_marks: 0, enable_proctoring: false, publish_status: 'draft' });
    setRandomQuestionsConfig({ mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 });
    setQuestions([]);
    setCurrentFormTab('details');
    setView('create');
  };

  const handleEdit = async (test: SkillTest) => {
    setFormData({
      title: test.title || '',
      description: test.description || '',
      instructions: test.instructions || '',
      difficulty: test.difficulty || 'medium',
      duration: test.duration || 0,
      total_marks: test.total_marks || 100,
      passing_marks: test.passing_marks || 60,
      enable_proctoring: test.enable_proctoring || false,
      publish_status: test.publish_status || 'draft',
    });
    setRandomQuestionsConfig({
      mcq_single: test.questions_random_config?.mcq_single || 0,
      mcq_multiple: test.questions_random_config?.mcq_multiple || 0,
      coding: test.questions_random_config?.coding || 0,
      descriptive: test.questions_random_config?.descriptive || 0,
    });
    setCurrentFormTab('details');
    setSelectedTest(test);
    setView('edit');
    const qDetails = await loadQuestions(test);
    setQuestions(qDetails);
  };

  const handleStatusToggle = async (test: SkillTest) => {
    const newStatus = test.publish_status === 'active' ? 'draft' : 'active';
    try {
      setTogglingStatusId(test.id);
      await skillTestService.updateSkillTest(test.id, { publish_status: newStatus });
      setPracticeTests(prev =>
        prev.map(t => t.id === test.id ? { ...t, publish_status: newStatus } : t)
      );
      toast({ title: 'Status updated', description: `"${test.title}" is now ${newStatus === 'active' ? 'published' : 'set to draft'}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleQuestionsChange = async (selectedIds: string[]) => {
    // We update the questions list based on the IDs selected in the bank
    // If a question is already in our list (has details), we keep it.
    // If it's new, we fetch its details to show in the preview or just store the minimal object.
    const newQuestions = await Promise.all(
      selectedIds.map(async (id) => {
        const existing = questions.find(q => q.id === id);
        if (existing) return existing;
        
        try {
          const detail = await fetchQuestionById(id);
          return {
            id: detail.id,
            type: detail.type,
            questionText: detail.content,
            options: detail.mcq_options?.map((o: any) => o.text || o.option_text),
            correctAnswer: detail.type === 'mcq_multiple'
              ? detail.mcq_options?.filter((o: any) => o.is_correct).map((o: any) => o.text || o.option_text)
              : detail.mcq_options?.find((o: any) => o.is_correct)?.text || detail.mcq_options?.find((o: any) => o.is_correct)?.option_text || detail.reference_answer,
            marks: detail.marks,
            isMultipleAnswer: detail.type === 'mcq_multiple',
            duration: detail.duration || 0,
          };
        } catch {
          return { id, type: 'unknown', questionText: 'Loading error...' };
        }
      })
    );
    setQuestions(newQuestions);
  };

  const handleSaveTest = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Practice test title is required.', variant: 'destructive' });
      return;
    }
    try {
      setIsSaving(true);
      const savedQuestionIds: Record<string, string[]> = { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] };

      for (const q of questions) {
        // Since we are using Question Bank, all questions should have IDs
        let resolvedType = q.type as string;
        if (q.type === 'mcq') resolvedType = q.isMultipleAnswer ? 'mcq_multiple' : 'mcq_single';
        else if (q.type === 'true-false') resolvedType = 'mcq_single';
        else if (q.type === 'short-answer') resolvedType = 'descriptive';

        if (resolvedType in savedQuestionIds) {
          savedQuestionIds[resolvedType as keyof typeof savedQuestionIds].push(q.id);
        }
      }

      const payload: CreateSkillTestData = {
        title: formData.title, description: formData.description, instructions: formData.instructions,
        difficulty: formData.difficulty, duration: formData.duration, total_marks: formData.total_marks,
        passing_marks: formData.passing_marks, enable_proctoring: formData.enable_proctoring,
        publish_status: formData.publish_status, test_type: 'practice',
        subject: selectedSubject, unit: selectedUnit,
        questions_config: savedQuestionIds,
        questions_random_config: randomQuestionsConfig,
      };

      if (view === 'create') {
        await skillTestService.createSkillTest(payload);
        toast({ title: 'Created', description: 'Practice test created successfully.' });
      } else if (selectedTest) {
        await skillTestService.updateSkillTest(selectedTest.id, payload);
        toast({ title: 'Saved', description: 'Practice test updated successfully.' });
      }

      setView('list');
      if (selectedUnit) loadPracticeTests(selectedUnit);
    } catch {
      toast({ title: 'Error', description: 'Failed to save practice test.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await skillTestService.deleteSkillTest(id);
      toast({ title: 'Deleted', description: 'Practice test removed.' });
      if (selectedUnit) loadPracticeTests(selectedUnit);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
    } finally {
      setTestToDelete(null);
    }
  };

  // ── Breadcrumb context ────────────────────────────────────────────────────

  const currentSubjectName = collegeSubjects.find(s => String(s.subject) === selectedSubject)?.subject_details?.subject_name || '';
  const currentUnitName = units.find(u => u.id === selectedUnit)?.name || '';

  // ── Render views ──────────────────────────────────────────────────────────

  const renderList = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Practice Tests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create and manage skill-based practice tests for students.</p>
        </div>
        <Button
          onClick={handleCreate}
          disabled={!selectedUnit}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-10 px-5 font-semibold"
        >
          <Plus className="h-4 w-4" />
          New Practice Test
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FilterSelect label="Batch" value={selectedBatch} options={uniqueBatchNames} values={uniqueBatchNames}
              onChange={(v) => { setSelectedBatch(v); setSelectedDepartment(undefined); setSelectedSubject(undefined); setSelectedUnit(undefined); }} />
            <FilterSelect label="Department" value={selectedDepartment || null}
              options={filteredDepartments.map(d => d.name)} values={filteredDepartments.map(d => String(d.id))}
              onChange={(v) => { setSelectedDepartment(v); setSelectedSubject(undefined); setSelectedUnit(undefined); }}
              disabled={!selectedBatch} />
            <FilterSelect label="Subject" value={selectedSubject || null}
              options={filteredSubjects.map((s: any) => s.subject_details?.subject_name)}
              values={filteredSubjects.map((s: any) => String(s.subject))}
              onChange={(v) => { setSelectedSubject(v); setSelectedUnit(undefined); }}
              disabled={!selectedDepartment} />
            <FilterSelect label="Unit" value={selectedUnit || null}
              options={units.map((u: any) => u.name)} values={units.map((u: any) => u.id)}
              onChange={setSelectedUnit} disabled={!selectedSubject} />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {testsLoading ? (
        <LoadingPlaceholder text="Loading practice tests…" />
      ) : selectedUnit ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Tests header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Available Tests</h2>
              <Badge variant="secondary" className="font-semibold">{filteredTests.length}</Badge>
              {(currentSubjectName || currentUnitName) && (
                <span className="text-sm text-muted-foreground">
                  {[currentSubjectName, currentUnitName].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by title…"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-background border-border"
              />
            </div>
          </div>

          {filteredTests.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredTests.map((test) => (
                <AssessmentCard
                  key={test.id}
                  test={test}
                  onAnalytics={() => handleAnalytics(test)}
                  onEdit={() => handleEdit(test)}
                  onDelete={() => setTestToDelete(test)}
                  onStatusToggle={() => handleStatusToggle(test)}
                  isTogglingStatus={togglingStatusId === test.id}
                />
              ))}
            </div>
          ) : (
            <EmptyPlaceholder
              text="No practice tests exist for this unit yet. Create your first one!"
              icon={FileText}
            />
          )}
        </div>
      ) : (
        <SelectionRequiredPlaceholder />
      )}
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView('list')}
          className="rounded-full h-9 w-9 border border-border text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {view === 'create' ? 'Create Practice Test' : 'Edit Practice Test'}
          </h1>
          {(currentSubjectName || currentUnitName) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {[currentSubjectName, currentUnitName].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 max-w-sm bg-muted p-1 rounded-lg h-11">
          <TabsTrigger value="details" className="rounded-md font-semibold text-sm">
            General Details
          </TabsTrigger>
          <TabsTrigger value="questions" className="rounded-md font-semibold text-sm">
            Questions
          </TabsTrigger>
        </TabsList>

        {/* ── Details tab ─────────────────────── */}
        <TabsContent value="details" className="space-y-5 animate-in fade-in duration-200">
          {/* Basic Info */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Trophy className="h-4 w-4 text-primary" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: (e.target as HTMLInputElement).value })}
                    placeholder="e.g., Unit 2 — Functions Quiz"
                    className="h-10 bg-background border-border focus:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Difficulty *</label>
                  <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v as any })}>
                    <SelectTrigger className="h-10 bg-background border-border">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this practice test…"
                  className="min-h-[90px] bg-background border-border resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Instructions for Students</label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Specific instructions students should read before starting…"
                  className="min-h-[90px] bg-background border-border resize-none"
                />
              </div>
            </CardContent>
          </Card>


          {/* Configuration */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" /> Test Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex justify-between">
                    Duration (minutes) *
                    <span className="text-[10px] text-primary italic font-normal">Auto-synced</span>
                  </label>
                  <Input type="number"
                    value={formData.duration}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, duration: Number(e.target.value) || 0 })}
                    min={1} className="h-10 bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex justify-between">
                    Total Marks
                    <span className="text-[10px] text-primary italic font-normal">Auto-synced</span>
                  </label>
                  <Input type="number"
                    value={formData.total_marks}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, total_marks: Number(e.target.value) || 0 })}
                    min={1} className="h-10 bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex justify-between">
                    Passing Marks
                    <span className="text-[10px] text-primary italic font-normal">Auto-set (40%)</span>
                  </label>
                  <Input type="number"
                    value={formData.passing_marks}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, passing_marks: Number(e.target.value) || 0 })}
                    min={1} className="h-10 bg-background border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Publish Status</label>
                  <Select value={formData.publish_status} onValueChange={(v) => setFormData({ ...formData, publish_status: v as any })}>
                    <SelectTrigger className="h-10 bg-background border-border">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active (Published)</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2.5 pb-1">
                  <Checkbox
                    id="proctoring"
                    checked={formData.enable_proctoring}
                    onCheckedChange={(checked: boolean) => setFormData({ ...formData, enable_proctoring: !!checked })}
                  />
                  <label htmlFor="proctoring" className="text-sm font-medium text-foreground cursor-pointer select-none">
                    Enable Proctoring
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Questions tab ────────────────────── */}
        <TabsContent value="questions" className="space-y-5 animate-in fade-in duration-200">
          {/* Random Config */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Settings className="h-4 w-4 text-primary" /> Random Question Config
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['mcq_single', 'mcq_multiple', 'coding', 'descriptive'] as const).map((key) => (
                  <div key={key} className="space-y-1.5 flex flex-col">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-semibold text-muted-foreground">
                        {key === 'mcq_single' ? 'MCQ Single' : key === 'mcq_multiple' ? 'MCQ Multi' : key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <span className="text-[10px] text-muted-foreground">{availableQuestionsCount[key] || 0} avail</span>
                    </div>
                    <div>
                      <Input
                        type="number" min={0} max={availableQuestionsCount[key] || 0}
                        value={randomQuestionsConfig[key]}
                        onChange={e => setRandomQuestionsConfig({ ...randomQuestionsConfig, [key]: Number((e.target as HTMLInputElement).value) || 0 })}
                        className={`h-10 bg-background border-border ${randomQuestionsConfig[key] > (availableQuestionsCount[key] || 0) ? 'border-red-500 bg-red-50 focus-visible:ring-red-500' : ''}`}
                      />
                      {randomQuestionsConfig[key] > (availableQuestionsCount[key] || 0) && (
                        <p className="text-[10px] text-red-500 mt-1">
                          Only {availableQuestionsCount[key] || 0} questions available in bank.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Specify how many questions of each type to randomly select from the pool.
              </p>
            </CardContent>
          </Card>


          {/* Question Bank Selection */}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Select Questions (Practice Category)
              </h3>
              <Badge variant="secondary" className="font-semibold">{questions.length}</Badge>
            </div>

            <QuestionBank
              mode="selection"
              showSplitView={true}
              selectedQuestions={questions.map(q => q.id)}
              onQuestionsChange={handleQuestionsChange}
              subjectFilter={selectedSubject}
              unitFilter={selectedUnit}
              categoryFilter="practice"
              difficultyFilter={formData.difficulty}
              allowCreation={false}
            />

            {questions.length > 0 && (
              <div className="space-y-3 mt-6">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Selected Questions Preview
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {questions.map((q: any) => (
                    <QuestionPreview
                      key={q.id}
                      question={q}
                      onDelete={() => setQuestions(questions.filter((x: any) => x.id !== q.id))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Form Actions */}
        <div className="flex items-center justify-between border-t border-border pt-6 mt-6">
          {currentFormTab === 'questions' ? (
            <Button variant="outline" onClick={() => setCurrentFormTab('details')}
              className="border-border text-muted-foreground hover:text-foreground">
              ← Back to Details
            </Button>
          ) : <div />}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setView('list')} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={() => currentFormTab === 'details' ? setCurrentFormTab('questions') : handleSaveTest()}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-6 font-semibold"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {currentFormTab === 'details' ? 'Next: Questions →' : view === 'create' ? 'Create Test' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );

  const renderAnalytics = () => {
    const attemptedCount = submissions.length;
    let completedCount = 0;
    const uniqueCandidatesSet = new Set();
    
    // Prepare metrics
    submissions.forEach(s => {
      // Logic for completed: status = completed/submitted, or has marks
      if (s.status === 'submitted' || s.status === 'completed' || s.completed_at || s.submitted_at || s.marks !== undefined) {
          completedCount++;
      }
      if (s.user) {
          uniqueCandidatesSet.add(s.user);
      }
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('list')}
              className="rounded-full h-9 w-9 border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{selectedTest?.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Submission analytics & performance overview</p>
            </div>
          </div>
        </div>

        <AnalyticsStats
          attemptedCount={attemptedCount}
          completedCount={completedCount}
          uniqueCandidates={uniqueCandidatesSet.size}
          registeredCount={0}
          showRegistered={false}
        />

        <CandidatesTable
          submissions={submissions}
          loading={analyticsLoading}
          showProctoring={false}
          onViewDetails={(id) => {
            setSelectedSubmissionId(id);
            setView('submission-results');
          }}
        />
      </div>
    );
  };

  const renderSubmissionResults = () => {
    if (!selectedTest || !selectedSubmissionId) return null;
    return (
      <div className="animate-in fade-in duration-300 pb-20">
         <SubmissionAnalyticsView 
            submissionId={selectedSubmissionId}
            onBack={() => {
                setSelectedSubmissionId(null);
                setView('analytics');
            }}
         />
      </div>
    );
  };

  // ── Root render ───────────────────────────────────────────────────────────

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
            {isLoadingInitial ? (
              <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground text-sm font-medium">Loading curriculum data…</p>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                {view === 'list' && renderList()}
                {(view === 'create' || view === 'edit') && renderForm()}
                {view === 'analytics' && renderAnalytics()}
                {view === 'submission-results' && renderSubmissionResults()}
              </div>
            )}

            <DeleteDialog
              open={!!testToDelete}
              title={testToDelete?.title || ''}
              onCancel={() => setTestToDelete(null)}
              onConfirm={() => testToDelete && handleDelete(testToDelete.id)}
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CollegeAdminPracticeTest;
