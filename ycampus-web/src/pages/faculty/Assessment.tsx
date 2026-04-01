import React, { useState, useEffect, useMemo } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Plus, Search, Loader2, Trophy, Clock, Users, Trash2, Edit, BarChart2, ArrowLeft, Send, Save, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFacultyAssignments, SectionSubjectFaculty, fetchUnitsBySubject } from '@/services/subjectService';
import skillTestService, { SkillTest } from '@/services/skillTestService';
import { cn } from '@/lib/utils';

// Reusing Admin components for Test creation
import { QuestionForm } from '@/components/admin/test-questions/QuestionForm';
import { QuestionPreview } from '@/components/admin/test-questions/QuestionPreview';
import { TestSettings } from '@/components/admin/test-questions/TestSettings';

type ViewMode = 'list' | 'create' | 'edit' | 'analytics';

// --- Sub-components (Declared at top to avoid use-before-def issues) ---

const FilterSelect = ({ label, value, options, values, onChange, disabled, highlight }: any) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{label}</Label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("bg-white/60", highlight && "border-primary/30 ring-primary/5 shadow-sm")}>
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

const AssessmentCard = ({ test, onAnalytics, onEdit, onDelete }: any) => (
  <Card className="group border-none shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-4 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors">
        <Trophy className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-gray-900 truncate">{test.title}</h4>
          <Badge className="text-[10px] uppercase bg-gray-50 border-gray-100 text-gray-500">{test.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground/70 tracking-tight">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {test.duration}m</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {test.participants_count || 0}</span>
          <span className="flex items-center gap-1 uppercase tracking-wider">Status: <span className="text-amber-600">{test.publish_status}</span></span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onAnalytics} className="h-9 w-9 border border-gray-100 hover:bg-indigo-50 hover:text-indigo-600"><BarChart2 className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-9 w-9 border border-gray-100 hover:bg-blue-50 hover:text-blue-600"><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-9 w-9 text-rose-500 hover:bg-rose-50 border border-gray-100"><Trash2 className="w-4 h-4" /></Button>
      </div>
    </CardContent>
  </Card>
);

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <Card className="border-none shadow-sm">
    <CardContent className="p-5 flex items-center gap-4">
      <div className={cn("p-3 rounded-2xl bg-gray-50", color.replace('text', 'bg').replace('600', '100'))}><Icon className={cn("w-5 h-5", color)} /></div>
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</p>
        <p className="text-xl font-extrabold text-gray-900 leading-tight">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const FullLoadingPlaceholder = ({ text }: any) => (
  <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-100 opacity-80">
    <Loader2 className="w-10 h-10 text-primary/40 animate-spin mb-4" />
    <p className="text-muted-foreground font-bold tracking-tighter uppercase text-xs">{text}</p>
  </div>
);

const EmptyPlaceholder = ({ text }: any) => (
  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-100 italic text-muted-foreground font-medium">{text}</div>
);

const SelectionRequiredPlaceholder = () => (
  <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-gray-200 group">
    <div className="relative p-7 bg-white shadow-xl rounded-3xl border border-gray-50 mb-8 group-hover:scale-110 transition-transform duration-500">
      <FileText className="w-12 h-12 text-primary/10 group-hover:text-primary transition-colors duration-500" />
    </div>
    <p className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Identity Required</p>
    <p className="text-muted-foreground max-w-sm text-center font-medium leading-relaxed px-6">Provide Batch, Faculty, Subject, Section, and Unit parameters to access evaluations.</p>
  </div>
);

const DeleteDialog = ({ open, title, onCancel, onConfirm }: any) => (
  <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-8 max-w-md">
      <AlertDialogHeader className="space-y-4">
        <AlertDialogTitle className="text-2xl font-black text-gray-900 tracking-tighter">Discard Assessment?</AlertDialogTitle>
        <AlertDialogDescription className="text-base font-medium text-gray-500 leading-relaxed italic">
          Are you sure you want to delete <span className="text-rose-500 not-italic font-black">"{title}"</span>? This will permanently erase student records.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex justify-end gap-3 mt-10">
        <AlertDialogCancel className="bg-transparent border-none text-gray-400 hover:text-gray-900 font-black text-xs uppercase tracking-widest px-8">Abort</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl px-10 h-12 font-black shadow-lg shadow-rose-100 active:scale-95 transition-all">Destroy Data</AlertDialogAction>
      </div>
    </AlertDialogContent>
  </AlertDialog>
);

