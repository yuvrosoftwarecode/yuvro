// Core code editor component without AI features.
// For AI-enhanced coding with problem descriptions, use CodeEditorWithAI.tsx instead.
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Send, X, FlaskConical, Terminal, CheckCircle2, XCircle, Zap, Activity, Sparkles } from 'lucide-react';
import MonacoCodeEditor from './MonacoCodeEditor';
import codeEditorService from '@/services/codeEditorService';


import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomTestCaseManager from '@/components/code-editor/CustomTestCaseManager';
import ExampleCodeGallery from './ExampleCodeGallery';

interface CustomTestCase {
  id: string;
  input: string;
  expected_output: string;
}

interface CodeEditorProps {
  value?: string;
  onChange?: (code: string) => void;
  language?: string;
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
  proctoringEnabled?: boolean;
}

export interface CodeEditorHandle {
  openExampleGallery: () => void;
  getLanguage: () => string;
  getCode: () => string;
  setCode: (code: string) => void;
  insertText: (text: string) => void;
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
  proctoringEnabled = false,
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

  // Custom resize state using CSS variables and rAF for smooth 60fps performance
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const startDrag = () => {
    setIsDragging(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const stopDrag = () => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const onDrag = (e: MouseEvent) => {
    if (!containerRef.current) return;

    // Failsafe: if mouse button is released outside window
    if (e.buttons !== 1) {
      stopDrag();
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const containerHeight = rect.height;

      // Calculate new height relative to bottom (since it's the bottom panel)
      const newHeight = ((containerHeight - relativeY) / containerHeight) * 100;

      // Clamp between 20% and 80%
      if (newHeight >= 20 && newHeight <= 80) {
        containerRef.current.style.setProperty('--output-height', `${newHeight}%`);
      }
    });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    }

    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [isDragging]);
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

  // References
  const monacoRef = useRef<any>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    openExampleGallery: () => setShowExamples(true),
    getLanguage: () => language,
    getCode: () => code,
    setCode: (newCode: string) => setCode(newCode),
    insertText: (text: string) => monacoRef.current?.insertText(text)
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
      } else if (res.status === 'timeout' || res.error_message === 'Time Limit Exceeded') {
        toast.error('Time Limit Exceeded');
      } else {
        toast.error('Code execution failed');
      }
    } catch (err) {
      const isTle = (err instanceof Error && err.message === 'Time Limit Exceeded') ||
        (err && typeof err === 'object' && (err as any).status === 400 && (err as any).data?.status === 'tle');
      if (isTle) {
        toast.error('Time Limit Exceeded');
        setOutput('⏱ Time Limit Exceeded: Your program exceeded the maximum execution time limit. Please optimize your algorithm or check for infinite loops.');
      } else {
        console.error('runCode error', err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        toast.error('Error running code');
        setOutput(errMsg);
      }
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

      setOutput(res.output || res.error_message || '');
      setTestResults(res.test_results ?? null);
      setExecutionMetrics({
        execution_time: res.execution_time,
        memory_usage: res.memory_usage,
        status: res.status,
        plagiarism_score: res.plagiarism_score,
      });

      if (res.status === 'timeout' || res.error_message === 'Time Limit Exceeded') {
        toast.error('Time Limit Exceeded');
      } else {
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
      }

      onSubmissionComplete?.(res);
    } catch (err) {
      const isTle = (err instanceof Error && err.message === 'Time Limit Exceeded') ||
        (err && typeof err === 'object' && (err as any).status === 400 && (err as any).data?.status === 'tle');
      if (isTle) {
        toast.error('Time Limit Exceeded');
        setOutput('⏱ Time Limit Exceeded: Your program exceeded the maximum execution time limit. Please optimize your algorithm or check for infinite loops.');
      } else {
        console.error('submitSolution error', err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        toast.error('Error submitting solution');
        setOutput(errMsg);
      }
      setShowOutput(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${shouldRenderFullscreenUI ? 'fixed inset-0 z-[9999] bg-white' : 'h-full'} ${className}`}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Fullscreen Header */}
        {shouldRenderFullscreenUI && (
          <div className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between z-10">
            <h2 className="text-lg font-bold text-gray-800">{problemTitle}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInternalFullscreen(false);
                onFullscreenChange?.(false);
              }}
              className="text-gray-400 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden" ref={containerRef}>
          <div className={`flex-1 overflow-hidden flex flex-col ${isDragging ? 'select-none pointer-events-none' : ''}`}>
            {/* Editor Panel */}
            <div
              className="w-full bg-white relative flex flex-col"
              style={{ height: showOutput ? `calc(100% - var(--output-height, 40%))` : '100%' }}
            >
              <div className="absolute inset-0">
                <MonacoCodeEditor
                  ref={monacoRef}
                  value={code}
                  onChange={handleChange}
                  language={language}
                  onLanguageChange={setLanguage}
                  height={height}
                  onShowExamples={showExamplesButton && !proctoringEnabled ? (onShowExamples || (() => setShowExamples(true))) : undefined}
                  onToggleAiChat={onToggleAiChat}
                  onToggleFullscreen={showFullscreenButton ? handleToggleFullscreen : undefined}
                  isAiChatOpen={isAiChatOpen}
                  isFullscreen={isFullscreen}
                  disableCopyPaste={proctoringEnabled}
                />
              </div>
            </div>

            {/* Drag Handle */}
            {showOutput && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  startDrag();
                }}
                className="h-4 -my-2 w-full relative flex items-center justify-center cursor-row-resize z-[60] group shrink-0"
              >
                <div className="w-12 h-1.5 bg-saffron-400 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-sm" />
              </div>
            )}

            {/* Output Panel */}
            {showOutput && (
              <div
                className="w-full bg-white flex flex-col overflow-hidden border-t border-gray-100"
                style={{ height: `var(--output-height, 40%)` }}
              >
                <Tabs value={activeBottomTab} onValueChange={(v: any) => setActiveBottomTab(v)} className="h-full flex flex-col">
                  <div className="flex-shrink-0 h-11 bg-white border-b border-gray-100 px-4 flex items-center justify-between gap-2">
                    <TabsList className="bg-transparent border-none p-0 h-auto flex items-center gap-2">
                      <TabsTrigger value="output" className="h-8 px-3 text-xs font-bold flex items-center gap-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-500 rounded-lg transition-all">
                        <Terminal className="h-3.5 w-3.5" /> Console
                      </TabsTrigger>
                      {showTestCases && (
                        <TabsTrigger value="testcases" className="h-8 px-3 text-xs font-bold flex items-center gap-2 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-500 rounded-lg transition-all">
                          <FlaskConical className="h-3.5 w-3.5" /> Test Cases
                        </TabsTrigger>
                      )}
                    </TabsList>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={runCode}
                        disabled={isRunning || isSubmitting}
                        size="sm"
                        className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-bold text-xs transition-all active:scale-95"
                      >
                        <Play className="h-3 w-3 mr-1.5 fill-current" /> {isRunning ? 'Running...' : 'Run'}
                      </Button>
                      <Button
                        onClick={submitSolution}
                        disabled={isRunning || isSubmitting}
                        size="sm"
                        className="h-8 px-4 bg-saffron-600 hover:bg-saffron-700 text-white rounded-lg shadow-sm font-bold text-xs transition-all active:scale-95 border-none"
                      >
                        <Send className="h-3 w-3 mr-1.5 fill-current" /> Submit
                      </Button>
                      <div className="w-px h-6 bg-gray-200 mx-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowOutput(false)}
                        className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-white hover:border-gray-200 border border-transparent rounded-lg transition-all"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <TabsContent value="output" className="flex-1 overflow-auto p-0 m-0">
                    {/* ── Scrollable content ── */}
                    <div className="flex-1 overflow-auto p-4 space-y-4">

                      {/* Console output */}
                      {(output || (testResults && testResults.results)) && (() => {
                        const consoleText = (() => {
                          if (testResults?.results && Array.isArray(testResults.results)) {
                            const lines = testResults.results
                              .filter((r: any) => !r.is_hidden && r.console_output)
                              .map((r: any, i: number) => `Test Case ${i + 1}:\n${r.console_output}`);
                            if (lines.length) return lines.join('\n\n');
                          }
                          return output || '';
                        })();
                        if (!consoleText) return null;
                        return (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Console</p>
                            <pre className="bg-gray-950 text-green-400 text-xs font-mono p-4 rounded-xl leading-relaxed whitespace-pre-wrap overflow-x-auto">{consoleText}</pre>
                          </div>
                        );
                      })()}

                      {/* Test result rows */}
                      {testResults?.results && Array.isArray(testResults.results) && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Test Results</p>
                          {testResults.results.map((result: any, idx: number) => {
                            const isHidden = result.is_hidden || false;
                            if (isHidden) return null;
                            const n = result.test_case_number || idx + 1;
                            const passed = result.passed;
                            return (
                              <div key={idx} className={`rounded-xl border overflow-hidden ${passed ? 'border-green-100 bg-green-50/40' : 'border-red-100 bg-red-50/30'
                                }`}>
                                {/* Row header */}
                                <div className="flex items-center justify-between px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {passed
                                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      : <XCircle className="h-4 w-4 text-red-500" />}
                                    <span className="text-sm font-bold text-gray-800">Case #{n}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {!passed && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-3 text-[11px] font-bold text-saffron-600 hover:bg-saffron-50"
                                        onClick={() => {
                                          if (onToggleAiChat && !isAiChatOpen) onToggleAiChat();
                                          window.dispatchEvent(new CustomEvent('ai-buddy-ask', {
                                            detail: { prompt: `Explain why this test case failed.\nInput:\n${result.input}\nExpected:\n${result.expected_output}\nActual Output:\n${result.actual_output}` }
                                          }));
                                        }}
                                      >
                                        <Sparkles className="h-3 w-3 mr-1" /> Ask AI
                                      </Button>
                                    )}
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${passed ? 'text-green-600' : 'text-red-500'
                                      }`}>{passed ? 'Passed' : 'Failed'}</span>
                                  </div>
                                </div>

                                {/* I/O grid — only for visible cases */}
                                {(result.input || result.expected_output || result.actual_output) && (
                                  <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-gray-100">
                                    <div className="pt-3">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Input</p>
                                      <pre className="text-xs font-mono bg-white border border-gray-100 rounded-lg p-3 overflow-x-auto text-gray-700">{result.input}</pre>
                                    </div>
                                    <div className="pt-3">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Expected</p>
                                      <pre className="text-xs font-mono bg-white border border-gray-100 rounded-lg p-3 overflow-x-auto text-gray-700">{result.expected_output}</pre>
                                    </div>
                                    <div className="pt-3">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Your Output</p>
                                      <pre className={`text-xs font-mono border rounded-lg p-3 overflow-x-auto ${passed ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-700'
                                        }`}>{result.actual_output}</pre>
                                    </div>
                                    {result.error_message && result.error_message !== 'N/A' && (
                                      <div className="md:col-span-3">
                                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Error</p>
                                        <pre className="text-xs font-mono bg-red-50 border border-red-100 rounded-lg p-3 overflow-x-auto text-red-700 whitespace-pre-wrap">{result.error_message}</pre>
                                        <div className="mt-2 flex justify-end">
                                          <Button size="sm" variant="ghost"
                                            className="h-7 px-3 text-[11px] font-bold text-saffron-600 hover:bg-saffron-50"
                                            onClick={() => {
                                              if (onToggleAiChat && !isAiChatOpen) onToggleAiChat();
                                              window.dispatchEvent(new CustomEvent('ai-buddy-ask', {
                                                detail: { prompt: `Explain this error:\n${result.error_message}` }
                                              }));
                                            }}
                                          >
                                            <Sparkles className="h-3 w-3 mr-1" /> Ask AI
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Empty state */}
                      {!executionMetrics && !output && !testResults && (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                          <Terminal className="h-8 w-8 text-gray-200 mb-3" />
                          <p className="text-sm font-semibold text-gray-400">No output yet</p>
                          <p className="text-xs text-gray-300 mt-1">Run your code to see results here</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>


                  {showTestCases && allowCustomTestCases && (
                    <TabsContent value="testcases" className="flex-1 overflow-auto p-4 m-0">
                      <CustomTestCaseManager
                        customTestCases={customTestCases}
                        onTestCasesChange={setCustomTestCases}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            )}
          </div>
        </div>   {/* Minimal Console Bar when collapsed */}
        {!showOutput && (
          <div className="flex-shrink-0 h-14 bg-white border-t border-gray-100 flex items-center justify-between px-6 gap-2">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="h-9 text-xs font-bold text-gray-500 flex items-center gap-2 hover:bg-slate-50 rounded-lg px-4 transition-all tracking-wide"
                onClick={() => {
                  setShowOutput(true);
                  setActiveBottomTab('output');
                }}
              >
                <Terminal className="h-4 w-4 text-emerald-500" />
                Console
              </Button>
              {showTestCases && (
                <Button
                  onClick={() => {
                    setShowOutput(true);
                    setActiveBottomTab('testcases');
                  }}
                  variant="ghost"
                  className="h-9 text-xs font-bold text-gray-500 flex items-center gap-2 hover:bg-slate-50 rounded-lg px-4 transition-all tracking-wide"
                >
                  <FlaskConical className="h-4 w-4 text-blue-500" />
                  Test Cases
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={runCode}
                disabled={isRunning || isSubmitting}
                size="sm"
                className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-100 font-bold text-xs transition-all active:scale-95"
              >
                <Play className="h-3.5 w-3.5 mr-1.5 fill-current" /> Run
              </Button>
              <Button
                onClick={submitSolution}
                disabled={isRunning || isSubmitting}
                size="sm"
                className="h-9 px-6 bg-saffron-600 hover:bg-saffron-700 text-white rounded-lg shadow-lg shadow-saffron-100 font-bold text-xs transition-all active:scale-95 border-none"
              >
                <Send className="h-3.5 w-3.5 mr-1.5 fill-current" /> Submit
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Example Gallery Modal */}
      {showExamples && (
        <ExampleCodeGallery
          onClose={() => setShowExamples(false)}
          onApplyCode={(exampleCode: string) => {
            setCode(exampleCode);
            setShowExamples(false);
          }}
          currentLanguage={language}
        />
      )}
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
