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
    <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans selection:bg-blue-100">
      <Card className="max-w-4xl w-full border-0 shadow-2xl bg-white/80 backdrop-blur-xl ring-1 ring-slate-200/50 rounded-[2rem] overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-600 w-full" />

        <div className="p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center shadow-sm border border-green-100 ring-4 ring-green-50/50 mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>

            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 mb-2">
              Interview Completed!
            </h2>
            <p className="text-slate-500 font-medium">
              You have successfully finished your session for <span className="text-slate-900 font-semibold">{role.title}</span>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Summary & Tips */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <BarChart3 className="w-4 h-4 text-slate-500" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Session Summary</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Position</span>
                    <span className="font-bold text-slate-800 text-sm">{role.title}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Difficulty</span>
                    <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600 shadow-sm">{difficulty}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Duration</span>
                    <span className="font-bold text-slate-800 text-sm">{duration}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-5 flex gap-4 items-start">
                <div className="shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  💡
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">Pro Tip</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Check your analysis report for AI feedback on your performance.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Actions */}
            <div className="space-y-4 flex flex-col justify-center h-full">
              <h3 className="font-bold text-slate-900 text-lg mb-2">What would you like to do?</h3>

              <Button
                onClick={onViewReports}
                className="w-full h-14 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95 border-0"
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                View Detailed Analysis
              </Button>

              <Button
                variant="outline"
                onClick={onTryAgain}
                className="w-full h-14 rounded-xl text-lg font-semibold bg-white border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
              >
                <RotateCcw className="w-5 h-5 mr-3" />
                Try Same Interview Again
              </Button>

              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={onBackToLibrary}
                  className="w-full h-12 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-medium"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Interview Library
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ThankYouScreen;