import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionForm } from './QuestionForm';
import { QuestionPreview } from './QuestionPreview';
import { QuestionManager } from './QuestionManager';
import { useToast } from '@/hooks/use-toast';

// Mock data structure
const mockCourses = [
  {
    id: '1',
    name: 'JavaScript Fundamentals',
    modules: [
      {
        id: '1',
        name: 'Variables and Data Types',
        topics: [
          { id: '1', name: 'Variable Declaration' },
          { id: '2', name: 'Primitive Data Types' },
          { id: '3', name: 'Type Conversion' },
        ]
      },
      {
        id: '2',
        name: 'Functions and Scope',
        topics: [
          { id: '4', name: 'Function Declaration' },
          { id: '5', name: 'Arrow Functions' },
          { id: '6', name: 'Scope and Closures' },
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'React Development',
    modules: [
      {
        id: '3',
        name: 'Components and JSX',
        topics: [
          { id: '7', name: 'Functional Components' },
          { id: '8', name: 'JSX Syntax' },
          { id: '9', name: 'Props and State' },
        ]
      }
    ]
  }
];

export interface Question {
  id: string;
  questionText: string;
  type: 'mcq' | 'coding' | 'short-answer' | 'true-false';
  options?: string[];
  correctAnswer: string | string[];
  marks: number;
  courseId: string;
  moduleId: string;
  topicId: string;
  isMultipleAnswer?: boolean;
  code_executor_config?: {
    time_limit: number;
    memory_limit: number;
  };
}

export function QuestionSetup() {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const { toast } = useToast();

  const selectedCourseData = mockCourses.find(c => c.id === selectedCourse);
  const selectedModuleData = selectedCourseData?.modules.find(m => m.id === selectedModule);
  const topics = selectedModuleData?.topics || [];

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedModule('');
    setSelectedTopic('');
    setShowQuestionForm(false);
  };

  const handleModuleChange = (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedTopic('');
    setShowQuestionForm(false);
  };

  const handleTopicChange = (topicId: string) => {
    setSelectedTopic(topicId);
    setShowQuestionForm(true);
  };

  const handleQuestionSave = (question: Omit<Question, 'id' | 'courseId' | 'moduleId' | 'topicId'>) => {
    const newQuestion: Question = {
      ...question,
      id: Date.now().toString(),
      courseId: selectedCourse,
      moduleId: selectedModule,
      topicId: selectedTopic,
    };
    
    setQuestions(prev => [...prev, newQuestion]);
    toast({
      title: "Success",
      description: "Question created successfully!",
    });
  };

  const handleQuestionDelete = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    toast({
      title: "Success",
      description: "Question deleted successfully!",
    });
  };

  const handleQuestionEdit = (question: Question) => {
    setEditingQuestion(question);
    setShowEditForm(true);
    setShowQuestionForm(false); // Hide the create form when editing
    
    // Ensure the course, module, and topic selections match the question being edited
    setSelectedCourse(question.courseId);
    setSelectedModule(question.moduleId);
    setSelectedTopic(question.topicId);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setShowEditForm(false);
    setShowQuestionForm(true); // Show the create form again
    // Note: We don't reset the course/module/topic selections here
    // as the user might want to continue creating questions for the same topic
  };

  const handleUpdateQuestion = (updatedQuestionData: Omit<Question, 'id' | 'courseId' | 'moduleId' | 'topicId'>) => {
    if (editingQuestion) {
      const updatedQuestion: Question = {
        ...updatedQuestionData,
        id: editingQuestion.id,
        courseId: editingQuestion.courseId,
        moduleId: editingQuestion.moduleId,
        topicId: editingQuestion.topicId,
      };
      
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? updatedQuestion : q));
      setEditingQuestion(null);
      setShowEditForm(false);
      setShowQuestionForm(true); // Show the create form again
      
      toast({
        title: "Success",
        description: "Question updated successfully!",
      });
    }
  };

  const handleSaveAll = () => {
    // In a real app, this would save to the database
    toast({
      title: "Success",
      description: `${questions.length} questions saved successfully!`,
    });
    setQuestions([]);
  };

  return (
    <div className="space-y-6">
      {/* Dependent Dropdowns */}
      <Card>
        <CardHeader>
          <CardTitle>Select Course, Module, and Topic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Course Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Course</label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {mockCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Module Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Module</label>
              <Select 
                value={selectedModule} 
                onValueChange={handleModuleChange}
                disabled={!selectedCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCourseData?.modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Topic</label>
              <Select 
                value={selectedTopic} 
                onValueChange={handleTopicChange}
                disabled={!selectedModule}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Create and Manage - Only enabled when all selections are made */}
      {selectedCourse && selectedModule && selectedTopic && (
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Questions</TabsTrigger>
                <TabsTrigger value="manage">Manage Questions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="mt-6">
                <div className="space-y-6">
                  {/* Question Form */}
                  {showQuestionForm && (
                    <QuestionForm onSave={handleQuestionSave} />
                  )}

                  {/* Edit Form */}
                  {showEditForm && editingQuestion && (
                    <QuestionForm
                      onSave={handleUpdateQuestion}
                      initialData={editingQuestion}
                      isEditing={true}
                      onCancel={handleCancelEdit}
                    />
                  )}

                  {/* Questions Preview */}
                  {questions.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-foreground">Created Questions ({questions.length})</h3>
                        <Button onClick={handleSaveAll}>
                          Save All Questions
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {questions.map((question) => (
                          <QuestionPreview
                            key={question.id}
                            question={question}
                            onDelete={() => handleQuestionDelete(question.id)}
                            onEdit={() => handleQuestionEdit(question)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="manage" className="mt-6">
                <QuestionManager />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}