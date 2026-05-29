import { useEffect, useState, useRef } from "react";
import { fetchQuestions, Question } from "@/services/questionService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, CheckCircle, Terminal, BrainCircuit, Target, Sparkles, ChevronRight } from "lucide-react";
import { CodeEditorWithAI, CodeEditorWithAIHandle } from "@/components/code-editor";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import { showGamificationToasts } from "@/utils/gamificationToast";

interface StudentCodingEmbedProps {
  subtopicId: string;
  onComplete?: (status: boolean) => void;
  codeSubmissionType?: 'learn' | 'practice';
  courseId?: string;
  topicId?: string;
}

// Import types from CodePractice for compatibility
import type { Course, Topic, CodingProblem } from '@/pages/student/CodePractice';

const StudentCodingEmbed = ({ subtopicId, onComplete, codeSubmissionType = 'practice', courseId, topicId }: StudentCodingEmbedProps) => {
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

  // Mock course and topic data for CodeEditorWithAI
  const mockCourse: Course = {
    id: courseId || subtopicId,
    name: "Coding Practice",
    icon: "💻",
    progress: 0,
    totalProblems: questions.length,
    solvedProblems: Object.keys(solvedMap).length,
    category: "practice"
  };

  const mockTopic: Topic = {
    id: topicId || subtopicId,
    name: "Coding Problems",
    problemCount: questions.length,
    order_index: 1,
    progress: 0
  };

  useEffect(() => {
    setSolvedMap({});
    setViewMode('list');
    setSelectedQuestion(null);
    processedSubmissions.current.clear();
  }, [subtopicId]);

  useEffect(() => {
    loadCodingQuestions();
  }, [subtopicId]);

  // Pre-populate solvedMap from existing submissions
  useEffect(() => {
    if (questions.length === 0) return;
    const fetchSolvedStatus = async () => {
      try {
        const questionIds = questions.map(q => q.id);
        const response: any = await restApiAuthUtil.get('/course/student-code-practices/', {
          params: { context: codeSubmissionType === 'learn' ? 'learn' : 'practice' }
        });
        const submissions: any[] = Array.isArray(response) ? response : (response?.results ?? []);
        const solved: Record<string, boolean> = {};
        submissions.forEach((s: any) => {
          const qId = s.question_id || s.question;
          if (questionIds.includes(qId) && s.status === 'completed') {
            solved[qId] = true;
          }
        });
        setSolvedMap(prev => ({ ...prev, ...solved }));
      } catch (err) {
        console.error('Failed to fetch solved status', err);
      }
    };
    fetchSolvedStatus();
  }, [questions, codeSubmissionType]);

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

  const loadCodingQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetchQuestions({
        subtopic: subtopicId,
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
    if (success) {
      // Use timestamp so re-submissions of the same problem are always processed
      const submissionKey = `${problemId}-${Date.now()}`;

      const newSolvedMap = { ...solvedMap, [problemId]: true };
      setSolvedMap(newSolvedMap);

      if (codeSubmissionType === 'learn') {
        if (!submissionResult || !submissionResult.code) return;

        try {
          processedSubmissions.current.add(submissionKey);
          const submissionDetails = {
            subtopic_id: subtopicId,
            coding_status: {},
            question_id: problemId,
            language: submissionResult.language || 'python',
            code: submissionResult.code || '',
            test_results: submissionResult.test_results || {},
            execution_output: submissionResult.output || ''
          };

          const res: any = await restApiAuthUtil.post('/course/student-course-progress/submit_coding/', submissionDetails);
          showGamificationToasts(res?.gamification);
          if (onComplete) onComplete(true);
        } catch (error) {
          console.error('Failed to update coding progress:', error);
        }
      } else {
        if (submissionResult?.gamification) {
          showGamificationToasts(submissionResult.gamification);
        }
      }
    }
  };

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
      <div className="flex-1 flex flex-col p-6 overflow-hidden font-sans">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-saffron-600/20 border-t-saffron-600 rounded-full animate-spin" />
            <p className="text-gray-400 font-medium">Initializing coding environment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-6 overflow-hidden font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Terminal className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">No Challenges Found</h3>
          <p className="text-sm text-gray-500 max-w-xs mt-1">This subtopic doesn't have any coding exercises yet.</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="flex-1 flex flex-col p-6 overflow-hidden font-sans bg-gray-50">
        <div className="flex-1 overflow-hidden flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center shrink-0 px-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-saffron-600 flex items-center justify-center shadow-lg shadow-saffron-200/50">
                <Code className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight leading-none">Programming exercises</h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant={isCompleted ? "default" : "outline"} className={`rounded-xl px-5 py-2 font-bold transition-all border-none ${isCompleted ? 'bg-saffron-600 text-white shadow-lg shadow-saffron-200/50' : 'bg-slate-100 text-slate-600'}`}>
                {isCompleted ? (
                  <span className="flex items-center gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5" /> All solved</span>
                ) : (
                  <span className="text-xs">{Object.keys(solvedMap).length} / {questions.length} Solved</span>
                )}
              </Badge>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto px-2 pb-6 custom-scrollbar">
            <div className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                {questions.map((question, index) => {
                  const isSolved = solvedMap[question.id];
                  return (
                    <div
                      key={question.id}
                      onClick={() => handleSelectQuestion(question)}
                      className="group relative cursor-pointer rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 ease-in-out px-5 py-5 overflow-hidden h-full flex flex-col justify-between"
                    >
                      {/* Top Row: Layout without Icon */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-[15px] font-bold text-gray-900 leading-tight group-hover:text-saffron-600 transition-colors">
                            {question.title || `Exercise ${index + 1}`}
                          </h3>
                          <div className="shrink-0">
                            <Badge variant="outline" className={`rounded-lg uppercase text-[10px] font-black tracking-widest px-2 py-0.5 border ${getDifficultyColor(question.difficulty)}`}>
                              {question.difficulty}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-70">
                            <BrainCircuit className="w-4 h-4 text-saffron-500" /> {question.marks ?? 100} pts
                          </p>
                        </div>
                      </div>

                      {/* Bottom Row: Progress Indicator */}
                      <div className="mt-6 flex items-center justify-between">
                        {isSolved ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-saffron-600 uppercase tracking-widest bg-saffron-50 px-3 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" /> Solved
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Not started</div>
                        )}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all transform group-hover:translate-x-1 ${isSolved ? 'bg-saffron-600 text-white shadow-lg shadow-saffron-200/50' : 'bg-slate-50 text-slate-300 group-hover:bg-saffron-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-saffron-200/50'}`}>
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== WORKSPACE VIEW =====================
  return (
    <div className="flex-1 w-full relative font-sans flex flex-col overflow-hidden">
      <CodeEditorWithAI
        ref={codeEditorRef}
        problem={convertToCodingProblem(selectedQuestion!)}
        course={mockCourse}
        topic={mockTopic}
        subtopicId={subtopicId}
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