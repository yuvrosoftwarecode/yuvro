import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchRandomQuestions } from "@/services/questionService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Code } from "lucide-react";
import Navigation from "@/components/common/Navigation";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_answer_index: number;
};

const StudentQuiz = () => {
  const { subtopicId } = useParams<{ subtopicId: string }>();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [k: number]: number }>({});
  const [isPassed, setIsPassed] = useState(false);


  useEffect(() => {
    if (subtopicId) {
      loadQuizzes();
      setCurrentIndex(0);
      setSelectedOption(null);
      setSubmitted(false);
      setScore(0);
      setUserAnswers({});
      setIsPassed(false);
    }
  }, [subtopicId]);

  const loadQuizzes = async () => {
    if (!subtopicId) return;

    setLoading(true);
    try {
      // Fetch random 5 questions from question service with category 'learn' and level 'subtopic'
      const selectedQuestions = await fetchRandomQuestions({
        subtopic: subtopicId,
        categories: 'learn',
        level: 'subtopic',
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
    } catch (err) {
      console.error("Failed to load quizzes", err);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCodingQuestions = () => {
    navigate(`/student/learn/${subtopicId}/coding`);
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading quiz...</div>
        </div>
      </>
    );
  }

  if (quizzes.length === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground mb-4">No quizzes available for this subtopic.</div>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </>
    );
  }

  // Quiz completed summary
  if (currentIndex >= quizzes.length) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-4">
            <Card className="p-6 text-center border border-gray-300">
              <h2 className="text-2xl font-bold mb-3">Quiz Completed 🎉</h2>
              <p className="text-lg mb-3">
                You scored{" "}
                <span className="font-bold">
                  {score} / {quizzes.length}
                </span>
              </p>

              <p
                className={`text-xl font-semibold mb-6 ${isPassed ? "text-green-600" : "text-red-600"
                  }`}
              >
                {isPassed ? "Congratulations! You passed the quiz." : "Unfortunately, you did not pass. Please try again."}
              </p>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => {
                    setCurrentIndex(0);
                    setScore(0);
                    setSubmitted(false);
                    setSelectedOption(null);
                    setUserAnswers({});
                    setIsPassed(false);
                  }}
                >
                  Retake Quiz
                </Button>

                {isPassed && (
                  <Button
                    variant="outline"
                    onClick={handleViewCodingQuestions}
                    className="flex items-center gap-2"
                  >
                    <Code className="h-4 w-4" />
                    Practice Coding
                  </Button>
                )}

                <Button variant="outline" onClick={() => navigate(-1)}>
                  Go Back
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const currentQuiz = quizzes[currentIndex];

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

    const percentage = (updatedScore / quizzes.length) * 100;
    if (percentage >= 70) {
      setIsPassed(true);
    }
  };

  const handleNext = () => {
    if (currentIndex === quizzes.length - 1) {
      setCurrentIndex(quizzes.length);
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

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Learn Quiz</h1>
            <p className="text-gray-600">Test your knowledge with this quiz</p>
          </div>

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
      </div>
    </>
  );
};

export default StudentQuiz;