// --- Main component ---

const Assessment = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [testsLoading, setTestsLoading] = useState(false);
  const [allAssignments, setAllAssignments] = useState<SectionSubjectFaculty[]>([]);
  
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
  
  // Create/Edit State
  const [questions, setQuestions] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '10:00',
    duration: 1
  });
  const [formData, setFormData] = useState({ title: '', description: '' });

  // Analytics State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  // Actions
  const handleCreate = () => {
    setFormData({ title: '', description: '' });
    setQuestions([]);
    setView('create');
  };

  const handleEdit = (test: SkillTest) => {
    setSelectedAssessment(test);
    setFormData({ title: test.title, description: test.description });
    setQuestions([]); 
    setView('edit');
  };

  const handleAnalytics = (test: SkillTest) => {
    setSelectedAssessment(test);
    loadAnalytics(test.id);
    setView('analytics');
  };

  const handleDelete = async (id: string) => {
    try {
      await skillTestService.deleteSkillTest(id);
      toast({ title: "Deleted", description: "Assessment removed." });
      if (selectedUnit) loadAssessments(selectedUnit);
    } catch (e) { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
    finally { setAssessmentToDelete(null); }
  };

  const handleSaveAssessment = async () => {
    if (!formData.title) return toast({ title: "Error", description: "Title is required", variant: "destructive" });
    
    try {
      const data = {
        title: formData.title,
        description: formData.description,
        difficulty: 'medium' as const,
        duration: settings.duration * 60,
        subject: selectedSubject,
        unit: selectedUnit,
        publish_status: 'draft' as const,
        test_type: 'assessment' as const
      };

      if (view === 'create') await skillTestService.createSkillTest(data);
      else if (selectedAssessment) await skillTestService.updateSkillTest(selectedAssessment.id, data);

      toast({ title: "Success", description: `Assessment ${view === 'create' ? 'created' : 'updated'} successfully.` });
      setView('list');
    } catch (e) { toast({ title: "Error", description: "Save failed", variant: "destructive" }); }
  };

  const filteredAssessments = assessments.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Render Helpers
  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessment Manager</h1>
          <p className="text-muted-foreground/80">Manage student competency evaluations.</p>
        </div>
        <Button onClick={handleCreate} disabled={!selectedUnit} className="font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <Plus className="w-4 h-4 mr-2" /> New Assessment
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-gradient-to-br from-white to-gray-50/50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FilterSelect label="Batch" value={selectedBatch} options={uniqueBatches} onChange={(v: string) => { setSelectedBatch(v); setSelectedDepartment(''); setSelectedSubject(''); setSelectedSection(''); setSelectedUnit(''); }} />
            <FilterSelect label="Department" value={selectedDepartment} options={uniqueDepartments.map(d=>d.name)} values={uniqueDepartments.map(d=>d.id)} onChange={(v: string) => { setSelectedDepartment(v); setSelectedSubject(''); setSelectedSection(''); setSelectedUnit(''); }} disabled={!selectedBatch} />
            <FilterSelect label="Subject" value={selectedSubject} options={uniqueSubjects.map(s=>s.name)} values={uniqueSubjects.map(s=>s.id)} onChange={(v: string) => { setSelectedSubject(v); setSelectedSection(''); setSelectedUnit(''); }} disabled={!selectedDepartment} />
            <FilterSelect label="Section" value={selectedSection} options={uniqueSections.map(s=>s.name)} values={uniqueSections.map(s=>s.id)} onChange={(v: string) => { setSelectedSection(v); setSelectedUnit(''); }} disabled={!selectedSubject} />
            <FilterSelect label="Unit" value={selectedUnit} options={units.map(u=>u.name)} values={units.map(u=>u.id)} onChange={setSelectedUnit} disabled={!selectedSection} highlight />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {testsLoading ? (
          <FullLoadingPlaceholder text="Scanning unit assessments..." />
        ) : selectedUnit ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary/60" /> Assessments
                <Badge variant="outline" className="ml-2 font-bold">{filteredAssessments.length}</Badge>
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-white" />
              </div>
            </div>

            {filteredAssessments.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredAssessments.map((test) => (
                  <AssessmentCard 
                    key={test.id} 
                    test={test} 
                    onAnalytics={() => handleAnalytics(test)} 
                    onEdit={() => handleEdit(test)} 
                    onDelete={() => setAssessmentToDelete(test)} 
                  />
                ))}
              </div>
            ) : <EmptyPlaceholder text="No assessments found for this unit." />}
          </div>
        ) : <SelectionRequiredPlaceholder />}
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="space-y-6 animate-in fade-in scale-in-95 duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setView('list')} className="rounded-full h-10 w-10 border border-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{view === 'create' ? 'Construct Assessment' : 'Refine Assessment'}</h2>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
            {uniqueSubjects.find(s=>s.id === selectedSubject)?.name} • {units.find(u=>u.id === selectedUnit)?.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Core Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Mid-Term Competency Sync" />
              </div>
              <div className="space-y-2">
                <Label>Instructions / Description</Label>
                <textarea className="w-full h-24 p-3 rounded-lg border border-input bg-transparent text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Define evaluation parameters..." />
              </div>
            </CardContent>
          </Card>

          <QuestionForm 
            onSave={(q) => setQuestions([...questions, {...q, id: Date.now().toString()}])} 
            onCancel={() => {}}
          />
          
          {questions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> Integrated Questions ({questions.length})
              </h3>
              {questions.map((q) => (
                <QuestionPreview key={q.id} question={q} onDelete={() => setQuestions(questions.filter(x=>x.id !== q.id))} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <TestSettings settings={settings} onSettingsChange={setSettings} />
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-6 space-y-4">
              <h4 className="font-bold text-primary flex items-center gap-2 italic">
                <Save className="w-4 h-4" /> Finalize Selection
              </h4>
              <p className="text-xs text-muted-foreground">Ensure all parameters are accurate before committing to the unit syllabus.</p>
              <Button onClick={handleSaveAssessment} className="w-full font-bold h-12 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform">
                {view === 'create' ? 'Create Evaluation' : 'Update Evaluation'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView('list')} className="rounded-full h-10 w-10 border border-gray-200">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedAssessment?.title} — Analytics</h2>
            <p className="text-muted-foreground text-sm">Engagement and performance insights.</p>
          </div>
        </div>
        <Button variant="outline" className="font-bold border-indigo-200 text-indigo-700 bg-indigo-50">
          <Send className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Submissions" value={submissions.length} icon={Users} color="text-blue-600" />
        <StatCard label="Avg Score" value={submissions.length > 0 ? (submissions.reduce((a, b) => a + (b.score || 0), 0) / submissions.length).toFixed(1) : '0'} icon={Trophy} color="text-amber-600" />
        <StatCard label="Duration" value={`${selectedAssessment?.duration || 0}m`} icon={Clock} color="text-emerald-600" />
        <StatCard label="Status" value={selectedAssessment?.publish_status || 'Draft'} icon={CheckCircle2} color="text-indigo-600" />
      </div>

      <Card>
        <CardContent className="p-0">
          {analyticsLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
          ) : submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4 text-center">Score</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold">{s.student_name || 'Anonymous'}</td>
                      <td className="px-6 py-4 text-center font-mono">{s.score || 0}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">Submitted</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyPlaceholder text="No submissions recorded yet." />}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <FacultyLayout>
      {view === 'list' ? renderList() : view === 'analytics' ? renderAnalytics() : renderForm()}
      
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
