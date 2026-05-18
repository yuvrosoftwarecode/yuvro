import { useEffect, useState } from "react";
import { fetchRandomQuestions } from "@/services/questionService";
import { submitQuiz } from "@/services/courseService";
import { showGamificationToasts } from "@/utils/gamificationToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCcw, BrainCircuit, CheckCircle2, AlertCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [animating, setAnimating] = useState(false);

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
    setDirection(null);
    setAnimating(false);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;

    const updatedAnswers = { ...userAnswers, [currentIndex]: selectedOption };
    setUserAnswers(updatedAnswers);
    setSubmitted(true);

    if (currentIndex === quizzes.length - 1) {
      // Recalculate score from all answers to avoid stale accumulation
      const finalScore = quizzes.reduce((acc, q, idx) => {
        return updatedAnswers[idx] === q.correct_answer_index ? acc + 1 : acc;
      }, 0);
      setScore(finalScore);

      const percentage = (finalScore / quizzes.length) * 100;
      const passed = percentage >= 70;
      if (passed) setIsPassed(true);

      submitQuiz(subtopicId, updatedAnswers, percentage, passed)
        .then((res: any) => {
          showGamificationToasts(res?.gamification);
          if (onComplete) onComplete(true);
        })
        .catch(err => console.error("Failed to submit quiz", err));
      setQuizCompleted(true);
    } else {
      // Update running score for display purposes only
      const isCorrect = selectedOption === currentQuiz.correct_answer_index;
      setScore(prev => isCorrect ? prev + 1 : prev);
    }
  };

  const handleNext = () => {
    if (animating) return;
    if (currentIndex === quizzes.length - 1) {
      setQuizCompleted(true);
      return;
    }

    setDirection('next');
    setAnimating(true);

    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedOption(userAnswers[nextIndex] ?? null);
      setSubmitted(userAnswers[nextIndex] !== undefined);
      setAnimating(false);
    }, 300);
  };

  const handlePrevious = () => {
    if (animating) return;
    if (currentIndex === 0) return;

    setDirection('prev');
    setAnimating(true);

    setTimeout(() => {
      const previousIndex = currentIndex - 1;
      setCurrentIndex(previousIndex);
      setSelectedOption(userAnswers[previousIndex] ?? null);
      setSubmitted(userAnswers[previousIndex] !== undefined);
      setAnimating(false);
    }, 300);
  };

  const handleRetakeQuiz = () => {
    resetQuiz();
    loadQuizzes();
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-saffron-600/20 border-t-saffron-600 rounded-full animate-spin" />
          <p className="text-gray-400 font-medium">Preparing your assessment...</p>
        </div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50 font-sans">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
          <AlertCircle className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">No quizzes found</h3>
        <p className="text-gray-500 max-w-xs mt-1">There are no MCQ questions for this topic yet. Check back later!</p>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="h-full flex flex-col p-6 bg-gray-50 overflow-y-auto font-sans">
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full py-10">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-md border-4 transition-transform duration-500 scale-110 ${isPassed ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
            {isPassed ? <CheckCircle2 className="w-10 h-10" /> : <RotateCcw className="w-10 h-10" />}
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight">{isPassed ? "Topic mastered! 🎉" : "Keep practicing!"}</h2>
          <p className="text-sm font-medium text-gray-500 mb-8">
            You scored <span className="text-gray-900 font-bold">{score} out of {quizzes.length}</span>
          </p>

          <div className={`px-8 py-6 rounded-xl border mb-10 w-full transition-all duration-500 ${isPassed ? "bg-green-50/50 border-green-100 text-green-800" : "bg-red-50/50 border-red-100 text-red-800"}`}>
            {isPassed ? (
              <p className="font-bold text-center text-sm">Excellent work! You have shown a strong understanding of this subtopic.</p>
            ) : (
              <p className="font-bold text-center text-sm">You're getting there. Review your notes and try the assessment again to improve your score.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Button onClick={handleRetakeQuiz} variant="outline" className="flex-1 rounded-xl h-12 border-gray-200 font-bold text-sm hover:bg-gray-50 transition-all">
              <RotateCcw className="h-4 w-4 mr-2" /> Retake quiz
            </Button>
            {isPassed && onComplete && (
              <Button onClick={() => onComplete(true)} className="flex-1 bg-saffron-600 hover:bg-saffron-700 text-white rounded-xl h-12 shadow-lg shadow-saffron-200/50 font-bold text-sm transition-all active:scale-95">
                Next lesson
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentQuiz = quizzes[currentIndex];

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden font-sans">
      {/* Ultra-Minimal Progress Bar */}
      <div className="h-1 w-full bg-gray-200 shrink-0 overflow-hidden">
        <div 
          className="h-full bg-saffron-600 shadow-[0_0_8px_rgba(255,128,0,0.4)]"
          style={{ width: `${((currentIndex + 1) / quizzes.length) * 100}%`, transition: currentIndex > 0 ? 'width 700ms ease-out' : 'none' }}
        />
      </div>

      {/* Flush Minimal Header (Notes Style) */}
      <div className="px-6 py-5 flex justify-between items-center shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-saffron-600" />
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">Learn quiz</h2>
            <p className="text-[11px] font-medium text-gray-400">Question {currentIndex + 1} of {quizzes.length}</p>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-50" />

      {/* Main content with horizontal sliding */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className={cn(
            "h-full w-full flex flex-col p-6 md:p-10 transition-all duration-300 ease-in-out",
            animating && direction === 'next' && "translate-x-[-20%] opacity-0",
            animating && direction === 'prev' && "translate-x-[20%] opacity-0",
            !animating && "translate-x-0 opacity-100"
          )}
        >
          <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
            {/* Question Card style but flush */}
            <div className="mb-10">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight tracking-tight">
                {currentQuiz.question}
              </h3>
            </div>

            {/* Options List */}
            <div className="grid grid-cols-1 gap-3 mb-8">
              {currentQuiz.options.map((opt, index) => {
                const isCorrect = index === currentQuiz.correct_answer_index;
                const isSelected = selectedOption === index;

                let buttonClass = "w-full min-h-[64px] justify-start text-left px-6 py-4 rounded-xl border-2 transition-all duration-200 group relative overflow-hidden ";

                if (submitted) {
                  if (isSelected) {
                    buttonClass += isCorrect ? "bg-green-50 border-green-500 text-green-900 shadow-sm" : "bg-red-50 border-red-500 text-red-900 shadow-sm";
                  } else if (isCorrect) {
                    buttonClass += "bg-green-50/20 border-green-100 text-green-800";
                  } else {
                    buttonClass += "border-gray-50 opacity-40";
                  }
                } else if (isSelected) {
                  buttonClass += "border-saffron-600 bg-saffron-50/30 text-saffron-900 ring-4 ring-saffron-50 shadow-md transform -translate-y-0.5";
                } else {
                  buttonClass += "border-gray-100 bg-white hover:border-saffron-200 hover:bg-slate-50 text-gray-700 hover:shadow-sm";
                }

                return (
                  <Button
                    key={index}
                    variant="ghost"
                    className={buttonClass}
                    onClick={() => !submitted && setSelectedOption(index)}
                  >
                    <div className="flex items-center gap-5 w-full relative z-10">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-2 font-bold text-xs transition-all duration-300 ${isSelected ? 'bg-saffron-600 border-saffron-600 text-white shadow-lg shadow-saffron-100/50' : 'border-gray-100 bg-gray-50 text-gray-400 group-hover:border-saffron-200 group-hover:text-saffron-500'}`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className={`flex-1 text-[15px] font-bold tracking-tight transition-colors ${isSelected ? 'text-saffron-900' : 'text-gray-700'}`}>{opt}</span>
                      {submitted && isSelected && (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-sm ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                          {isCorrect ? "✓" : "✗"}
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* In-place Feedback (Material Style) */}
            {submitted && (
              <div className={`mt-auto p-5 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 border ${selectedOption === currentQuiz.correct_answer_index ? 'bg-green-50/50 text-green-800 border-green-100' : 'bg-red-50/50 text-red-800 border-red-100'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold shadow-sm ${selectedOption === currentQuiz.correct_answer_index ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {selectedOption === currentQuiz.correct_answer_index ? "✓" : "!"}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[15px] tracking-tight">{selectedOption === currentQuiz.correct_answer_index ? "Excellent work!" : "Not quite, but good effort."}</p>
                  {selectedOption !== currentQuiz.correct_answer_index && (
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mt-0.5">Correct: {currentQuiz.options[currentQuiz.correct_answer_index]}</p>
                  )}
                </div>
                <Button onClick={handleNext} className="bg-gray-900 hover:bg-black text-white rounded-xl h-11 px-8 font-bold text-sm shadow-lg transition-all active:scale-95">
                  {currentIndex === quizzes.length - 1 ? 'Finish' : 'Next question'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persistent Footer */}
      {!submitted && (
        <div className="px-6 py-5 bg-white border-t border-gray-50 flex justify-between items-center shrink-0">
          <Button
            variant="ghost"
            disabled={currentIndex === 0 || animating}
            onClick={handlePrevious}
            className="flex items-center gap-2 text-gray-400 font-bold hover:text-gray-900 rounded-xl px-2 hover:bg-slate-50 transition-colors text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <Button
            className="bg-saffron-600 hover:bg-saffron-700 text-white rounded-xl h-12 px-10 shadow-lg shadow-saffron-200/50 font-bold transition-all active:scale-95 text-sm"
            disabled={selectedOption === null || animating}
            onClick={handleSubmit}
          >
            Confirm choice
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudentQuizEmbed;