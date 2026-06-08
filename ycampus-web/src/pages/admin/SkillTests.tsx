import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
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
  TrendingUp, Eye, EyeOff, ClipboardList, AlertCircle, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchUnitsBySubject, fetchSubjects } from '@/services/subjectService';
import skillTestService, { SkillTest, CreateSkillTestData } from '@/services/skillTestService';
import { fetchQuestionById, fetchQuestions } from '@/services/questionService';

import AnalyticsStats from '@/components/college-admin/analytics/AnalyticsStats';
import CandidatesTable from '@/components/college-admin/analytics/CandidatesTable';
import SubmissionAnalyticsView from '@/components/college-admin/analytics/SubmissionAnalyticsView';
import QuestionBank from '@/components/common/QuestionBank';

type ViewMode = 'list' | 'create' | 'edit' | 'analytics' | 'submission-results';

// ─── Sub-components ──────────────────────────────────────────────────────────

const FilterSelect = ({
  label, value, options, values, onChange, disabled, emptyMessage
}: {
  label: string; value: string | null; options: string[]; values?: string[];
  onChange: (v: string) => void; disabled?: boolean; emptyMessage?: string;
}) => (
  <div className="space-y-1.5 flex-1 min-w-[220px]">
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="bg-background h-10 border-border hover:border-primary/40 transition-colors">
        <SelectValue placeholder={`Select ${label}`} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 && emptyMessage ? (
          <SelectItem value="empty" disabled className="text-muted-foreground italic">
            {emptyMessage}
          </SelectItem>
        ) : (
          options.map((o, i) => (
            <SelectItem key={i} value={values ? values[i] : o}>{o}</SelectItem>
          ))
        )}
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
      <div className={`h-1 w-full transition-colors duration-300 ${isActive ? 'bg-primary' : 'bg-border'}`} />
      <CardContent className="p-4 flex items-center gap-4">
        <div className="shrink-0 p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
          <Trophy className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h4 className="font-semibold text-foreground truncate">{test.title}</h4>
            <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0 border ${diff.className}`}>
              {diff.label}
            </Badge>
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
    <p className="text-lg font-semibold text-foreground mb-2">Select Subject and Unit to Continue</p>
    <p className="text-muted-foreground text-sm max-w-xs text-center">
      Choose Subject → Unit above to manage and create skill tests.
    </p>
  </div>
);

const DeleteDialog = ({ open, title, onCancel, onConfirm }: {
  open: boolean; title: string; onCancel: () => void; onConfirm: () => void;
}) => (
  <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent className="rounded-xl border-border max-w-md">
      <AlertDialogHeader className="space-y-2">
        <AlertDialogTitle className="text-xl font-bold text-foreground">Delete Skill Test?</AlertDialogTitle>
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

const AdminSkillTests = () => {
  const { toast } = useToast();

  const [view, setView] = useState<ViewMode>('list');
  const [testsLoading, setTestsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [availableQuestionsCount, setAvailableQuestionsCount] = useState<Record<string, number>>({ mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 });
  const [averageDurations, setAverageDurations] = useState<Record<string, number>>({ mcq_single: 1, mcq_multiple: 2, coding: 30, descriptive: 15 });

  const [collegeSubjects, setCollegeSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);

  const [activeTab, setActiveTab] = useState<'skill-tests' | 'assessments'>('skill-tests');
  const [skillTests, setSkillTests] = useState<SkillTest[]>([]);
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

  const filteredTests = skillTests.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadInitialData = async () => {
    try {
      setIsLoadingInitial(true);
      const subs = await fetchSubjects();
      // Only assessment product type
      const assessmentSubjects = subs.filter(s => s.product_type === 'assessments');
      setCollegeSubjects(assessmentSubjects);
    } catch {
      toast({ title: 'Error', description: 'Failed to load assessment subjects.', variant: 'destructive' });
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

  const loadSkillTests = async (unitId: string) => {
    try {
      setTestsLoading(true);
      const data = await skillTestService.getSkillTestsByUnit(unitId, 'practice');
      setSkillTests(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load skill tests.', variant: 'destructive' });
    } finally {
      setTestsLoading(false);
    }
  };

  const loadAssessments = async (subjectId: string) => {
    try {
      setTestsLoading(true);
      const data = await skillTestService.getSkillTests({
        subject: subjectId,
        unit: 'null',
        test_type: 'assessment'
      });
      setSkillTests(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load assessments.', variant: 'destructive' });
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
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSubject) { loadUnits(selectedSubject); setSelectedUnit(''); }
    else { setUnits([]); setSelectedUnit(''); }
  }, [selectedSubject]);

  useEffect(() => {
    if (activeTab === 'skill-tests') {
      if (selectedUnit && view === 'list') {
        loadSkillTests(selectedUnit);
      } else {
        setSkillTests([]);
      }
    } else {
      if (selectedSubject && view === 'list') {
        loadAssessments(selectedSubject);
      } else {
        setSkillTests([]);
      }
    }
  }, [selectedSubject, selectedUnit, activeTab, view]);

  // Fetch available questions count from pool
  useEffect(() => {
    const fetchCounts = async () => {
      if (!selectedSubject) return;
      try {
        const qs = await fetchQuestions({
          subject: selectedSubject,
          unit: activeTab === 'skill-tests' ? (selectedUnit || undefined) : undefined,
          categories: 'skill_test',
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
  }, [selectedSubject, selectedUnit, activeTab, formData.difficulty]);

  // Auto-calculate configurations
  useEffect(() => {
    const getEstimate = (type: string) => {
      const diff = formData.difficulty;
      if (type === 'coding') return { marks: 10, duration: 30 };
      if (type === 'descriptive') return { marks: 5, duration: 15 };
      if (diff === 'easy') return { marks: 1, duration: 1 };
      if (diff === 'hard') return { marks: 4, duration: 5 };
      return { marks: 2, duration: 2 };
    };

    let totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    let totalDuration = questions.reduce((sum, q) => {
      const qDur = Number(q.duration) || 0;
      if (qDur === 60 || qDur === 0) {
        const est = getEstimate(q.type || 'mcq_single');
        return sum + est.duration;
      }
      return sum + qDur;
    }, 0);
    
    Object.entries(randomQuestionsConfig).forEach(([type, count]) => {
      if (count > 0) {
        const est = getEstimate(type);
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
      setSkillTests(prev =>
        prev.map(t => t.id === test.id ? { ...t, publish_status: newStatus } : t)
      );
      toast({ title: 'Status updated', description: `"${test.title}" is now ${newStatus === 'active' ? 'published' : 'set to draft'}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedSubject) return;
    if (activeTab === 'skill-tests' && !selectedUnit) return;
    try {
      setAutoGenerating(true);
      const subjectObj = collegeSubjects.find(s => String(s.id) === selectedSubject);
      const unitObj = units.find(u => u.id === selectedUnit);
      const subjectName = subjectObj?.subject_name || '';
      const unitName = unitObj?.name || '';
      
      const testsConfig = activeTab === 'skill-tests' ? [
        {
          title: `${unitName} - Easy Skill Test 1`,
          difficulty: 'easy' as const,
          duration: 20,
          total_marks: 15,
          passing_marks: 6,
          enable_proctoring: true,
          questions_random_config: { mcq_single: 10, mcq_multiple: 5, coding: 0, descriptive: 0 }
        },
        {
          title: `${unitName} - Easy Skill Test 2`,
          difficulty: 'easy' as const,
          duration: 20,
          total_marks: 15,
          passing_marks: 6,
          enable_proctoring: true,
          questions_random_config: { mcq_single: 10, mcq_multiple: 5, coding: 0, descriptive: 0 }
        },
        {
          title: `${unitName} - Medium Skill Test`,
          difficulty: 'medium' as const,
          duration: 30,
          total_marks: 20,
          passing_marks: 8,
          enable_proctoring: true,
          questions_random_config: { mcq_single: 15, mcq_multiple: 5, coding: 0, descriptive: 0 }
        },
        {
          title: `${unitName} - Hard Skill Test`,
          difficulty: 'hard' as const,
          duration: 45,
          total_marks: 25,
          passing_marks: 10,
          enable_proctoring: true,
          questions_random_config: { mcq_single: 15, mcq_multiple: 10, coding: 0, descriptive: 0 }
        }
      ] : [
        {
          title: `${subjectName} - Easy Subject Assessment`,
          difficulty: 'easy' as const,
          duration: 30,
          total_marks: 25,
          passing_marks: 10,
          enable_proctoring: true,
          questions_random_config: { mcq_single: 15, mcq_multiple: 10, coding: 0, descriptive: 0 }
        },
        {
          title: `${subjectName} - Medium Subject Assessment`,
          difficulty: 'medium' as const,
          duration: 45,
          total_marks: 40,
          passing_marks: 16,
          enable_proctoring: true,
          questions_random_config: { mcq_single: 20, mcq_multiple: 10, coding: 0, descriptive: 0 }
        },
        {
          title: `${subjectName} - Hard Subject Assessment`,
          difficulty: 'hard' as const,
          duration: 60,
          total_marks: 50,
          passing_marks: 20,
          enable_proctoring: true,
          questions_random_config: { mcq_single: 25, mcq_multiple: 15, coding: 0, descriptive: 0 }
        }
      ];

      for (const conf of testsConfig) {
        await skillTestService.createSkillTest({
          title: conf.title,
          description: activeTab === 'skill-tests'
            ? `Automated MCQ skill assessment for unit ${unitName} in ${subjectName}.`
            : `Automated MCQ subject assessment for ${subjectName}.`,
          instructions: 'Please answer all questions within the given duration. Proctoring and tab monitoring may be active.',
          difficulty: conf.difficulty,
          duration: conf.duration,
          total_marks: conf.total_marks,
          passing_marks: conf.passing_marks,
          enable_proctoring: conf.enable_proctoring,
          publish_status: 'active',
          test_type: activeTab === 'skill-tests' ? 'practice' : 'assessment',
          subject: selectedSubject,
          unit: activeTab === 'skill-tests' ? selectedUnit : undefined,
          questions_config: { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] },
          questions_random_config: conf.questions_random_config
        });
      }

      toast({ 
        title: 'Suite Created', 
        description: activeTab === 'skill-tests'
          ? 'Instantly created and activated 2 Easy, 1 Medium, and 1 Hard Skill Tests.'
          : 'Instantly created and activated 1 Easy, 1 Medium, and 1 Hard Subject Assessments.' 
      });

      if (activeTab === 'skill-tests') {
        if (selectedUnit) loadSkillTests(selectedUnit);
      } else {
        if (selectedSubject) loadAssessments(selectedSubject);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to auto-generate skill tests suite.', variant: 'destructive' });
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleQuestionsChange = async (selectedIds: string[]) => {
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
      toast({ title: 'Error', description: 'Skill test title is required.', variant: 'destructive' });
      return;
    }
    try {
      setIsSaving(true);
      const savedQuestionIds = {
        mcq_single: [] as string[],
        mcq_multiple: [] as string[],
        coding: [] as string[],
        descriptive: [] as string[]
      };

      for (const q of questions) {
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
        publish_status: formData.publish_status, test_type: activeTab === 'skill-tests' ? 'practice' : 'assessment',
        subject: selectedSubject,
        unit: activeTab === 'skill-tests' ? selectedUnit : undefined,
        questions_config: savedQuestionIds,
        questions_random_config: randomQuestionsConfig,
      };

      if (view === 'create') {
        await skillTestService.createSkillTest(payload);
        toast({ title: 'Created', description: 'Skill test/Assessment created successfully.' });
      } else if (selectedTest) {
        await skillTestService.updateSkillTest(selectedTest.id, payload);
        toast({ title: 'Saved', description: 'Skill test/Assessment updated successfully.' });
      }

      setView('list');
      if (activeTab === 'skill-tests') {
        if (selectedUnit) loadSkillTests(selectedUnit);
      } else {
        if (selectedSubject) loadAssessments(selectedSubject);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save skill test/Assessment.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await skillTestService.deleteSkillTest(id);
      toast({ title: 'Deleted', description: 'Skill test/Assessment removed successfully.' });
      if (activeTab === 'skill-tests') {
        if (selectedUnit) loadSkillTests(selectedUnit);
      } else {
        if (selectedSubject) loadAssessments(selectedSubject);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete skill test/Assessment.', variant: 'destructive' });
    } finally {
      setTestToDelete(null);
    }
  };

  // ── Breadcrumbs ──────────────────────────────────────────────────────────

  const currentSubjectName = collegeSubjects.find(s => String(s.id) === selectedSubject)?.subject_name || '';
  const currentUnitName = units.find(u => u.id === selectedUnit)?.name || '';

  // ── Render Views ──────────────────────────────────────────────────────────

  const renderList = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Skill Tests & Assessments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Fully managed skill assessment suites for assessment products.</p>
        </div>
        <div className="flex items-center gap-2">
          {((activeTab === 'skill-tests' && selectedUnit) || (activeTab === 'assessments' && selectedSubject)) && (
            <Button
              onClick={handleAutoGenerate}
              disabled={autoGenerating}
              variant="outline"
              className="border-primary/20 text-primary hover:bg-primary/10 gap-2 h-10 px-4 font-semibold shrink-0"
            >
              {autoGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Auto-Generate Suite
            </Button>
          )}
          <Button
            onClick={handleCreate}
            disabled={activeTab === 'skill-tests' ? !selectedUnit : !selectedSubject}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-10 px-5 font-semibold shrink-0"
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'skill-tests' ? 'New Skill Test' : 'New Assessment'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="bg-muted p-1 rounded-lg h-11 mb-6 max-w-md grid grid-cols-2">
          <TabsTrigger value="skill-tests" className="rounded-md font-semibold text-sm">
            Unit Skill Tests
          </TabsTrigger>
          <TabsTrigger value="assessments" className="rounded-md font-semibold text-sm">
            Subject Assessments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skill-tests" className="space-y-6 mt-0">
          <Card className="border-border bg-card">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-wrap gap-4">
                <FilterSelect label="Subject" value={selectedSubject || null}
                  options={collegeSubjects.map(s => s.subject_name)}
                  values={collegeSubjects.map(s => String(s.id))}
                  onChange={(v) => { setSelectedSubject(v); setSelectedUnit(''); }}
                  disabled={isLoadingInitial}
                  emptyMessage="No assessment subjects found" />
                <FilterSelect label="Unit" value={selectedUnit || null}
                  options={units.map(u => u.name)} values={units.map(u => u.id)}
                  onChange={setSelectedUnit} disabled={!selectedSubject}
                  emptyMessage="No units in subject" />
              </div>
            </CardContent>
          </Card>

          {testsLoading ? (
            <LoadingPlaceholder text="Loading skill tests…" />
          ) : selectedUnit ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Available Suite</h2>
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
                    placeholder="Filter suite by title…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
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
                  text="No skill tests exist for this unit yet. Auto-generate the standard suite above!"
                  icon={FileText}
                />
              )}
            </div>
          ) : (
            <SelectionRequiredPlaceholder />
          )}
        </TabsContent>

        <TabsContent value="assessments" className="space-y-6 mt-0">
          <Card className="border-border bg-card">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-wrap gap-4">
                <FilterSelect label="Subject" value={selectedSubject || null}
                  options={collegeSubjects.map(s => s.subject_name)}
                  values={collegeSubjects.map(s => String(s.id))}
                  onChange={(v) => { setSelectedSubject(v); setSelectedUnit(''); }}
                  disabled={isLoadingInitial}
                  emptyMessage="No assessment subjects found" />
              </div>
            </CardContent>
          </Card>

          {testsLoading ? (
            <LoadingPlaceholder text="Loading assessments…" />
          ) : selectedSubject ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Subject Assessments</h2>
                  <Badge variant="secondary" className="font-semibold">{filteredTests.length}</Badge>
                  {currentSubjectName && (
                    <span className="text-sm text-muted-foreground">
                      {currentSubjectName}
                    </span>
                  )}
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter assessments by title…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
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
                  text="No assessments exist for this subject yet. Auto-generate the standard suite above!"
                  icon={FileText}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 rounded-xl border border-dashed border-border bg-card">
              <div className="p-4 bg-muted rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">Select Subject to Continue</p>
              <p className="text-muted-foreground text-sm max-w-xs text-center">
                Choose Subject above to manage and create subject-level assessments.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView('list')}
          className="rounded-full h-9 w-9 border border-border text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {view === 'create' ? 'Create Skill Test' : 'Edit Skill Test'}
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
            Questions Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-5 animate-in fade-in duration-200">
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
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Easy Skill Test 1"
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
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this skill test…"
                  className="min-h-[90px] bg-background border-border resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Instructions for Students</label>
                <Textarea
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Specific instructions students should read before starting…"
                  className="min-h-[90px] bg-background border-border resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" /> Configuration
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
                    onChange={e => setFormData({ ...formData, duration: Number(e.target.value) || 0 })}
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
                    onChange={e => setFormData({ ...formData, total_marks: Number(e.target.value) || 0 })}
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
                    onChange={e => setFormData({ ...formData, passing_marks: Number(e.target.value) || 0 })}
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
                    Enable Proctoring & Camera Snapshots
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-5 animate-in fade-in duration-200">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Settings className="h-4 w-4 text-primary" /> Random Question Pool Config
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
                        onChange={e => setRandomQuestionsConfig({ ...randomQuestionsConfig, [key]: Number(e.target.value) || 0 })}
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

          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Selected Fixed Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <QuestionBank
                mode="selection"
                selectedQuestions={questions.map(q => q.id)}
                onQuestionsChange={handleQuestionsChange}
                subjectFilter={selectedSubject}
                unitFilter={selectedUnit || undefined}
                categoryFilter="skill_test"
                showSplitView={true}
              />

              {questions.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden mt-6 bg-muted/20">
                  <div className="bg-muted/40 px-4 py-2 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground">Fixed List Summary ({questions.length} questions)</span>
                  </div>
                  <div className="divide-y divide-border">
                    {questions.map((q, idx) => (
                      <div key={q.id || idx} className="p-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{q.questionText || 'Loading text...'}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Type: <span className="font-semibold uppercase">{q.type}</span> · Marks: {q.marks}
                          </p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleQuestionsChange(questions.filter(item => item.id !== q.id).map(item => item.id))}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between border-t border-border pt-5">
        <Button variant="outline" onClick={() => setView('list')} className="border-border">Cancel</Button>
        <Button onClick={handleSaveTest} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Skill Test
        </Button>
      </div>
    </div>
  );

  const renderAnalytics = () => {
    if (!selectedTest) return null;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('list')}
            className="rounded-full h-9 w-9 border border-border text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{selectedTest.title}</p>
          </div>
        </div>

        {analyticsLoading ? (
          <LoadingPlaceholder text="Analyzing performance records…" />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Attempts" value={submissions.length} icon={Users} colorClass="bg-primary/10 text-primary" />
              <StatCard
                label="Passing Rate"
                value={`${
                  submissions.length > 0
                    ? Math.round(
                        (submissions.filter(s => (s.score ?? 0) >= selectedTest.passing_marks).length / submissions.length) * 100
                      )
                    : 0
                }%`}
                icon={TrendingUp}
                colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              />
              <StatCard
                label="Average Score"
                value={
                  submissions.length > 0
                    ? Math.round(submissions.reduce((acc, curr) => acc + (curr.score ?? 0), 0) / submissions.length)
                    : 0
                }
                icon={Trophy}
                colorClass="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              />
              <StatCard label="Total Marks" value={selectedTest.total_marks} icon={ClipboardList} colorClass="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" />
            </div>

            <Tabs defaultValue="candidates" className="w-full">
              <TabsList className="mb-4 bg-muted max-w-sm rounded-lg">
                <TabsTrigger value="candidates">Candidates List</TabsTrigger>
                <TabsTrigger value="charts">Performance Distribution</TabsTrigger>
              </TabsList>

              <TabsContent value="candidates">
                <Card className="border-border">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-base font-semibold">Submissions & Grading</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <CandidatesTable
                      submissions={submissions}
                      onViewDetails={(id: string) => {
                        setSelectedSubmissionId(id);
                        setView('submission-results');
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="charts">
                <Card className="border-border">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary" /> Grade Curves
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <AnalyticsStats submissions={submissions} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    );
  };

  const renderSubmissionDetails = () => {
    if (!selectedSubmissionId) return null;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('analytics')}
            className="rounded-full h-9 w-9 border border-border text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Submission Analysis</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Attempt Detailed Answer-by-Answer Grade Report</p>
          </div>
        </div>

        <SubmissionAnalyticsView
          submissionId={selectedSubmissionId}
          onBack={() => setView('analytics')}
        />
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6 overflow-y-auto max-w-[1400px] mx-auto w-full">
          {view === 'list' && renderList()}
          {(view === 'create' || view === 'edit') && renderForm()}
          {view === 'analytics' && renderAnalytics()}
          {view === 'submission-results' && renderSubmissionDetails()}
        </main>
      </div>

      <DeleteDialog
        open={!!testToDelete}
        title={testToDelete?.title || ''}
        onCancel={() => setTestToDelete(null)}
        onConfirm={() => testToDelete && handleDelete(testToDelete.id)}
      />
    </SidebarProvider>
  );
};

export default AdminSkillTests;
