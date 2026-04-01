import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { QuestionPreview } from './QuestionPreview';
import { QuestionForm } from './QuestionForm';
import { Question } from './QuestionSetup';
import { Search, Filter } from 'lucide-react';

// Mock existing test questions
const mockExistingTestQuestions: Question[] = [
  {
    id: '1',
    questionText: 'What is the correct way to declare a variable in JavaScript?',
    type: 'mcq',
    options: ['var name = "John"', 'let name = "John"', 'const name = "John"', 'All of the above'],
    correctAnswer: 'All of the above',
    marks: 2,
    courseId: '1',
    moduleId: '1',
    topicId: '1',
    isMultipleAnswer: false
  },
  {
    id: '2',
    questionText: 'Write a function that returns the sum of two numbers.',
    type: 'coding',
    correctAnswer: 'function sum(a, b) {\n  return a + b;\n}',
    marks: 5,
    courseId: '1',
    moduleId: '2',
    topicId: '4'
  },
  {
    id: '3',
    questionText: 'Explain the concept of closure in JavaScript.',
    type: 'short-answer',
    correctAnswer: 'A closure is a function that has access to variables from its outer scope even after the outer function has returned.',
    marks: 3,
    courseId: '1',
    moduleId: '2',
    topicId: '6'
  },
  {
    id: '4',
    questionText: 'JavaScript is a compiled language.',
    type: 'true-false',
    correctAnswer: 'false',
    marks: 1,
    courseId: '1',
    moduleId: '1',
    topicId: '1'
  }
];

export function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>(mockExistingTestQuestions);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMarks, setFilterMarks] = useState<string>('all');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || question.type === filterType;
    const matchesMarks = filterMarks === 'all' || 
      (filterMarks === '1' && question.marks === 1) ||
      (filterMarks === '2-3' && question.marks >= 2 && question.marks <= 3) ||
      (filterMarks === '4+' && question.marks >= 4);

    return matchesSearch && matchesType && matchesMarks;
  });

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestionId(question.id);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
  };

  const handleUpdateQuestion = (updatedQuestionData: Omit<Question, 'id' | 'courseId' | 'moduleId' | 'topicId' | 'testSettings'>) => {
    const editingQuestion = questions.find(q => q.id === editingQuestionId);
    if (editingQuestion) {
      const updatedQuestion: Question = {
        ...updatedQuestionData,
        id: editingQuestion.id,
        courseId: editingQuestion.courseId,
        moduleId: editingQuestion.moduleId,
        topicId: editingQuestion.topicId,
        testSettings: editingQuestion.testSettings,
      };
      
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? updatedQuestion : q));
      setEditingQuestionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search and Filter Test Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search test questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="short-answer">Short Answer</SelectItem>
                <SelectItem value="true-false">True/False</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterMarks} onValueChange={setFilterMarks}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by marks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Marks</SelectItem>
                <SelectItem value="1">1 Mark</SelectItem>
                <SelectItem value="2-3">2-3 Marks</SelectItem>
                <SelectItem value="4+">4+ Marks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>


      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">
            Test Questions ({filteredQuestions.length})
          </h3>
          {filteredQuestions.length > 0 && (
            <Button variant="outline">
              Export Test Questions
            </Button>
          )}
        </div>

        {filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No test questions found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              editingQuestionId === question.id ? (
                <Card key={question.id}>
                  <CardContent className="p-6">
                    <QuestionForm
                      onSave={handleUpdateQuestion}
                      initialData={question}
                      isEditing={true}
                      onCancel={handleCancelEdit}
                    />
                  </CardContent>
                </Card>
              ) : (
                <QuestionPreview
                  key={question.id}
                  question={question}
                  onDelete={() => handleDeleteQuestion(question.id)}
                  onEdit={() => handleEditQuestion(question)}
                />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 