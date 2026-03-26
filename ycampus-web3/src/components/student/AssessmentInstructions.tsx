import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PermissionDialog from './PermissionDialog';
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Camera,
  Mic,
  Monitor,
  Shield
} from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  marks: number;
}

interface AssessmentInstructionsProps {
  assessment: Assessment;
  onStart: () => void;
  onBack: () => void;
}

const AssessmentInstructions: React.FC<AssessmentInstructionsProps> = ({
  assessment,
  onStart,
  onBack
}) => {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleStartAssessment = () => {
    setShowPermissionDialog(true);
  };

  const handlePermissionGranted = () => {
    setShowPermissionDialog(false);
    onStart();
  };

  const handlePermissionCanceled = () => {
    setShowPermissionDialog(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header - removed back button as requested */}

      {/* Assessment Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{assessment.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{assessment.course}</p>
            </div>
            <Badge 
              variant="outline" 
              className={getDifficultyColor(assessment.difficulty)}
            >
              {assessment.difficulty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">{assessment.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg">
              <Clock className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">{assessment.duration} minutes</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="font-semibold">{assessment.totalQuestions}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Marks</p>
                <p className="font-semibold">{assessment.marks}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span>Assessment Instructions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">General Guidelines</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span>Read each question carefully before answering</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span>You can navigate between questions freely</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span>Mark questions for review if uncertain</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span>Submit your assessment before time expires</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span>Ensure stable internet connection throughout</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Question Types</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span><strong>Multiple Choice:</strong> Select one or more correct answers</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span><strong>Coding Questions:</strong> Write and test your code</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span><strong>Descriptive:</strong> Provide detailed written answers</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span>Some questions may have partial marking</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <span>Important Security Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-2">Proctoring Requirements</p>
                <p>This assessment uses automated proctoring to ensure academic integrity. Please ensure compliance with all monitoring requirements.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Camera className="h-5 w-5 text-blue-500 mt-1" />
              <div className="text-sm">
                <p className="font-semibold">Camera Monitoring</p>
                <p className="text-muted-foreground">Keep your camera on and face visible throughout the assessment</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Mic className="h-5 w-5 text-green-500 mt-1" />
              <div className="text-sm">
                <p className="font-semibold">Audio Monitoring</p>
                <p className="text-muted-foreground">Microphone will be active to monitor ambient sound</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Monitor className="h-5 w-5 text-purple-500 mt-1" />
              <div className="text-sm">
                <p className="font-semibold">Screen Monitoring</p>
                <p className="text-muted-foreground">Do not switch tabs or minimize the browser window</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Prohibited Actions</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Switching tabs or opening other applications</li>
              <li>• Using external resources or materials</li>
              <li>• Communicating with others during the assessment</li>
              <li>• Taking screenshots or recording the assessment</li>
              <li>• Leaving the assessment area</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Before You Begin */}
      <Card>
        <CardHeader>
          <CardTitle>Before You Begin</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Ensure you have a stable internet connection</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Close all unnecessary applications and browser tabs</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Verify camera and microphone permissions</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Find a quiet, well-lit environment</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Have a valid ID ready if required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Assessments
        </Button>
        <Button onClick={handleStartAssessment} size="lg" className="px-8">
          Start Assessment
        </Button>
      </div>

      {/* Permission Dialog */}
      <PermissionDialog
        open={showPermissionDialog}
        onConfirm={handlePermissionGranted}
        onCancel={handlePermissionCanceled}
      />
    </div>
  );
};

export default AssessmentInstructions;