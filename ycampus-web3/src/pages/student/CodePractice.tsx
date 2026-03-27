import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import SubjectDashboard from '@/components/student/code-practice/CourseDashboard';
import UnitSelection from '@/components/student/code-practice/UnitSelection';
import CodeEditorWithAI from '@/components/code-editor/CodeEditorWithAI';
import ScoreAnalytics from '@/components/student/code-practice/ScoreAnalytics';
import AIInsights from '@/components/student/code-practice/AIInsights';
import { fetchSubjectById, fetchUnitsBySubject, fetchSubjects } from '@/services/subjectService';
import { fetchQuestionById } from '@/services/questionService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Subject, Unit, CodingProblem } from '@/types/codePractice';

export type ViewType = 'dashboard' | 'units' | 'problem' | 'analytics' | 'insights';

const CodePractice = () => {
  const navigate = useNavigate();
  const { subjectId, unitId, problemId } = useParams<{ subjectId: string; unitId: string; problemId: string }>();

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);

  const getIconColor = (category: string) => {
    const colors = {
      databases: 'bg-indigo-100 text-indigo-600',
      programming_languages: 'bg-rose-100 text-rose-600',
      fundamentals: 'bg-purple-100 text-purple-600',
      ai_tools: 'bg-amber-100 text-amber-600',
    };
    return colors[category as keyof typeof colors] || 'bg-slate-100 text-slate-600';
  };

  const hydrateStateFromUrl = useCallback(async () => {
    if (!subjectId) return;

    setIsHydrating(true);
    try {
      // 1. Fetch Subject
      let subject: any = selectedSubject;
      if (!selectedSubject || selectedSubject.id !== subjectId) {
        subject = await fetchSubjectById(subjectId);
        const transformedSubject: Subject = {
          id: subject.id.toString(),
          name: subject.subject_name || subject.name || subject.title || 'Untitled Subject',
          icon: subject.category || '',
          progress: Math.round(subject.progress_percentage || 0),
          totalProblems: subject.total_problems || 0,
          solvedProblems: subject.solved_problems || 0,
          category: subject.category || '',
          iconColor: getIconColor(subject.category),
          totalScore: subject.total_score || 0,
          aiHelpUsed: subject.ai_help_used || 0,
        };
        setSelectedSubject(transformedSubject);
        subject = transformedSubject;
      }

      // 2. Fetch Problem FIRST (if ID exists) to help resolve unit
      let problem: CodingProblem | null = selectedProblem;
      if (problemId && (!selectedProblem || selectedProblem.id !== problemId)) {
        const q = await fetchQuestionById(problemId);
        problem = {
          id: q.id,
          title: q.title,
          difficulty: q.difficulty === 'easy' ? 'Easy' : q.difficulty === 'medium' ? 'Medium' : 'Hard',
          score: q.marks,
          description: q.content,
          hints: q.hints || [],
          solutions: q.solutions || [],
          test_cases_basic: (q.test_cases_basic || []).map((tc: any) => ({
            input: tc.input || '',
            expected_output: tc.expected_output || '',
            weight: tc.weight || 1
          })),
          test_cases_advanced: (q.test_cases_advanced || []).map((tc: any) => ({
            input: tc.input || '',
            expected_output: tc.expected_output || '',
            weight: tc.weight || 1
          })),
        };
        setSelectedProblem(problem);
      }

      // 3. Resolve Unit
      if (unitId || problemId) {
        const targetUnitId = unitId || (problemId ? (selectedProblem as any)?.unitId : null);
        
        if (targetUnitId && (!selectedUnit || selectedUnit.id !== targetUnitId)) {
          const units = await fetchUnitsBySubject(subjectId);
          let unit = units.find((t: any) => t.id === targetUnitId);
          
          if (!unit && problemId && problem) {
             unit = { 
               id: targetUnitId, 
               name: "Section Practice", 
               total_problems: 0, 
               order_index: 0, 
               progress_percentage: 0,
               subject: subjectId || '',
               created_at: new Date().toISOString()
             } as any;
          }

          if (unit) {
            setSelectedUnit({
              id: unit.id,
              name: unit.name,
              problemCount: unit.total_problems || 0,
              order_index: unit.order_index,
              progress: Math.round(unit.progress_percentage || 0),
            });
          }
        }
      }

      if (problemId) {
        setCurrentView('problem');
      } else if (unitId || subjectId) {
        setCurrentView('units');
      }
    } catch (error) {
      console.error('Failed to hydrate state:', error);
      toast.error('Failed to load session');
      setCurrentView('dashboard');
    } finally {
      setIsHydrating(false);
    }
  }, [subjectId, unitId, problemId, selectedSubject, selectedUnit, selectedProblem]);

  useEffect(() => {
    if (subjectId || unitId || problemId) {
      if ((subjectId && !selectedSubject) || (unitId && !selectedUnit) || (problemId && !selectedProblem)) {
        hydrateStateFromUrl();
      } else if (problemId) {
        setCurrentView('problem');
      } else if (subjectId) {
        setCurrentView('units');
      }
    } else {
      setCurrentView('dashboard');
    }
  }, [subjectId, unitId, problemId, hydrateStateFromUrl, selectedSubject, selectedUnit, selectedProblem]);

  useEffect(() => {
    const autoSelectDSA = async () => {
      if (subjectId) return;
      
      try {
        const subjects = await fetchSubjects();
        const dsaSubject = subjects.find((s: any) => {
          const name = (s.subject_name || s.name || s.title || '').toLowerCase();
          return name.includes('data structure') || name.includes('dsa');
        });

        if (dsaSubject) {
          navigate(`/student/code-practice/subjects/${dsaSubject.id}`);
        }
      } catch (error) {
        console.error('Failed to auto-select DSA:', error);
      }
    };

    if (!subjectId) {
      autoSelectDSA();
    }
  }, [subjectId, navigate]);

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentView('units');
    navigate(`/student/code-practice/subjects/${subject.id}`);
  };

  const handleUnitSelect = (unit: Unit) => {
    setSelectedUnit(unit);
    const sId = selectedSubject?.id || subjectId;
    if (sId) {
      navigate(`/student/code-practice/subjects/${sId}/units/${unit.id}`);
    }
  };

  const handleProblemSelect = (problem: CodingProblem) => {
    setSelectedProblem(problem);
    setCurrentView('problem');
    const sId = selectedSubject?.id || subjectId;
    const uId = selectedUnit?.id || unitId;
    if (sId && uId) {
      navigate(`/student/code-practice/subjects/${sId}/units/${uId}/questions/${problem.id}`);
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedSubject(null);
    setSelectedUnit(null);
    setSelectedProblem(null);
    navigate('/student/interview-preparation');
  };

  const handleBackToUnits = () => {
    setCurrentView('units');
    setSelectedProblem(null);
    const sId = selectedSubject?.id || subjectId;
    const uId = selectedUnit?.id || unitId;
    if (sId && uId) {
      navigate(`/student/code-practice/subjects/${sId}/units/${uId}`);
    } else if (sId) {
      navigate(`/student/code-practice/subjects/${sId}`);
    } else {
      navigate('/student/code-practice');
    }
  };

  const handleViewAnalytics = () => setCurrentView('analytics');
  const handleViewInsights = () => setCurrentView('insights');

  return (
    <StudentLayout>
      <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative h-full">
        <div className="flex-1 flex flex-col min-h-0 w-full h-full">
          <div className="flex-1 transition-all duration-300 flex flex-col min-h-0 h-full">
            {isHydrating ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <div className="text-center space-y-1">
                   <p className="text-lg font-semibold text-foreground">Loading Session</p>
                   <p className="text-sm text-muted-foreground">Preparing your practice environment...</p>
                </div>
              </div>
            ) : (
              <>
                {currentView === 'dashboard' && (
                  <SubjectDashboard
                    onSubjectSelect={handleSubjectSelect}
                    onViewAnalytics={handleViewAnalytics}
                  />
                )}

                {currentView === 'units' && selectedSubject && (
                  <UnitSelection
                    subject={selectedSubject}
                    selectedUnit={selectedUnit}
                    onUnitSelect={handleUnitSelect}
                    onProblemSelect={handleProblemSelect}
                    onBack={handleBackToDashboard}
                  />
                )}

                {currentView === 'problem' && selectedProblem && selectedSubject && selectedUnit && (
                  <div className="flex-1 bg-background rounded-3xl border border-border shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <CodeEditorWithAI
                      problem={selectedProblem}
                      subject={selectedSubject}
                      unit={selectedUnit}
                      onBack={handleBackToUnits}
                      onViewAnalytics={handleViewAnalytics}
                      codeSubmissionType="practice"
                      initialEditorOpen={true}
                    />
                  </div>
                )}

                {currentView === 'analytics' && (
                  <ScoreAnalytics
                    onBack={handleBackToDashboard}
                    onViewInsights={handleViewInsights}
                  />
                )}

                {currentView === 'insights' && (
                  <AIInsights
                    onBack={() => setCurrentView('analytics')}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default CodePractice;
