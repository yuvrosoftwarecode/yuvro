import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Settings, FileText, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchQuestionById, fetchQuestions } from '@/services/questionService';
import { SkillTest, CreateSkillTestData } from '@/services/skillTestService';
import { QuestionPreview } from '@/components/admin/test-questions/QuestionPreview';
import AssessmentQuestionBank from './AssessmentQuestionBank';

export interface AssessmentBuilderProps {
  initialData: SkillTest | null;
  mode: 'create' | 'edit';
  testType: 'practice' | 'assessment';
  subjectFilter?: string;
  unitFilter?: string;
  sectionFilter?: string; // Added sectionFilter
  contextSubtitle?: string;
  onSave: (payload: CreateSkillTestData) => Promise<void>;
  onCancel: () => void;
}

const AssessmentBuilder: React.FC<AssessmentBuilderProps> = ({
  initialData, mode, testType, subjectFilter, unitFilter, sectionFilter, contextSubtitle, onSave, onCancel
}) => {
  const { toast } = useToast();
  
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentFormTab, setCurrentFormTab] = useState('details');
  
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
    selectedQuestions: [] as string[]
  });
  
  const [randomQuestionsConfig, setRandomQuestionsConfig] = useState({
    mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0,
  });
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [availableQuestionsCount, setAvailableQuestionsCount] = useState<Record<string, number>>({ 
    mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 
  });
  const [averageDurations, setAverageDurations] = useState<Record<string, number>>({ 
    mcq_single: 1, mcq_multiple: 2, coding: 30, descriptive: 15 
  });

  // Load initial data and questions if editing
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        instructions: initialData.instructions || '',
        difficulty: initialData.difficulty || 'medium',
        duration: initialData.duration || 0,
        total_marks: initialData.total_marks || 100,
        passing_marks: initialData.passing_marks || 60,
        enable_proctoring: initialData.enable_proctoring || false,
        publish_status: initialData.publish_status || 'draft',
        selectedQuestions: []
      });
      setRandomQuestionsConfig({
        mcq_single: initialData.questions_random_config?.mcq_single || 0,
        mcq_multiple: initialData.questions_random_config?.mcq_multiple || 0,
        coding: initialData.questions_random_config?.coding || 0,
        descriptive: initialData.questions_random_config?.descriptive || 0,
      });

      const fetchExistingQuestions = async () => {
        setIsLoadingDetails(true);
        try {
          if (!initialData.questions_config) return;
          const allIds: string[] = [];
          Object.values(initialData.questions_config).forEach(ids => {
            if (Array.isArray(ids)) allIds.push(...ids);
          });
          if (allIds.length === 0) return;
          const details = await Promise.all(allIds.map(id => fetchQuestionById(id).catch(() => null)));
          const qDetails = details.filter(Boolean).map((q: any) => ({
            id: q.id,
            type: q.type,
            questionText: q.content,
            options: q.mcq_options?.map((o: any) => o.text),
            correctAnswer: q.type === 'mcq_multiple'
              ? q.mcq_options?.filter((o: any) => o.is_correct).map((o: any) => o.text)
              : q.mcq_options?.find((o: any) => o.is_correct)?.text || '',
            marks: q.marks,
            duration: q.duration || 0,
            isMultipleAnswer: q.type === 'mcq_multiple',
          }));
          setQuestions(qDetails);
          setFormData(prev => ({ ...prev, selectedQuestions: qDetails.map(q => q.id) }));
        } catch (e) {
          toast({ title: 'Error', description: 'Failed to load existing questions.', variant: 'destructive' });
        } finally {
          setIsLoadingDetails(false);
        }
      };
      
      fetchExistingQuestions();
    }
  }, [mode, initialData]);

  // Fetch available questions count
  useEffect(() => {
    const fetchCounts = async () => {
      if (!subjectFilter) return;
      try {
        const qs = await fetchQuestions({
          subject: subjectFilter,
          unit: unitFilter || undefined,
          categories: testType,
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
  }, [subjectFilter, unitFilter, formData.difficulty, testType]);

  // Auto-calculate test configuration based on questions and config
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
            options: detail.mcq_options?.map((o: any) => o.text),
            correctAnswer: detail.type === 'mcq_multiple'
              ? detail.mcq_options?.filter((o: any) => o.is_correct).map((o: any) => o.text)
              : detail.mcq_options?.find((o: any) => o.is_correct)?.text || '',
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

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Test title is required.', variant: 'destructive' });
      return;
    }
    
    if (questions.length === 0 && Object.values(randomQuestionsConfig).every(v => v === 0)) {
        toast({ title: 'Error', description: 'Please add at least one question or configure random questions.', variant: 'destructive' });
        return;
    }

    try {
      setIsSaving(true);
      const savedQuestionIds: { mcq_single: string[]; mcq_multiple: string[]; coding: string[]; descriptive: string[]; } = { 
        mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] 
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
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        difficulty: formData.difficulty,
        duration: formData.duration,
        total_marks: formData.total_marks,
        passing_marks: formData.passing_marks,
        enable_proctoring: formData.enable_proctoring,
        publish_status: formData.publish_status,
        test_type: testType,
        subject: subjectFilter || undefined,
        unit: unitFilter || undefined,
        section: sectionFilter || undefined,
        questions_config: savedQuestionIds,
        questions_random_config: randomQuestionsConfig,
      };

      await onSave(payload);
    } catch {
      toast({ title: 'Error', description: 'Failed to save test.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingDetails) {
    return (
      <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-dashed border-border bg-card">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
        <p className="text-muted-foreground text-sm font-medium">Loading test configuration…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}
          className="rounded-full h-9 w-9 border border-border text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'create' ? `Create New ${testType === 'practice' ? 'Practice Test' : 'Assessment'}` : `Edit ${testType === 'practice' ? 'Practice Test' : 'Assessment'}`}
          </h1>
          {contextSubtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {contextSubtitle}
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

        <TabsContent value="details" className="space-y-5 animate-in fade-in duration-200">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-4 bg-muted/20">
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
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this test…"
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

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-4 bg-muted/20">
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
                    Enable Proctoring
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-5 animate-in fade-in duration-200">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-4 bg-muted/20">
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
                        onChange={e => setRandomQuestionsConfig({ ...randomQuestionsConfig, [key]: Number(e.target.value) || 0 })}
                        className={`h-10 bg-background border-border ${randomQuestionsConfig[key] > (availableQuestionsCount[key] || 0) ? 'border-red-500 bg-red-50 focus-visible:ring-red-500' : ''}`}
                      />
                      {randomQuestionsConfig[key] > (availableQuestionsCount[key] || 0) && (
                        <p className="text-[10px] text-red-500 mt-1">
                          Only {availableQuestionsCount[key] || 0} {formData.difficulty} questions available in bank.
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

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Select Questions ({testType === 'practice' ? 'Practice' : 'Assessment'} Category)
              </h3>
              <Badge variant="secondary" className="font-semibold">{questions.length}</Badge>
            </div>

            <AssessmentQuestionBank
              mode="selection"
              selectedQuestions={formData.selectedQuestions}
              onQuestionsChange={(ids) => {
                setFormData(prev => ({ ...prev, selectedQuestions: ids }));
                handleQuestionsChange(ids);
              }}
              showSplitView={true}
              subjectFilter={subjectFilter}
              unitFilter={unitFilter}
              categoryFilter={testType === 'assessment' ? 'assessment' : 'practice'}
              creationCategory={testType === 'assessment' ? 'assessment' : 'practice'}
              allowCreation={testType === 'assessment'}
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

        <div className="flex items-center justify-between border-t border-border pt-6 mt-6">
          {currentFormTab === 'questions' ? (
            <Button variant="outline" onClick={() => setCurrentFormTab('details')}
              className="border-border text-muted-foreground hover:text-foreground">
              ← Back to Details
            </Button>
          ) : <div />}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onCancel} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={() => currentFormTab === 'details' ? setCurrentFormTab('questions') : handleSubmit()}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-6 font-semibold"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {currentFormTab === 'details' ? 'Next: Questions →' : mode === 'create' ? 'Create Test' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default AssessmentBuilder;
