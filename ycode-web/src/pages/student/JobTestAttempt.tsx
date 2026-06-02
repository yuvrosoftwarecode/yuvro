import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentInterface from '@/components/student/AssessmentInterface';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';
import { toast } from 'sonner';
import { CheckCircle2, ArrowRight, BookOpen, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface QuestionData {
  id: string;
  type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
  title: string;
  content: string;
  mcq_options: any;
  test_cases_basic: any;
  marks: number;
  duration: number;
}

interface StartTestResponse {
  application_id: string;
  job_title: string;
  company_name: string;
  questions: QuestionData[];
}

export default function JobTestAttempt() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [duration, setDuration] = useState(60);
  
  const proctoringEvents = useRef<any[]>([]);

  useEffect(() => {
    if (!isStarted || isSubmitted) return;

    // 1. Tab visibility changes
    const handleVisibilityChange = () => {
      proctoringEvents.current.push({
        activity_type: document.hidden ? 'tab_switched_away' : 'tab_switched_back',
        timestamp: new Date().toISOString(),
        meta_data: { type: document.hidden ? 'hidden' : 'visible' }
      });
    };

    // 2. Window focus/blur
    const handleBlur = () => {
      proctoringEvents.current.push({
        activity_type: 'window_blur',
        timestamp: new Date().toISOString()
      });
    };
    const handleFocus = () => {
      proctoringEvents.current.push({
        activity_type: 'window_focus',
        timestamp: new Date().toISOString()
      });
    };

    // 3. Copy & paste detection
    const handleCopy = () => {
      const selectedText = window.getSelection()?.toString() || '';
      proctoringEvents.current.push({
        activity_type: 'copy_detected',
        timestamp: new Date().toISOString(),
        meta_data: { key: 'Ctrl+C', copied_text: selectedText }
      });
    };
    const handlePaste = (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData('text') || '';
      proctoringEvents.current.push({
        activity_type: 'paste_detected',
        timestamp: new Date().toISOString(),
        meta_data: { key: 'Ctrl+V', pasted_text: pastedText }
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [isStarted, isSubmitted]);

  useEffect(() => {
    const fetchTestData = async () => {
      if (!applicationId) return;
      try {
        const data = await restApiAuthUtil.get<StartTestResponse>(`/jobs/applications/${applicationId}/start-test/`);
        setJobTitle(data.job_title);
        setCompanyName(data.company_name);
        setQuestions(data.questions);
        
        // Calculate total duration (sum of question durations or default to 60)
        const totalDuration = data.questions.reduce((acc, q) => acc + (q.duration || 1), 0);
        setDuration(totalDuration || 60);
      } catch (err: any) {
        console.error('Error fetching test:', err);
        setError(err.response?.data?.error || 'Failed to load job assessment data.');
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, [applicationId]);

  const handleStart = () => {
    setIsStarted(true);
  };

  const handleSubmit = async (
    assessmentId: string,
    submissionId: string,
    answers: any
  ) => {
    if (!applicationId) return;
    try {
      await restApiAuthUtil.post(`/jobs/applications/${applicationId}/submit-test/`, {
        responses: answers,
        proctoring_events: proctoringEvents.current
      });
      toast.success('Job Assessment submitted successfully!');
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting test:', err);
      toast.error(err.response?.data?.error || 'Failed to submit assessment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <span className="text-slate-600 font-medium">Loading Job Assessment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white shadow-xl shadow-orange-500/5 rounded-2xl p-8 border border-slate-100 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto mb-4 border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all shadow-md"
          >
            Go to Yuvro Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/20 px-4">
        <div className="w-full max-w-lg bg-white shadow-2xl shadow-orange-500/5 rounded-2xl p-10 border border-slate-100 text-center relative overflow-hidden">
          {/* Top orange accent line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-orange-600" />
          
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-500 mx-auto mb-6 border border-green-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Job Assessment Submitted
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-md mx-auto mb-8">
            Thank you for completing the assessment for <strong>{jobTitle}</strong> at <strong>{companyName}</strong>. 
            Your responses have been successfully recorded. The recruiting team will review your submission and contact you with the next steps.
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 rounded-xl text-base font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99]"
          >
            Continue to Yuvro Code
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-2xl bg-white shadow-xl shadow-orange-500/5 rounded-2xl p-10 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-600" />
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-lg border border-orange-100">
              Y
            </div>
            <span className="text-slate-800 text-xl font-bold tracking-tight">Yuvro Assessment</span>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Job Assessment Instructions
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            You are attempting the assessment for <strong>{jobTitle}</strong> at <strong>{companyName}</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block font-semibold text-slate-800 text-sm">Duration</span>
                <span className="text-slate-500 text-xs">{duration} minutes total</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block font-semibold text-slate-800 text-sm">Questions</span>
                <span className="text-slate-500 text-xs">{questions.length} question(s)</span>
              </div>
            </div>
          </div>

          <div className="mb-10 text-sm text-slate-600 leading-relaxed space-y-3">
            <p className="font-semibold text-slate-800">Please review the rules before starting:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-500">
              <li>Ensure you have a stable internet connection.</li>
              <li>Once you click start, the timer cannot be paused.</li>
              <li>Switching tabs or minimizing the browser may flag your submission.</li>
              <li>No assessment results or scores will be shown to you after completion.</li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3.5 rounded-xl text-base font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99]"
          >
            Start Job Assessment
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <AssessmentInterface
      assessment={{
        id: applicationId || '',
        title: `Job Assessment: ${jobTitle}`,
        course: companyName,
        duration: duration,
        totalQuestions: questions.length,
        topicId: 'job-assessment',
        proctoring_enabled: false,
      }}
      questions={questions}
      submissionId={applicationId || ''}
      onComplete={() => {}}
      onSubmit={handleSubmit}
      onBack={() => {
        if (window.confirm('Are you sure you want to go back? Your current progress might not be saved.')) {
          navigate('/');
        }
      }}
      assessmentType="skill-tests"
    />
  );
}
