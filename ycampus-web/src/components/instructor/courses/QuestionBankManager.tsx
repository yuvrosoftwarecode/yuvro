import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit3,
  Trash2,
  FileQuestion,
  Code,
  FileText,
  CheckCircle,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Question,
  CreateQuestionData,
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
  QUESTION_CATEGORIES,
  validateQuestion,
} from '@/services/questionService';

interface QuestionBankManagerProps {
  course: any;
  selectedTopic: any;
  selectedSubtopic: any;
  topics: any[];
}

const QuestionBankManager: React.FC<QuestionBankManagerProps> = ({
  course,
  selectedTopic,
  selectedSubtopic,
  topics,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('mcq_single');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Tab and form states
  const [activeTab, setActiveTab] = useState<'create' | 'questions'>('create');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState<CreateQuestionData>({
    type: 'mcq_single',
    title: '',
    content: '',
    level: 'course',
    difficulty: 'easy',
    marks: 1,
    categories: [],
    mcq_options: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ],
    test_cases_basic: [{ input: '', expected_output: '', description: '' }],
    test_cases_advanced: [],
  });

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadQuestions = async () => {
    if (!course) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    try {
      const filters: any = {};

      // Add search filter only if search term is provided
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      // Apply level filter based strictly on dropdown selection
      if (filterLevel === 'all') {
        filters.course = course.id;
        filters.level = 'all';
      } else if (filterLevel === 'course') {
        filters.course = course.id;
        filters.level = 'course';
      } else if (filterLevel === 'topic') {
        if (selectedTopic) {
          filters.topic = selectedTopic.id;
        } else {
          filters.course = course.id; // Fallback if no topic selected
        }
        filters.level = 'topic';
      } else if (filterLevel === 'subtopic') {
        if (selectedSubtopic) {
          filters.subtopic = selectedSubtopic.id;
        } else if (selectedTopic) {
          filters.topic = selectedTopic.id; // Fallback if no subtopic selected
        } else {
          filters.course = course.id; // Fallback if no topic/subtopic selected
        }
        filters.level = 'subtopic';
      }

      // Add type filter
      if (filterType !== 'all') {
        filters.type = filterType;
      }

      console.log('Loading questions with filters:', filters);
      const data = await fetchQuestions(filters);
      setQuestions(data);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search and auto-load
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadQuestions();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, course, selectedTopic, selectedSubtopic, filterLevel, filterType]);

  // Update form data when selection context changes (only if not editing)
  useEffect(() => {
    if (!editingQuestion && activeTab === 'create') {
      let defaultLevel: 'course' | 'topic' | 'subtopic' = 'course';
      let formCourse = course?.id;
      let formTopic = undefined;
      let formSubtopic = undefined;

      if (selectedSubtopic) {
        defaultLevel = 'subtopic';
        formTopic = selectedTopic?.id;
        formSubtopic = selectedSubtopic.id;
      } else if (selectedTopic) {
        defaultLevel = 'topic';
        formTopic = selectedTopic.id;
      }

      setFormData(prev => ({
        ...prev,
        level: defaultLevel,
        course: formCourse,
        topic: formTopic,
        subtopic: formSubtopic,
      }));
    }
  }, [course, selectedTopic, selectedSubtopic, editingQuestion, activeTab]);

  const openCreateForm = () => {
    // Determine default level and set appropriate IDs based on current selection
    let defaultLevel: 'course' | 'topic' | 'subtopic' = 'course';
    let formCourse = course?.id;
    let formTopic = undefined;
    let formSubtopic = undefined;

    if (selectedSubtopic) {
      defaultLevel = 'subtopic';
      formTopic = selectedTopic?.id;
      formSubtopic = selectedSubtopic.id;
    } else if (selectedTopic) {
      defaultLevel = 'topic';
      formTopic = selectedTopic.id;
    }

    setFormData({
      type: 'mcq_single',
      title: '',
      content: '',
      level: defaultLevel,
      course: formCourse,
      topic: formTopic,
      subtopic: formSubtopic,
      difficulty: 'easy',
      marks: 1,
      categories: [],
      mcq_options: [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ],
      test_cases_basic: [{ input: '', expected_output: '', description: '' }],
      test_cases_advanced: [],
    });
    setActiveTab('create');
    setEditingQuestion(null);
  };

  const openEditForm = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      type: question.type,
      title: question.title,
      content: question.content,
      level: question.level,
      course: question.course,
      topic: question.topic,
      subtopic: question.subtopic,
      difficulty: question.difficulty,
      marks: question.marks,
      categories: question.categories,
      mcq_options: question.mcq_options || [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ],
      test_cases_basic: question.test_cases_basic || [{ input: '', expected_output: '', description: '' }],
      test_cases_advanced: question.test_cases_advanced || [],
    });
    setActiveTab('create');
  };

  const handleSave = async () => {
    const errors = validateQuestion(formData);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setSaving(true);
    try {
      if (editingQuestion) {
        const updated = await updateQuestion(editingQuestion.id, formData);
        setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
        toast.success('Question updated successfully');
        // After editing, go back to questions tab
        setActiveTab('questions');
        setEditingQuestion(null);
      } else {
        const created = await createQuestion(formData);
        setQuestions(prev => [created, ...prev]);
        toast.success('Question created successfully');
        // After creating, stay on create tab and reset form for new question
        openCreateForm();
      }
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setActiveTab('questions');
    setEditingQuestion(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await deleteQuestion(confirmDelete);
      setQuestions(prev => prev.filter(q => q.id !== confirmDelete));
      toast.success('Question deleted successfully');
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    } finally {
      setDeleting(false);
    }
  };

  const updateMCQOption = (index: number, value: string) => {
    const newOptions = [...(formData.mcq_options || [])];
    newOptions[index] = { ...newOptions[index], text: value };
    setFormData(prev => ({ ...prev, mcq_options: newOptions }));
  };

  const toggleMCQCorrect = (index: number) => {
    const newOptions = [...(formData.mcq_options || [])];

    // For single answer MCQ, uncheck all others first
    if (formData.type === 'mcq_single') {
      newOptions.forEach((option, i) => {
        if (i !== index) {
          option.is_correct = false;
        }
      });
    }

    newOptions[index] = { ...newOptions[index], is_correct: !newOptions[index].is_correct };
    setFormData(prev => ({ ...prev, mcq_options: newOptions }));
  };

  const addMCQOption = () => {
    setFormData(prev => ({
      ...prev,
      mcq_options: [...(prev.mcq_options || []), { text: '', is_correct: false }]
    }));
  };

  const removeMCQOption = (index: number) => {
    if ((formData.mcq_options?.length || 0) <= 2) return;

    const newOptions = formData.mcq_options?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({
      ...prev,
      mcq_options: newOptions
    }));
  };



  const updateTestCase = (index: number, field: 'input' | 'expected_output' | 'description', value: string) => {
    const newTestCases = [...(formData.test_cases_basic || [])];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData(prev => ({ ...prev, test_cases_basic: newTestCases }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases_basic: [...(prev.test_cases_basic || []), { input: '', expected_output: '', description: '' }]
    }));
  };

  const removeTestCase = (index: number) => {
    if ((formData.test_cases_basic?.length || 0) <= 1) return;

    const newTestCases = formData.test_cases_basic?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, test_cases_basic: newTestCases }));
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || question.type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || question.difficulty === filterDifficulty;

    return matchesSearch && matchesType && matchesDifficulty;
  });

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'mcq_single':
      case 'mcq_multiple': return <CheckCircle className="w-4 h-4" />;
      case 'coding': return <Code className="w-4 h-4" />;
      case 'descriptive': return <FileText className="w-4 h-4" />;
      default: return <FileQuestion className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const questionType = QUESTION_TYPES.find(t => t.value === type);
    return questionType ? questionType.label : type;
  };

  // Get available level options based on current selection
  const getAvailableLevels = () => {
    return [
      { value: 'course', label: 'Course Level' },
      { value: 'topic', label: 'Topic Level' },
      { value: 'subtopic', label: 'Subtopic Level' }
    ];
  };

  // Handle level change and update form data accordingly
  const handleLevelChange = (level: 'course' | 'topic' | 'subtopic') => {
    setFormData(prev => {
      const newData = { ...prev, level };

      // Set appropriate IDs based on selected level
      if (level === 'course') {
        newData.course = course?.id;
        newData.topic = undefined;
        newData.subtopic = undefined;
      } else if (level === 'topic') {
        newData.course = course?.id;
        newData.topic = selectedTopic?.id;
        newData.subtopic = undefined;
      } else if (level === 'subtopic') {
        newData.course = course?.id;
        newData.topic = selectedTopic?.id;
        newData.subtopic = selectedSubtopic?.id;
      }

      // Auto-select 'learn' category if subtopic level is selected
      if (level === 'subtopic') {
        if (!newData.categories.includes('learn')) {
          newData.categories = [...newData.categories, 'learn'];
          toast.success("Added 'learn' category for Subtopic level");
        }
      }

      return newData;
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Tabs */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Question Bank</h3>
          <p className="text-sm text-slate-600 mt-1">
            Manage questions for {course?.name || 'this course'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-amber-50 p-1 rounded-lg border border-amber-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'create'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-amber-700 hover:text-amber-800 hover:bg-amber-100'
              }`}
          >
            <Plus className="w-4 h-4" />
            Create New Question
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'questions'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-amber-700 hover:text-amber-800 hover:bg-amber-100'
              }`}
          >
            <FileQuestion className="w-4 h-4" />
            Questions
          </button>
        </div>
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <>
          {/* Search and Filters */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search questions (optional)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {searchTerm.trim() ? 'Searching...' : 'Showing all MCQ Single questions'}
              </p>
            </div>
            <Select value={filterType} onValueChange={(value) => setFilterType(value)}>
              <SelectTrigger className="w-40 bg-white border-slate-300">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg z-[9999]">
                <SelectItem value="all">All Types</SelectItem>
                {QUESTION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={(value) => setFilterDifficulty(value)}>
              <SelectTrigger className="w-40 bg-white border-slate-300">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg z-[9999]">
                <SelectItem value="all">All Difficulty</SelectItem>
                {DIFFICULTY_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={(value) => setFilterLevel(value)}>
              <SelectTrigger className="w-40 bg-white border-slate-300">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg z-[9999]">
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="course">Course Level</SelectItem>
                <SelectItem value="topic">Topic Level</SelectItem>
                <SelectItem value="subtopic">Subtopic Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Questions List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No questions found</h3>
              <p className="text-gray-500 mb-4">
                No questions match your search criteria. Try different keywords or create a new question.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map(question => (
                <Card key={question.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {getQuestionIcon(question.type)}
                            <span className="font-semibold text-slate-900">{question.title}</span>
                          </div>
                          <Badge className={getDifficultyColor(question.difficulty)}>
                            {question.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getQuestionTypeLabel(question.type)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {question.level} level
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {question.marks} marks
                          </Badge>
                        </div>
                        <p className="text-slate-600 text-sm mb-2 line-clamp-2">
                          {question.content}
                        </p>
                        {question.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {question.categories.map(category => (
                              <Badge key={category} variant="secondary" className="text-xs">
                                {QUESTION_CATEGORIES.find(c => c.value === category)?.label || category}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditForm(question)}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(question.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create New Question Tab */}
      {activeTab === 'create' && (
        <Card className="border-2 border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Form Header */}
              <div className="border-b border-amber-200 pb-4">
                <div className="flex items-center gap-3">
                  {editingQuestion ? (
                    <>
                      <Edit3 className="w-5 h-5 text-amber-600" />
                      <h4 className="text-lg font-semibold text-slate-900">Edit Question</h4>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-amber-600" />
                      <h4 className="text-lg font-semibold text-slate-900">Create New Question</h4>
                    </>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Question Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      type: value as 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive'
                    }))}
                  >
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-lg z-[9999]">
                      {QUESTION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Question Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => handleLevelChange(value as 'course' | 'topic' | 'subtopic')}
                  >
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-lg z-[9999]">
                      {getAvailableLevels().map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>


                  {/* Topic Selection - Show if level is topic/subtopic and no topic pre-selected */}
                  {(formData.level === 'topic' || formData.level === 'subtopic') && !selectedTopic && (
                    <div className="mt-3">
                      <Label className="text-sm font-medium text-slate-700">Select Topic</Label>
                      <Select
                        value={formData.topic}
                        onValueChange={(value) => {
                          setFormData(prev => ({
                            ...prev,
                            topic: value,
                            subtopic: undefined // Reset subtopic when topic changes
                          }));
                        }}
                      >
                        <SelectTrigger className="bg-white border-slate-300 mt-1">
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 shadow-lg z-[9999]">
                          {topics.map((topic: any) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {topic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Subtopic Selection - Show if level is subtopic and no subtopic pre-selected */}
                  {formData.level === 'subtopic' && !selectedSubtopic && (
                    <div className="mt-3">
                      <Label className="text-sm font-medium text-slate-700">Select Subtopic</Label>
                      <Select
                        disabled={!formData.topic && !selectedTopic}
                        value={formData.subtopic}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, subtopic: value }))}
                      >
                        <SelectTrigger className="bg-white border-slate-300 mt-1">
                          <SelectValue placeholder="Select a subtopic" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 shadow-lg z-[9999]">
                          {(() => {
                            // Find the active topic to get its subtopics
                            const activeTopicId = selectedTopic?.id || formData.topic;
                            const activeTopic = topics.find((t: any) => t.id === activeTopicId);

                            return activeTopic?.subtopics?.map((sub: any) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name}
                              </SelectItem>
                            )) || <SelectItem value="none" disabled>No subtopics found</SelectItem>;
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      difficulty: value as 'easy' | 'medium' | 'hard'
                    }))}
                  >
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-lg z-[9999]">
                      {DIFFICULTY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Marks</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.marks}
                    onChange={(e) => setFormData(prev => ({ ...prev, marks: parseInt(e.target.value) || 1 }))}
                    className="bg-white border-slate-300"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Question Categories</Label>
                <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                  {QUESTION_CATEGORIES.map(category => (
                    <div key={category.value} className="flex items-center space-x-2 p-2 bg-white rounded-md border border-slate-200 hover:border-amber-300 transition-colors">
                      <Checkbox
                        id={`category-${category.value}`}
                        checked={formData.categories.includes(category.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ ...prev, categories: [...prev.categories, category.value] }));
                          } else {
                            // Prevent removing 'learn' if level is subtopic
                            if (category.value === 'learn' && formData.level === 'subtopic') {
                              toast.error("Subtopic questions must have the 'learn' category");
                              return;
                            }
                            setFormData(prev => ({ ...prev, categories: prev.categories.filter(c => c !== category.value) }));
                          }
                        }}
                        className="border-slate-400"
                      />
                      <Label htmlFor={`category-${category.value}`} className="text-xs font-medium text-slate-700 cursor-pointer leading-tight whitespace-nowrap">
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a clear, descriptive question title"
                  className="bg-white border-slate-300"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter the detailed question content"
                  rows={4}
                  className="bg-white border-slate-300"
                />
              </div>

              {/* MCQ Options */}
              {(formData.type === 'mcq_single' || formData.type === 'mcq_multiple') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700">Answer Options</Label>
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      {formData.type === 'mcq_single' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-amber-600" />
                          Select one correct answer
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 text-amber-600" />
                          Select multiple correct answers
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                    {formData.mcq_options?.map((option, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200 ${option.is_correct
                          ? 'bg-green-50 border-green-300 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`relative ${option.is_correct ? 'scale-110' : ''} transition-transform duration-200`}>
                            <Checkbox
                              checked={option.is_correct}
                              onCheckedChange={() => toggleMCQCorrect(index)}
                              className={`border-2 ${option.is_correct ? 'border-green-500 bg-green-500' : 'border-slate-400'}`}
                            />
                            {option.is_correct && (
                              <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-green-600 bg-white rounded-full" />
                            )}
                          </div>
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${option.is_correct
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                            }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                        </div>
                        <Input
                          value={option.text}
                          onChange={(e) => updateMCQOption(index, e.target.value)}
                          placeholder={`Enter option ${String.fromCharCode(65 + index)} text`}
                          className={`flex-1 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 focus:ring-1 focus:ring-blue-200 ${option.is_correct ? 'font-medium text-green-900' : 'text-slate-700'
                            }`}
                        />
                        {(formData.mcq_options?.length || 0) > 2 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMCQOption(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-70 hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addMCQOption}
                      className="w-full border-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400 py-3"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Option
                    </Button>
                  </div>
                </div>
              )}

              {/* Coding Test Cases */}
              {formData.type === 'coding' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">Test Cases</Label>
                  <div className="space-y-3">
                    {formData.test_cases_basic?.map((testCase, index) => (
                      <div key={index} className="bg-white border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-slate-800">Test Case {index + 1}</h5>
                          {(formData.test_cases_basic?.length || 0) > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeTestCase(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-slate-600">Input</Label>
                            <Textarea
                              value={testCase.input}
                              onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                              placeholder="Enter input data"
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Expected Output</Label>
                            <Textarea
                              value={testCase.expected_output}
                              onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)}
                              placeholder="Enter expected output"
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addTestCase}
                      className="w-full border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Test Case
                    </Button>
                  </div>
                </div>
              )}

              {/* Save Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="min-w-24 bg-amber-600 hover:bg-amber-700 text-white">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : editingQuestion ? (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Update Question
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Question
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Question
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              This action cannot be undone. The question will be permanently removed from your course.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700 mb-4">
              Are you sure you want to delete this question? This action cannot be undone and will permanently remove the question from your course.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ This will permanently delete the question and all associated data.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Question
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBankManager;