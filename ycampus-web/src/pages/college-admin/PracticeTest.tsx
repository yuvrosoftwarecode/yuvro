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
import skillTestService, { SkillTest } from '@/services/skillTestService';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

import AnalyticsStats from '@/components/college-admin/analytics/AnalyticsStats';
import CandidatesTable from '@/components/college-admin/analytics/CandidatesTable';
import SubmissionAnalyticsView from '@/components/college-admin/analytics/SubmissionAnalyticsView';
import Builder from '@/components/common/Builder';

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
  const [collegeSubjects, setCollegeSubjects] = useState<any[]>([]);
  const [semesterSubjects, setSemesterSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
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
      setSubmissions(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load analytics.', variant: 'destructive' });
    } finally {
      setAnalyticsLoading(false);
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

  useEffect(() => {
    if (selectedUnit && view === 'list') loadPracticeTests(selectedUnit);
  }, [selectedUnit, view]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAnalytics = (test: SkillTest) => {
    setSelectedTest(test);
    loadAnalytics(test.id);
    setView('analytics');
  };

  const handleCreate = () => {
    setSelectedTest(null);
    setView('create');
  };

  const handleEdit = async (test: SkillTest) => {
    setSelectedTest(test);
    setView('edit');
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
    <Builder
      initialData={selectedTest}
      mode={view === 'create' ? 'create' : 'edit'}
      testType="practice"
      subjectFilter={selectedSubject}
      unitFilter={selectedUnit}
      contextSubtitle={[currentSubjectName, currentUnitName].filter(Boolean).join(' · ')}
      onSave={async (payload) => {
        try {
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
          toast({ title: 'Error', description: 'Failed to save test.', variant: 'destructive' });
        }
      }}
      onCancel={() => setView('list')}
    />
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
