import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, AlertTriangle, Shield, Eye, Mic, Camera, Monitor } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  duration: number;
  questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface TestPreInstructionsProps {
  topic: Topic;
  course?: Course | null;
  onStart: () => void;
  onBack: () => void;
}

const TestPreInstructions: React.FC<TestPreInstructionsProps> = ({
  topic,
  course,
  onStart,
  onBack
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          {course && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={`w-4 h-4 rounded ${course.color}`} />
              <span className="text-sm text-muted-foreground">{course.name}</span>
            </div>
          )}
          <CardTitle className="text-2xl">{topic.name}</CardTitle>
          <CardDescription>Final Instructions & Security Guidelines</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Test Details */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="font-medium">{topic.duration} minutes</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                {topic.questions} questions
              </Badge>
              <div className="text-xs text-muted-foreground">Total Questions</div>
            </div>
            <div className="text-center">
              <Badge variant={
                topic.difficulty === 'Easy' ? 'secondary' : 
                topic.difficulty === 'Medium' ? 'default' : 'destructive'
              }>
                {topic.difficulty}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">Difficulty</div>
            </div>
          </div>

          <Separator />

          {/* Security Instructions */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Important Security Guidelines
            </h3>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium text-orange-800">Test Monitoring Active</p>
                  <p className="text-sm text-orange-700">
                    This test is monitored for academic integrity. Your camera and microphone will be active throughout the test.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Camera className="h-4 w-4" />
                  <span>Camera monitoring</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Mic className="h-4 w-4" />
                  <span>Audio recording</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Monitor className="h-4 w-4" />
                  <span>Screen monitoring</span>
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-medium text-destructive">•</span>
                <span>Do not switch tabs, minimize the browser, or open other applications</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-destructive">•</span>
                <span>Keep your face visible in the camera at all times</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-destructive">•</span>
                <span>No external help, references, or communication is allowed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-destructive">•</span>
                <span>Any suspicious activity will be flagged and reported</span>
              </li>
            </ul>
          </div>

          <Separator />

          {/* Final Checklist */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Before You Begin
            </h3>
            
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-medium text-primary">✓</span>
                <span>Ensure stable internet connection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-primary">✓</span>
                <span>Close all unnecessary applications and browser tabs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-primary">✓</span>
                <span>Position yourself in a well-lit, quiet environment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-primary">✓</span>
                <span>Have a backup device ready in case of technical issues</span>
              </li>
            </ul>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3 justify-between">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            
            <Button onClick={onStart} size="lg" className="bg-green-600 hover:bg-green-700">
              Start Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestPreInstructions;