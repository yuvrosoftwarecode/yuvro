import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowLeft, Clock, FileText } from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
}

interface AssessmentThankYouProps {
  assessment: Assessment;
  answeredCount: number;
  totalQuestions: number;
  timeSpent: number;
  onBackToAssessment: () => void;
}

const AssessmentThankYou: React.FC<AssessmentThankYouProps> = ({
  assessment,
  answeredCount,
  totalQuestions,
  timeSpent,
  onBackToAssessment
}) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const completionPercentage = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600 mb-2">
            Assessment Submitted Successfully!
          </CardTitle>
          <p className="text-muted-foreground">
            Thank you for completing the assessment. Your responses have been recorded.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Assessment Details */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Assessment Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Assessment</p>
                <p className="font-medium">{assessment.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Course</p>
                <Badge variant="outline">{assessment.course}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Questions Answered</p>
                <p className="font-medium text-green-600">
                  {answeredCount} of {totalQuestions} ({completionPercentage}%)
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Spent</p>
                <p className="font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(timeSpent)}
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your responses are being evaluated</li>
              <li>• Results will be available in the Results section</li>
              <li>• You will receive feedback on your performance</li>
              <li>• Check back later for detailed analytics</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={onBackToAssessment}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Assessments</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssessmentThankYou;