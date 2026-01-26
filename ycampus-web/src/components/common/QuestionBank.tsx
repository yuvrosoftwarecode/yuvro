import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Plus, Eye, Edit, Trash2, Code, FileText, CheckCircle, Circle, GripVertical, X } from 'lucide-react';
import { toast } from 'sonner';
import { Question, QuestionFilters, fetchQuestions, QUESTION_TYPES, DIFFICULTY_LEVELS } from '@/services/questionService';

interface QuestionBankProps {
  mode?: 'selection' | 'management';
  selectedQuestions?: string[];
  onQuestionSelect?: (questionId: string) => void;
  onQuestionDeselect?: (questionId: string) => void;
  onQuestionsChange?: (questions: string[]) => void;
  allowMultipleSelection?: boolean;
  filters?: Partial<QuestionFilters>;
  title?: string;
  description?: string;
  showSplitView?: boolean;
  courseFilter?: string;
  topicFilter?: string;
  categoryFilter?: string;
}

export default function QuestionBank({
  mode = 'management',
  selectedQuestions = [],
  onQuestionSelect,
  onQuestionDeselect,
  onQuestionsChange,
  allowMultipleSelection = true,
  filters: initialFilters = {},
  title = 'Question Bank',
  description = 'Browse and manage questions from the question bank',
  showSplitView = false,
  courseFilter,
  topicFilter,
  categoryFilter
}: QuestionBankProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allSelectedQuestions, setAllSelectedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<QuestionFilters>({
    ...initialFilters,
    search: '',
    course: courseFilter,
    topic: topicFilter,
    categories: categoryFilter
  });
  const [selectedType, setSelectedType] = useState<string>('mcq_single');
  const [leftPanelWidth, setLeftPanelWidth] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchQuestionsData = async () => {
    setLoading(true);
    try {
      const queryFilters: QuestionFilters = {
        ...filters,
        search: searchQuery || undefined,
        type: selectedType !== 'all' ? selectedType as any : undefined,
      };

      const data = await fetchQuestions(queryFilters);
      setQuestions(data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      toast.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchQuestionsData();
  }, [searchQuery, selectedType, filters]);

  // Update filters when props change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      course: courseFilter,
      topic: topicFilter,
      categories: categoryFilter
    }));
  }, [courseFilter, topicFilter, categoryFilter]);

  // Handle selectedQuestions changes - manage allSelectedQuestions
  useEffect(() => {
    const updateSelectedQuestions = async () => {
      if (selectedQuestions.length === 0) {
        setAllSelectedQuestions([]);
        return;
      }

      // Get questions that are already loaded (from current questions array)
      const loadedSelected = questions.filter(q => selectedQuestions.includes(q.id));
      
      // Get questions that are already in allSelectedQuestions
      const existingSelected = allSelectedQuestions.filter(q => selectedQuestions.includes(q.id));
      
      // Find questions that need to be fetched
      const loadedIds = loadedSelected.map(q => q.id);
      const existingIds = existingSelected.map(q => q.id);
      const allKnownIds = [...new Set([...loadedIds, ...existingIds])];
      const missingIds = selectedQuestions.filter(id => !allKnownIds.includes(id));
      
      let allSelected = [...loadedSelected];
      
      // Add existing questions that are still selected (avoid duplicates)
      existingSelected.forEach(q => {
        if (!allSelected.some(existing => existing.id === q.id)) {
          allSelected.push(q);
        }
      });
      
      // Fetch missing questions if any
      if (missingIds.length > 0) {
        try {
          const { fetchQuestionById } = await import('@/services/questionService');
          const missingQuestions = await Promise.all(
            missingIds.map(id => fetchQuestionById(id))
          );
          
          // Add missing questions (avoid duplicates)
          missingQuestions.forEach(q => {
            if (!allSelected.some(existing => existing.id === q.id)) {
              allSelected.push(q);
            }
          });
        } catch (error) {
          console.error('Failed to fetch missing questions:', error);
        }
      }
      
      // Set the final list, ensuring no duplicates and maintaining order
      const uniqueSelected = allSelected.filter((question, index, self) => 
        index === self.findIndex(q => q.id === question.id)
      );
      
      setAllSelectedQuestions(uniqueSelected);
    };

    updateSelectedQuestions();
  }, [selectedQuestions, questions]);

  // Drag functionality for resizing panels
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    if (newWidth >= 20 && newWidth <= 80) {
      setLeftPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleQuestionToggle = (questionId: string) => {
    if (mode !== 'selection') return;

    const isSelected = selectedQuestions.includes(questionId);
    const question = questions.find(q => q.id === questionId);
    
    if (isSelected) {
      // Remove from selected questions
      setAllSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
      onQuestionDeselect?.(questionId);
      if (onQuestionsChange) {
        onQuestionsChange(selectedQuestions.filter(id => id !== questionId));
      }
    } else {
      // Add to selected questions
      if (question) {
        if (!allowMultipleSelection) {
          // Single selection mode - replace all
          setAllSelectedQuestions([question]);
          onQuestionSelect?.(questionId);
          if (onQuestionsChange) {
            onQuestionsChange([questionId]);
          }
        } else {
          // Multiple selection mode - add to existing
          setAllSelectedQuestions(prev => {
            // Avoid duplicates
            if (prev.some(q => q.id === questionId)) return prev;
            return [...prev, question];
          });
          onQuestionSelect?.(questionId);
          if (onQuestionsChange) {
            onQuestionsChange([...selectedQuestions, questionId]);
          }
        }
      }
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'coding':
        return <Code className="h-4 w-4" />;
      case 'mcq_single':
      case 'mcq_multiple':
        return <CheckCircle className="h-4 w-4" />;
      case 'descriptive':
        return <FileText className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const typeObj = QUESTION_TYPES.find(t => t.value === type);
    return typeObj?.label || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'coding':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'mcq_single':
      case 'mcq_multiple':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'descriptive':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (showSplitView && mode === 'selection') {
    return (
      <div className="h-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        
        <div ref={containerRef} className="flex h-[600px] border border-gray-200 rounded-lg overflow-hidden">
          {/* Left Panel - Selected Questions */}
          <div 
            className="bg-gray-50 border-r border-gray-200 flex flex-col"
            style={{ width: `${leftPanelWidth}%` }}
          >
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Selected Questions ({selectedQuestions.length})</h4>
                {selectedQuestions.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to clear all ${selectedQuestions.length} selected questions?`)) {
                        setAllSelectedQuestions([]);
                        if (onQuestionsChange) {
                          onQuestionsChange([]);
                        }
                        toast.success('All questions cleared');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors flex items-center"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedQuestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm">No questions selected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allSelectedQuestions.map((question) => (
                    <div key={question.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getTypeColor(question.type)} variant="outline">
                              <span className="mr-1">{getQuestionTypeIcon(question.type)}</span>
                              {getQuestionTypeLabel(question.type)}
                            </Badge>
                            <Badge className={getDifficultyColor(question.difficulty)} variant="outline">
                              {question.difficulty}
                            </Badge>
                          </div>
                          <h5 className="text-sm font-medium text-gray-900 line-clamp-2">{question.title}</h5>
                          <p className="text-xs text-gray-500 mt-1">{question.marks} marks</p>
                        </div>
                        <button
                          onClick={() => handleQuestionToggle(question.id)}
                          className="h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drag Handle */}
          <div 
            className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize flex items-center justify-center"
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="h-4 w-4 text-gray-500" />
          </div>

          {/* Right Panel - Question Bank */}
          <div 
            className="bg-white flex flex-col"
            style={{ width: `${100 - leftPanelWidth}%` }}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                {/* Question Type Tabs */}
                <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-100">
                    <TabsTrigger value="mcq_single" className="text-xs">MCQ Single</TabsTrigger>
                    <TabsTrigger value="mcq_multiple" className="text-xs">MCQ Multiple</TabsTrigger>
                    <TabsTrigger value="coding" className="text-xs">Coding</TabsTrigger>
                    <TabsTrigger value="descriptive" className="text-xs">Descriptive</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No questions found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? `No questions found matching "${searchQuery}"` : 'No questions available.'}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {questions.map((question) => (
                    <div 
                      key={question.id}
                      className={`p-4 border border-gray-200 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedQuestions.includes(question.id) 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => handleQuestionToggle(question.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getTypeColor(question.type)} variant="outline">
                              <span className="mr-1">{getQuestionTypeIcon(question.type)}</span>
                              {getQuestionTypeLabel(question.type)}
                            </Badge>
                            <Badge className={getDifficultyColor(question.difficulty)} variant="outline">
                              {question.difficulty}
                            </Badge>
                            <span className="text-xs text-gray-500">{question.marks} marks</span>
                          </div>
                          <h5 className="text-sm font-medium text-gray-900 mb-1">{question.title}</h5>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {question.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                          </p>
                        </div>
                        <div className="ml-3">
                          {selectedQuestions.includes(question.id) ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original single-panel view for management mode or when split view is disabled
  return (
    <Card className="border border-gray-200 rounded-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {QUESTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No questions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? `No questions found matching "${searchQuery}"` : 'No questions available in the question bank.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {mode === 'selection' && <TableHead className="w-12">Select</TableHead>}
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Categories</TableHead>
                  {mode === 'management' && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow 
                    key={question.id}
                    className={mode === 'selection' ? 'cursor-pointer hover:bg-gray-50' : ''}
                    onClick={() => mode === 'selection' && handleQuestionToggle(question.id)}
                  >
                    {mode === 'selection' && (
                      <TableCell>
                        <div className="flex items-center">
                          {selectedQuestions.includes(question.id) ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div>
                        <div className="text-sm font-medium text-gray-900 line-clamp-2">
                          {question.title}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                          {question.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(question.type)} variant="outline">
                        <span className="mr-1">{getQuestionTypeIcon(question.type)}</span>
                        {getQuestionTypeLabel(question.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDifficultyColor(question.difficulty)} variant="outline">
                        {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{question.marks}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {question.categories.slice(0, 2).map((category, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {question.categories.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{question.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {mode === 'management' && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View Question">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Edit Question">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Question">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {mode === 'selection' && selectedQuestions.length > 0 && !showSplitView && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700">
                {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to clear all ${selectedQuestions.length} selected questions?`)) {
                    setAllSelectedQuestions([]);
                    if (onQuestionsChange) {
                      onQuestionsChange([]);
                    }
                    toast.success('All questions cleared');
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors flex items-center"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}