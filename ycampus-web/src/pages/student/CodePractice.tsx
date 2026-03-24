import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '@/components/common/Navigation';
import SubjectDashboard from '@/components/student/code-practice/CourseDashboard';
import UnitSelection from '@/components/student/code-practice/UnitSelection';
import { CodeEditorWithAI } from '@/components/code-editor';
import ScoreAnalytics from '@/components/student/code-practice/ScoreAnalytics';
import AIInsights from '@/components/student/code-practice/AIInsights';
import { fetchSubjectById, fetchUnitsBySubject } from '@/services/subjectService';
import { fetchQuestionById, fetchQuestions } from '@/services/questionService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export type ViewType = 'dashboard' | 'units' | 'problem' | 'analytics' | 'insights';

export interface Subject {
  id: string;
  name: string;
  icon: string;
  progress: number;
  totalProblems: number;
  solvedProblems: number;
  iconColor?: string;
  category: string;
  totalScore?: number;
  aiHelpUsed?: number;
}

export interface Unit {
  id: string;
  name: string;
  problemCount: number;
  order_index: number;
  progress: number;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  score: number;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  hints?: string[];
  solutions?: any[];
  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  test_cases_basic: Array<{
    input: string;
    expected_output: string;
    weight?: number;
  }>;
  test_cases_advanced: Array<{
    input: string;
    expected_output: string;
    weight?: number;
  }>;
}

const CodePractice = () => {
  const navigate = useNavigate();
  const { subjectId, unitId, problemId } = useParams<{ subjectId: string; unitId: string; problemId: string }>();

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);

  // Helper to get icon colors (duplicated from CourseDashboard for consistency)
  const getIconColor = (category: string) => {
    const colors = {
      databases: 'bg-blue-100 text-blue-600',
      programming_languages: 'bg-red-100 text-red-600',
      fundamentals: 'bg-purple-100 text-purple-600',
      ai_tools: 'bg-amber-100 text-amber-600',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  const hydrateStateFromUrl = useCallback(async () => {
    if (!subjectId) return;

    setIsHydrating(true);
    try {
      // 1. Fetch Subject
      if (!selectedSubject || selectedSubject.id !== subjectId) {
        const subject = await fetchSubjectById(subjectId);
        const transformedSubject: Subject = {
          id: subject.id.toString(),
          name: subject.name || 'Untitled Subject',
          icon: subject.category,
          progress: Math.round(subject.progress_percentage || 0),
          totalProblems: subject.total_problems || 0,
          solvedProblems: subject.solved_problems || 0,
          category: subject.category,
          iconColor: getIconColor(subject.category),
          totalScore: subject.total_score || 0,
          aiHelpUsed: subject.ai_help_used || 0,
        };
        setSelectedSubject(transformedSubject);
      }

      // 2. Fetch Unit
      if (unitId && (!selectedUnit || selectedUnit.id !== unitId)) {
        const units = await fetchUnitsBySubject(subjectId);
        const unit = units.find((t: any) => t.id === unitId);
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

      // 3. Fetch Problem
      if (problemId && (!selectedProblem || selectedProblem.id !== problemId)) {
        const q = await fetchQuestionById(problemId);
        const transformedProblem: CodingProblem = {
          id: q.id,
          title: q.title,
          difficulty: q.difficulty === 'easy' ? 'Easy' : q.difficulty === 'medium' ? 'Medium' : 'Hard',
          score: q.marks,
          description: q.content,
          hints: q.hints || [],
          solutions: q.solutions || [],
          test_cases_basic: q.test_cases_basic?.map((tc: any) => ({
            input: tc.input || '',
            expected_output: tc.expected_output || '',
            weight: tc.weight || 1
          })) || [],
          test_cases_advanced: q.test_cases_advanced?.map((tc: any) => ({
            input: tc.input || '',
            expected_output: tc.expected_output || '',
            weight: tc.weight || 1
          })) || [],
        };
        setSelectedProblem(transformedProblem);
        setCurrentView('problem');
      } else if (unitId) {
        setCurrentView('units');
      } else {
        setCurrentView('units'); // If only subjectId is present
      }
    } catch (error) {
      console.error('Failed to hydrate state:', error);
      toast.error('Failed to load practice session');
      setCurrentView('dashboard');
    } finally {
      setIsHydrating(false);
    }
  }, [subjectId, unitId, problemId, selectedSubject, selectedUnit, selectedProblem]);

  // Sync view and state with URL parameters
  useEffect(() => {
    if (subjectId || unitId || problemId) {
      // If we have IDs in URL but missing state, hydrate
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
    navigate('/student/code-practice');
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

  const handleViewAnalytics = () => {
    setCurrentView('analytics');
  };

  const handleViewInsights = () => {
    setCurrentView('insights');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="transition-all duration-300 ease-in-out">
        {isHydrating ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading your practice session...</p>
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
              <CodeEditorWithAI
                problem={selectedProblem}
                subject={selectedSubject}
                unit={selectedUnit}
                onBack={handleBackToUnits}
                onViewAnalytics={handleViewAnalytics}
                codeSubmissionType="practice"
              />
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
  );
};

export default CodePractice;
