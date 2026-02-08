import { useEffect, useState, useRef } from "react";
import { fetchQuestions, Question } from "@/services/questionService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, CheckCircle, Terminal } from "lucide-react";
import { CodeEditorWithAI, CodeEditorWithAIHandle } from "@/components/code-editor";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";

interface StudentCodingEmbedProps {
  subunitId: string;
  onComplete?: (status: boolean) => void;
  codeSubmissionType?: 'learn' | 'practice';
  subjectId?: string;
  unitId?: string;
}

// Import types from CodePractice for compatibility
import type { Subject, Unit, CodingProblem } from '@/pages/student/CodePractice';

// Layout components removed as CodeEditorWithAI handles layout internally

const StudentCodingEmbed = ({ subunitId, onComplete, codeSubmissionType = 'practice', subjectId, unitId }: StudentCodingEmbedProps) => {
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

  // Convert Question to CodingProblem format
  const convertToCodingProblem = (question: Question): CodingProblem => {
    return {
      id: question.id,
      title: question.title || 'Coding Problem',
      difficulty: (question.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium',
      score: 100,
      description: question.content || '',
      test_cases_basic: question.test_cases_basic || [],
      test_cases_advanced: []
    };
  };

  // Problem context removed as CodeExecutionPanel handles this internally

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-muted-foreground p-4">Loading coding questions...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 bg-gray-50 rounded-lg border border-dashed">
        <Code className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No coding questions available for this subunit.</p>
        <p className="text-sm mt-2">Requirement automatically met.</p>
      </div>
    );
  }

  // ===================== LIST VIEW =====================
  if (viewMode === 'list') {
    return (
      <div className="space-y-6 animate-fade-in px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Coding Practice ({Object.keys(solvedMap).length} / {questions.length} solved)
            </h3>
          </div>
          <Badge variant={isCompleted ? "default" : "outline"} className={isCompleted ? "bg-green-600" : ""}>
            {isCompleted ? "All Completed" : "In Progress"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questions.map((question, index) => (
            <Card
              key={question.id}
              className={`cursor-pointer transition-all hover:shadow-md border-gray-200 hover:border-indigo-300 group`}
              onClick={() => handleSelectQuestion(question)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <Terminal className="h-5 w-5 text-indigo-600" />
                  </div>
                  {(solvedMap[question.id]) && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>

                <h5 className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                  {index + 1}. {question.title}
                </h5>

                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(question.difficulty)}>
                    {question.difficulty}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ===================== WORKSPACE VIEW =====================

  return (
    <div className="h-full w-full relative">
      {/* CodeEditorWithAI - Let it handle its own layout and fullscreen */}
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