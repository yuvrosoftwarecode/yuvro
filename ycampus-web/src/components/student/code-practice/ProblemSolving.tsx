import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Play, Send, Maximize2, Minimize2, Plus, Trash2, Clock, CheckCircle2, XCircle, Zap, MemoryStick, Activity, Shield, Sparkles, X, FlaskConical, Terminal, BookOpen } from 'lucide-react';
import { CodeExecutionPanel } from '@/components/code-editor';
import CodeEditor from '@/components/code-editor/CodeEditor';
import codeEditorService from '@/services/codeEditorService';
import ExampleCodeGallery from '@/components/code-editor/ExampleCodeGallery';
import type { Course, Topic, CodingProblem } from '@/pages/student/CodePractice';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import AIChatContainer from '@/components/student/Learn/AIChatWidget/AIChatContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CustomTestCaseManager from '@/components/code-editor/CustomTestCaseManager';

interface CustomTestCase {
  id: string;
  input: string;
  expected_output: string;
}

interface ProblemSolvingProps {
  problem: CodingProblem;
  course: Course;
  topic: Topic;
  onBack: () => void;
  onViewAnalytics?: () => void;
  initialFullscreen?: boolean;
  initialEditorOpen?: boolean;
  isEmbedded?: boolean;
}

export interface ProblemSolvingHandle {
  openExampleGallery: () => void;
  getLanguage: () => string;
}

const ProblemSolving = forwardRef<ProblemSolvingHandle, ProblemSolvingProps>(({ problem, course, topic, onBack, initialFullscreen = false, initialEditorOpen = false, isEmbedded = false }, ref) => {
  // Editor & code state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');

  // Execution state
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [executionMetrics, setExecutionMetrics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [editorOpen, setEditorOpen] = useState(initialEditorOpen);
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(initialFullscreen);
  const [showOutput, setShowOutput] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'output' | 'testcases'>('output');
  const [apiTemplates, setApiTemplates] = useState<Record<string, string>>({});
  const [languageCodes, setLanguageCodes] = useState<Record<string, string>>({});
  const [showExamples, setShowExamples] = useState(false);
  const prevLanguageRef = useRef(language);

  const handleToggleAiChat = () => {
    const nextShow = !showAiChat;
    setShowAiChat(nextShow);
    if (nextShow) {
      setIsSidebarCollapsed(true);
    }
  };

  // Generate a unique session key every time the problem is loaded to start fresh
  const [chatSessionId, setChatSessionId] = useState(() => `chat-${problem.id}-${crypto.randomUUID()}`);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    openExampleGallery: () => setShowExamples(true),
    getLanguage: () => language
  }));

  // Custom test cases state
  const [customTestCases, setCustomTestCases] = useState<CustomTestCase[]>([]);
  // activeTestCaseTab is no longer needed for sidebar but we'll remove it if unused.
  // Custom test case functions are now handled by CustomTestCaseManager.

  useEffect(() => {
    setChatSessionId(`chat-${problem.id}-${crypto.randomUUID()}`);
  }, [problem.id]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const CACHE_KEY = 'code_templates_cache';
      const cached = localStorage.getItem(CACHE_KEY);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setApiTemplates(parsed);
          if (parsed[language]) {
            setCode(parsed[language]);
          }
          // Still fetch in background to keep it fresh
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

        // Initial code set if templates are now available and not set by cache
        if (!cached && templateMap[language]) {
          setCode(templateMap[language]);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, []);

  // Auto-enable AI Buddy in fullscreen mode
  useEffect(() => {
    if (isEditorFullscreen) {
      setShowAiChat(true);
      setIsSidebarCollapsed(true);
    }
  }, [isEditorFullscreen]);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditorFullscreen) setIsEditorFullscreen(false);
      // Toggle fullscreen with F11
      if (e.key === 'F11') {
        e.preventDefault();
        setIsEditorFullscreen((s) => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditorFullscreen]);

  const mounted = useRef(false);

  useEffect(() => {
    // 1. Save current code for the previous language
    const prevLang = prevLanguageRef.current;
    if (prevLang && code) {
      setLanguageCodes(prev => ({ ...prev, [prevLang]: code }));
    }
    prevLanguageRef.current = language;

    // 2. Load code for the new language if it exists, otherwise use template
    const savedCode = languageCodes[language];
    const currentTemplate = apiTemplates[language];

    // Fallback templates with detailed input examples
    const fallbackTemplates: Record<string, string> = {
      python: `class Solution:
    def solve(self, *args):
        # Competitive Programming Template - Python
        # Each line of your test case input is passed as an argument in *args.
        # Arguments are automatically parsed as JSON/Numbers if possible.

        # Example: If your input lines are: "Hello", 42, [1, 2, 3]
        # You can access them like this:
        # input_str = args[0] if len(args) > 0 else ""
        # num = args[1] if len(args) > 1 else 0
        # list_data = args[2] if len(args) > 2 else []

        # Start your logic below:
        return None
`,
      javascript: `"use strict";

const fs = require('fs');

/**
 * Competitive Programming Template - Node.js
 * Reads stdin and parses lines. Often inputs are JSON strings.
 */
function solve() {
    const lines = fs.readFileSync(0, 'utf8').split('\\n').filter(line => line.trim());
    if (lines.length === 0) return;

    // Example: parse first line as a JSON array
    try {
        const data = JSON.parse(lines[0]);
        // Your logic here
    } catch (e) {
        // Fallback for non-JSON input
        const data = lines[0];
    }
}

solve();
`,
      java: `import java.util.*;

/**
 * Competitive Programming Template - Java
 */
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        
        // For array inputs, the platform provides [count] followed by [elements]
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int[] arr = new int[n];
            for(int i = 0; i < n; i++) {
                arr[i] = sc.nextInt();
            }
            // Your logic here
        }
    }
}
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

/**
 * Competitive Programming Template - C++
 */
int main() {
    // Faster I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    // For array inputs, the platform provides [count] followed by [elements]
    if (cin >> n) {
        vector<int> arr(n);
        for(int i = 0; i < n; i++) {
            cin >> arr[i];
        }
        // Your logic here
    }

    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

/**
 * Competitive Programming Template - C
 */
int main() {
    int n;
    // For array inputs, the platform provides [count] followed by [elements]
    if (scanf("%d", &n) == 1) {
        int* arr = (int*)malloc(n * sizeof(int));
        for(int i = 0; i < n; i++) {
            scanf("%d", &arr[i]);
        }
        
        // Your logic here
        
        free(arr);
    }
    return 0;
}
`
    };

    const targetTemplate = currentTemplate || fallbackTemplates[language] || fallbackTemplates.python;

    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(targetTemplate);
    }

    if (!mounted.current) {
      mounted.current = true;
      return;
    }
  }, [language, apiTemplates]);

  // difficulty badge style (pure Tailwind)
  const difficultyBadgeClass =
    problem.difficulty === 'Easy'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : problem.difficulty === 'Medium'
        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        : problem.difficulty === 'Hard'
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-gray-50 text-gray-700 border border-gray-200';

  const runCode = async () => {
    if (!code.trim()) return toast.error('Please write some code first');
    setIsRunning(true);
    setOutput('');
    setTestResults(null);
    setExecutionMetrics(null);
    setShowOutput(true); // show output area while running
    setActiveBottomTab('output'); // auto-switch to output tab

    try {
      const basicTestCases = (problem.test_cases_basic || []).map((t: any) => ({
        input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
        expected_output: typeof t.expected_output === 'string' ? t.expected_output : JSON.stringify(t.expected_output),
        weight: t.weight || 1,
      }));

      const customMapped = customTestCases.map(tc => ({
        input: tc.input,
        expected_output: tc.expected_output,
        weight: 1,
      }));

      const transformed = [...basicTestCases, ...customMapped];

      const res = await codeEditorService.runCode({
        code,
        language,
        test_cases: basicTestCases,
        test_cases_custom: customMapped,
        problem_title: problem.title,
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
    setActiveBottomTab('output'); // auto-switch to output tab

    try {
      const all = [
        ...(problem.test_cases_basic || []),
        ...(problem.test_cases_advanced || []),
      ].map((t: any) => ({
        input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
        expected_output: typeof t.expected_output === 'string' ? t.expected_output : JSON.stringify(t.expected_output),
        weight: t.weight || 1,
      }));

      const res = await codeEditorService.submitSolution({
        code,
        language,
        question_id: problem.id,
        test_cases_basic: (problem.test_cases_basic || []).map((t: any) => ({
          input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
          expected_output: typeof t.expected_output === 'string' ? t.expected_output : JSON.stringify(t.expected_output),
          weight: t.weight || 1,
        })),
        test_cases_advanced: (problem.test_cases_advanced || []).map((t: any) => ({
          input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
          expected_output: typeof t.expected_output === 'string' ? t.expected_output : JSON.stringify(t.expected_output),
          weight: t.weight || 1,
        })),
      });

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
        const passRate = total ? ((passed / total) * 100).toFixed(1) : '0.0';
        toast.success(`Solution submitted: ${passed}/${total} passed (${passRate}%)`);
      } else {
        toast.error('Submission failed');
      }
    } catch (err) {
      console.error('submitSolution error', err);
      toast.error('Error submitting solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showTestsCount = (arr?: any[]) => (Array.isArray(arr) ? arr.length : 0);



  const getProblemContext = () => {
    return `
Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Score: ${problem.score}

Description:
${problem.description}

Input Format:
${problem.inputFormat || 'N/A'}

Output Format:
${problem.outputFormat || 'N/A'}

Examples:
${(problem.examples || []).map(e => `Input: ${e.input}\nOutput: ${e.output}`).join('\n\n')}

Current Code (${language}):
${code}
    `.trim();
  };

  return (
    <div className={`${isEditorFullscreen ? (isEmbedded ? 'h-full w-full bg-white relative' : 'h-screen bg-white') : 'mx-auto px-[1px] py-6 max-w-[1500px]'}`}>
      {/* Breadcrumb */}
      {!isEditorFullscreen && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-auto p-0 hover:bg-transparent hover:text-gray-900 transition-colors">
            {topic.name}
          </Button>
          <span>/</span>
          <span className="text-gray-800 font-medium">{problem.title}</span>
        </div>
      )}

      {/* 1) Problem-only view (editor hidden) */}
      {!editorOpen && !isEditorFullscreen && (
        <Card className="pt-1 border border-gray-200 shadow-sm bg-white">
          <CardHeader className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl text-gray-900">{problem.title}</CardTitle>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                  <Badge className={`px-2 py-1 rounded ${difficultyBadgeClass}`}>{problem.difficulty}</Badge>
                  <span>Score: {problem.score}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setEditorOpen(true)}
                  className="border border-gray-200 text-gray-700 hover:bg-gray-100"
                  variant="outline"
                >
                  Open Code Editor
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-6">
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{problem.description}</p>
              </div>

              {/* Input format */}
              {problem.inputFormat && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Input Format</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{problem.inputFormat}</p>
                </div>
              )}

              {/* Output format */}
              {problem.outputFormat && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Output Format</h3>
                  <p className="text-gray-700 text-sm">{problem.outputFormat}</p>
                </div>
              )}

              {/* Examples */}
              {problem.examples && problem.examples.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Examples</h3>
                  <div className="space-y-3">
                    {problem.examples.map((ex: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <div className="text-sm mb-1">
                          <strong>Input:</strong> <code className="font-mono">{ex.input}</code>
                        </div>
                        <div className="text-sm">
                          <strong>Output:</strong> <code className="font-mono">{ex.output}</code>
                        </div>
                        {ex.explanation && (
                          <p className="text-gray-600 text-sm mt-2">
                            <strong>Explanation:</strong> {ex.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Cases - Basic Only (Custom tests available in editor view) */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Test Cases</h3>
                <div className="space-y-4">
                  {(problem.test_cases_basic || []).map((tc: any, i: number) => (
                    <div key={i} className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-700">Test Case</span>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Input</div>
                        <pre className="bg-white/80 backdrop-blur-sm p-3 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto border border-gray-100 font-mono">
                          {typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input, null, 2)}
                        </pre>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Expected Output</div>
                        <pre className="bg-white/80 backdrop-blur-sm p-3 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto border border-gray-100 font-mono">
                          {typeof tc.expected_output === 'string'
                            ? tc.expected_output
                            : JSON.stringify(tc.expected_output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                  {(problem.test_cases_basic || []).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No basic test cases available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2) Split view when editor is open (horizontal resizable) */}
      {editorOpen && !isEditorFullscreen && (
        <div className="h-[calc(100vh-140px)]">
          <ResizablePanelGroup
            key={isSidebarCollapsed ? 'collapsed' : 'expanded'}
            direction="horizontal"
            className="w-full h-full flex"
          >
            {/* LEFT PANEL — Problem */}
            <ResizablePanel defaultSize={35} minSize={isSidebarCollapsed ? 0 : 20} maxSize={isSidebarCollapsed ? 0 : 50} className={`${isSidebarCollapsed ? 'hidden' : ''}`}>
              <div className="h-full overflow-y-auto pr-1">
                <Card className="border border-gray-200 shadow-sm bg-white flex flex-col h-full">
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-gray-900">{problem.title}</CardTitle>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                          <Badge className={`px-2 py-1 rounded ${difficultyBadgeClass}`}>{problem.difficulty}</Badge>
                          <span>Score: {problem.score}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsSidebarCollapsed(true)}
                          className="text-gray-500 hover:text-gray-900"
                          title="Collapse Sidebar"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-6">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{problem.description}</p>

                      {problem.examples && problem.examples.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Examples</h4>
                          <div className="space-y-3">
                            {problem.examples.map((ex: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 p-3 rounded-lg shadow-sm">
                                <p><strong>Input:</strong> <code>{ex.input}</code></p>
                                <p><strong>Output:</strong> <code>{ex.output}</code></p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Example Test Cases</h4>
                        <div className="space-y-3">
                          {(problem.test_cases_basic || []).map((tc: any, i: number) => (
                            <div key={i} className="bg-gradient-to-br from-gray-50 to-slate-50 p-3 rounded-lg border border-gray-200/60 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                  {i + 1}
                                </span>
                              </div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Input</div>
                              <pre className="bg-white/80 p-2 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap border border-gray-100 font-mono">
                                {typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input, null, 2)}
                              </pre>

                              <div className="text-xs mt-2 font-medium text-gray-500 uppercase tracking-wide mb-1">Expected Output</div>
                              <pre className="bg-white/80 p-2 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap border border-gray-100 font-mono">
                                {typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output, null, 2)}
                              </pre>
                            </div>
                          ))}
                          {(problem.test_cases_basic || []).length === 0 && (
                            <p className="text-xs text-gray-500 italic text-center py-4">No example test cases provided.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ResizablePanel>
            {/* COLLAPSED SIDEBAR GHOST */}
            {isSidebarCollapsed && (
              <div className="w-10 border-r border-gray-200 bg-gray-50 flex flex-col items-center py-4 gap-4 transition-all">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="w-8 h-8 p-0 rotate-180 text-gray-500 hover:text-gray-900"
                  title="Expand Sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="h-px w-6 bg-gray-200" />
                <div className="[writing-mode:vertical-rl] text-[10px] font-bold text-gray-400 uppercase tracking-widest select-none py-2">
                  Problem Description
                </div>
              </div>
            )}

            {/* DRAGGABLE HANDLE */}
            {!isSidebarCollapsed && (
              <ResizableHandle className="w-1 flex items-center justify-center px-1 cursor-col-resize select-none">
                <div className="flex flex-col items-center justify-center gap-1 h-22">
                  <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                  <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                  <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                  <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                  <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                  <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                </div>
              </ResizableHandle>
            )}

            {/* RIGHT PANEL — Editor + Output */}
            <ResizablePanel defaultSize={65} minSize={30}>
              <div className="h-full overflow-hidden pl-1 flex flex-col">
                {/* VERTICAL RESIZE GROUP (editor + output) */}
                <ResizablePanelGroup direction="vertical" className="flex-1 overflow-hidden">

                  {/* EDITOR PANEL */}
                  <ResizablePanel defaultSize={showOutput ? 65 : 100} minSize={30} maxSize={100}>
                    <div className="h-full flex flex-col overflow-hidden">
                      <CodeEditor
                        value={code}
                        onChange={setCode}
                        language={language}
                        onLanguageChange={setLanguage}
                        height="100%"
                        onShowExamples={() => setShowExamples(true)}
                        onToggleAiChat={handleToggleAiChat}
                        onFullscreenChange={setIsEditorFullscreen}
                        isAiChatOpen={showAiChat}
                        isFullscreen={false}
                      />
                    </div>
                  </ResizablePanel>

                  {/* DIVIDER */}
                  {showOutput && (
                    <ResizableHandle className="h-3 cursor-row-resize flex items-center justify-center bg-gray-100 hover:bg-gray-200">
                      <div className="w-10 h-1 bg-gray-400 rounded-full" />
                    </ResizableHandle>
                  )}

                  {/* OUTPUT PANEL */}
                  {showOutput && (
                    <ResizablePanel defaultSize={35} minSize={15} maxSize={70}>
                      <div className="h-full overflow-hidden border-t border-gray-200 bg-white">
                        <Tabs value={activeBottomTab} onValueChange={(v: any) => setActiveBottomTab(v)} className="h-full flex flex-col">
                          <TabsList className="flex-shrink-0 justify-between h-10 bg-gray-50 border-b px-2">
                            <div className="flex items-center gap-1">
                              <TabsTrigger value="output" className="h-8 text-[11px] flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold uppercase tracking-tight">
                                <Terminal className="h-3 w-3" /> Console
                              </TabsTrigger>
                              <TabsTrigger value="testcases" className="h-8 text-[11px] flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold uppercase tracking-tight">
                                <FlaskConical className="h-3 w-3" /> Test Cases
                              </TabsTrigger>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => {
                                  setShowOutput(true);
                                  setActiveBottomTab('output');
                                  runCode();
                                }}
                                disabled={isRunning || isSubmitting}
                                size="sm"
                                variant="outline"
                                className="h-7 border-gray-300 text-gray-700 text-[10px] font-bold px-3 uppercase"
                              >
                                <Play className="h-3 w-3 mr-1" /> Run
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowOutput(true);
                                  setActiveBottomTab('output');
                                  submitSolution();
                                }}
                                disabled={isRunning || isSubmitting}
                                size="sm"
                                className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 uppercase"
                              >
                                <Send className="h-3 w-3 mr-1" /> Submit
                              </Button>
                              <div className="w-px h-5 bg-gray-200 mx-1" />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowOutput(false)}
                                className="h-7 w-7 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TabsList>
                          <TabsContent value="output" className="flex-1 overflow-auto p-4 m-0">
                            <div className="space-y-6">
                              {/* Execution Metrics */}

                              {executionMetrics && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                    Execution Metrics
                                  </h4>
                                  <div className="grid grid-cols-4 gap-3">
                                    {executionMetrics.execution_time !== undefined && (
                                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Clock className="h-4 w-4 text-blue-600" />
                                          <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Time</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-800">
                                          {typeof executionMetrics.execution_time === 'number'
                                            ? executionMetrics.execution_time.toFixed(4)
                                            : executionMetrics.execution_time}
                                          <span className="text-sm font-normal text-gray-500 ml-1">ms</span>
                                        </div>
                                      </div>
                                    )}
                                    {executionMetrics.memory_usage !== undefined && (
                                      <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 p-4 rounded-xl border border-purple-100">
                                        <div className="flex items-center gap-2 mb-1">
                                          <MemoryStick className="h-4 w-4 text-purple-600" />
                                          <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Memory</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-800">
                                          {(executionMetrics.memory_usage / 1024).toFixed(2)}
                                          <span className="text-sm font-normal text-gray-500 ml-1">KB</span>
                                        </div>
                                      </div>
                                    )}
                                    {executionMetrics.status && (
                                      <div className={`p-4 rounded-xl border ${executionMetrics.status === 'completed'
                                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                                        : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          {executionMetrics.status === 'completed' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                          )}
                                          <span className={`text-xs font-medium uppercase tracking-wide ${executionMetrics.status === 'completed' ? 'text-green-600' : 'text-red-600'
                                            }`}>Status</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-800 capitalize">
                                          {executionMetrics.status}
                                        </div>
                                      </div>
                                    )}
                                    {executionMetrics.plagiarism_score !== undefined && (
                                      <div className={`p-4 rounded-xl border ${executionMetrics.plagiarism_score > 0.7
                                        ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100'
                                        : 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <Shield className={`h-4 w-4 ${executionMetrics.plagiarism_score > 0.7 ? 'text-red-600' : 'text-teal-600'}`} />
                                          <span className={`text-xs font-medium uppercase tracking-wide ${executionMetrics.plagiarism_score > 0.7 ? 'text-red-600' : 'text-teal-600'}`}>Plagiarism</span>
                                        </div>
                                        <div className="text-lg font-bold text-gray-800">
                                          {(executionMetrics.plagiarism_score * 100).toFixed(0)}%
                                          <span className={`text-xs font-medium ml-2 ${executionMetrics.plagiarism_score > 0.7 ? 'text-red-500' : 'text-teal-500'}`}>
                                            {executionMetrics.plagiarism_score > 0.7 ? 'Flagged' : 'Clear'}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              )}

                              {/* 3. Console Output - Third */}
                              {output && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-gray-600" />
                                    Console Output
                                  </h4>
                                  <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-sm whitespace-pre-wrap overflow-auto font-mono border border-gray-800 shadow-inner">
                                    {output}
                                  </pre>
                                </div>
                              )}

                              {/* 4. Test Results - Last */}
                              {testResults && Array.isArray(testResults.results) && (
                                <div>
                                  {/* Summary Header */}
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-gray-600" />
                                      Test Results
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${testResults.passed === testResults.total
                                        ? 'bg-green-100 text-green-700'
                                        : testResults.passed > 0
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                        }`}>
                                        {testResults.passed}/{testResults.total} Passed
                                      </span>
                                    </div>
                                  </div>

                                  {/* Individual Test Cards */}
                                  <div className="grid gap-4">
                                    {testResults.results.map((result: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className={`rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all ${result.passed
                                          ? 'border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30'
                                          : 'border-red-200 bg-gradient-to-br from-red-50/50 to-rose-50/30'
                                          }`}
                                      >
                                        {/* Card Header */}
                                        <div className={`px-4 py-3 flex items-center justify-between ${result.passed ? 'bg-green-100/40' : 'bg-red-100/40'
                                          }`}>
                                          <div className="flex items-center gap-3">
                                            {result.passed ? (
                                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                                <CheckCircle2 className="h-5 w-5 text-white" />
                                              </div>
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                                                <XCircle className="h-5 w-5 text-white" />
                                              </div>
                                            )}
                                            <div>
                                              <span className="font-semibold text-gray-800">Test #{idx + 1}</span>
                                              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${result.passed
                                                ? 'bg-green-200/80 text-green-800'
                                                : 'bg-red-200/80 text-red-800'
                                                }`}>
                                                {result.passed ? 'Passed' : 'Failed'}
                                              </span>
                                            </div>
                                          </div>
                                          {result.execution_time !== undefined && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500 bg-white/60 px-2 py-1 rounded-full">
                                              <Clock className="h-3 w-3" />
                                              <span>{typeof result.execution_time === 'number' ? result.execution_time.toFixed(4) : result.execution_time} ms</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-4 space-y-4">
                                          {/* Input */}
                                          <div>
                                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                              Input
                                            </div>
                                            <pre className="bg-white/80 backdrop-blur-sm p-3 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto border border-gray-100 font-mono text-gray-700 shadow-inner">
                                              {result.input}
                                            </pre>
                                          </div>

                                          {/* Expected vs Actual */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                Expected Output
                                              </div>
                                              <pre className="bg-white/80 backdrop-blur-sm p-3 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto border border-gray-100 font-mono text-gray-700 shadow-inner">
                                                {result.expected_output}
                                              </pre>
                                            </div>
                                            <div>
                                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${result.passed ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                                Actual Output
                                              </div>
                                              <pre className={`bg-white/80 backdrop-blur-sm p-3 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto border font-mono shadow-inner ${result.passed
                                                ? 'border-gray-100 text-gray-700'
                                                : 'border-red-200 text-red-700'
                                                }`}>
                                                {result.actual_output}
                                              </pre>
                                            </div>
                                          </div>

                                          {/* Error Message (only if present) */}
                                          {result.error_message && result.error_message !== 'N/A' && (
                                            <div>
                                              <div className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                Error Message
                                              </div>
                                              <pre className="bg-red-50 p-3 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto border border-red-200 font-mono text-red-700">
                                                {result.error_message}
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          <TabsContent value="testcases" className="flex-1 overflow-auto p-4 m-0">
                            <CustomTestCaseManager
                              customTestCases={customTestCases}
                              onTestCasesChange={setCustomTestCases}
                            />
                          </TabsContent>
                        </Tabs>
                      </div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>

                {/* Minimal Console Bar when collapsed */}
                {!showOutput && (
                  <div className="flex-shrink-0 h-12 bg-gray-50 border-t flex items-center justify-between px-6 shadow-sm">
                    <Button
                      variant="ghost"
                      className="h-9 text-[11px] font-bold text-gray-500 flex items-center gap-2.5 hover:bg-gray-100 uppercase tracking-widest transition-all"
                      onClick={() => {
                        setShowOutput(true);
                        setActiveBottomTab('output');
                      }}
                    >
                      <Terminal className="h-4 w-4" />
                      Console Output
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => {
                          setShowOutput(true);
                          setActiveBottomTab('testcases');
                        }}
                        variant="ghost"
                        className="h-9 text-[11px] font-bold text-gray-500 flex items-center gap-2.5 hover:bg-gray-100 uppercase tracking-widest transition-all"
                      >
                        <FlaskConical className="h-4 w-4" />
                        Test Cases
                      </Button>
                      <div className="w-px h-6 bg-gray-200 mx-1" />
                      <Button
                        onClick={() => {
                          setShowOutput(true);
                          setActiveBottomTab('output');
                          runCode();
                        }}
                        disabled={isRunning || isSubmitting}
                        size="sm"
                        variant="outline"
                        className="h-8 border-gray-300 text-[10px] font-bold px-4 uppercase text-gray-700 hover:bg-white hover:border-gray-400 transition-all active:scale-95"
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" /> Run
                      </Button>
                      <Button
                        onClick={() => {
                          setShowOutput(true);
                          setActiveBottomTab('output');
                          submitSolution();
                        }}
                        disabled={isRunning || isSubmitting}
                        size="sm"
                        className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-4 uppercase shadow-sm transition-all active:scale-95"
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" /> Submit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            {/* AI Chat Sidebar in Split View */}
            {showAiChat && (
              <>
                <ResizableHandle className="w-1.5 bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className="block w-1 h-1 bg-purple-400 rounded-full" />
                    <span className="block w-1 h-1 bg-purple-400 rounded-full" />
                    <span className="block w-1 h-1 bg-purple-400 rounded-full" />
                  </div>
                </ResizableHandle>
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                  <div className="h-full border-l border-gray-200 bg-white shadow-lg overflow-hidden flex flex-col">
                    <AIChatContainer
                      className="w-full flex-1"
                      contextGetter={getProblemContext}
                      welcomeMessage={`Hi! I'm your AI Buddy. Ready to help you with "${problem.title}". Ask me anything!`}
                      persistenceKey={chatSessionId}
                      chatTitle={`${problem.title} - AI Buddy`}
                      onNewChat={() => setChatSessionId(`chat-${problem.id}-${crypto.randomUUID()}`)}
                    />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      )}

      {/* 3) Fullscreen editor mode */}
      {isEditorFullscreen && (
        <div className={`${isEmbedded ? 'absolute inset-0 z-10' : 'fixed inset-0 z-[9999]'} bg-white flex flex-col overflow-hidden`}>
          {/* Fullscreen Header - Hidden if embedded since the page has its own header */}
          {!isEmbedded && (
            <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between shadow-md shrink-0 relative z-[50]">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <h2 className="text-xl font-bold text-gray-900 truncate">{problem.title}</h2>
                <Badge className={`px-3 py-1 rounded shrink-0 hidden md:inline-flex ${difficultyBadgeClass}`}>
                  {problem.difficulty}
                </Badge>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Fullscreen Resizable Panels */}
            <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
              {/* Main Area (Editor + Output) */}
              <ResizablePanel defaultSize={showAiChat ? 70 : 100} minSize={30}>
                <div className="h-full flex flex-col overflow-hidden">
                  <ResizablePanelGroup direction="vertical" className="flex-1 overflow-hidden">
                    {/* Editor Panel */}
                    <ResizablePanel defaultSize={showOutput ? 60 : 100} minSize={30}>
                      <div className="h-full bg-white">
                        <CodeEditor
                          value={code}
                          onChange={setCode}
                          language={language}
                          onLanguageChange={setLanguage}
                          height="100%"
                          onShowExamples={() => setShowExamples(true)}
                          onToggleAiChat={handleToggleAiChat}
                          onFullscreenChange={setIsEditorFullscreen}
                          isAiChatOpen={showAiChat}
                          isFullscreen={true}
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
                      <ResizablePanel defaultSize={40} minSize={20}>
                        <div className="h-full bg-white flex flex-col overflow-hidden border-t">
                          <Tabs value={activeBottomTab} onValueChange={(v: any) => setActiveBottomTab(v)} className="h-full flex flex-col">
                            <TabsList className="flex-shrink-0 justify-between h-12 bg-gray-50 border-b px-6">
                              <div className="flex items-center gap-4">
                                <TabsTrigger value="output" className="h-9 px-4 text-sm flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase tracking-wide">
                                  <Terminal className="h-4 w-4" /> Console Output
                                </TabsTrigger>
                                <TabsTrigger value="testcases" className="h-9 px-4 text-sm flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase tracking-wide">
                                  <FlaskConical className="h-4 w-4" /> Test Cases
                                </TabsTrigger>
                              </div>
                              <div className="flex items-center gap-4">
                                <Button
                                  onClick={() => {
                                    setShowOutput(true);
                                    setActiveBottomTab('output');
                                    runCode();
                                  }}
                                  disabled={isRunning || isSubmitting}
                                  size="default"
                                  variant="outline"
                                  className="h-9 border-gray-300 text-gray-800 text-xs font-bold px-5 uppercase"
                                >
                                  <Play className="h-4 w-4 mr-2" /> Run
                                </Button>
                                <Button
                                  onClick={() => {
                                    setShowOutput(true);
                                    setActiveBottomTab('output');
                                    submitSolution();
                                  }}
                                  disabled={isRunning || isSubmitting}
                                  size="default"
                                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 uppercase"
                                >
                                  <Send className="h-4 w-4 mr-2" /> Submit
                                </Button>
                                <div className="w-px h-6 bg-gray-200 mx-2" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setShowOutput(false)}
                                  className="h-9 w-9 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>
                            </TabsList>
                            <TabsContent value="output" className="flex-1 overflow-auto p-6 m-0">
                              <div className="max-w-5xl mx-auto space-y-8 pb-12">
                                {executionMetrics && (
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                      <Zap className="h-4 w-4 text-amber-500" />
                                      Execution Metrics
                                    </h4>
                                    <div className="grid grid-cols-4 gap-4">
                                      {executionMetrics.execution_time !== undefined && (
                                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm">
                                          <div className="text-xs font-medium text-blue-600 uppercase mb-1">Time</div>
                                          <div className="text-xl font-bold text-gray-900">{typeof executionMetrics.execution_time === 'number' ? executionMetrics.execution_time.toFixed(4) : executionMetrics.execution_time} ms</div>
                                        </div>
                                      )}
                                      {executionMetrics.memory_usage !== undefined && (
                                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 shadow-sm">
                                          <div className="text-xs font-medium text-purple-600 uppercase mb-1">Memory</div>
                                          <div className="text-xl font-bold text-gray-900">{(executionMetrics.memory_usage / 1024).toFixed(4)} KB</div>
                                        </div>
                                      )}
                                      {executionMetrics.status && (
                                        <div className={`p-4 rounded-xl border shadow-sm ${executionMetrics.status === 'completed'
                                          ? 'bg-green-50/50 border-green-100'
                                          : 'bg-amber-50/50 border-amber-100'
                                          }`}>
                                          <div className={`text-xs font-medium uppercase mb-1 ${executionMetrics.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>Status</div>
                                          <div className={`text-xl font-bold capitalize ${executionMetrics.status === 'completed' ? 'text-green-900' : 'text-amber-900'}`}>{executionMetrics.status}</div>
                                        </div>
                                      )}
                                      {executionMetrics.plagiarism_score !== undefined && (
                                        <div className={`p-4 rounded-xl border shadow-sm ${executionMetrics.plagiarism_score > 0.7
                                          ? 'bg-red-50/50 border-red-100'
                                          : 'bg-teal-50/50 border-teal-100'
                                          }`}>
                                          <div className={`text-xs font-medium uppercase mb-1 ${executionMetrics.plagiarism_score > 0.7 ? 'text-red-600' : 'text-teal-600'}`}>Plagiarism</div>
                                          <div className="text-xl font-bold text-gray-900">
                                            {(executionMetrics.plagiarism_score * 100).toFixed(0)}%
                                            <span className={`text-xs font-medium ml-2 ${executionMetrics.plagiarism_score > 0.7 ? 'text-red-500' : 'text-teal-500'}`}>
                                              {executionMetrics.plagiarism_score > 0.7 ? 'Flagged' : 'Clear'}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                )}

                                {testResults && Array.isArray(testResults.results) && (
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-gray-600" />
                                      Test Results ({testResults.passed}/{testResults.total})
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                      {testResults.results.map((result: any, idx: number) => (
                                        <div key={idx} className={`border rounded-xl overflow-hidden shadow-sm ${result.passed ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/20'}`}>
                                          <div className={`px-4 py-2 border-b flex justify-between items-center ${result.passed ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                                            <div className="flex items-center gap-2">
                                              {result.passed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                                              <span className="font-bold text-sm">Case #{idx + 1}</span>
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${result.passed ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                              {result.passed ? 'Passed' : 'Failed'}
                                            </span>
                                          </div>
                                          <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                                            <div className="space-y-1">
                                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Input</div>
                                              <pre className="text-xs bg-white p-2 border rounded font-mono text-gray-700 overflow-x-auto shadow-inner">{result.input}</pre>
                                            </div>
                                            <div className="space-y-1">
                                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expected</div>
                                              <pre className="text-xs bg-white p-2 border rounded font-mono text-gray-700 overflow-x-auto shadow-inner">{result.expected_output}</pre>
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Actual Output</div>
                                              <pre className={`text-xs p-2 border rounded font-mono overflow-x-auto shadow-inner ${result.passed
                                                ? 'bg-white text-gray-700'
                                                : 'bg-red-50/30 border-red-100 text-red-700'
                                                }`}>
                                                {result.actual_output}
                                              </pre>
                                            </div>

                                            {/* Error Message (only if present) */}
                                            {result.error_message && result.error_message !== 'N/A' && (
                                              <div className="col-span-2">
                                                <div className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                  Error Message
                                                </div>
                                                <pre className="bg-red-50 p-3 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto border border-red-200 font-mono text-red-700">
                                                  {result.error_message}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                            <TabsContent value="testcases" className="flex-1 overflow-auto p-6 m-0">
                              <div className="max-w-5xl mx-auto">
                                <CustomTestCaseManager
                                  customTestCases={customTestCases}
                                  onTestCasesChange={setCustomTestCases}
                                />
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </ResizablePanel>
                    )}
                  </ResizablePanelGroup>

                  {/* Minimal Console Bar for Fullscreen when collapsed */}
                  {!showOutput && (
                    <div className="flex-shrink-0 h-14 bg-gray-50 border-t flex items-center justify-between px-10 shadow-inner">
                      <Button
                        variant="ghost"
                        className="h-10 text-sm font-bold text-gray-500 flex items-center gap-3 hover:bg-gray-100 uppercase tracking-widest"
                        onClick={() => {
                          setShowOutput(true);
                          setActiveBottomTab('output');
                        }}
                      >
                        <Terminal className="h-5 w-5" />
                        Console Output
                      </Button>
                      <div className="flex items-center gap-6">
                        <Button
                          onClick={() => {
                            setShowOutput(true);
                            setActiveBottomTab('testcases');
                          }}
                          variant="ghost"
                          className="h-10 text-sm font-bold text-gray-500 flex items-center gap-3 hover:bg-gray-100 uppercase tracking-widest"
                        >
                          <FlaskConical className="h-5 w-5" />
                          Test Cases
                        </Button>
                        <div className="w-px h-8 bg-gray-200 mx-2" />
                        <Button
                          onClick={() => {
                            setShowOutput(true);
                            setActiveBottomTab('output');
                            runCode();
                          }}
                          disabled={isRunning || isSubmitting}
                          size="default"
                          variant="outline"
                          className="h-10 border-gray-300 text-sm font-bold px-8 uppercase text-gray-800 hover:bg-white"
                        >
                          <Play className="h-5 w-5 mr-2" /> Run
                        </Button>
                        <Button
                          onClick={() => {
                            setShowOutput(true);
                            setActiveBottomTab('output');
                            submitSolution();
                          }}
                          disabled={isRunning || isSubmitting}
                          size="default"
                          className="h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-8 uppercase shadow-lg transition-all active:scale-95"
                        >
                          <Send className="h-5 w-5 mr-2" /> Submit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              {/* AI Chat Sidebar in Fullscreen */}
              {showAiChat && (
                <>
                  <ResizableHandle className="w-1.5 bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                    </div>
                  </ResizableHandle>
                  <ResizablePanel defaultSize={30} minSize={20}>
                    <div className="h-full bg-white border-l border-gray-100 overflow-hidden">
                      <AIChatContainer
                        className="w-full h-full"
                        contextGetter={getProblemContext}
                        welcomeMessage="I'm active in fullscreen mode! Ask any questions about the problem or your code."
                        persistenceKey={chatSessionId}
                        chatTitle={`${problem.title} - AI Buddy`}
                        onNewChat={() => setChatSessionId(`chat-${problem.id}-${crypto.randomUUID()}`)}
                      />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
      )}

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

export default ProblemSolving;