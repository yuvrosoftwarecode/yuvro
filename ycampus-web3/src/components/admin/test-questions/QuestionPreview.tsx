import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
import { Question } from './QuestionSetup';

interface QuestionPreviewProps {
  question: Question;
  onDelete: () => void;
  onEdit?: () => void;
}

export function QuestionPreview({ question, onDelete, onEdit }: QuestionPreviewProps) {
  const getQuestionTypeBadge = (type: string) => {
    const badges = {
      'mcq': { label: 'MCQ', variant: 'default' as const },
      'coding': { label: 'Coding', variant: 'secondary' as const },
      'short-answer': { label: 'Short Answer', variant: 'outline' as const },
      'true-false': { label: 'True/False', variant: 'destructive' as const },
    };
    
    const badge = badges[type as keyof typeof badges];
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const renderCorrectAnswer = () => {
    switch (question.type) {
      case 'mcq':
        if (question.isMultipleAnswer && Array.isArray(question.correctAnswer)) {
          return (
            <div>
              <p className="font-medium text-muted-foreground mb-1">Correct Answers:</p>
              <ul className="list-disc list-inside space-y-1">
                {question.correctAnswer.map((answer, index) => (
                  <li key={index} className="text-sm">{answer}</li>
                ))}
              </ul>
            </div>
          );
        } else {
          return (
            <div>
              <p className="font-medium text-muted-foreground mb-1">Correct Answer:</p>
              <p className="text-sm">{question.correctAnswer as string}</p>
            </div>
          );
        }
      
      case 'coding':
        return (
          <div>
            <p className="font-medium text-muted-foreground mb-1">Expected Solution:</p>
            <pre className="text-sm bg-muted p-2 rounded border overflow-x-auto">
              <code>{question.correctAnswer as string}</code>
            </pre>
          </div>
        );
      
      case 'short-answer':
        return (
          <div>
            <p className="font-medium text-muted-foreground mb-1">Expected Answer:</p>
            <p className="text-sm bg-muted p-2 rounded border">{question.correctAnswer as string}</p>
          </div>
        );
      
      case 'true-false':
        return (
          <div>
            <p className="font-medium text-muted-foreground mb-1">Correct Answer:</p>
            <Badge variant={question.correctAnswer === 'true' ? 'default' : 'secondary'}>
              {question.correctAnswer === 'true' ? 'True' : 'False'}
            </Badge>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getQuestionTypeBadge(question.type)}
              {question.isMultipleAnswer && (
                <Badge variant="outline">Multiple Answers</Badge>
              )}
              <Badge variant="outline">{question.marks} {question.marks === 1 ? 'Mark' : 'Marks'}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Text */}
        <div>
          <p className="font-medium text-muted-foreground mb-2">Question:</p>
          <p className="text-foreground">{question.questionText}</p>
        </div>

        {/* Options for MCQ */}
        {question.type === 'mcq' && question.options && (
          <div>
            <p className="font-medium text-muted-foreground mb-2">Options:</p>
            <ul className="space-y-1">
              {question.options.map((option, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="text-sm">{option}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Correct Answer */}
        {renderCorrectAnswer()}
      </CardContent>
    </Card>
  );
} 