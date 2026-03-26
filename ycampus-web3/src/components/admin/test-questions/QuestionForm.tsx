import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { Question } from './QuestionSetup';

interface QuestionFormProps {
  onSave: (question: Omit<Question, 'id' | 'courseId' | 'moduleId' | 'topicId' | 'testSettings'>) => void;
  initialData?: Question;
  isEditing?: boolean;
  onCancel?: () => void;
}

export function QuestionForm({ onSave, initialData, isEditing = false, onCancel }: QuestionFormProps) {
  const [questionType, setQuestionType] = useState<string>('');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState<number>(1);
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [isMultipleAnswer, setIsMultipleAnswer] = useState(false);
  const [shortAnswer, setShortAnswer] = useState('');
  const [codingSolution, setCodingSolution] = useState('');
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean | null>(null);

  // Populate form with initial data when editing
  useEffect(() => {
    if (initialData && isEditing) {
      setQuestionType(initialData.type);
      setQuestionText(initialData.questionText);
      setMarks(initialData.marks);
      setIsMultipleAnswer(initialData.isMultipleAnswer || false);
      
      if (initialData.options) {
        setOptions(initialData.options);
      }
      
      if (initialData.type === 'mcq') {
        if (initialData.isMultipleAnswer && Array.isArray(initialData.correctAnswer)) {
          setCorrectAnswers(initialData.correctAnswer);
        } else {
          setCorrectAnswer(initialData.correctAnswer as string);
        }
      } else if (initialData.type === 'short-answer') {
        setShortAnswer(initialData.correctAnswer as string);
      } else if (initialData.type === 'coding') {
        setCodingSolution(initialData.correctAnswer as string);
      } else if (initialData.type === 'true-false') {
        setTrueFalseAnswer(initialData.correctAnswer === 'true');
      }
    }
  }, [initialData, isEditing]);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleMultipleAnswerChange = (option: string, checked: boolean) => {
    if (checked) {
      setCorrectAnswers([...correctAnswers, option]);
    } else {
      setCorrectAnswers(correctAnswers.filter(ans => ans !== option));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!questionType || !questionText || marks <= 0) {
      return;
    }

    let finalCorrectAnswer: string | string[] = '';
    let finalOptions: string[] | undefined = undefined;

    switch (questionType) {
      case 'mcq':
        finalOptions = options.filter(opt => opt.trim() !== '');
        finalCorrectAnswer = isMultipleAnswer ? correctAnswers : correctAnswer;
        break;
      case 'short-answer':
        finalCorrectAnswer = shortAnswer;
        break;
      case 'coding':
        finalCorrectAnswer = codingSolution;
        break;
      case 'true-false':
        finalCorrectAnswer = trueFalseAnswer ? 'true' : 'false';
        break;
    }

    const question: Omit<Question, 'id' | 'courseId' | 'moduleId' | 'topicId'> = {
      questionText,
      type: questionType as Question['type'],
      options: finalOptions,
      correctAnswer: finalCorrectAnswer,
      marks,
      isMultipleAnswer: questionType === 'mcq' ? isMultipleAnswer : undefined,
    };

    onSave(question);
    resetForm();
  };

  const resetForm = () => {
    setQuestionType('');
    setQuestionText('');
    setMarks(1);
    setOptions(['', '']);
    setCorrectAnswer('');
    setCorrectAnswers([]);
    setIsMultipleAnswer(false);
    setShortAnswer('');
    setCodingSolution('');
    setTrueFalseAnswer(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Test Question' : 'Create New Test Question'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Type */}
          <div className="space-y-2">
            <Label htmlFor="questionType">Question Type</Label>
            <Select value={questionType} onValueChange={setQuestionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select question type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice Question (MCQ)</SelectItem>
                <SelectItem value="coding">Coding Question</SelectItem>
                <SelectItem value="short-answer">Short Answer</SelectItem>
                <SelectItem value="true-false">True/False</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="questionText">Question Text</Label>
            <Textarea
              id="questionText"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your test question here..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* MCQ Options */}
          {questionType === 'mcq' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multipleAnswer"
                  checked={isMultipleAnswer}
                  onCheckedChange={(checked) => {
                    setIsMultipleAnswer(checked as boolean);
                    setCorrectAnswer('');
                    setCorrectAnswers([]);
                  }}
                />
                <Label htmlFor="multipleAnswer">Multiple correct answers</Label>
              </div>

              <div className="space-y-3">
                <Label>Options</Label>
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {!isMultipleAnswer ? (
                      <RadioGroup
                        value={correctAnswer}
                        onValueChange={setCorrectAnswer}
                        className="flex-shrink-0"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={option} />
                        </div>
                      </RadioGroup>
                    ) : (
                      <Checkbox
                        checked={correctAnswers.includes(option)}
                        onCheckedChange={(checked) => handleMultipleAnswerChange(option, checked as boolean)}
                      />
                    )}
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Short Answer */}
          {questionType === 'short-answer' && (
            <div className="space-y-2">
              <Label htmlFor="shortAnswer">Expected Answer</Label>
              <Textarea
                id="shortAnswer"
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                placeholder="Enter the expected answer..."
                required
              />
            </div>
          )}

          {/* Coding Question */}
          {questionType === 'coding' && (
            <div className="space-y-2">
              <Label htmlFor="codingSolution">Expected Code/Solution</Label>
              <Textarea
                id="codingSolution"
                value={codingSolution}
                onChange={(e) => setCodingSolution(e.target.value)}
                placeholder="Enter the expected code or solution..."
                className="min-h-[150px] font-mono"
                required
              />
            </div>
          )}

          {/* True/False */}
          {questionType === 'true-false' && (
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <RadioGroup
                value={trueFalseAnswer?.toString()}
                onValueChange={(value) => setTrueFalseAnswer(value === 'true')}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" />
                  <Label>True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" />
                  <Label>False</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Marks */}
          <div className="space-y-2">
            <Label htmlFor="marks">Marks</Label>
            <Input
              id="marks"
              type="number"
              min="1"
              value={marks}
              onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
              className="w-24"
              required
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={!questionType || !questionText}>
              {isEditing ? 'Update Test Question' : 'Save Test Question'}
            </Button>
            {isEditing && onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {!isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset Form
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 