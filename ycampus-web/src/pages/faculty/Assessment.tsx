import React, { useState, useEffect, useMemo } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileText, Plus, Search, Loader2, Trophy, Clock, Users, Trash2, Edit,
  BarChart2, ArrowLeft, Eye, EyeOff, ClipboardList, AlertCircle, BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFacultyAssignments, SectionSubjectFaculty, fetchUnitsBySubject } from '@/services/subjectService';
import skillTestService, { SkillTest } from '@/services/skillTestService';

// Reusing Admin components for Test creation
import Builder from '@/components/common/Builder';
import AnalyticsStats from '@/components/college-admin/analytics/AnalyticsStats';
import CandidatesTable from '@/components/college-admin/analytics/CandidatesTable';
import SubmissionAnalyticsView from '@/components/college-admin/analytics/SubmissionAnalyticsView';

type ViewMode = 'list' | 'create' | 'edit' | 'analytics' | 'submission-results';

// --- Sub-components ---

const FilterSelect = ({ label, value, options, values, onChange, disabled }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-[#020817] mb-2 block font-sans">{label}</label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors shadow-none">
        <SelectValue placeholder={`Select ${label}`} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o: string, i: number) => (
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

const AssessmentCard = ({ test, onAnalytics, onEdit, onDelete, onStatusToggle, isTogglingStatus }: any) => {
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
    <p className="text-lg font-semibold text-foreground mb-2">Select a Unit to Continue</p>
    <p className="text-muted-foreground text-sm max-w-xs text-center">
      Choose Batch → Department → Subject → Section → Unit above to manage assessments.
    </p>
  </div>
);

const DeleteDialog = ({ open, title, onCancel, onConfirm }: any) => (
  <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent className="rounded-xl border-border max-w-md">
      <AlertDialogHeader className="space-y-2">
        <AlertDialogTitle className="text-xl font-bold text-foreground">Delete Assessment?</AlertDialogTitle>
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

// --- Main component ---

const Assessment = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [testsLoading, setTestsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [allAssignments, setAllAssignments] = useState<SectionSubjectFaculty[]>([]);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [units, setUnits] = useState<{id: string, name: string}[]>([]);

  const [assessments, setAssessments] = useState<SkillTest[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<SkillTest | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assessmentToDelete, setAssessmentToDelete] = useState<SkillTest | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const data = await getFacultyAssignments();
      setAllAssignments(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load assignments", variant: "destructive" });
    }
  };

  // Cascading Filters Logic
  const uniqueBatches = useMemo(() => {
    const b = new Set<string>();
    allAssignments.forEach(a => { if (a.semester_subject_details?.batch_name) b.add(a.semester_subject_details.batch_name); });
    return Array.from(b).sort();
  }, [allAssignments]);

  const uniqueDepartments = useMemo(() => {
    if (!selectedBatch) return [];
    const depts = new Map<string, string>();
    allAssignments.filter(a => a.semester_subject_details?.batch_name === selectedBatch).forEach(a => {
      if (a.semester_subject_details?.department_id) depts.set(String(a.semester_subject_details.department_id), a.semester_subject_details.department_name || '');
    });
    return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
  }, [allAssignments, selectedBatch]);

  const uniqueSubjects = useMemo(() => {
    if (!selectedBatch || !selectedDepartment) return [];
    const subs = new Map<string, string>();
    allAssignments.filter(a => a.semester_subject_details?.batch_name === selectedBatch && String(a.semester_subject_details?.department_id) === selectedDepartment).forEach(a => {
      const details = a.semester_subject_details?.subject_details;
      if (details) subs.set(String(details.id), details.subject_name || details.name || 'Unknown');
    });
    return Array.from(subs.entries()).map(([id, name]) => ({ id, name }));
  }, [allAssignments, selectedBatch, selectedDepartment]);

  const uniqueSections = useMemo(() => {
    if (!selectedBatch || !selectedDepartment || !selectedSubject) return [];
    return allAssignments.filter(a => a.semester_subject_details?.batch_name === selectedBatch && String(a.semester_subject_details?.department_id) === selectedDepartment && String(a.semester_subject_details?.subject_details?.id) === selectedSubject)
      .map(a => ({ id: String(a.id), name: a.section_name || `Section ${a.section}` }));
  }, [allAssignments, selectedBatch, selectedDepartment, selectedSubject]);

  useEffect(() => {
    if (selectedSubject) loadUnits(selectedSubject);
    else { setUnits([]); setSelectedUnit(''); }
  }, [selectedSubject]);

  const loadUnits = async (subjectId: string) => {
    try {
      const data = await fetchUnitsBySubject(subjectId);
      setUnits(data.map(u => ({ id: u.id, name: u.name })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedUnit && view === 'list') loadAssessments(selectedUnit);
  }, [selectedUnit, view]);

  const loadAssessments = async (unitId: string) => {
    try {
      setTestsLoading(true);
      const data = await skillTestService.getSkillTestsByUnit(unitId, 'assessment');
      setAssessments(data);
    } catch (e) { toast({ title: "Error", description: "Failed to load assessments", variant: "destructive" }); }
    finally { setTestsLoading(false); }
  };

  const loadAnalytics = async (testId: string) => {
    try {
      setAnalyticsLoading(true);
      const data = await skillTestService.getSkillTestSubmissions(testId);
      setSubmissions(data);
    } catch (e) { toast({ title: "Error", description: "Failed to load analytics", variant: "destructive" }); }
    finally { setAnalyticsLoading(false); }
  };

  const handleCreate = () => { setSelectedAssessment(null); setView('create'); };
  const handleEdit = async (test: SkillTest) => { setSelectedAssessment(test); setView('edit'); };
  const handleAnalytics = (test: SkillTest) => { setSelectedAssessment(test); loadAnalytics(test.id); setView('analytics'); };

  const handleStatusToggle = async (test: SkillTest) => {
    const newStatus = test.publish_status === 'active' ? 'draft' : 'active';
    try {
      setTogglingStatusId(test.id);
      await skillTestService.updateSkillTest(test.id, { publish_status: newStatus });
      setAssessments(prev => prev.map(t => t.id === test.id ? { ...t, publish_status: newStatus } : t));
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
      toast({ title: "Deleted", description: "Assessment removed." });
      if (selectedUnit) loadAssessments(selectedUnit);
    } catch (e) { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
    finally { setAssessmentToDelete(null); }
  };

  const filteredAssessments = assessments.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentSubjectName = uniqueSubjects.find(s => s.id === selectedSubject)?.name || '';
  const currentUnitName = units.find(u => u.id === selectedUnit)?.name || '';

  // Render Helpers
  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessment Manager</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and evaluate student competency through Assessments.</p>
        </div>
        <Button onClick={handleCreate} disabled={!selectedUnit}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-10 px-5 font-semibold">
          <Plus className="h-4 w-4" /> New Assessment
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FilterSelect label="Batch" value={selectedBatch} options={uniqueBatches} onChange={(v: string) => { setSelectedBatch(v); setSelectedDepartment(''); setSelectedSubject(''); setSelectedSection(''); setSelectedUnit(''); }} />
            <FilterSelect label="Department" value={selectedDepartment} options={uniqueDepartments.map(d=>d.name)} values={uniqueDepartments.map(d=>d.id)} onChange={(v: string) => { setSelectedDepartment(v); setSelectedSubject(''); setSelectedSection(''); setSelectedUnit(''); }} disabled={!selectedBatch} />
            <FilterSelect label="Subject" value={selectedSubject} options={uniqueSubjects.map(s=>s.name)} values={uniqueSubjects.map(s=>s.id)} onChange={(v: string) => { setSelectedSubject(v); setSelectedSection(''); setSelectedUnit(''); }} disabled={!selectedDepartment} />
            <FilterSelect label="Section" value={selectedSection} options={uniqueSections.map(s=>s.name)} values={uniqueSections.map(s=>s.id)} onChange={(v: string) => { setSelectedSection(v); setSelectedUnit(''); }} disabled={!selectedSubject} />
            <FilterSelect label="Unit" value={selectedUnit} options={units.map(u=>u.name)} values={units.map(u=>u.id)} onChange={setSelectedUnit} disabled={!selectedSection} />
          </div>
        </CardContent>
      </Card>

      {testsLoading ? (
        <LoadingPlaceholder text="Loading assessments…" />
      ) : selectedUnit ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Available Assessments</h2>
              <Badge variant="secondary" className="font-semibold">{filteredAssessments.length}</Badge>
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-background border-border"
              />
            </div>
          </div>

          {filteredAssessments.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {filteredAssessments.map((test) => (
                <AssessmentCard
                  key={test.id}
                  test={test}
                  onAnalytics={() => handleAnalytics(test)}
                  onEdit={() => handleEdit(test)}
                  onDelete={() => setAssessmentToDelete(test)}
                  onStatusToggle={() => handleStatusToggle(test)}
                  isTogglingStatus={togglingStatusId === test.id}
                />
              ))}
            </div>
          ) : (
            <EmptyPlaceholder text="No assessments exist for this unit yet." icon={FileText} />
          )}
        </div>
      ) : (
        <SelectionRequiredPlaceholder />
      )}
    </div>
  );

  const renderForm = () => (
    <Builder
      initialData={selectedAssessment}
      mode={view === 'create' ? 'create' : 'edit'}
      testType="assessment"
      subjectFilter={selectedSubject}
      unitFilter={selectedUnit}
      contextSubtitle={[currentSubjectName, currentUnitName].filter(Boolean).join(' · ')}
      onSave={async (payload) => {
        try {
          if (view === 'create') {
            await skillTestService.createSkillTest(payload);
            toast({ title: 'Created', description: 'Assessment created successfully.' });
          } else if (selectedAssessment) {
            await skillTestService.updateSkillTest(selectedAssessment.id, payload);
            toast({ title: 'Saved', description: 'Assessment updated successfully.' });
          }
          setView('list');
          if (selectedUnit) loadAssessments(selectedUnit);
        } catch {
          toast({ title: 'Error', description: 'Failed to save assessment.', variant: 'destructive' });
        }
      }}
      onCancel={() => setView('list')}
    />
  );

  const renderAnalytics = () => {
    const attemptedCount = submissions.length;
    let completedCount = 0;
    const uniqueCandidatesSet = new Set();
    submissions.forEach(s => {
      if (s.status === 'submitted' || s.status === 'completed' || s.completed_at || s.submitted_at || s.marks !== undefined) completedCount++;
      if (s.user) uniqueCandidatesSet.add(s.user);
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => setView('list')}
            className="rounded-full h-9 w-9 border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{selectedAssessment?.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Submission analytics & performance overview</p>
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
          showProctoring={true}
          onViewDetails={(id) => {
            setSelectedSubmissionId(id);
            setView('submission-results');
          }}
        />
      </div>
    );
  };

  const renderSubmissionResults = () => {
    if (!selectedAssessment || !selectedSubmissionId) return null;
    return (
      <div className="animate-in fade-in duration-300 pb-20">
        <SubmissionAnalyticsView
          submissionId={selectedSubmissionId}
          onBack={() => { setSelectedSubmissionId(null); setView('analytics'); }}
        />
      </div>
    );
  };

  return (
    <FacultyLayout>
      {view === 'list' && renderList()}
      {(view === 'create' || view === 'edit') && renderForm()}
      {view === 'analytics' && renderAnalytics()}
      {view === 'submission-results' && renderSubmissionResults()}

      <DeleteDialog
        open={!!assessmentToDelete}
        title={assessmentToDelete?.title || ''}
        onCancel={() => setAssessmentToDelete(null)}
        onConfirm={() => assessmentToDelete && handleDelete(assessmentToDelete.id)}
      />
    </FacultyLayout>
  );
};

export default Assessment;