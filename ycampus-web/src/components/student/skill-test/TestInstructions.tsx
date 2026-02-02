import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PermissionDialog from '@/components/student/mock_interview/PermissionDialog';
import {
  ArrowLeft,
  Clock,
  FileText,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Mic,
  Monitor,
  Shield,
  Play,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Test {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  marks: number;
}

interface TestInstructionsProps {
  test: Test;
  onStart: () => void;
  onBack: () => void;
}

const TestInstructions: React.FC<TestInstructionsProps> = ({
  test,
  onStart,
  onBack
}) => {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-emerald-500 text-white border-transparent hover:bg-emerald-600';
      case 'Medium': return 'bg-cyan-500 text-white border-transparent hover:bg-cyan-600';
      case 'Hard': return 'bg-rose-500 text-white border-transparent hover:bg-rose-600';
      default: return 'bg-gray-500 text-white border-transparent';
    }
  };

  const handleStartTest = () => {
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
    <div className="max-w-4xl mx-auto space-y-6 p-6 animate-fade-in">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tests</span>
        </button>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground">{test.course}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground font-medium">{test.title}</span>
      </div>

      {/* Test Info Card */}
      <Card className="overflow-hidden border-0 shadow-xl rounded-2xl bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">{test.title}</CardTitle>
                  <p className="text-muted-foreground text-sm">{test.course}</p>
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn('px-4 py-1.5 font-medium rounded-full', getDifficultyColor(test.difficulty))}
            >
              {test.difficulty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">{test.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-blue-100 shadow-sm hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Duration</p>
                <p className="font-bold text-lg text-foreground">{test.duration} mins</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-emerald-100 shadow-sm hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Questions</p>
                <p className="font-bold text-lg text-foreground">{test.totalQuestions}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-amber-100 shadow-sm hover:border-amber-300 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Marks</p>
                <p className="font-bold text-lg text-foreground">{test.marks}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>Test Instructions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="font-semibold mb-3 text-foreground">General Guidelines</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {[
                  'Read each question carefully before answering',
                  'You can navigate between questions freely',
                  'Mark questions for review if uncertain',
                  'Submit your test before time expires',
                  'Ensure stable internet connection throughout'
                ].map((item, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="font-semibold mb-3 text-foreground">Question Types</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Multiple Choice:</strong> Select one or more correct answers</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Coding Questions:</strong> Write and test your code</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Descriptive:</strong> Provide detailed written answers</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <span>Some questions may have partial marking</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Guidelines */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Shield className="h-5 w-5 text-amber-500" />
            <span>Security Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 shadow-sm">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-900 mb-1">Proctoring Requirements</p>
                <p className="text-yellow-800">This test uses automated proctoring to ensure academic integrity. Please ensure compliance with all monitoring requirements.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Camera</p>
                <p className="text-muted-foreground text-xs mt-0.5">Keep your face visible</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Mic className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Microphone</p>
                <p className="text-muted-foreground text-xs mt-0.5">Audio monitoring active</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Monitor className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Screen</p>
                <p className="text-muted-foreground text-xs mt-0.5">No tab switching</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <h4 className="font-semibold text-red-900 mb-2 text-sm">Prohibited Actions</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-red-800">
              <span>• Switching tabs or apps</span>
              <span>• Using external resources</span>
              <span>• Communicating with others</span>
              <span>• Taking screenshots</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Before You Begin - Compact Checklist */}
      <Card className="rounded-2xl border-0 shadow-lg">
        <CardContent className="py-5">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Before You Begin
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              'Stable internet connection',
              'Close unnecessary apps',
              'Camera & mic ready',
              'Quiet environment',
              'Valid ID if required',
              'Sufficient battery'
            ].map((item, i) => (
              <div key={i} className="flex items-center space-x-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleStartTest}
          size="lg"
          className="px-8 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-2"
        >
          <Play className="h-4 w-4" />
          Start Test
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

export default TestInstructions;
