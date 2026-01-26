import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRandomQuestions } from "@/services/questionService";
import { submitQuiz } from "@/services/courseService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

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
  const navigate = useNavigate();
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
    if (onComplete) {
    }

    loadQuizzes();
    resetQuiz();
  }, [subtopicId]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      // Fetch random 5 questions from question service with category 'learn' and level 'subtopic'
      const selectedQuestions = await fetchRandomQuestions({
        subtopic: subtopicId,
        type: 'mcq_single'
      }, 5);

      // Transform to quiz format
      const quizData: QuizQuestion[] = selectedQuestions.map(q => ({
        id: q.id,
        question: q.content,
        options: q.mcq_options?.map(opt => opt.text) || [],
        correct_answer_index: q.mcq_options?.findIndex(opt => opt.is_correct) || 0
      }));

      setQuizzes(quizData);

      // If no quizzes, mark complete automatically
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

    const passed = localStorage.getItem(`quiz_passed_${subtopicId}`) === 'true';
    setQuizCompleted(false);
    if (!passed) setIsPassed(false);
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

    // Check if quiz is completed
    if (currentIndex === quizzes.length - 1) {
      const percentage = (updatedScore / quizzes.length) * 100;
      const passed = percentage >= 70;

      if (passed) {
        setIsPassed(true);
      }

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
    return <div className="text-muted-foreground">Loading quiz...</div>;
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div className="mb-4">No quizzes available for this subtopic.</div>
        <p className="text-sm text-gray-500">Try the Coding tab for programming exercises.</p>
      </div>
    );
  }

  // Quiz completed summary
  if (quizCompleted) {
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center border border-gray-300">
          <h2 className="text-xl font-bold mb-3">Quiz Completed! 🎉</h2>
          <p className="text-lg mb-3">
            You scored{" "}
            <span className="font-bold">
              {score} / {quizzes.length}
            </span>
          </p>

          <p
            className={`text-lg font-semibold mb-4 ${isPassed ? "text-green-600" : "text-red-600"
              }`}
          >
            {isPassed ? "Congratulations! You passed the quiz." : "Keep practicing! You can retake the quiz."}
          </p>

          <div className="flex justify-center">
            <Button onClick={handleRetakeQuiz} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Retake Quiz
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentQuiz = quizzes[currentIndex];

  return (
    <div className="space-y-4">
      <Card className="border border-gray-300">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Question {currentIndex + 1} / {quizzes.length}</span>
            <span className="text-sm font-normal text-gray-600">
              Score: {score} / {quizzes.length}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Question */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-lg">{currentQuiz.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQuiz.options.map((opt, index) => {
              const isCorrect = index === currentQuiz.correct_answer_index;
              const isSelected = selectedOption === index;

              let buttonClass = "w-full justify-start text-left border border-gray-300";

              if (submitted) {
                if (isCorrect) {
                  buttonClass += " bg-green-100 border-green-500 text-green-800";
                } else if (isSelected) {
                  buttonClass += " bg-red-100 border-red-500 text-red-800";
                }
              } else if (isSelected) {
                buttonClass += " border-blue-500 bg-blue-50";
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={buttonClass}
                  onClick={() => !submitted && setSelectedOption(index)}
                >
                  {opt}
                </Button>
              );
            })}
          </div>

          {/* Submit Button */}
          {!submitted && (
            <Button
              className="w-full mt-4"
              disabled={selectedOption === null}
              onClick={handleSubmit}
            >
              Submit Answer
            </Button>
          )}

          {/* Feedback */}
          {submitted && (
            <div className="text-center mt-4 p-4 rounded-lg bg-gray-50">
              {selectedOption === currentQuiz.correct_answer_index ? (
                <p className="text-green-600 font-semibold">Correct! 🎉</p>
              ) : (
                <div className="text-red-600 font-semibold">
                  <p>Incorrect ❌</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Correct Answer: {currentQuiz.options[currentQuiz.correct_answer_index]}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={handlePrevious}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={!submitted}
              className="flex items-center gap-2"
            >
              {currentIndex === quizzes.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentQuizEmbed;