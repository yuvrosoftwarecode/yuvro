import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, BarChart3, RotateCcw, ArrowLeft } from 'lucide-react';

interface ThankYouScreenProps {
  role: {
    title: string;
    level: string;
  };
  difficulty: string;
  duration: string;
  onViewReports: () => void;
  onTryAgain: () => void;
  onBackToLibrary: () => void;
}

const ThankYouScreen: React.FC<ThankYouScreenProps> = ({
  role,
  difficulty,
  duration,
  onViewReports,
  onTryAgain,
  onBackToLibrary
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <CardTitle className="text-2xl font-bold">
            Interview Completed Successfully!
          </CardTitle>
          
          <p className="text-muted-foreground">
            Congratulations! You have successfully completed your mock interview for {role.title}.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Interview Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Interview Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="font-medium">{role.title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Difficulty</p>
                <Badge variant="secondary">{difficulty}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{duration}</p>
              </div>
            </div>
          </div>
          
          {/* Next Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold">What's Next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                onClick={onViewReports}
                className="flex items-center justify-center gap-2 h-12"
              >
                <BarChart3 className="w-4 h-4" />
                View Detailed Reports
              </Button>
              
              <Button 
                variant="outline"
                onClick={onTryAgain}
                className="flex items-center justify-center gap-2 h-12"
              >
                <RotateCcw className="w-4 h-4" />
                Try Same Interview Again
              </Button>
            </div>
            
            <Button 
              variant="ghost"
              onClick={onBackToLibrary}
              className="w-full flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Interview Library
            </Button>
          </div>
          
          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Pro Tips</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Review your detailed performance report to identify areas for improvement</li>
              <li>• Practice regularly to build confidence and improve your interview skills</li>
              <li>• Focus on the feedback provided for each question type</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThankYouScreen;