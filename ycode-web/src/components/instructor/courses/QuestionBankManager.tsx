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
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  Loader2,
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
import SolutionManager, { Solution } from './SolutionManager';
import { createSolution, updateSolution, deleteSolution, fetchSolutions } from '@/services/solutionService';
import TestCasesModal from './TestCasesModal';
import { getDefaultMarks, getDefaultDuration } from '@/constants/questionMarksConfig';

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
    duration: 1,
    categories: [],
    hints: [],
    mcq_options: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ],
    test_cases_basic: [{ input: '', expected_output: '', description: '' }],
    test_cases_advanced: [],
    code_executor_config: { time_limit: 10, memory_limit: 256 },
  });

  // Solutions Management
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [originalSolutions, setOriginalSolutions] = useState<Solution[]>([]);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Test cases modal
  const [testCasesTarget, setTestCasesTarget] = useState<Question | null>(null);
  // Lifted state for the inline Test Cases modal inside SolutionManager (create form)
  const [formTestCasesModalOpen, setFormTestCasesModalOpen] = useState(false);

  // Collapsible sections
  const [hintsOpen, setHintsOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

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
  }, [searchTerm, course, selectedTopic, selectedSubtopic, filterLevel, filterType, filterDifficulty]);

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

      setFormData((prev: CreateQuestionData) => ({
        ...prev,
        level: defaultLevel,
        course: formCourse,
        topic: formTopic,
        subtopic: formSubtopic,
      }));
    }
  }, [course, selectedTopic, selectedSubtopic, editingQuestion, activeTab]);

  // Update marks when type or difficulty changes
  useEffect(() => {
    if (!editingQuestion && activeTab === 'create') {
      const marks = getDefaultMarks(formData.type, formData.difficulty);
      const duration = getDefaultDuration(formData.type, formData.difficulty);
      setFormData((prev: CreateQuestionData) => ({
        ...prev,
        marks,
        duration
      }));
    }
  }, [formData.type, formData.difficulty, editingQuestion, activeTab]);

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
      duration: 1,
      categories: [],
      hints: [],
      mcq_options: [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ],
      test_cases_basic: [{ input: '', expected_output: '', description: '' }],
      test_cases_advanced: [],
    });
    setSolutions([]); // Reset solutions
    setOriginalSolutions([]);
    setHintsOpen(false);
    setSolutionsOpen(false);
    setActiveTab('create');
    setEditingQuestion(null);
  };

  const openEditForm = async (question: Question) => {
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
      duration: question.duration,
      categories: question.categories,
      hints: question.hints || [],
      mcq_options: question.mcq_options || [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ],
      test_cases_basic: question.test_cases_basic || [{ input: '', expected_output: '', description: '' }],
      test_cases_advanced: question.test_cases_advanced || [],
      code_executor_config: question.code_executor_config || { time_limit: 10, memory_limit: 256 },
    });

    // Fetch solutions
    try {
      const response: any = await fetchSolutions(question.id);
      const fetchedSolutions = Array.isArray(response) ? response : (response?.results || []);
      setSolutions(fetchedSolutions);
      setOriginalSolutions(fetchedSolutions);
      setSolutionsOpen(fetchedSolutions.length > 0);
    } catch (error) {
      console.error('Error fetching solutions:', error);
      toast.error('Failed to load solutions');
      setSolutions([]);
      setOriginalSolutions([]);
    }

    setHintsOpen((question.hints || []).length > 0);
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
      let savedQuestion: Question;
      
      // Ensure 'learn' category is present for subtopic questions
      const dataToSave = { ...formData };
      if (dataToSave.level === 'subtopic' && !dataToSave.categories.includes('learn')) {
        dataToSave.categories = [...dataToSave.categories, 'learn'];
      }

      if (editingQuestion) {
        savedQuestion = await updateQuestion(editingQuestion.id, dataToSave);
        toast.success('Question updated successfully');
      } else {
        savedQuestion = await createQuestion(dataToSave);
        toast.success('Question created successfully');
      }

      // Handle Solutions
      const questionId = savedQuestion.id;
      const solutionPromises = [];

      // 1. Create/Update solutions
      for (const sol of solutions) {
        if (sol.id) {
          // Update existing
          solutionPromises.push(updateSolution(sol.id, { ...sol, question: questionId }));
        } else {
          // Create new
          solutionPromises.push(createSolution({ ...sol, question: questionId }));
        }
      }

      // 2. Delete removed solutions (only if editing)
      if (editingQuestion) {
        const currentIds = solutions.map(s => s.id).filter(id => id);
        const toDelete = originalSolutions.filter(s => s.id && !currentIds.includes(s.id));
        for (const sol of toDelete) {
          if (sol.id) solutionPromises.push(deleteSolution(sol.id));
        }
      }

      await Promise.all(solutionPromises);

      if (editingQuestion) {
        setQuestions(prev => prev.map(q => q.id === savedQuestion.id ? savedQuestion : q));
        // After editing, go back to questions tab
        setActiveTab('questions');
        setEditingQuestion(null);
      } else {
        setQuestions(prev => [savedQuestion, ...prev]);
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

  // Auto-save new question then open test cases modal
  const handleTestCasesClick = async () => {
    if (editingQuestion) {
      // Already saved — just open the modal
      setFormTestCasesModalOpen(true);
      return;
    }
    // New question — validate and auto-save first
    const errors = validateQuestion(formData);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setSaving(true);
    try {
      const created = await createQuestion(formData);
      toast.success('Question saved');
      setEditingQuestion(created);
      setQuestions(prev => [created, ...prev]);
      setFormTestCasesModalOpen(true);
    } catch (error) {
      console.error('Error auto-saving question:', error);
      toast.error('Failed to save question');
    } finally {
      setSaving(false);
    }
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
    const newOptions = (formData.mcq_options || []).map((option, i) => {
      if (formData.type === 'mcq_single') {
        return { ...option, is_correct: i === index ? !option.is_correct : false };
      }
      return i === index ? { ...option, is_correct: !option.is_correct } : { ...option };
    });

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

  const addHint = () => {
    setFormData(prev => ({
      ...prev,
      hints: [...(prev.hints || []), '']
    }));
  };

  const updateHint = (index: number, value: string) => {
    const newHints = [...(formData.hints || [])];
    newHints[index] = value;
    setFormData(prev => ({ ...prev, hints: newHints }));
  };

  const removeHint = (index: number) => {
    const newHints = formData.hints?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, hints: newHints }));
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
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header with Tabs */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Question Bank</h3>
          <p className="text-sm text-slate-600 mt-1">
            Manage questions for {course?.name || 'this course'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 space-x-0 sm:space-x-1 sm:flex-nowrap bg-amber-50 p-1.5 rounded-lg border border-amber-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 whitespace-nowrap ${activeTab === 'create'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-amber-700 hover:text-amber-800 hover:bg-amber-100'
              }`}
          >
            <Plus className="w-4 h-4" />
            Create New Question
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 whitespace-nowrap ${activeTab === 'questions'
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
        <Card className="border-2 border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-amber-200 pb-4">
                <div className="flex items-center gap-3">
                  <FileQuestion className="w-5 h-5 text-amber-600" />
                  <h4 className="text-lg font-semibold text-slate-900">Question Bank</h4>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search questions (optional)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white border border-slate-300 h-10 rounded-lg hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:border-amber-400 transition-all w-full"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={(value) => setFilterType(value)}>
                  <SelectTrigger className="w-full bg-white border border-slate-300 h-10 rounded-lg hover:border-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]">
                    <SelectItem value="all" className="rounded-md focus:bg-amber-50 focus:text-amber-900">All Types</SelectItem>
                    {QUESTION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value} className="rounded-md focus:bg-amber-50 focus:text-amber-900">{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDifficulty} onValueChange={(value) => setFilterDifficulty(value)}>
                  <SelectTrigger className="w-full bg-white border border-slate-300 h-10 rounded-lg hover:border-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]">
                    <SelectItem value="all" className="rounded-md focus:bg-amber-50 focus:text-amber-900">All Difficulty</SelectItem>
                    {DIFFICULTY_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value} className="rounded-md focus:bg-amber-50 focus:text-amber-900">{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterLevel} onValueChange={(value) => setFilterLevel(value)}>
                  <SelectTrigger className="w-full bg-white border border-slate-300 h-10 rounded-lg hover:border-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]">
                    <SelectItem value="all" className="rounded-md focus:bg-amber-50 focus:text-amber-900">All Levels</SelectItem>
                    <SelectItem value="course" className="rounded-md focus:bg-amber-50 focus:text-amber-900">Course Level</SelectItem>
                    <SelectItem value="topic" className="rounded-md focus:bg-amber-50 focus:text-amber-900">Topic Level</SelectItem>
                    <SelectItem value="subtopic" className="rounded-md focus:bg-amber-50 focus:text-amber-900">Subtopic Level</SelectItem>
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
                    <Card key={question.id} className="hover:border-amber-300 transition-colors border-slate-200 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1 space-y-3 w-full">
                            <div className="flex items-center gap-2">
                              {getQuestionIcon(question.type)}
                              <h5 className="font-semibold text-slate-900 text-base">{question.title}</h5>
                              <Badge className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty}
                              </Badge>
                            </div>
                            <p className="text-slate-600 text-sm line-clamp-2">
                              {question.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-100 font-medium">
                                {getQuestionTypeLabel(question.type)}
                              </Badge>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-800 border-slate-200">
                                {question.level} level
                              </Badge>
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-100">
                                {question.marks} marks
                              </Badge>
                              <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 border-amber-100">
                                {question.duration} mins
                              </Badge>
                              {question.categories.length > 0 && (
                                <>
                                  <div className="w-1 h-1 rounded-full bg-slate-300 mx-1"></div>
                                  {question.categories.map(category => (
                                    <Badge key={category} variant="outline" className="text-slate-500 border-slate-200">
                                      {QUESTION_CATEGORIES.find(c => c.value === category)?.label || category}
                                    </Badge>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center gap-2 self-end sm:self-start mt-2 sm:mt-0">
                            {question.type === 'coding' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setTestCasesTarget(question)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Manage Test Cases"
                              >
                                <FlaskConical className="w-4 h-4" />
                              </Button>
                            )}
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Question Tab */}
      {activeTab === 'create' && (
        <Card className="border-2 border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Form Header */}
              <div className="border-b border-amber-200 pb-4 flex items-center gap-3">
                {editingQuestion ? <Edit3 className="w-5 h-5 text-amber-600" /> : <Plus className="w-5 h-5 text-amber-600" />}
                <h4 className="text-lg font-semibold text-slate-900">{editingQuestion ? 'Edit Question' : 'Create New Question'}</h4>
              </div>

              {/* Row 1: Type + Difficulty + Marks/Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Question Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}>
                    <SelectTrigger className="bg-white border-slate-300 mt-1.5 h-10 rounded-lg hover:border-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all">
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]">
                      {QUESTION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value} className="rounded-md focus:bg-amber-50 focus:text-amber-900">{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value as any }))}>
                    <SelectTrigger className="bg-white border-slate-300 mt-1.5 h-10 rounded-lg hover:border-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]">
                      {DIFFICULTY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value} className="rounded-md focus:bg-amber-50 focus:text-amber-900">{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Marks</Label>
                    <Input type="number" value={formData.marks} readOnly className="bg-slate-100 border-slate-300 mt-1.5 h-10 rounded-lg cursor-not-allowed opacity-75" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Duration (mins)</Label>
                    <Input type="number" value={formData.duration} readOnly className="bg-slate-100 border-slate-300 mt-1.5 h-10 rounded-lg cursor-not-allowed opacity-75" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label className="text-sm font-medium text-slate-700">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a clear, descriptive question title"
                  className="bg-white border-slate-300 mt-1.5"
                />
              </div>

              {/* Content */}
              <div>
                <Label className="text-sm font-medium text-slate-700">Content / Problem Statement</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter the detailed question content"
                  rows={4}
                  className="bg-white border-slate-300 mt-1.5"
                />
              </div>

              {/* Level */}
              <div>
                <Label className="text-sm font-medium text-slate-700">Question Level</Label>
                <Select value={formData.level} onValueChange={(value) => handleLevelChange(value as any)}>
                  <SelectTrigger className="bg-white border-slate-300 mt-1.5 h-10 rounded-lg hover:border-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]">
                    {getAvailableLevels().map(level => (
                      <SelectItem key={level.value} value={level.value} className="rounded-md focus:bg-amber-50 focus:text-amber-900">{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(formData.level === 'topic' || formData.level === 'subtopic') && !selectedTopic && (
                  <div className="mt-3">
                    <Label className="text-sm font-medium text-slate-700">Select Topic</Label>
                    <Select value={formData.topic} onValueChange={(value) => setFormData(prev => ({ ...prev, topic: value, subtopic: undefined }))}>
                      <SelectTrigger className="bg-white border-slate-300 mt-1.5 h-10 rounded-lg hover:border-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]">
                        {topics.map((topic: any) => (
                          <SelectItem key={topic.id} value={topic.id} className="rounded-md focus:bg-amber-50 focus:text-amber-900">{topic.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.level === 'subtopic' && !selectedSubtopic && (
                  <div className="mt-3">
                    <Label className="text-sm font-medium text-slate-700">Select Subtopic</Label>
                    <Select disabled={!formData.topic && !selectedTopic} value={formData.subtopic} onValueChange={(value) => setFormData(prev => ({ ...prev, subtopic: value }))}>
                      <SelectTrigger className="bg-white border-slate-300 mt-1.5 h-10 rounded-lg hover:border-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all">
                        <SelectValue placeholder="Select a subtopic" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-lg z-[9999]">
                        {(() => {
                          const activeTopicId = selectedTopic?.id || formData.topic;
                          const activeTopic = topics.find((t: any) => t.id === activeTopicId);
                          return activeTopic?.subtopics?.map((sub: any) => (
                            <SelectItem key={sub.id} value={sub.id} className="rounded-md focus:bg-amber-50 focus:text-amber-900">{sub.name}</SelectItem>
                          )) || <SelectItem value="none" disabled>No subtopics found</SelectItem>;
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Categories — pill style */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Categories</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-white rounded-lg border border-slate-200">
                  {QUESTION_CATEGORIES.map(category => {
                    const active = formData.categories.includes(category.value);
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => {
                          if (active) {
                            if (category.value === 'learn' && formData.level === 'subtopic') {
                              toast.error("Subtopic questions must have the 'learn' category");
                              return;
                            }
                            setFormData(prev => ({ ...prev, categories: prev.categories.filter(c => c !== category.value) }));
                          } else {
                            setFormData(prev => ({ ...prev, categories: [...prev.categories, category.value] }));
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${active ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300'}`}
                      >
                        {active && <CheckCircle className="w-3 h-3" />}
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MCQ Options */}
              {(formData.type === 'mcq_single' || formData.type === 'mcq_multiple') && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700">Answer Options</Label>
                    <span className="text-xs text-slate-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      {formData.type === 'mcq_single' ? 'Select one correct answer' : 'Select multiple correct answers'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {formData.mcq_options?.map((option, index) => (
                      <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${option.is_correct ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <Checkbox
                          checked={option.is_correct}
                          onCheckedChange={() => toggleMCQCorrect(index)}
                          className={`border-2 shrink-0 ${option.is_correct ? 'data-[state=checked]:border-green-500 data-[state=checked]:bg-green-500' : 'border-slate-400'}`}
                        />
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${option.is_correct ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <Input
                          value={option.text}
                          onChange={(e) => updateMCQOption(index, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className={`flex-1 border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300 ${option.is_correct ? 'font-medium text-green-900' : ''}`}
                        />
                        {(formData.mcq_options?.length || 0) > 2 && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeMCQOption(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" onClick={addMCQOption} className="w-full border-dashed border-amber-300 text-amber-600 hover:bg-amber-50">
                      <Plus className="w-4 h-4 mr-2" /> Add Option
                    </Button>
                  </div>
                </div>
              )}

              {/* Test Cases — coding only, dedicated section */}
              {formData.type === 'coding' && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-slate-800">Test Cases</span>
                      {((formData.test_cases_basic?.length || 0) + (formData.test_cases_advanced?.length || 0)) > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px] px-2 hover:bg-blue-100">
                          {formData.test_cases_basic?.length || 0} basic · {formData.test_cases_advanced?.length || 0} advanced
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleTestCasesClick}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                    >
                      {saving ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</>
                      ) : editingQuestion ? (
                        <><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Manage Test Cases</>
                      ) : (
                        <><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Save & Add Test Cases</>
                      )}
                    </Button>
                  </div>
                  {!editingQuestion && (
                    <p className="text-xs text-slate-400 mt-1.5">The question will be saved first, then you can add test cases.</p>
                  )}
                  
                  {/* Execution Limits */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Code className="w-4 h-4 text-blue-600" />
                      Execution Limits
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="time_limit" className="text-xs text-slate-600">Time Limit (seconds)</Label>
                        <Input
                          id="time_limit"
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={formData.code_executor_config?.time_limit || 10}
                          onChange={(e) => setFormData({
                            ...formData,
                            code_executor_config: {
                              ...formData.code_executor_config,
                              time_limit: parseFloat(e.target.value) || 10,
                              memory_limit: formData.code_executor_config?.memory_limit || 256
                            }
                          })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="memory_limit" className="text-xs text-slate-600">Memory Limit (MB)</Label>
                        <Input
                          id="memory_limit"
                          type="number"
                          step="1"
                          min="16"
                          value={formData.code_executor_config?.memory_limit || 256}
                          onChange={(e) => setFormData({
                            ...formData,
                            code_executor_config: {
                              ...formData.code_executor_config,
                              memory_limit: parseInt(e.target.value) || 256,
                              time_limit: formData.code_executor_config?.time_limit || 10
                            }
                          })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hints — collapsible */}
              <div className="pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setHintsOpen(o => !o)} className="flex items-center justify-between w-full py-1">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-slate-800">Hints</span>
                    {(formData.hints?.length || 0) > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2 hover:bg-amber-100">{formData.hints?.length}</Badge>
                    )}
                    <span className="text-xs text-slate-400">optional · students lose marks when used</span>
                  </div>
                  {hintsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {hintsOpen && (
                  <div className="mt-3 space-y-3">
                    {formData.hints && formData.hints.length > 0 ? (
                      formData.hints.map((hint, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="bg-amber-100 text-amber-800 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">{index + 1}</div>
                          <Textarea value={hint} onChange={(e) => updateHint(index, e.target.value)} placeholder={`Hint ${index + 1}...`} className="bg-white border-slate-300 min-h-[60px]" />
                          <Button type="button" variant="ghost" onClick={() => removeHint(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 mt-1 h-8 w-8 p-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 text-center py-3">No hints yet.</p>
                    )}
                    <Button type="button" variant="outline" onClick={addHint} className="text-amber-600 border-amber-200 hover:bg-amber-50 w-full border-dashed">
                      <Plus className="w-4 h-4 mr-2" /> Add Hint
                    </Button>
                  </div>
                )}
              </div>

              {/* Reference Solutions — collapsible, coding/descriptive only */}
              {(formData.type === 'coding' || formData.type === 'descriptive') && (
                <div className="pt-2 border-t border-slate-200">
                  <button type="button" onClick={() => setSolutionsOpen(o => !o)} className="flex items-center justify-between w-full py-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-slate-800">Reference Solutions</span>
                      {solutions.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2 hover:bg-amber-100">{solutions.length}</Badge>
                      )}
                      <span className="text-xs text-slate-400">optional · for instructor reference</span>
                    </div>
                    {solutionsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {solutionsOpen && (
                    <div className="mt-4">
                      <SolutionManager
                        solutions={solutions}
                        onChange={setSolutions}
                        testCases={[
                          ...(formData.test_cases_basic || []),
                          ...(formData.test_cases_advanced || []),
                        ]}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Save Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                <Button onClick={handleCancel} variant="secondary">Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="min-w-24 bg-amber-600 hover:bg-amber-700 text-white">
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : editingQuestion ? (
                    <><Edit3 className="w-4 h-4 mr-2" />Update Question</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" />Create Question</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Cases Modal — from questions list */}
      {testCasesTarget && (
        <TestCasesModal
          open={!!testCasesTarget}
          onOpenChange={(open) => { if (!open) setTestCasesTarget(null); }}
          questionId={testCasesTarget.id}
          questionTitle={testCasesTarget.title}
          initialBasic={testCasesTarget.test_cases_basic || []}
          initialAdvanced={testCasesTarget.test_cases_advanced || []}
          onSaved={(basic, advanced) => {
            setQuestions(prev =>
              prev.map(q =>
                q.id === testCasesTarget.id
                  ? { ...q, test_cases_basic: basic, test_cases_advanced: advanced }
                  : q
              )
            );
          }}
        />
      )}

      {/* Test Cases Modal — from create/edit form */}
      {formTestCasesModalOpen && editingQuestion && (
        <TestCasesModal
          open={formTestCasesModalOpen}
          onOpenChange={setFormTestCasesModalOpen}
          questionId={editingQuestion.id}
          questionTitle={editingQuestion.title}
          initialBasic={formData.test_cases_basic || []}
          initialAdvanced={formData.test_cases_advanced || []}
          onSaved={(basic, advanced) => {
            setFormData(prev => ({ ...prev, test_cases_basic: basic, test_cases_advanced: advanced }));
            setQuestions(prev =>
              prev.map(q =>
                q.id === editingQuestion.id
                  ? { ...q, test_cases_basic: basic, test_cases_advanced: advanced }
                  : q
              )
            );
          }}
        />
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
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="border-slate-300 text-slate-700 hover:bg-slate-100">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" />Delete Question</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBankManager;
