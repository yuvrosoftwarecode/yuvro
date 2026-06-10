import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentInterface from '@/components/student/AssessmentInterface';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';
import { toast } from 'sonner';
import { CheckCircle2, ArrowRight, BookOpen, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import ProctoringGate from '@/components/student/ProctoringGate';

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
  enable_proctoring?: boolean;
  tab_switch_threshold?: number;
  violation_threshold?: number;
  violation_count?: number;
  tab_switch_count?: number;
}

export default function JobTestAttempt() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [duration, setDuration] = useState(60);
  
  const [proctoringEnabled, setProctoringEnabled] = useState(false);
  const [tabSwitchThreshold, setTabSwitchThreshold] = useState(3);
  const [violationThreshold, setViolationThreshold] = useState(5);
  const [gatePassed, setGatePassed] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [initialViolations, setInitialViolations] = useState(0);
  const [initialTabSwitches, setInitialTabSwitches] = useState(0);

  useEffect(() => {
    const fetchTestData = async () => {
      if (!applicationId) return;
      try {
        const data = await restApiAuthUtil.get<StartTestResponse>(`/jobs/applications/${applicationId}/start-test/`);
        setJobTitle(data.job_title);
        setCompanyName(data.company_name);
        setQuestions(data.questions);
        setProctoringEnabled(!!data.enable_proctoring);
        setTabSwitchThreshold(data.tab_switch_threshold ?? 3);
        setViolationThreshold(data.violation_threshold ?? 5);
        setInitialViolations(data.violation_count ?? 0);
        setInitialTabSwitches(data.tab_switch_count ?? 0);
        
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



  const handleSubmit = async (
    assessmentId: string,
    submissionId: string,
    answers: any
  ) => {
    if (!applicationId) return;
    try {
      await restApiAuthUtil.post(`/jobs/applications/${applicationId}/submit-test/`, {
        responses: answers,
        proctoring_events: [] // Live logged to backend, no need to resubmit
      });
      toast.success('Job Assessment submitted successfully!');
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting test:', err);
      toast.error(err.response?.data?.error || 'Failed to submit assessment. Please try again.');
      throw err;
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


  if (proctoringEnabled && !gatePassed) {
    return (
      <ProctoringGate
        onReady={(stream) => {
          setCameraStream(stream);
          setGatePassed(true);
        }}
        onCancel={() => navigate('/')}
      />
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
        proctoring_enabled: proctoringEnabled,
        tab_switch_threshold: tabSwitchThreshold,
        violation_threshold: violationThreshold,
        initial_violations: initialViolations,
        initial_tab_switches: initialTabSwitches,
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
      assessmentType="job-tests"
      preExamCameraStream={cameraStream}
    />
  );
}
