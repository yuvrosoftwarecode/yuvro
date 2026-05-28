import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import PlacementSidebar from '@/components/placement/PlacementSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileText, Search, Loader2, Trophy, Clock, Users, BarChart2, ArrowLeft,
  CheckCircle2, BookOpen, TrendingUp, ClipboardList, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUnitsBySubject, fetchSubjects } from '@/services/subjectService';
import skillTestService, { SkillTest } from '@/services/skillTestService';
import studentService from '@/services/studentService';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

import AnalyticsStats from '@/components/college-admin/analytics/AnalyticsStats';
import CandidatesTable from '@/components/college-admin/analytics/CandidatesTable';
import SubmissionAnalyticsView from '@/components/college-admin/analytics/SubmissionAnalyticsView';
import LeaderboardTable from '@/components/placement/leaderboard/LeaderboardTable';
import leaderboardService, { LeaderboardEntry } from '@/services/leaderboardService';

type ViewMode = 'list' | 'analytics' | 'submission-results';
type SubTabMode = 'tests' | 'leaderboard';
type LeaderboardScope = 'test' | 'unit' | 'subject' | 'global' | 'assessments';

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
  collegeCount?: number;
  onAnalytics: () => void;
}

const AssessmentCard = ({ test, collegeCount, onAnalytics }: AssessmentCardProps) => {
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
  const displayCount = collegeCount !== undefined ? collegeCount : 0;

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
              className={`text-[10px] font-semibold px-2 py-0 border select-none transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {isActive ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {test.duration} min
            </span>
            {displayCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {displayCount} students
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> {totalQuestions} questions
            </span>
          </div>
        </div>

        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onAnalytics}
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <BarChart2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Analytics</p></TooltipContent>
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
      Choose Subject → Unit above to view skill test analytics.
    </p>
  </div>
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

const PlacementSkillTests = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [view, setView] = useState<ViewMode>('list');
  const [testsLoading, setTestsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);

  const [collegeSubjects, setCollegeSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);

  const [activeTab, setActiveTab] = useState<'skill-tests' | 'assessments'>('skill-tests');
  const [activeSubTab, setActiveSubTab] = useState<SubTabMode>('tests');
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>('unit');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [skillTests, setSkillTests] = useState<SkillTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<SkillTest | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [validCollegeUserIds, setValidCollegeUserIds] = useState<Set<string> | null>(null);
  const [collegeCounts, setCollegeCounts] = useState<Record<string, number>>({});

  const filteredTests = skillTests.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Data loaders ─────────────────────────────────────────────────────────

  useEffect(() => {
    const loadValidUsers = async () => {
      try {
        const kpiRes = await restApiAuthUtil.get<any>('/assessment/placement-dashboard/kpis/?batch=all&assessment_type=all&skill_category=all&readiness_status=all');
        if (kpiRes && kpiRes.students) {
          setValidCollegeUserIds(new Set(kpiRes.students.map((s: any) => String(s.user_id))));
        } else {
          setValidCollegeUserIds(new Set());
        }
      } catch (e) {
        console.error("Failed to load valid college users", e);
        setValidCollegeUserIds(new Set());
      }
    };
    loadValidUsers();
  }, []);

  useEffect(() => {
    if (!validCollegeUserIds || skillTests.length === 0) return;
    const collegeId = String(user?.college_id || user?.college || '');
    
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(skillTests.map(async (test) => {
        try {
           const data = await skillTestService.getSkillTestSubmissions(test.id, collegeId);
           const filtered = (data || []).filter((sub: any) => validCollegeUserIds.has(String(sub.user)));
           counts[test.id] = filtered.length;
        } catch (e) {
           counts[test.id] = 0;
        }
      }));
      setCollegeCounts(counts);
    };
    fetchCounts();
  }, [skillTests, validCollegeUserIds, user]);

  const loadInitialData = async () => {
    try {
      setIsLoadingInitial(true);
      const subs = await fetchSubjects();
      // Only assessment product type
      const assessmentSubjects = subs.filter((s: any) => s.product_type === 'assessments');
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
      setUnits(data.map((u: any) => ({ id: String(u.id), name: u.name })));
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
      // Fetch submissions for this test
      const collegeId = String(user?.college_id || user?.college || '');
      const collegeName = String(user?.college_name || '');
      const data = await skillTestService.getSkillTestSubmissions(testId, collegeId);
      
      let filteredData = data || [];
      
      // Enforce strict college filtering on the frontend in case backend doesn't filter
      if (filteredData.length > 0 && collegeId) {
        const sample = filteredData[0];
        const hasCollegeInfo = sample.college !== undefined || 
                               sample.college_id !== undefined || 
                               sample.college_name !== undefined || 
                               sample.user_details?.college !== undefined || 
                               sample.user_college !== undefined;
        
        if (hasCollegeInfo) {
           filteredData = filteredData.filter(sub => {
             const subColId = String(sub.college || sub.college_id || sub.user_details?.college || sub.user_college || '');
             const subColName = String(sub.college_name || sub.user_details?.college_name || sub.user_college_name || '');
             
             if (subColId && subColId === collegeId) return true;
             if (subColName && collegeName && subColName.toLowerCase() === collegeName.toLowerCase()) return true;
             
             return false; // exclude if doesn't match
           });
        } else {
           // Fallback: Fetch from the placement dashboard KPI endpoint, which guarantees only the TPO's students
           try {
             const kpiRes = await restApiAuthUtil.get<any>('/assessment/placement-dashboard/kpis/?batch=all&assessment_type=all&skill_category=all&readiness_status=all');
             if (kpiRes && kpiRes.students) {
               const validUserIds = new Set(kpiRes.students.map((s: any) => String(s.user_id)));
               filteredData = filteredData.filter(sub => validUserIds.has(String(sub.user)));
             } else {
               filteredData = []; // Fallback failed securely
             }
           } catch (err) {
             console.error("Failed to fetch students for filtering via KPIs", err);
             filteredData = []; // Clear data if we can't securely filter it
           }
        }
      }

      setSubmissions(filteredData);
    } catch {
      toast({ title: 'Error', description: 'Failed to load analytics.', variant: 'destructive' });
    } finally {
      setAnalyticsLoading(false);
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
      if (selectedUnit && view === 'list' && activeSubTab === 'tests') {
        loadSkillTests(selectedUnit);
      } else {
        setSkillTests([]);
      }
    } else {
      if (selectedSubject && view === 'list' && activeSubTab === 'tests') {
        loadAssessments(selectedSubject);
      } else {
        setSkillTests([]);
      }
    }
  }, [selectedSubject, selectedUnit, activeTab, view, activeSubTab]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      try {
        let data: LeaderboardEntry[] = [];
        if (leaderboardScope === 'global') {
          data = await leaderboardService.getGlobalLeaderboard();
        } else if (leaderboardScope === 'subject' && selectedSubject) {
          data = await leaderboardService.getSubjectLeaderboard(selectedSubject);
        } else if (leaderboardScope === 'unit' && selectedUnit) {
          data = await leaderboardService.getUnitLeaderboard(selectedUnit);
        } else if (leaderboardScope === 'test' && skillTests.length > 0) {
          // Default to first test in list if scoping to test without selecting one
          data = await leaderboardService.getTestLeaderboard(skillTests[0].id);
        } else if (leaderboardScope === 'assessments' && selectedSubject) {
          data = await leaderboardService.getAssessmentLeaderboard(selectedSubject);
        }
        setLeaderboardData(data);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load leaderboard.', variant: 'destructive' });
      } finally {
        setLeaderboardLoading(false);
      }
    };

    if (activeSubTab === 'leaderboard' && view === 'list') {
      fetchLeaderboard();
    }
  }, [activeSubTab, leaderboardScope, selectedSubject, selectedUnit, skillTests, view]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAnalytics = (test: SkillTest) => {
    setSelectedTest(test);
    loadAnalytics(test.id);
    setView('analytics');
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
          <p className="text-muted-foreground text-sm mt-0.5">View analytics for assessments taken by your college's students.</p>
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
          <Tabs value={activeSubTab} onValueChange={(val: any) => {
            setActiveSubTab(val);
            if (val === 'leaderboard' && leaderboardScope === 'assessments') {
              setLeaderboardScope('unit');
            }
          }} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none">
                <TabsTrigger 
                  value="tests" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-medium"
                >
                  Unit Tests
                </TabsTrigger>
                <TabsTrigger 
                  value="leaderboard" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-medium"
                >
                  <Trophy className="w-4 h-4 mr-2" /> Leaderboard
                </TabsTrigger>
              </TabsList>
              
              {activeSubTab === 'leaderboard' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Scope:</span>
                  <Select value={leaderboardScope} onValueChange={(v: any) => setLeaderboardScope(v)}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test Level</SelectItem>
                      <SelectItem value="unit">Unit Level</SelectItem>
                      <SelectItem value="subject">Subject Level</SelectItem>
                      <SelectItem value="global">Global Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

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

          <TabsContent value="tests" className="mt-0">
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
                      collegeCount={collegeCounts[test.id]}
                      onAnalytics={() => handleAnalytics(test)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyPlaceholder
                  text="No skill tests exist for this unit yet."
                  icon={FileText}
                />
              )}
            </div>
          ) : (
            <SelectionRequiredPlaceholder />
          )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-0">
            {leaderboardLoading ? (
              <LoadingPlaceholder text="Calculating rankings..." />
            ) : (!selectedUnit && leaderboardScope === 'unit') || (!selectedSubject && leaderboardScope === 'subject') ? (
              <SelectionRequiredPlaceholder />
            ) : (
              <LeaderboardTable entries={leaderboardData} scope={leaderboardScope} />
            )}
          </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-6 mt-0">
          <Tabs value={activeSubTab} onValueChange={(val: any) => {
            setActiveSubTab(val);
            if (val === 'leaderboard') setLeaderboardScope('assessments');
          }} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none">
                <TabsTrigger 
                  value="tests" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-medium"
                >
                  Assessments
                </TabsTrigger>
                <TabsTrigger 
                  value="leaderboard" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-medium"
                >
                  <Trophy className="w-4 h-4 mr-2" /> Leaderboard
                </TabsTrigger>
              </TabsList>
            </div>

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

          <TabsContent value="tests" className="mt-0">
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
                      collegeCount={collegeCounts[test.id]}
                      onAnalytics={() => handleAnalytics(test)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyPlaceholder
                  text="No assessments exist for this subject yet."
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
                Choose Subject above to view subject-level assessments analytics.
              </p>
            </div>
          )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-0">
            {leaderboardLoading ? (
              <LoadingPlaceholder text="Calculating assessment rankings..." />
            ) : !selectedSubject ? (
              <SelectionRequiredPlaceholder />
            ) : (
              <LeaderboardTable entries={leaderboardData} scope="assessments" />
            )}
          </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
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
            <p className="text-sm text-muted-foreground mt-0.5">{selectedTest.title} (Your College)</p>
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
        <PlacementSidebar />
        <main className="flex-1 p-6 overflow-y-auto max-w-[1400px] mx-auto w-full">
          {view === 'list' && renderList()}
          {view === 'analytics' && renderAnalytics()}
          {view === 'submission-results' && renderSubmissionDetails()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default PlacementSkillTests;
