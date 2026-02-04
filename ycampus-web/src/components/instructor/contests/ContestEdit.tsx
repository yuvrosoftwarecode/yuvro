import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Search, Code, FileText, Brain, Filter } from 'lucide-react';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { contestService, Contest, Question } from '@/services/contestService';
import courseService from '@/services/courseService';

interface Course {
  id: string | number;
  title?: string;
  name?: string;
}

interface ContestSection {
  id: string;
  title: string;
  questions: Question[];
}

interface PendingChanges {
  sections: ContestSection[];
}

export default function ContestEdit() {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [sections, setSections] = useState<ContestSection[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contestId) {
      fetchContest();
      fetchCourses();
    }
  }, [contestId]);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (selectedCourse) {
      const timeoutId = setTimeout(() => {
        fetchQuestionsByCourse(selectedCourse);
      }, 300); // Debounce search by 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [selectedCourse, selectedDifficulty, selectedType, searchQuery]);

  const fetchContest = async () => {
    try {
      const data = await contestService.getContest(contestId!);
      setContest(data);
      
      if (data.question_ids && data.question_ids.length > 0) {
        // Check if it's the new section format or old simple array format
        if (Array.isArray(data.question_ids) && data.question_ids.length > 0) {
          if (typeof data.question_ids[0] === 'object' && data.question_ids[0].title) {
            // New section format
            await loadSectionsFromContest(data.question_ids);
          } else {
            // Old simple array format - convert to single section
            const questions = await fetchQuestionsByIds(data.question_ids);
            setSections([{
              id: 'default',
              title: 'Questions',
              questions: questions
            }]);
          }
        }
      } else {
        // No questions yet - start with empty default section
        setSections([{
          id: 'default',
          title: 'Section 1',
          questions: []
        }]);
      }
    } catch (error) {
      toast.error('Failed to fetch contest details');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionsByIds = async (questionIds: number[]): Promise<Question[]> => {
    try {
      const questions = await Promise.all(
        questionIds.map(async (id) => {
          try {
            return await contestService.getQuestion(id);
          } catch {
            return null;
          }
        })
      );
      return questions.filter(q => q !== null);
    } catch (error) {
      toast.error('Failed to fetch questions');
      return [];
    }
  };

  const loadSectionsFromContest = async (sectionsData: any[]) => {
    try {
      const loadedSections = await Promise.all(
        sectionsData.map(async (section) => {
          const questions = await fetchQuestionsByIds(section.questions || []);
          return {
            id: section.id || `section-${Date.now()}`,
            title: section.title || 'Untitled Section',
            questions: questions
          };
        })
      );
      setSections(loadedSections);
    } catch (error) {
      toast.error('Failed to load contest sections');
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await courseService.getCourses();
      setCourses(data);
    } catch (error) {
      toast.error('Failed to fetch courses');
    }
  };

  const fetchQuestionsByCourse = async (courseId: string | number) => {
    setQuestionsLoading(true);
    try {
      const filters = {
        difficulty: selectedDifficulty || undefined,
        type: selectedType || undefined,
        search: searchQuery || undefined,
      };
      const data = await contestService.getQuestionsByCourse(courseId, filters);
      setAvailableQuestions(data);
    } catch (error) {
      toast.error('Failed to fetch questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const addSection = () => {
    const newSection: ContestSection = {
      id: `section-${Date.now()}`,
      title: `Section ${sections.length + 1}`,
      questions: []
    };
    setSections([...sections, newSection]);
    setHasUnsavedChanges(true);
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, title } : section
    ));
    setHasUnsavedChanges(true);
  };

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) {
      toast.error('Contest must have at least one section');
      return;
    }
    setSections(sections.filter(section => section.id !== sectionId));
    setHasUnsavedChanges(true);
  };

  const addQuestionToSection = (sectionId: string, question: Question) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        // Check if question already exists in this section
        if (section.questions.some(q => q.id === question.id)) {
          toast.error('Question already exists in this section');
          return section;
        }
        return { ...section, questions: [...section.questions, question] };
      }
      return section;
    }));
    setHasUnsavedChanges(true);
  };

  const removeQuestionFromSection = (sectionId: string, questionId: number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, questions: section.questions.filter(q => q.id !== questionId) };
      }
      return section;
    }));
    setHasUnsavedChanges(true);
  };

  const saveContestChanges = async () => {
    if (!contest) return;
    
    setIsSaving(true);
    try {
      // Convert sections to the format expected by the backend
      const sectionsData = sections.map(section => ({
        id: section.id,
        title: section.title,
        questions: section.questions.map(q => q.id)
      }));

      await contestService.updateContest(contestId!, { question_ids: sectionsData });
      setHasUnsavedChanges(false);
      toast.success('Contest saved successfully');
    } catch (error) {
      toast.error('Failed to save contest');
    } finally {
      setIsSaving(false);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'coding': return <Code className="h-4 w-4" />;
      case 'mcq_single':
      case 'mcq_multiple': return <Brain className="h-4 w-4" />;
      case 'descriptive': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAllQuestionIds = () => {
    return sections.flatMap(section => section.questions.map(q => q.id));
  };

  const filteredAvailableQuestions = availableQuestions.filter(question =>
    !getAllQuestionIds().includes(question.id)
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!contest) {
    return <div className="flex items-center justify-center h-screen">Contest not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader 
            title={`Manage Contest: ${contest.title}`}
            subtitle="Add questions and manage contest content"
          />
          <div className="p-6">
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                      navigate('/instructor/contests');
                    }
                  } else {
                    navigate('/instructor/contests');
                  }
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Contests
              </Button>
              {hasUnsavedChanges && (
                <Badge variant="destructive">Unsaved Changes</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contest Sections */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Contest Sections ({sections.reduce((total, section) => total + section.questions.length, 0)} questions)</CardTitle>
                      <CardDescription>Organize questions into sections</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addSection}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Section
                      </Button>
                      {hasUnsavedChanges && (
                        <Button
                          onClick={saveContestChanges}
                          disabled={isSaving}
                          className="gap-2"
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {sections.map((section, sectionIndex) => (
                      <div key={section.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Input
                            value={section.title}
                            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                            className="font-medium text-lg border-none p-0 h-auto focus-visible:ring-0"
                            placeholder="Section title..."
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{section.questions.length} questions</Badge>
                            {sections.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSection(section.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {section.questions.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                            No questions in this section. Add questions from the question bank.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {section.questions.map((question, questionIndex) => (
                              <div key={question.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500 w-6">{questionIndex + 1}.</span>
                                  {getQuestionTypeIcon(question.type)}
                                  <div>
                                    <div className="font-medium text-sm">{question.title}</div>
                                    <div className="text-xs text-gray-500">{question.course.title}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getDifficultyColor(question.difficulty)} variant="outline">
                                    {question.difficulty}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeQuestionFromSection(section.id, question.id)}
                                    className="h-6 w-6"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Add Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Question Bank</CardTitle>
                  <CardDescription>Select questions to add to the contest</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Course Selection */}
                    <div className="flex gap-2">
                      <select
                        value={selectedCourse || ''}
                        onChange={(e) => {
                          const courseId = e.target.value || null;
                          setSelectedCourse(courseId);
                          // Reset filters when course changes
                          if (courseId !== selectedCourse) {
                            setSearchQuery('');
                            setSelectedDifficulty('');
                            setSelectedType('');
                          }
                        }}
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="">Select a course</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title || course.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedCourse && (
                      <>
                        {/* Search Bar */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search questions by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-sm font-medium mb-1 block">Difficulty</Label>
                            <select
                              value={selectedDifficulty}
                              onChange={(e) => setSelectedDifficulty(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                              <option value="">All Difficulties</option>
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                          <div className="flex-1">
                            <Label className="text-sm font-medium mb-1 block">Question Type</Label>
                            <select
                              value={selectedType}
                              onChange={(e) => setSelectedType(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                              <option value="">All Types</option>
                              <option value="mcq_single">MCQ - Single Answer</option>
                              <option value="mcq_multiple">MCQ - Multiple Answers</option>
                              <option value="coding">Coding Problem</option>
                              <option value="descriptive">Descriptive Question</option>
                            </select>
                          </div>
                        </div>

                        {/* Clear Filters Button */}
                        {(selectedDifficulty || selectedType || searchQuery) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDifficulty('');
                              setSelectedType('');
                              setSearchQuery('');
                            }}
                            className="gap-2"
                          >
                            <Filter className="h-4 w-4" />
                            Clear Filters
                          </Button>
                        )}
                      </>
                    )}

                    {selectedCourse && (
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {questionsLoading ? (
                          <div className="text-center py-8 text-gray-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            Loading questions...
                          </div>
                        ) : filteredAvailableQuestions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            {searchQuery || selectedDifficulty || selectedType ? (
                              <div>
                                <p>No questions match your filters</p>
                                <p className="text-sm mt-1">Try adjusting your search criteria</p>
                              </div>
                            ) : (
                              'No available questions found in this course'
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600 mb-2">
                              Found {filteredAvailableQuestions.length} question{filteredAvailableQuestions.length !== 1 ? 's' : ''}
                            </div>
                            {filteredAvailableQuestions.map((question) => (
                              <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                  {getQuestionTypeIcon(question.type)}
                                  <div>
                                    <div className="font-medium">{question.title}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                      <span>{question.course.title}</span>
                                      <span>•</span>
                                      <span className="capitalize">{question.type}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getDifficultyColor(question.difficulty)} variant="outline">
                                    {question.difficulty}
                                  </Badge>
                                  <div className="flex items-center gap-1">
                                    {sections.map((section) => (
                                      <Button
                                        key={section.id}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => addQuestionToSection(section.id, question)}
                                        title={`Add to ${section.title}`}
                                        className="h-8 px-2 text-xs"
                                      >
                                        {section.title.substring(0, 8)}
                                        {section.title.length > 8 ? '...' : ''}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}