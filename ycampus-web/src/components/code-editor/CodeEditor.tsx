// Core code editor component without AI features.
// For AI-enhanced coding with problem descriptions, use CodeEditorWithAI.tsx instead.
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Send, X, FlaskConical, Terminal, CheckCircle2, XCircle, Zap, Activity } from 'lucide-react';
import MonacoCodeEditor from './MonacoCodeEditor';
import codeEditorService from '@/services/codeEditorService';
import ExampleCodeGallery from '@/components/code-editor/ExampleCodeGallery';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomTestCaseManager from '@/components/code-editor/CustomTestCaseManager';

interface CustomTestCase {
  id: string;
  input: string;
  expected_output: string;
}

interface CodeEditorProps {
  // Controlled props
  value?: string;
  onChange?: (code: string) => void;
  language?: string;
  // Uncontrolled / Hybrid props
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
  initialLanguage?: string;
  problemTitle?: string;
  problemId?: string;
  courseId?: string;
  topicId?: string;
  subtopicId?: string;
  codeSubmissionType?: 'learn' | 'practice';
  submissionId?: string;
  contestId?: string;
  skillTestId?: string;
  mockInterviewId?: string;
  testCases?: Array<{
    input: string;
    expected_output: string;
    weight?: number;
  }>;
  showTestCases?: boolean;
  allowCustomTestCases?: boolean;
  onSubmissionComplete?: (result: any) => void;
  className?: string;
  showFullscreenButton?: boolean;
  showExamplesButton?: boolean;
  onShowExamples?: () => void;
  onToggleAiChat?: () => void;
  isAiChatOpen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  isFullscreen?: boolean;
  templates?: Record<string, string>;
  height?: string;
}

export interface CodeEditorHandle {
  openExampleGallery: () => void;
  getLanguage: () => string;
  getCode: () => string;
  setCode: (code: string) => void;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(({
  value,
  onChange,
  language: controlledLanguage,
  initialCode = '',
  onCodeChange,
  onLanguageChange,
  initialLanguage = 'python',
  problemTitle = 'Code Practice',
  problemId = 'practice',
  courseId,
  topicId,
  subtopicId,
  codeSubmissionType = 'practice',
  submissionId,
  contestId,
  skillTestId,
  mockInterviewId,
  testCases = [],
  showTestCases = true,
  allowCustomTestCases = true,
  onSubmissionComplete,
  className = '',
  showFullscreenButton = true,
  showExamplesButton = true,
  onShowExamples,
  onToggleAiChat,
  isAiChatOpen = false,
  onFullscreenChange,
  isFullscreen: controlledFullscreen,
  templates,
  height = '100%'
}, ref) => {
  // Editor & code state
  // If value is provided, we use it as initial state, but we also sync it via useEffect
  const [code, setCode] = useState(value !== undefined ? value : initialCode);
  const [language, setLanguage] = useState(initialLanguage);

  // Sync value prop to internal state (Controlled mode support)
  useEffect(() => {
    if (value !== undefined && value !== code) {
      setCode(value);
    }
  }, [value]);

  // Sync language prop to internal state
  useEffect(() => {
    if (controlledLanguage !== undefined && controlledLanguage !== language) {
      setLanguage(controlledLanguage);
    }
  }, [controlledLanguage]);

  // Handle onChange callback
  const handleChange = (newCode: string) => {
    setCode(newCode);
    onChange?.(newCode);
    onCodeChange?.(newCode);
  };

  // Execution state
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [executionMetrics, setExecutionMetrics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = controlledFullscreen !== undefined ? controlledFullscreen : internalFullscreen;
  // If controlled, let the parent handle the fullscreen layout/UI container. we just fill the parent
  const shouldRenderFullscreenUI = isFullscreen && controlledFullscreen === undefined;
  const [showOutput, setShowOutput] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'output' | 'testcases'>('output');
  // Code templates state
  const [apiTemplates, setApiTemplates] = useState<Record<string, string>>(templates || {});
  const [languageCodes, setLanguageCodes] = useState<Record<string, string>>(
    initialCode ? { [initialLanguage]: initialCode } : {}
  );
  const [showExamples, setShowExamples] = useState(false);
  const prevLanguageRef = useRef(language);

  // Custom test cases state
  const [customTestCases, setCustomTestCases] = useState<CustomTestCase[]>([]);

  // Ref to store onCodeChange callback to avoid infinite loops
  const onCodeChangeRef = useRef(onCodeChange);
  onCodeChangeRef.current = onCodeChange;

  // Track if code change was from user input vs internal updates
  const isUserInputRef = useRef(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    openExampleGallery: () => setShowExamples(true),
    getLanguage: () => language,
    getCode: () => code,
    setCode: (newCode: string) => setCode(newCode)
  }));

  const handleToggleFullscreen = () => {
    const newState = !isFullscreen;
    if (controlledFullscreen === undefined) {
      setInternalFullscreen(newState);
    }
    onFullscreenChange?.(newState);
  };

  useEffect(() => {
    if (templates) {
      setApiTemplates(templates);
      return;
    }

    const fetchTemplates = async () => {
      const CACHE_KEY = 'code_templates_cache';
      const cached = localStorage.getItem(CACHE_KEY);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setApiTemplates(parsed);
          // Don't overwrite if we already have code (via initialCode or previous edits)
          if (!code && parsed[language]) {
            setCode(parsed[language]);
          }
        } catch (e) {
          console.warn('Failed to parse cached templates:', e);
        }
      }

      try {
        const data = await codeEditorService.getSupportedLanguagesAndTemplates();
        const templateMap: Record<string, string> = {};
        if (data.details) {
          Object.entries(data.details).forEach(([lang, config]: [string, any]) => {
            templateMap[lang] = config.template;
          });
        }
        setApiTemplates(templateMap);
        localStorage.setItem(CACHE_KEY, JSON.stringify(templateMap));

        // Only set code if we don't have any yet
        if (!code && !cached && templateMap[language]) {
          setCode(templateMap[language]);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, [templates]);

  // Handle code changes - use ref to avoid dependency on callback
  const prevCodeRef = useRef(code);
  useEffect(() => {
    // Only call onCodeChange if code actually changed (not on initial mount or callback change)
    if (prevCodeRef.current !== code) {
      prevCodeRef.current = code;
      onCodeChangeRef.current?.(code);
    }
  }, [code]);

  // Handle language changes - use ref to avoid dependency on callback
  const onLanguageChangeRef = useRef(onLanguageChange);
  onLanguageChangeRef.current = onLanguageChange;
  const prevLanguageForCallbackRef = useRef(language);
  useEffect(() => {
    if (prevLanguageForCallbackRef.current !== language) {
      prevLanguageForCallbackRef.current = language;
      onLanguageChangeRef.current?.(language);
    }
  }, [language]);

  // Language switching logic
  useEffect(() => {
    const prevLang = prevLanguageRef.current;
    if (prevLang && code) {
      setLanguageCodes(prev => ({ ...prev, [prevLang]: code }));
    }
    prevLanguageRef.current = language;

    const savedCode = languageCodes[language];
    const currentTemplate = apiTemplates[language];
    const targetTemplate = currentTemplate || '';

    if (savedCode !== undefined) {
      setCode(savedCode);
    } else {
      setCode(targetTemplate);
    }
  }, [language, apiTemplates]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (controlledFullscreen === undefined) setInternalFullscreen(false);
        onFullscreenChange?.(false);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, controlledFullscreen, onFullscreenChange]);

  const runCode = async () => {
    if (!code.trim()) return toast.error('Please write some code first');

    const basicTestCases = testCases.map((t: any) => ({
      input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
      expected_output: typeof t.expected_output === 'string' ? t.expected_output : JSON.stringify(t.expected_output),
      weight: t.weight || 1,
    }));

    const customMapped = customTestCases.map(tc => ({
      input: tc.input,
      expected_output: tc.expected_output,
      weight: 1,
    }));

    if (basicTestCases.length === 0 && customMapped.length === 0) {
      toast.error('Please add test cases before running your code');
      setShowOutput(true);
      setActiveBottomTab('testcases');
      return;
    }

    setIsRunning(true);
    setOutput('');
    setTestResults(null);
    setExecutionMetrics(null);
    setShowOutput(true);
    setActiveBottomTab('output');

    try {
      const res = await codeEditorService.runCode({
        code,
        language,
        test_cases: basicTestCases,
        test_cases_custom: customMapped,
        problem_title: problemTitle,
      });

      setOutput(res.output || res.error_message || '');
      setTestResults(res.test_results ?? null);
      setExecutionMetrics({
        execution_time: res.execution_time,
        memory_usage: res.memory_usage,
        status: res.status,
        plagiarism_score: res.plagiarism_score,
      });

      if (res.status === 'completed') {
        const passed = res.test_results?.passed ?? 0;
        const total = res.test_results?.total ?? 0;
        toast.success(`Passed ${passed} of ${total} tests`);
      } else {
        toast.error('Code execution failed');
      }
    } catch (err) {
      console.error('runCode error', err);
      toast.error('Error running code');
      setOutput(typeof err === 'string' ? err : err instanceof Error ? err.message : 'Unknown error');
      setShowOutput(true);
    } finally {
      setIsRunning(false);
    }
  };

  const submitSolution = async () => {
    if (!code.trim()) return toast.error('Please write some code first');
    setIsSubmitting(true);
    setShowOutput(true);
    setActiveBottomTab('output');

    try {
      let res;

      if (codeSubmissionType === 'learn') {
        console.log('Learn mode: submitting to student-course-progress');

        res = await codeEditorService.submitSolution({
          code,
          language,
          subtopic_id: subtopicId || undefined,
          question_id: problemId,
          course_id: courseId,
          topic_id: topicId,
          submissionType: 'learn',
          test_cases_basic: testCases.map(tc => ({
            input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
            expected_output: typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output),
            weight: tc.weight || 1
          })),
          test_cases_custom: customTestCases.map(tc => ({
            input: tc.input,
            expected_output: tc.expected_output
          }))
        });
      } else {
        console.log('Practice mode: submitting to student-code-practices');
        res = await codeEditorService.submitSolution({
          code,
          language,
          question_id: problemId,
          course_id: courseId,
          topic_id: topicId,
          subtopic_id: subtopicId,
          submissionType: 'practice',
          submission_id: submissionId,
          contest_id: contestId,
          skill_test_id: skillTestId,
          mock_interview_id: mockInterviewId,
          test_cases_basic: testCases.map(tc => ({
            input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
            expected_output: typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output),
            weight: tc.weight || 1
          })),
          test_cases_custom: customTestCases.map(tc => ({
            input: tc.input,
            expected_output: tc.expected_output
          }))
        });
      }

      setTestResults(res.test_results ?? null);
      setExecutionMetrics({
        execution_time: res.execution_time,
        memory_usage: res.memory_usage,
        status: res.status,
        plagiarism_score: res.plagiarism_score,
      });

      const passed = res.test_cases_passed ?? 0;
      const total = res.total_test_cases ?? 0;
      const passRate = total ? ((passed / total) * 100).toFixed(1) : '0.0';

      if (passed === total && total > 0) {
        toast.success(`Solution submitted: All ${total} test cases passed (100%)`);
      } else if (total > 0) {
        toast.success(`Solution submitted: ${passed}/${total} test cases passed (${passRate}%)`);
      } else {
        toast.success('Solution submitted successfully');
      }

      onSubmissionComplete?.(res);
    } catch (err) {
      console.error('submitSolution error', err);
      toast.error('Error submitting solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${shouldRenderFullscreenUI ? 'fixed inset-0 z-[9999] bg-white' : 'h-full'} ${className}`}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Fullscreen Header */}
        {shouldRenderFullscreenUI && (
          <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between shadow-md shrink-0">
            <h2 className="text-xl font-bold text-gray-900">{problemTitle}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInternalFullscreen(false);
                onFullscreenChange?.(false);
              }}
              className="text-gray-500 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <ResizablePanelGroup direction="vertical" className="flex-1 overflow-hidden">
            {/* Editor Panel */}
            <ResizablePanel
              id="code-editor-panel"
              order={1}
              defaultSize={showOutput ? 50 : 100}
              minSize={30}
            >
              <div className="h-full bg-white">
                <MonacoCodeEditor
                  value={code}
                  onChange={handleChange}
                  language={language}
                  onLanguageChange={setLanguage}
                  height={height}
                  onShowExamples={showExamplesButton ? (onShowExamples || (() => setShowExamples(true))) : undefined}
                  onToggleAiChat={onToggleAiChat}
                  onToggleFullscreen={showFullscreenButton ? handleToggleFullscreen : undefined}
                  isAiChatOpen={isAiChatOpen}
                  isFullscreen={isFullscreen}
                />
              </div>
            </ResizablePanel>

            {/* Divider */}
            {showOutput && (
              <ResizableHandle className="h-2 bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </ResizableHandle>
            )}

            {/* Output Panel */}
            {showOutput && (
              <ResizablePanel
                id="output-panel"
                order={2}
                defaultSize={50}
                minSize={20}
              >
                <div className="h-full bg-white flex flex-col overflow-hidden border-t">
                  <Tabs value={activeBottomTab} onValueChange={(v: any) => setActiveBottomTab(v)} className="h-full flex flex-col">
                    <TabsList className="flex-shrink-0 justify-between h-12 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-6 shadow-sm">
                      <div className="flex items-center gap-6">
                        <TabsTrigger value="output" className="h-8 px-4 text-sm flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-gray-200 font-semibold text-gray-700 data-[state=active]:text-gray-900 rounded-lg transition-all">
                          <Terminal className="h-4 w-4 text-emerald-600" /> Console Output
                        </TabsTrigger>
                        {showTestCases && (
                          <TabsTrigger value="testcases" className="h-8 px-4 text-sm flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-gray-200 font-semibold text-gray-700 data-[state=active]:text-gray-900 rounded-lg transition-all">
                            <FlaskConical className="h-4 w-4 text-blue-600" /> Test Cases
                          </TabsTrigger>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={runCode}
                          disabled={isRunning || isSubmitting}
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md px-6 rounded-xl transition-all active:scale-95"
                        >
                          <Play className="h-3 w-3 mr-1" /> {isRunning ? 'Running...' : 'Run'}
                        </Button>
                        <Button
                          onClick={submitSolution}
                          disabled={isRunning || isSubmitting}
                          size="sm"
                          className="h-8 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-4 rounded-md transition-all disabled:opacity-50"
                        >
                          <Send className="h-3 w-3 mr-1" /> {isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>
                        <div className="w-px h-5 bg-gray-300 mx-2" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowOutput(false)}
                          className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TabsList>

                    <TabsContent value="output" className="flex-1 overflow-auto p-6 m-0">
                      <div className="max-w-5xl mx-auto space-y-8 pb-12">
                        {/* Execution Metrics */}
                        {executionMetrics && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Zap className="h-5 w-5 text-amber-500" />
                              Execution Metrics
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {executionMetrics.execution_time !== undefined && (
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Execution Time</div>
                                  <div className="text-2xl font-bold text-blue-900">{typeof executionMetrics.execution_time === 'number' ? executionMetrics.execution_time.toFixed(2) : executionMetrics.execution_time}</div>
                                  <div className="text-xs text-blue-600 mt-1">milliseconds</div>
                                </div>
                              )}
                              {executionMetrics.memory_usage !== undefined && (
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 rounded-xl border border-purple-200 shadow-md hover:shadow-lg transition-shadow">
                                  <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Memory Usage</div>
                                  <div className="text-2xl font-bold text-purple-900">{(executionMetrics.memory_usage / 1024).toFixed(1)}</div>
                                  <div className="text-xs text-purple-600 mt-1">KB</div>
                                </div>
                              )}
                              {(testResults?.passed !== undefined && testResults?.total !== undefined) ? (
                                <div className={`p-5 rounded-xl border shadow-md hover:shadow-lg transition-shadow ${testResults.passed === testResults.total
                                  ? 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200'
                                  : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200'
                                  }`}>
                                  <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${testResults.passed === testResults.total ? 'text-green-700' : 'text-amber-700'}`}>Test Cases</div>
                                  <div className={`text-2xl font-bold ${testResults.passed === testResults.total ? 'text-green-900' : 'text-amber-900'}`}>
                                    {testResults.passed}/{testResults.total}
                                  </div>
                                  <div className={`text-xs mt-1 ${testResults.passed === testResults.total ? 'text-green-600' : 'text-amber-600'}`}>
                                    {testResults.passed === testResults.total ? 'All Passed' : 'Some Failed'}
                                  </div>
                                </div>
                              ) : executionMetrics.status && (
                                <div className={`p-5 rounded-xl border shadow-md hover:shadow-lg transition-shadow ${executionMetrics.status === 'completed'
                                  ? 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200'
                                  : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200'
                                  }`}>
                                  <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${executionMetrics.status === 'completed' ? 'text-green-700' : 'text-amber-700'}`}>Status</div>
                                  <div className={`text-2xl font-bold capitalize ${executionMetrics.status === 'completed' ? 'text-green-900' : 'text-amber-900'}`}>{executionMetrics.status}</div>
                                  <div className={`text-xs mt-1 ${executionMetrics.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {executionMetrics.status === 'completed' ? 'Success' : 'Failed'}
                                  </div>
                                </div>
                              )}
                              {executionMetrics.plagiarism_score !== undefined && (
                                <div className={`p-5 rounded-xl border shadow-md hover:shadow-lg transition-shadow ${executionMetrics.plagiarism_score > 0.7
                                  ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200'
                                  : 'bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200'
                                  }`}>
                                  <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${executionMetrics.plagiarism_score > 0.7 ? 'text-red-700' : 'text-teal-700'}`}>Plagiarism</div>
                                  <div className="text-2xl font-bold text-gray-900">
                                    {(executionMetrics.plagiarism_score * 100).toFixed(0)}%
                                  </div>
                                  <div className={`text-xs mt-1 ${executionMetrics.plagiarism_score > 0.7 ? 'text-red-600' : 'text-teal-600'}`}>
                                    {executionMetrics.plagiarism_score > 0.7 ? 'Flagged' : 'Clear'}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Console Output */}
                        {(output || (testResults && testResults.results)) && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Activity className="h-5 w-5 text-emerald-600" />
                              Console Output
                            </h4>
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-5 rounded-xl border border-gray-700 shadow-xl">
                              <pre className="text-green-400 text-sm whitespace-pre-wrap overflow-auto font-mono leading-relaxed">
                                {(() => {
                                  // Show console outputs from basic test cases only
                                  if (testResults && testResults.results && Array.isArray(testResults.results)) {
                                    const basicTestResults = testResults.results.filter((result: any) => !result.is_hidden);
                                    const consoleOutputs = basicTestResults
                                      .map((result: any, idx: number) => {
                                        const consoleOutput = result.console_output || '';
                                        return consoleOutput ? `Test Case ${idx + 1}:\n${consoleOutput}` : '';
                                      })
                                      .filter((output: string) => output)
                                      .join('\n\n');

                                    if (consoleOutputs) {
                                      return consoleOutputs;
                                    }
                                  }

                                  // Fallback to original output if no console outputs from test cases
                                  return output || 'No console output available';
                                })()}
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Test Results */}
                        {testResults && testResults.results && Array.isArray(testResults.results) && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                              Test Results
                              <span className={`ml-2 px-3 py-1 rounded-full text-sm font-bold ${testResults.passed === testResults.total
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                                }`}>
                                {testResults.passed}/{testResults.total}
                              </span>
                            </h4>
                            <div className="grid grid-cols-1 gap-5">
                              {testResults.results.map((result: any, idx: number) => {
                                const isHidden = result.is_hidden || false;
                                const testCaseNumber = result.test_case_number || idx + 1;

                                return (
                                  <div key={idx} className={`border-2 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow ${isHidden
                                    ? result.passed
                                      ? 'border-blue-200 bg-gradient-to-br from-blue-50/50 to-blue-100/30'
                                      : 'border-purple-200 bg-gradient-to-br from-purple-50/50 to-purple-100/30'
                                    : result.passed
                                      ? 'border-green-200 bg-gradient-to-br from-green-50/50 to-green-100/30'
                                      : 'border-red-200 bg-gradient-to-br from-red-50/50 to-red-100/30'
                                    }`}>
                                    <div className={`px-6 py-4 border-b-2 flex justify-between items-center ${isHidden
                                      ? result.passed
                                        ? 'bg-blue-100/60 border-blue-200'
                                        : 'bg-purple-100/60 border-purple-200'
                                      : result.passed
                                        ? 'bg-green-100/60 border-green-200'
                                        : 'bg-red-100/60 border-red-200'
                                      }`}>
                                      <div className="flex items-center gap-3">
                                        {result.passed ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                                        <span className="font-bold text-lg text-gray-800">
                                          Test Case #{testCaseNumber}
                                          {isHidden && (
                                            <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-medium">
                                              Hidden
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                      <span className={`text-sm font-bold px-4 py-2 rounded-full ${result.passed
                                        ? 'bg-green-200 text-green-800'
                                        : 'bg-red-200 text-red-800'
                                        }`}>
                                        {result.passed ? '✓ PASSED' : '✗ FAILED'}
                                      </span>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/80">
                                      <div className="space-y-2">
                                        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                          Input {isHidden && <span className="text-gray-400">(Partially Hidden)</span>}
                                        </div>
                                        <pre className={`text-sm p-4 border rounded-lg font-mono overflow-x-auto shadow-sm ${isHidden
                                          ? 'bg-gray-100 border-gray-300 text-gray-600'
                                          : 'bg-gray-50 border-gray-200 text-gray-800'
                                          }`}>
                                          {result.input}
                                        </pre>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                          Expected Output {isHidden && <span className="text-gray-400">(Partially Hidden)</span>}
                                        </div>
                                        <pre className={`text-sm p-4 border rounded-lg font-mono overflow-x-auto shadow-sm ${isHidden
                                          ? 'bg-gray-100 border-gray-300 text-gray-600'
                                          : 'bg-gray-50 border-gray-200 text-gray-800'
                                          }`}>
                                          {result.expected_output}
                                        </pre>
                                      </div>
                                      <div className="space-y-2 col-span-1 md:col-span-2">
                                        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                                          Actual Output {isHidden && result.actual_output === '***' && <span className="text-gray-400">(Hidden)</span>}
                                        </div>
                                        <pre className={`text-sm p-4 border rounded-lg font-mono overflow-x-auto shadow-sm ${result.passed
                                          ? 'bg-green-50 border-green-200 text-green-800'
                                          : 'bg-red-50 border-red-200 text-red-800'
                                          }`}>
                                          {result.actual_output}
                                        </pre>
                                      </div>
                                      {result.error_message && result.error_message !== 'N/A' && (
                                        <div className="col-span-1 md:col-span-2">
                                          <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Error Message</div>
                                          <pre className="bg-red-50 p-4 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto border border-red-200 font-mono text-red-700 shadow-sm">
                                            {result.error_message}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {showTestCases && allowCustomTestCases && (
                      <TabsContent value="testcases" className="flex-1 overflow-auto p-6 m-0">
                        <div className="max-w-5xl mx-auto">
                          <CustomTestCaseManager
                            customTestCases={customTestCases}
                            onTestCasesChange={setCustomTestCases}
                          />
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>

          {/* Minimal Console Bar when collapsed */}
          {!showOutput && (
            <div className="flex-shrink-0 h-12 bg-gradient-to-r from-slate-50 to-gray-50 border-t border-gray-200 flex items-center justify-between px-6 shadow-lg">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  className="h-8 text-sm font-medium text-gray-600 flex items-center gap-2 hover:bg-white hover:shadow-sm rounded-md px-3 transition-all"
                  onClick={() => {
                    setShowOutput(true);
                    setActiveBottomTab('output');
                  }}
                >
                  <Terminal className="h-4 w-4 text-emerald-600" />
                  Console Output
                </Button>
                {showTestCases && (
                  <Button
                    onClick={() => {
                      setShowOutput(true);
                      setActiveBottomTab('testcases');
                    }}
                    variant="ghost"
                    className="h-8 text-sm font-medium text-gray-600 flex items-center gap-2 hover:bg-white hover:shadow-sm rounded-md px-3 transition-all"
                  >
                    <FlaskConical className="h-4 w-4 text-blue-600" />
                    Test Cases
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={runCode}
                  disabled={isRunning || isSubmitting}
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md px-6 rounded-xl transition-all active:scale-95"
                >
                  <Play className="h-3 w-3 mr-1" /> {isRunning ? 'Running...' : 'Run'}
                </Button>
                <Button
                  onClick={submitSolution}
                  disabled={isRunning || isSubmitting}
                  size="sm"
                  className="h-8 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-4 rounded-md transition-all disabled:opacity-50"
                >
                  <Send className="h-3 w-3 mr-1" /> {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Example Code Gallery */}
      {showExamples && (
        <ExampleCodeGallery
          currentLanguage={language}
          onClose={() => setShowExamples(false)}
          onApplyCode={(exampleCode) => setCode(exampleCode)}
        />
      )}
    </div>
  );
});

export default CodeEditor;