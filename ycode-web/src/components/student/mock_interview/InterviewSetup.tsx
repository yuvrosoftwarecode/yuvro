import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Play, Settings, Sparkles } from 'lucide-react';

interface InterviewSetupProps {
  analysis: any;
  onStart: (settings: {
    difficulty: string;
    num_questions: number;
    adaptive: boolean;
  }) => void;
  onCancel: () => void;
}

export const InterviewSetup: React.FC<InterviewSetupProps> = ({ analysis, onStart, onCancel }) => {

  const matchScore = analysis?.match_score || 0;
  const strengths = analysis?.strengths || [];
  const gaps = analysis?.gaps || [];
  const candidateName = analysis?.candidate_name || 'Candidate';
  const roleTitle = analysis?._jd_requirements?.title || analysis?.domain || 'Target Role';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Profile Matching & Setup</h1>
        <p className="text-muted-foreground text-sm">Review how your resume matches the job requirements and configure your interview session.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Matching Metrics */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="pt-8 flex flex-col md:flex-row items-center gap-8">
              {/* Radial Score Gauge */}
              <div className="relative flex items-center justify-center w-36 h-36 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className="stroke-slate-100"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className="stroke-indigo-600 transition-all duration-1000 ease-out"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={402}
                    strokeDashoffset={402 - (402 * matchScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-slate-800">{matchScore}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fit Score</span>
                </div>
              </div>

              {/* Summary Details */}
              <div className="space-y-3 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Match Analysis
                </div>
                <h2 className="text-xl font-bold text-slate-800">{candidateName}</h2>
                <p className="text-slate-500 text-sm">
                  Alignment for <span className="font-semibold text-slate-700">{roleTitle}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Based on skills, qualifications, and experience level extracted from your resume.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-emerald-50/30">
                <CardTitle className="text-base font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Matched Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {strengths.length > 0 ? (
                  <ul className="space-y-3">
                    {strengths.map((str: string, idx: number) => (
                      <li key={idx} className="flex gap-2.5 items-start text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        {str}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 text-sm italic">No specific strengths mapped. Ready to test core domain skills.</p>
                )}
              </CardContent>
            </Card>

            {/* Gaps */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-amber-50/30">
                <CardTitle className="text-base font-semibold text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Identified Skill Gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {gaps.length > 0 ? (
                  <ul className="space-y-3">
                    {gaps.map((gap: string, idx: number) => (
                      <li key={idx} className="flex gap-2.5 items-start text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 text-sm italic">No significant skill gaps found. Your profile aligns perfectly!</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side: Setup Options */}
        <div>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Session Settings
              </CardTitle>
              <CardDescription>Your session is pre-configured and ready to start.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="font-medium">Difficulty:</span>
                  <span className="capitalize font-semibold text-slate-800">Medium</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Questions:</span>
                  <span className="font-semibold text-slate-800">10 Questions</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Adaptive Mode:</span>
                  <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-bold">Enabled</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-6">
                <Button
                  onClick={() => onStart({ difficulty: 'medium', num_questions: 10, adaptive: true })}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Live Interview
                </Button>
                <Button variant="ghost" onClick={onCancel} className="w-full rounded-xl text-slate-500 hover:text-slate-700">
                  Cancel
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
export default InterviewSetup;
