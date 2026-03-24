import { useEffect, useState, useRef } from "react";
import { fetchQuestions, Question } from "@/services/questionService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, CheckCircle, Terminal, BrainCircuit, Target, Sparkles, ChevronRight } from "lucide-react";
import { CodeEditorWithAI, CodeEditorWithAIHandle } from "@/components/code-editor";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";

interface StudentCodingEmbedProps {
  subunitId: string;
  subunitName?: string;
  unitName?: string;
  onComplete?: (status: boolean) => void;
  codeSubmissionType?: 'learn' | 'practice';
  subjectId?: string;
  unitId?: string;
}

// Import types from CodePractice for compatibility
import type { Subject, Unit, CodingProblem } from '@/pages/student/CodePractice';

// Layout components removed as CodeEditorWithAI handles layout internally

const StudentCodingEmbed = ({ subunitId, subunitName, unitName, onComplete, codeSubmissionType = 'practice', subjectId, unitId }: StudentCodingEmbedProps) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'workspace'>('list');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  // CodeEditorWithAI ref
  const codeEditorRef = useRef<CodeEditorWithAIHandle>(null);

  // Track solved questions IDs
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});

  // Track processed submissions to prevent duplicate API calls
  const processedSubmissions = useRef<Set<string>>(new Set());

  // Mock subject and unit data for CodeEditorWithAI
  const mockSubject: Subject = {
    id: subjectId || subunitId,
    name: "Coding Practice",
    icon: "💻",
    progress: 0,
    totalProblems: questions.length,
    solvedProblems: Object.keys(solvedMap).length,
    category: "practice"
  };

  const mockUnit: Unit = {
    id: unitId || subunitId,
    name: unitName ? `${unitName} › ${subunitName || 'Coding'}` : (subunitName || 'Coding Problems'),
    problemCount: questions.length,
    order_index: 1,
    progress: 0
  };

  useEffect(() => {
    setSolvedMap({});
    setViewMode('list');
    setSelectedQuestion(null);
    processedSubmissions.current.clear();
  }, [subunitId]);

  useEffect(() => {
    loadCodingQuestions();
  }, [subunitId]);

  useEffect(() => {
    if (questions.length > 0) {
      const allSolved = questions.every(q => solvedMap[q.id]);
      if (allSolved) {
        setIsCompleted(true);
        if (onComplete) onComplete(true);
      }
    } else if (!loading && questions.length === 0) {
      if (onComplete) onComplete(true);
    }
  }, [solvedMap, questions, loading, onComplete]);

  // Layout and interaction handlers

  const loadCodingQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetchQuestions({
        sub_unit: subunitId,
        type: 'coding'
      });

      setQuestions(res);
    } catch (err) {
      console.error("Failed to load coding questions", err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuestion = (q: Question) => {
    setSelectedQuestion(q);
    setViewMode('workspace');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedQuestion(null);
  };

  const handleSubmissionComplete = async (problemId: string, success: boolean, submissionResult?: any) => {
    console.log('handleSubmissionComplete called:', { problemId, success, submissionResult });

    if (success) {
      const submissionKey = `${problemId}-${success}`;

      if (processedSubmissions.current.has(submissionKey)) {
        console.log('Submission already processed, skipping API call');
        return;
      }

      // Update local state regardless of submission type
      const newSolvedMap = { ...solvedMap, [problemId]: true };
      setSolvedMap(newSolvedMap);

      // Only call progress API for learn mode
      if (codeSubmissionType === 'learn') {
        // Validate that we have actual submission data
        if (!submissionResult || !submissionResult.code) {
          console.warn('No submission result or code provided, skipping detailed tracking');
          console.log('Available submissionResult keys:', submissionResult ? Object.keys(submissionResult) : 'null');
          return;
        }

        try {
          processedSubmissions.current.add(submissionKey);

          // Only update progress via StudentSubjectProgressViewSet
          console.log('Updating progress via submit_coding API...');
          const submissionDetails = {
            subunit_id: subunitId,
            coding_status: {}, // Empty for detailed submissions
            question_id: problemId,
            language: submissionResult.language || 'python',
            code: submissionResult.code || '',
            test_results: submissionResult.test_results || {},
            execution_output: submissionResult.output || ''
          };

          await restApiAuthUtil.post('/course/student-subject-progress/submit_coding/', submissionDetails);
          console.log('Coding progress updated successfully', {
            questionId: submissionDetails?.question_id,
            language: submissionDetails?.language,
            testsPassed: submissionDetails?.test_results?.passed,
            testsTotal: submissionDetails?.test_results?.total
          });

          // Notify parent component that progress has been updated (similar to quiz)
          if (onComplete) {
            console.log('Calling onComplete to refresh progress display');
            onComplete(true);
          }
        } catch (error) {
          console.error('Failed to update coding progress:', error);
          processedSubmissions.current.delete(submissionKey);
        }
      } else {
        // For practice mode, just update UI state
        console.log('Practice mode: Updated local solved state for question', problemId);
      }
    }
  };

  // Note: CodeEditorWithAI handles submissions internally
  // We could add a callback here if needed to track completion status

  const convertToCodingProblem = (question: Question): CodingProblem => {
    return {
      id: question.id,
      title: question.title || 'Coding Problem',
      difficulty: (question.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium',
      score: 100,
      description: question.content || '',
      test_cases_basic: question.test_cases_basic || [],
      test_cases_advanced: [],
      hints: question.hints || [],
      solutions: question.solutions || []
    };
  };

  // Problem context removed as CodeExecutionPanel handles this internally

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-50 text-green-700 border-green-100';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'hard': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden font-sans">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-gray-400 font-medium">Initializing coding environment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Terminal className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Challenges Found</h3>
          <p className="text-gray-500 max-w-xs mt-1">This subunit doesn't have any coding exercises yet.</p>
        </div>
      </div>
    );
  }

  // ===================== LIST VIEW =====================
  if (viewMode === 'list') {
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden font-sans">
        <div className="flex-1 overflow-hidden flex flex-col transition-all duration-300">
          <div className="px-6 py-5 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm">
                <Code className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-none mb-1">Logic Lab</p>
                <p className="text-sm font-bold text-gray-900 leading-none">Programming Exercises</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <Target className="w-3.5 h-3.5 text-slate-700" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Completion</p>
                </div>
                <p className="text-sm font-bold text-slate-700 leading-none">
                  {Math.round((Object.keys(solvedMap).length / questions.length) * 100)}%
                </p>
              </div>
              <div className="h-10 w-[1px] bg-gray-200 hidden sm:block" />
              <Badge variant={isCompleted ? "default" : "outline"} className={`rounded-xl px-4 py-1.5 font-bold transition-all ${isCompleted ? 'bg-green-600 border-green-600 shadow-lg shadow-green-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                {isCompleted ? (
                  <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> All Solved</span>
                ) : (
                  <span>{Object.keys(solvedMap).length} / {questions.length} Solved</span>
                )}
              </Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:px-8 md:py-8 custom-scrollbar bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {questions.map((question, index) => {
                const isSolved = solvedMap[question.id];
                return (
                  <Card
                    key={question.id}
                    className={`group cursor-pointer transition-all duration-300 hover:scale-[1.02] border-gray-200 hover:border-slate-300 shadow-none hover:shadow-xl hover:shadow-slate-50/50 rounded-2xl overflow-hidden relative ${isSolved ? 'bg-green-50/30' : 'bg-white'}`}
                    onClick={() => handleSelectQuestion(question)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isSolved ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-800 group-hover:bg-slate-900 group-hover:text-white'}`}>
                            <Terminal className="h-4 w-4" />
                          </div>
                          <h5 className="font-bold text-gray-900 leading-tight group-hover:text-slate-900 transition-colors line-clamp-2">
                            {question.title || `Exercise ${index + 1}`}
                          </h5>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSolved && <CheckCircle className="w-4 h-4 text-green-500" />}
                          <Badge variant="outline" className={`rounded-lg uppercase text-[9px] font-black tracking-widest px-2 py-0.5 border ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <BrainCircuit className="w-3 h-3" /> {question.marks ?? 100} pts
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:translate-x-1">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== WORKSPACE VIEW =====================
  return (
    <div className="h-full w-full flex flex-col">
      <CodeEditorWithAI
        ref={codeEditorRef}
        problem={convertToCodingProblem(selectedQuestion!)}
        subject={mockSubject}
        unit={mockUnit}
        subunitId={subunitId}
        onBack={handleBackToList}
        initialFullscreen={false}
        initialEditorOpen={true}
        isEmbedded={true}
        codeSubmissionType={codeSubmissionType}
        onSubmissionComplete={handleSubmissionComplete}
      />
    </div>
  );
};

export default StudentCodingEmbed;