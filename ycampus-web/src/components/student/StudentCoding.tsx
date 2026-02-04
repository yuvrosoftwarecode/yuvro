import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchQuestions, Question } from "@/services/questionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Play, CheckCircle, ChevronLeft } from "lucide-react";
import Navigation from "@/components/common/Navigation";

const StudentCoding = () => {
  const { subtopicId } = useParams<{ subtopicId: string }>();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (subtopicId) {
      loadCodingQuestions();
    }
  }, [subtopicId]);

  const loadCodingQuestions = async () => {
    if (!subtopicId) return;
    
    setLoading(true);
    try {
      // Fetch all coding questions for this subtopic from question service
      const res = await fetchQuestions({
        subtopic: subtopicId,
        categories: 'learn',
        level: 'subtopic',
        type: 'coding'
      });
      
      setQuestions(res);
      if (res.length > 0) {
        setSelectedQuestion(res[0]);
      }
    } catch (err) {
      console.error("Failed to load coding questions", err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

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
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading coding questions...</div>
        </div>
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-muted-foreground py-8">
            <Code className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="mb-4">No coding questions available for this subtopic.</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Code className="h-6 w-6" />
              Coding Practice ({questions.length} questions)
            </h1>
            <p className="text-gray-600">Practice coding problems for this subtopic</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Question List */}
            <div className="lg:col-span-1">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Problems</h3>
                <div className="space-y-2">
                  {questions.map((question, index) => (
                    <Card 
                      key={question.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedQuestion?.id === question.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedQuestion(question)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">
                              Problem {index + 1}: {question.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {question.marks} marks
                              </span>
                            </div>
                          </div>
                          {selectedQuestion?.id === question.id && (
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Question Details */}
            <div className="lg:col-span-2">
              {selectedQuestion ? (
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        {selectedQuestion.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getDifficultyColor(selectedQuestion.difficulty)}>
                          {selectedQuestion.difficulty}
                        </Badge>
                        <Badge variant="outline">
                          {selectedQuestion.marks} marks
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Problem Description */}
                    <div>
                      <h4 className="font-medium mb-2">Problem Description</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm">
                          {selectedQuestion.content}
                        </pre>
                      </div>
                    </div>

                    {/* Test Cases */}
                    {selectedQuestion.test_cases_basic && selectedQuestion.test_cases_basic.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Sample Test Cases</h4>
                        <div className="space-y-3">
                          {selectedQuestion.test_cases_basic.map((testCase, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Input:</span>
                                  <pre className="mt-1 bg-white p-2 rounded border">
                                    {testCase.input}
                                  </pre>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Expected Output:</span>
                                  <pre className="mt-1 bg-white p-2 rounded border">
                                    {testCase.expected_output}
                                  </pre>
                                </div>
                              </div>
                              {testCase.description && (
                                <div className="mt-2">
                                  <span className="font-medium text-gray-700">Description:</span>
                                  <p className="text-sm text-gray-600 mt-1">{testCase.description}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Start Coding
                      </Button>
                      <Button variant="outline">
                        View Solution
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <Code className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Select a problem from the list to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentCoding;