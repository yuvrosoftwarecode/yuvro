import { useEffect, useState } from "react";
import { fetchRandomQuestions } from "@/services/questionService";
import { submitQuiz } from "@/services/courseService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCcw, BrainCircuit, CheckCircle2, AlertCircle, Target } from "lucide-react";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_answer_index: number;
};

interface StudentQuizEmbedProps {
  subtopicId: string;
  onComplete?: (status: boolean) => void;
}

const StudentQuizEmbed = ({ subtopicId, onComplete }: StudentQuizEmbedProps) => {
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [k: number]: number }>({});
  const [isPassed, setIsPassed] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    loadQuizzes();
    resetQuiz();
  }, [subtopicId]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const selectedQuestions = await fetchRandomQuestions({
        subtopic: subtopicId,
        type: 'mcq_single'
      }, 5);

      const quizData: QuizQuestion[] = selectedQuestions.map(q => ({
        id: q.id,
        question: q.content,
        options: q.mcq_options?.map(opt => opt.text) || [],
        correct_answer_index: q.mcq_options?.findIndex(opt => opt.is_correct) || 0
      }));

      setQuizzes(quizData);
      if (quizData.length === 0 && onComplete) {
        onComplete(true);
      }
    } catch (err) {
      console.error("Failed to load quizzes", err);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setScore(0);
    setUserAnswers({});
    setQuizCompleted(false);
    setIsPassed(false);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;

    const isCorrect = selectedOption === currentQuiz.correct_answer_index;
    const updatedScore = isCorrect ? score + 1 : score;
    setScore(updatedScore);

    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: selectedOption,
    }));

    setSubmitted(true);

    if (currentIndex === quizzes.length - 1) {
      const percentage = (updatedScore / quizzes.length) * 100;
      const passed = percentage >= 70;
      if (passed) setIsPassed(true);

      submitQuiz(subtopicId, { ...userAnswers, [currentIndex]: selectedOption }, percentage, passed)
        .then(() => {
          if (onComplete) onComplete(true);
        })
        .catch(err => console.error("Failed to submit quiz", err));
      setQuizCompleted(true);
    }
  };

  const handleNext = () => {
    if (currentIndex === quizzes.length - 1) {
      setQuizCompleted(true);
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedOption(userAnswers[nextIndex] ?? null);
    setSubmitted(userAnswers[nextIndex] !== undefined);
  };

  const handlePrevious = () => {
    if (currentIndex === 0) return;
    const previousIndex = currentIndex - 1;
    setCurrentIndex(previousIndex);
    setSelectedOption(userAnswers[previousIndex] ?? null);
    setSubmitted(userAnswers[previousIndex] !== undefined);
  };

  const handleRetakeQuiz = () => {
    resetQuiz();
    loadQuizzes();
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col p-4 bg-slate-50/50 overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-400 font-medium">Preparing your assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="h-full flex flex-col p-4 bg-slate-50/50 overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">No Quizzes Found</h3>
          <p className="text-gray-500 max-w-xs mt-1">There are no MCQ questions for this topic yet. Check back later!</p>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="h-full flex flex-col p-4 bg-slate-50/50 overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-md border-4 ${isPassed ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
            {isPassed ? <CheckCircle2 className="w-10 h-10" /> : <RotateCcw className="w-10 h-10" />}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{isPassed ? "Topic Mastered! 🎉" : "Keep Practicing!"}</h2>
          <p className="text-gray-500 mb-8 font-medium">
            Score: <span className="text-gray-900 font-bold">{score} / {quizzes.length}</span>
          </p>

          <div className={`px-8 py-5 rounded-2xl border mb-10 max-w-md w-full ${isPassed ? "bg-green-50/50 border-green-100 text-green-800" : "bg-red-50/50 border-red-100 text-red-800"}`}>
            {isPassed ? (
              <p className="font-semibold">Excellent work! You have shown a strong understanding of this subtopic.</p>
            ) : (
              <p className="font-semibold">You're getting there. Review your notes and try the assessment again to improve your score.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <Button onClick={handleRetakeQuiz} variant="secondary" className="flex-1 rounded-xl h-12 border border-gray-200 font-bold hover:bg-gray-50 transition-all">
              <RotateCcw className="h-4 w-4 mr-2" /> Retake
            </Button>
            {isPassed && onComplete && (
              <Button onClick={() => onComplete(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 shadow-lg shadow-blue-100 font-bold transition-all active:scale-95">
                Next Session
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQuiz = quizzes[currentIndex];

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50/50 overflow-hidden">
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Quiz Header */}
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none mb-1">Knowledge Guard</p>
              <p className="text-sm font-bold text-gray-900 leading-none">Assessment {currentIndex + 1} of {quizzes.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-2 justify-end mb-1">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Accuracy</p>
              </div>
              <p className="text-sm font-bold text-indigo-600 leading-none">{Math.round((score / quizzes.length) * 100)}%</p>
            </div>
            <div className="h-10 w-[1px] bg-gray-200 hidden sm:block" />
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Progress</div>
              <div className="flex gap-1.5">
                {quizzes.map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-1 rounded-full transition-all duration-300 ${i <= currentIndex ? 'bg-indigo-600 w-6' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-2xl mx-auto flex flex-col h-full min-h-0">
            {/* Question */}
            <div className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {currentQuiz.question}
              </h2>
            </div>

            {/* Options List */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              {currentQuiz.options.map((opt, index) => {
                const isCorrect = index === currentQuiz.correct_answer_index;
                const isSelected = selectedOption === index;

                let buttonClass = "w-full min-h-[56px] justify-start text-left p-4 rounded-xl border-2 transition-all duration-200 group ";

                if (submitted) {
                  if (isSelected) {
                    buttonClass += isCorrect ? "bg-green-50 border-green-500 text-green-900 shadow-sm" : "bg-red-50 border-red-500 text-red-900 shadow-sm";
                  } else if (isCorrect) {
                    buttonClass += "bg-green-50/20 border-green-200 text-green-800";
                  } else {
                    buttonClass += "border-gray-50 opacity-40";
                  }
                } else if (isSelected) {
                  buttonClass += "border-blue-500 bg-blue-50/50 text-blue-900 ring-4 ring-blue-50 shadow-md transform -translate-y-0.5";
                } else {
                  buttonClass += "border-gray-100 bg-white hover:border-blue-200 hover:bg-slate-50 text-gray-700 hover:shadow-sm";
                }

                return (
                  <Button
                    key={index}
                    variant="ghost"
                    className={buttonClass}
                    onClick={() => !submitted && setSelectedOption(index)}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-2 font-bold text-xs transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-100 bg-gray-50 text-gray-400 group-hover:border-blue-200 group-hover:text-blue-500'}`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className={`flex-1 text-sm md:text-base font-semibold transition-colors ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{opt}</span>
                      {submitted && isSelected && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                          {isCorrect ? "✓" : "✗"}
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Floating Feedback Bubble */}
            {submitted && (
              <div className={`mt-auto p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300 border ${selectedOption === currentQuiz.correct_answer_index ? 'bg-green-50/30 text-green-800 border-green-100' : 'bg-red-50/30 text-red-800 border-red-100'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${selectedOption === currentQuiz.correct_answer_index ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {selectedOption === currentQuiz.correct_answer_index ? "✓" : "!"}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{selectedOption === currentQuiz.correct_answer_index ? "Excellent work!" : "Not quite, but good effort."}</p>
                  {selectedOption !== currentQuiz.correct_answer_index && (
                    <p className="text-[10px] uppercase font-bold opacity-60 mt-0.5">Correct: {currentQuiz.options[currentQuiz.correct_answer_index]}</p>
                  )}
                </div>
                <Button onClick={handleNext} className="bg-gray-900 hover:bg-black text-white rounded-xl h-10 px-6 font-bold text-xs shadow-md">
                  {currentIndex === quizzes.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Standard Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
          <Button
            variant="ghost"
            disabled={currentIndex === 0 || submitted}
            onClick={handlePrevious}
            className="flex items-center gap-2 text-gray-400 font-bold hover:text-gray-900 rounded-xl px-0 hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Backtrack</span>
          </Button>

          <div className="flex-1 max-w-[200px]">
            {!submitted && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 shadow-lg shadow-indigo-100 font-bold transition-all active:scale-95 w-full uppercase tracking-widest text-xs"
                disabled={selectedOption === null}
                onClick={handleSubmit}
              >
                Confirm Choice
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQuizEmbed;