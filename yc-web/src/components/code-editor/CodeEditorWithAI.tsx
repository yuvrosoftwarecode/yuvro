// AI-enhanced code editor that wraps CodeEditor with problem descriptions and AI chat functionality.
// For simpler use cases without AI features, use CodeEditor.tsx instead.
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, BrainCircuit, Target, Code, PanelsRightBottom, Layout } from 'lucide-react';
import CodeEditor, { CodeEditorHandle } from './CodeEditor';
import type { Course, Topic, CodingProblem } from '@/pages/student/CodePractice';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import AIChatContainer from '@/components/student/Learn/AIChatWidget/AIChatContainer';
import codeEditorService from '@/services/codeEditorService';

interface CodeEditorWithAIProps {
  problem: CodingProblem;
  course: Course;
  topic: Topic;
  subtopicId?: string;
  onBack: () => void;
  onViewAnalytics?: () => void;
  initialFullscreen?: boolean;
  initialEditorOpen?: boolean;
  initialAiChatOpen?: boolean;
  initialSidebarCollapsed?: boolean;
  showBreadcrumb?: boolean;
  isEmbedded?: boolean;
  showAiBuddy?: boolean;
  showProblemDescription?: boolean;
  codeSubmissionType?: 'learn' | 'practice';
  onSubmissionComplete?: (problemId: string, success: boolean, submissionResult?: any) => void;
}

export interface CodeEditorWithAIHandle {
  openExampleGallery: () => void;
  getLanguage: () => string;
}

const CodeEditorWithAI = forwardRef<CodeEditorWithAIHandle, CodeEditorWithAIProps>(({
  problem,
  course,
  topic,
  subtopicId,
  onBack,
  initialFullscreen = false,
  initialEditorOpen = false,
  initialAiChatOpen = false,
  initialSidebarCollapsed = false,
  showBreadcrumb = true,
  isEmbedded = false,
  showAiBuddy = true,
  showProblemDescription = true,
  codeSubmissionType = 'practice',
  onSubmissionComplete
}, ref) => {
  // UI state
  const [editorOpen, setEditorOpen] = useState(initialEditorOpen);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(initialFullscreen);
  const [showAiChat, setShowAiChat] = useState(initialAiChatOpen);
  const [chatSessionId, setChatSessionId] = useState(() => `chat-${problem.id}-${crypto.randomUUID()}`);

  // Lifted state to persist across view switches
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [apiTemplates, setApiTemplates] = useState<Record<string, string>>({});

  // Custom drag-based resizing (like StudentVideos)
  const [problemPanelWidth, setProblemPanelWidth] = useState(35); // % width for problem description
  const [aiChatPanelWidth, setAiChatPanelWidth] = useState(30); // % width for AI chat
  const [dragMode, setDragMode] = useState<'problem' | 'ai-chat' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Code editor ref
  const codeEditorRef = useRef<CodeEditorHandle>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await codeEditorService.getSupportedLanguagesAndTemplates();
        const templateMap: Record<string, string> = {};
        if (data.details) {
          Object.entries(data.details).forEach(([lang, config]: [string, any]) => {
            templateMap[lang] = config.template;
          });
        }
        setApiTemplates(templateMap);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, []);

  const handleToggleAiChat = () => {
    const nextShow = !showAiChat;
    setShowAiChat(nextShow);
    if (nextShow) {
      setIsSidebarCollapsed(true);
    }
  };

  // Custom drag handlers for resizing (like StudentVideos)
  const startProblemDrag = () => setDragMode('problem');
  const startAiChatDrag = () => setDragMode('ai-chat');
  const stopDrag = () => setDragMode(null);

  const onDrag = (e: MouseEvent) => {
    if (!dragMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const containerWidth = rect.width;

    if (dragMode === 'problem') {
      const newWidth = (relativeX / containerWidth) * 100;
      if (newWidth >= 15 && newWidth <= 60) {
        setProblemPanelWidth(newWidth);
      }
    } else if (dragMode === 'ai-chat') {
      // AI chat resize - calculate from right edge
      const rightEdgeX = containerWidth - relativeX;
      const newWidth = (rightEdgeX / containerWidth) * 100;
      if (newWidth >= 20 && newWidth <= 50) {
        setAiChatPanelWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    const handleDrag = (e: MouseEvent) => onDrag(e);
    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", stopDrag);

    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [dragMode]);


  // Generate a unique session key every time the problem is loaded to start fresh
  useEffect(() => {
    setChatSessionId(`chat-${problem.id}-${crypto.randomUUID()}`);
  }, [problem.id]);

  // Auto-enable AI Buddy in fullscreen mode
  useEffect(() => {
    if (isEditorFullscreen && showAiBuddy) {
      setShowAiChat(true);
      setIsSidebarCollapsed(true);
    }
  }, [isEditorFullscreen, showAiBuddy]);

  // Handle fullscreen changes from CodeEditor
  const handleFullscreenChange = (isFullscreen: boolean) => {
    setIsEditorFullscreen(isFullscreen);
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    openExampleGallery: () => codeEditorRef.current?.openExampleGallery(),
    getLanguage: () => codeEditorRef.current?.getLanguage() || 'python'
  }));

  // Difficulty badge style
  const getDifficultyStyles = (difficulty: string) => {
    const diff = difficulty.toLowerCase();
    if (diff === 'easy') return 'bg-green-50 text-green-700 border-green-100';
    if (diff === 'medium') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (diff === 'hard') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-gray-50 text-gray-700 border-gray-100';
  };

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

Current Code (${codeEditorRef.current?.getLanguage() || 'python'}):
${codeEditorRef.current?.getCode() || ''}
    `.trim();
  };

  return (
    <div className={`${isEditorFullscreen ? (isEmbedded ? 'h-full w-full bg-white relative flex flex-col' : 'h-screen bg-white') : 'flex-1 flex flex-col p-6 box-border bg-slate-50/50 font-sans overflow-hidden'}`}>

      {/* Premium Header / Breadcrumb */}
      {!isEditorFullscreen && (
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-9 w-9 p-0 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-gray-500 hover:text-gray-900"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="h-4 w-px bg-gray-300 hidden sm:block mx-1" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">
                {topic.name}
              </p>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900 leading-none">{problem.title}</h2>
                <Badge variant="outline" className={`text-[9px] font-black uppercase px-1.5 py-0 border rounded-[4px] ${getDifficultyStyles(problem.difficulty)}`}>
                  {problem.difficulty}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-right pr-4 border-r border-gray-200">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                  <Target className="w-3 h-3 text-indigo-500" /> goal
                </div>
                <p className="text-xs font-bold text-gray-900 leading-none">{problem.score} Points</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1) Problem-only view (editor hidden) */}
      {showProblemDescription && !editorOpen && !isEditorFullscreen && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-8 bg-gray-50/50 border-b border-gray-100">
              <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                    <BrainCircuit className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              <div className="max-w-4xl mx-auto space-y-10">
                {/* Description */}
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5 text-indigo-500" /> Challenge Overview
                  </h3>
                  <div className="prose prose-slate max-w-none">
                    <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">{problem.description}</p>
                  </div>
                </div>

                {/* Input/Output Formats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {problem.inputFormat && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Input Format</h4>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{problem.inputFormat}</p>
                    </div>
                  )}
                  {problem.outputFormat && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Output Format</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{problem.outputFormat}</p>
                    </div>
                  )}
                </div>

                {/* Examples */}
                {problem.examples && problem.examples.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Examples</h3>
                    <div className="space-y-4">
                      {problem.examples.map((ex: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-all">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Input</div>
                              <pre className="bg-slate-50 p-4 rounded-xl text-sm font-mono text-indigo-600 border border-slate-100">{ex.input}</pre>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Output</div>
                              <pre className="bg-slate-50 p-4 rounded-xl text-sm font-mono text-emerald-600 border border-slate-100">{ex.output}</pre>
                            </div>
                          </div>
                          {ex.explanation && (
                            <p className="text-gray-500 text-sm mt-4 italic">
                              <strong>Note:</strong> {ex.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Launch Workspace Button - Centered below question */}
          <div className="flex justify-center mt-8">
            <Button
              onClick={() => setEditorOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 font-bold px-8 py-3 h-12 transition-all active:scale-95 text-sm uppercase tracking-widest hover:shadow-xl"
            >
              <Code className="w-5 h-5 mr-2" />
              Launch Workspace
            </Button>
          </div>
        </div>
      )}

      {/* 2) Split view when editor is open (custom drag-based resizing) */}
      {editorOpen && !isEditorFullscreen && (
        <div
          ref={containerRef}
          className={`flex-1 min-h-0 overflow-hidden flex relative gap-3 ${dragMode ? 'select-none' : ''}`}
        >
          {/* Collapsed Sidebar */}
          {showProblemDescription && isSidebarCollapsed && (
            <div className="w-10 shrink-0 border border-gray-200 bg-white rounded-2xl flex flex-col items-center py-6 gap-6 transition-all shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-8 h-8 p-0 rotate-180 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                title="Expand Overview"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="[writing-mode:vertical-rl] text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] select-none py-2 cursor-pointer hover:text-indigo-600 transition-all" onClick={() => setIsSidebarCollapsed(false)}>
                Task Overview
              </div>
            </div>
          )}

          {/* LEFT PANEL — Problem Description */}
          {showProblemDescription && !isSidebarCollapsed && (
            <div
              className={`h-full shrink-0 ${dragMode ? 'pointer-events-none' : ''}`}
              style={{ width: `calc(${problemPanelWidth}% - 6px)` }}
            >
              <div className="h-full font-sans overflow-hidden">
                <Card className="border border-gray-200 shadow-sm bg-white flex flex-col h-full rounded-2xl overflow-hidden">
                  <CardHeader className="p-4 bg-gray-50/50 border-b border-gray-100 flex-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
                          <Layout className="w-3.5 h-3.5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{problem.title}</CardTitle>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSidebarCollapsed(true)}
                        className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white">
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Task</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{problem.description}</p>
                      </div>

                      {problem.examples && problem.examples.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Example</h4>
                          <div className="space-y-3">
                            {problem.examples.slice(0, 1).map((ex: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-gray-100">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Input</div>
                                    <code className="text-[11px] font-mono text-indigo-600">{ex.input}</code>
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Output</div>
                                    <code className="text-[11px] font-mono text-emerald-600">{ex.output}</code>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-50">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Sample Scenarios</h4>
                        <div className="space-y-4">
                          {(problem.test_cases_basic || []).map((tc: any, i: number) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Scenario 0{i + 1}</div>
                              <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-bold text-gray-400 uppercase">Input</span>
                                  <pre className="bg-gray-50 p-2 rounded-lg text-[10px] overflow-x-auto font-mono text-gray-700 leading-tight">
                                    {typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input, null, 2)}
                                  </pre>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-bold text-gray-400 uppercase">Expectation</span>
                                  <pre className="bg-gray-50 p-2 rounded-lg text-[10px] overflow-x-auto font-mono text-emerald-600 leading-tight">
                                    {typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* PROBLEM RESIZE HANDLE */}
          {showProblemDescription && !isSidebarCollapsed && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                startProblemDrag();
              }}
              className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
            >
              <div className="w-1 h-8 bg-gray-300 rounded-full shadow-sm" />
            </div>
          )}

          {/* CENTER PANEL — Editor + Output */}
          <div
            className={`h-full flex-1 min-w-0 ${dragMode ? 'pointer-events-none' : ''}`}
          >
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                <CodeEditor
                  ref={codeEditorRef}
                  initialCode={code}
                  onCodeChange={setCode}
                  initialLanguage={language}
                  onLanguageChange={setLanguage}
                  problemTitle={problem.title}
                  problemId={problem.id}
                  courseId={course.id}
                  topicId={topic.id}
                  subtopicId={subtopicId}
                  testCases={problem.test_cases_basic || []}
                  showTestCases={true}
                  allowCustomTestCases={true}
                  showFullscreenButton={true}
                  showExamplesButton={true}
                  onToggleAiChat={showAiBuddy ? handleToggleAiChat : undefined}
                  isAiChatOpen={showAiChat}
                  onFullscreenChange={handleFullscreenChange}
                  isFullscreen={isEditorFullscreen}
                  className="h-full"
                  templates={apiTemplates}
                  codeSubmissionType={codeSubmissionType}
                  onSubmissionComplete={onSubmissionComplete ? (result) => onSubmissionComplete(problem.id, result?.test_results?.success || false, result) : undefined}
                />
              </div>
            </div>
          </div>

          {/* AI CHAT RESIZE HANDLE */}
          {showAiBuddy && showAiChat && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                startAiChatDrag();
              }}
              className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
            >
              <div className="w-1 h-8 bg-gray-300 rounded-full shadow-sm" />
            </div>
          )}

          {/* RIGHT PANEL — AI Chat */}
          {showAiBuddy && showAiChat && (
            <div
              className={`h-full shrink-0 ${dragMode ? 'pointer-events-none' : ''}`}
              style={{ width: `calc(${aiChatPanelWidth}% - 6px)` }}
            >
              <div className="h-full min-h-0 border border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden flex flex-col">
                <AIChatContainer
                  className="w-full flex-1"
                  contextGetter={getProblemContext}
                  welcomeMessage={`Hi! I'm your AI Buddy. Ready to help you with "${problem.title}". Ask me anything!`}
                  persistenceKey={chatSessionId}
                  chatTitle={`${problem.title} - AI Buddy`}
                  onNewChat={() => setChatSessionId(`chat-${problem.id}-${crypto.randomUUID()}`)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3) Fullscreen editor mode */}
      {isEditorFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden">
          {/* Fullscreen Header - Elevated AI Workspace Design */}
          {!isEmbedded && (
            <div className="bg-white border-b border-gray-200 px-8 h-20 flex items-center justify-between shadow-sm shrink-0 relative z-[50]">
              <div className="flex items-center gap-6 min-w-0 flex-1">
                <Button variant="ghost" size="sm" onClick={() => handleFullscreenChange(false)} className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all text-gray-500 hover:text-gray-900">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="h-8 w-px bg-gray-200 hidden md:block" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] leading-none mb-1.5 flex items-center gap-2">
                    <BrainCircuit className="w-3.5 h-3.5" /> AI Workspace
                  </p>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900 truncate leading-none">{problem.title}</h2>
                    <Badge variant="outline" className={`px-2 py-0.5 rounded-[6px] text-[10px] font-black uppercase shrink-0 border-2 ${getDifficultyStyles(problem.difficulty)}`}>
                      {problem.difficulty}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="hidden lg:flex items-center gap-6 pr-6 border-r border-gray-200">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      <Target className="w-3.5 h-3.5 text-indigo-500" /> potential
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-none">{problem.score} Points</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      <Layout className="w-3.5 h-3.5 text-blue-500" /> Environment
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-none capitalize">{language}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => handleFullscreenChange(false)}
                  className="h-10 px-5 gap-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border border-transparent hover:border-gray-100"
                >
                  <ChevronLeft className="w-4 h-4" /> Exit
                </Button>
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            className={`flex-1 flex overflow-hidden p-4 gap-4 bg-gray-50 ${dragMode ? 'select-none' : ''}`}
          >
            {/* Main Area (Editor + Output) */}
            <div className={`h-full flex-1 min-w-0 ${dragMode ? 'pointer-events-none' : ''}`}>
              <div className="h-full flex flex-col overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
                <CodeEditor
                  ref={codeEditorRef}
                  initialCode={code}
                  onCodeChange={setCode}
                  initialLanguage={language}
                  onLanguageChange={setLanguage}
                  problemTitle={problem.title}
                  problemId={problem.id}
                  courseId={course.id}
                  topicId={topic.id}
                  subtopicId={subtopicId}
                  testCases={problem.test_cases_basic || []}
                  showTestCases={true}
                  allowCustomTestCases={true}
                  showFullscreenButton={true}
                  showExamplesButton={true}
                  onToggleAiChat={showAiBuddy ? handleToggleAiChat : undefined}
                  isAiChatOpen={showAiChat}
                  onFullscreenChange={handleFullscreenChange}
                  isFullscreen={isEditorFullscreen}
                  className="h-full"
                  templates={apiTemplates}
                  codeSubmissionType={codeSubmissionType}
                  onSubmissionComplete={onSubmissionComplete ? (result) => onSubmissionComplete(problem.id, result?.test_results?.success || false, result) : undefined}
                />
              </div>
            </div>

            {/* AI Chat Resize Handle */}
            {showAiBuddy && showAiChat && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  startAiChatDrag();
                }}
                className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
              >
                <div className="w-1 h-8 bg-gray-300 rounded-full shadow-sm" />
              </div>
            )}

            {/* AI Chat Sidebar */}
            {showAiBuddy && showAiChat && (
              <div
                className={`h-full shrink-0 ${dragMode ? 'pointer-events-none' : ''}`}
                style={{ width: `calc(${aiChatPanelWidth}% - 8px)` }}
              >
                <div className="h-full min-h-0 bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
                  <AIChatContainer
                    className="w-full flex-1"
                    contextGetter={getProblemContext}
                    welcomeMessage="I'm active in fullscreen mode! Ask any questions about the problem or your code."
                    persistenceKey={chatSessionId}
                    chatTitle={`${problem.title} - AI Buddy`}
                    onNewChat={() => setChatSessionId(`chat-${problem.id}-${crypto.randomUUID()}`)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CodeEditorWithAI.displayName = 'CodeEditorWithAI';

export default CodeEditorWithAI;