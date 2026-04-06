// AI-enhanced code editor that wraps CodeEditor with problem descriptions and AI chat functionality.
// For simpler use cases without AI features, use CodeEditor.tsx instead.
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, BrainCircuit, Target, Code, PanelsRightBottom, Layout, AlertTriangle, Lightbulb, Key, Shield, BookOpen, Download, PanelLeftClose } from 'lucide-react';
import CodeEditor, { CodeEditorHandle } from './CodeEditor';
import type { Course, Topic, CodingProblem } from '@/pages/student/CodePractice';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import AIChatContainer from '@/components/student/Learn/AIChatWidget/AIChatContainer';
import codeEditorService from '@/services/codeEditorService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  // Custom performant drag-based CSS var resizing (like StudentVideos)
  const [problemPanelWidth, setProblemPanelWidth] = useState(27);
  const [aiChatPanelWidth, setAiChatPanelWidth] = useState(30);
  const [dragMode, setDragMode] = useState<'problem' | 'ai-chat' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ mode: 'problem' | 'ai-chat' | null; val: number }>({ mode: null, val: 0 });
  const rafRef = useRef<number | null>(null);

  // Hint/Solution state
  const [leftTab, setLeftTab] = useState<'question' | 'hints' | 'solution'>('question');
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [revealedSolution, setRevealedSolution] = useState(false);
  const [hintToReveal, setHintToReveal] = useState<number | null>(null);
  const [showSolutionDialog, setShowSolutionDialog] = useState(false);
  const [fetchedSolutions, setFetchedSolutions] = useState<any[]>([]);
  const [selectedApproach, setSelectedApproach] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedSolutionIdx, setSelectedSolutionIdx] = useState(0);

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

  const startProblemDrag = () => {
    setDragMode('problem');
    dragInfo.current = { mode: 'problem', val: problemPanelWidth };
  };

  const startAiChatDrag = () => {
    setDragMode('ai-chat');
    dragInfo.current = { mode: 'ai-chat', val: aiChatPanelWidth };
  };

  const COLLAPSE_THRESHOLD = 5;

  useEffect(() => {
    const handleMouseUp = () => {
      const { mode, val } = dragInfo.current;
      if (!mode) return;

      if (mode === 'problem') setProblemPanelWidth(val);
      if (mode === 'ai-chat') setAiChatPanelWidth(val);

      dragInfo.current = { mode: null, val: 0 };
      setDragMode(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { mode } = dragInfo.current;
      if (!mode || !containerRef.current) return;

      if (e.buttons !== 1) {
        handleMouseUp();
        return;
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const containerWidth = rect.width;

        if (mode === 'problem') {
          const newWidth = (relativeX / containerWidth) * 100;
          if (isSidebarCollapsed) {
            if (relativeX > 40) {
              setIsSidebarCollapsed(false);
              const clamped = Math.min(Math.max(newWidth, COLLAPSE_THRESHOLD + 1), 50);
              containerRef.current.style.setProperty('--problem-width', `${clamped}%`);
              dragInfo.current.val = clamped;
            }
          } else {
            if (newWidth < COLLAPSE_THRESHOLD) {
              handleMouseUp();
              setIsSidebarCollapsed(true);
            } else if (newWidth <= 50) {
              containerRef.current.style.setProperty('--problem-width', `${newWidth}%`);
              dragInfo.current.val = newWidth;
            }
          }
        } else if (mode === 'ai-chat') {
          const rightEdgeX = containerWidth - relativeX;
          const newWidth = (rightEdgeX / containerWidth) * 100;
          if (newWidth >= 15 && newWidth <= 40) {
            containerRef.current.style.setProperty('--chat-width', `${newWidth}%`);
            dragInfo.current.val = newWidth;
          }
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSidebarCollapsed]);


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
  const handleFullscreenChange = async (isFullscreen: boolean) => {
    setIsEditorFullscreen(isFullscreen);
    try {
      if (isFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      // Fullscreen API may be blocked by browser policy
    }
  };

  // Sync state if user presses Escape to exit browser fullscreen
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && isEditorFullscreen) {
        setIsEditorFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [isEditorFullscreen]);

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

  const sharedContainerClass = "h-full flex-1 w-full flex overflow-hidden bg-white font-sans box-border relative";

  const handleRevealHint = async () => {
    if (hintToReveal === null) return;
    try {
      await restApiAuthUtil.post(`/course/student-code-practices/reveal-hint/`, { question_id: problem.id, hint_index: hintToReveal });
      setRevealedHints(prev => [...prev, hintToReveal]);
      setHintToReveal(null);
      toast.success('Hint revealed');
    } catch (err) {
      console.error('Failed to reveal hint:', err);
      toast.error('Failed to reveal hint');
      setHintToReveal(null);
    }
  };

  const handleRevealSolution = async () => {
    try {
      const data = await restApiAuthUtil.post(`/course/student-code-practices/reveal-solution/`, { question_id: problem.id });
      const sols = Array.isArray(data) ? data : (problem.solutions || []);
      setFetchedSolutions(sols);
      const firstApproach = sols.length > 0 ? (sols[0].approach || 'optimal') : '';
      setSelectedApproach(firstApproach);
      const firstLangForApproach = sols.find((s: any) => s.approach === firstApproach)?.language || '';
      setSelectedLanguage(firstLangForApproach);
      setSelectedSolutionIdx(0);
      setRevealedSolution(true);
      setShowSolutionDialog(false);
      toast.success('Solution revealed');
    } catch (err: any) {
      console.error('Failed to reveal solution:', err);
      const message = err?.message || '';
      if (message.includes('No predefined solutions') || message.includes('404')) {
        toast.info('Solution not available yet for this problem');
      } else {
        toast.error('Failed to reveal solution');
      }
      setShowSolutionDialog(false);
    }
  };

  const renderLeftPanelContent = () => (
    <Tabs value={leftTab} onValueChange={(v: any) => setLeftTab(v)} className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar w-full">
        <TabsContent value="question" className="m-0 w-full">
          {/* Title + difficulty — TUF style */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 leading-snug mb-2">{problem.title}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                problem.difficulty?.toLowerCase() === 'easy' ? 'bg-green-50 text-green-700 border-green-200' :
                problem.difficulty?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}>{problem.difficulty}</span>
            </div>
          </div>

          {/* Description prose */}
          <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded mb-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.description}</ReactMarkdown>
          </div>

          {/* Sample test cases — 2 basic + 1 advanced */}
          {(() => {
            const basic = (problem.test_cases_basic || []).slice(0, 2);
            const advanced = (problem.test_cases_advanced || []).slice(0, 1);
            const all = [
              ...basic.map((tc: any) => ({ ...tc, label: 'Basic' })),
              ...advanced.map((tc: any) => ({ ...tc, label: 'Advanced' })),
            ];
            if (all.length === 0) return null;
            return (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900">Sample Test Cases</h4>
                {all.map((tc: any, i: number) => (
                  <div key={i}>
                    <h5 className="text-xs font-semibold text-gray-500 mb-1.5">Case {i + 1} <span className="text-gray-400 font-normal">({tc.label})</span></h5>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-1.5 font-mono text-xs">
                      <div><span className="font-bold text-gray-600">Input: </span><span className="text-gray-800">{typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input)}</span></div>
                      <div><span className="font-bold text-gray-600">Output: </span><span className="text-emerald-700">{typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="hints" className="m-0 space-y-4 w-full">
          {problem.hints && problem.hints.length > 0 ? (
            problem.hints.map((hint: string, index: number) => {
              const isRevealed = revealedHints.includes(index);
              return (
                <div key={index} className="border border-amber-200 bg-amber-50 rounded-lg p-4 w-full">
                  <div className="flex items-center gap-2 font-semibold text-amber-800 mb-2 text-sm">
                    <Lightbulb className="w-4 h-4" />
                    Hint {index + 1}
                  </div>
                  {isRevealed ? (
                    <div className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{hint}</ReactMarkdown>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-amber-700/80 mb-2">Using hints will result in a score penalty.</p>
                      <Button onClick={() => setHintToReveal(index)} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm" size="sm">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        Reveal Hint
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500 w-full">
              <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm">No hints available for this problem.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="solution" className="m-0 w-full">
          {revealedSolution ? (
            <div className="w-full space-y-3">
              {/* Approach tabs — TUF style flat underline */}
              {(() => {
                const approaches = Array.from(new Set(fetchedSolutions.map((s: any) => s.approach || 'optimal')));
                const approachLabels: Record<string, string> = { brute_force: 'Brute Force', better: 'Better', optimal: 'Optimal' };
                return (
                  <div className="flex border-b border-gray-200 gap-0">
                    {approaches.map((ap: any) => (
                      <button
                        key={ap}
                        onClick={() => {
                          setSelectedApproach(ap);
                          const firstLang = fetchedSolutions.find((s: any) => s.approach === ap)?.language || '';
                          setSelectedLanguage(firstLang);
                          setSelectedSolutionIdx(0);
                        }}
                        className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-all ${
                          selectedApproach === ap
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                        }`}
                      >
                        {approachLabels[ap] || ap}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Language pills for selected approach */}
              {(() => {
                const approachSols = fetchedSolutions.filter((s: any) => (s.approach || 'optimal') === selectedApproach);
                const langs = Array.from(new Set(approachSols.map((s: any) => s.language)));
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {langs.map((lang: any) => (
                      <button
                        key={lang}
                        onClick={() => { setSelectedLanguage(lang); setSelectedSolutionIdx(0); }}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          selectedLanguage === lang
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {String(lang).toUpperCase()}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Code view */}
              {(() => {
                const sol = fetchedSolutions.find(
                  (s: any) => (s.approach || 'optimal') === selectedApproach && s.language === selectedLanguage
                );
                if (!sol) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">{sol.title}</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setCode(sol.code);
                          setLanguage(sol.language || 'python');
                          codeEditorRef.current?.setCode(sol.code);
                          toast.success('Solution loaded into editor');
                        }}
                        className="h-6 px-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Load into Editor
                      </Button>
                    </div>
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 p-3 overflow-auto max-h-80">
                        <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap"><code>{sol.code}</code></pre>
                      </div>
                    </div>
                    {sol.complexity_analysis && (
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
                        <p className="text-xs font-bold text-indigo-700 mb-1.5">Complexity Analysis</p>
                        <p className="text-sm text-indigo-900 leading-relaxed">{sol.complexity_analysis}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8 w-full">
              <Shield className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
              <h4 className="text-sm font-medium text-emerald-800 mb-1">Need the answer?</h4>
              <p className="text-xs text-emerald-700/80 max-w-sm mx-auto mb-4">
                Viewing the solution will set your score to 0.
              </p>
              <Button onClick={() => setShowSolutionDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow" size="sm">
                <Key className="w-3.5 h-3.5 mr-1.5" />
                Reveal Solution
              </Button>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );

  return (
    <>



      {/* 1) Problem-only view (editor hidden) */}
      {showProblemDescription && !editorOpen && !isEditorFullscreen && (
        <div className={`${sharedContainerClass} flex-col overflow-y-auto custom-scrollbar`}>
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
                    <div className="text-gray-700 text-base leading-relaxed prose prose-sm max-w-none prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {problem.description}
                      </ReactMarkdown>
                    </div>
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
          className={`${sharedContainerClass} flex-row ${dragMode ? 'select-none' : ''}`}
          style={{
            '--problem-width': showProblemDescription && !isSidebarCollapsed ? `${problemPanelWidth}%` : '0%',
            '--chat-width': showAiBuddy && showAiChat ? `${aiChatPanelWidth}%` : '0%'
          } as React.CSSProperties}
        >
          {/* Collapsed Sidebar — vertical tab buttons */}
          {showProblemDescription && isSidebarCollapsed && (
            <div className="w-9 shrink-0 border-r border-slate-200 bg-white flex flex-col items-center pt-2 pb-4 gap-1 transition-all z-10 overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="w-7 h-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all mb-1"
                title="Back to problems"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {[
                { key: 'question', label: 'Description', icon: <BookOpen className="w-3 h-3" /> },
                { key: 'hints', label: 'Hints', icon: <Lightbulb className="w-3 h-3" /> },
                { key: 'solution', label: 'Solution', icon: <Key className="w-3 h-3" /> },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setLeftTab(t.key as any); setProblemPanelWidth(30); setIsSidebarCollapsed(false); }}
                  className={`w-full flex flex-col items-center gap-1 py-3 text-[8px] font-bold uppercase tracking-widest transition-all
                    ${leftTab === t.key ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                  title={t.label}
                >
                  {t.icon}
                  <span className="[writing-mode:vertical-rl] rotate-180 leading-none">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* LEFT PANEL — Tabbed Problem Description (always mounted for fluid transitions) */}
          {showProblemDescription && (
            <div
              className={`h-full shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden will-change-[width] ${dragMode ? 'pointer-events-none' : 'transition-[width] duration-500 ease-in-out'} ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : ''}`}
              style={{ width: `var(--problem-width)` }}
            >
                {/* Tab bar with back chevron on the left */}
                <div className="flex items-center gap-0 px-1 border-b border-gray-200 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-7 w-7 p-0 mr-1 rounded-md text-gray-400 hover:text-gray-900 shrink-0"
                    title="Back to problems"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {[
                    { key: 'question', label: 'Description', icon: <BookOpen className="w-3.5 h-3.5" /> },
                    { key: 'hints', label: `Hints${problem.hints && problem.hints.length > 0 ? ` (${problem.hints.length})` : ''}`, icon: <Lightbulb className="w-3.5 h-3.5" /> },
                    { key: 'solution', label: 'Solution', icon: <Key className="w-3.5 h-3.5" /> },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setLeftTab(t.key as any)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all -mb-px
                        ${leftTab === t.key
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="h-7 w-7 p-0 ml-auto rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 shrink-0"
                    title="Collapse"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden p-0 flex">
                  {renderLeftPanelContent()}
                </div>
            </div>
          )}

          {/* PROBLEM RESIZE HANDLE */}
          {showProblemDescription && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                startProblemDrag();
              }}
              className={`w-4 h-full cursor-col-resize z-20 flex items-center justify-center relative group shrink-0 -mx-2 transition-opacity duration-500 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <div className="w-1.5 h-10 bg-indigo-500 rounded-full transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100" />
            </div>
          )}

          {/* CENTER PANEL — Editor + Output */}
          <div
            className={`h-full flex-1 flex flex-col bg-white overflow-hidden min-w-0 ${dragMode ? 'pointer-events-none' : ''}`}
          >
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

          {/* AI CHAT RESIZE HANDLE (always mounted for fluid transitions) */}
          {showAiBuddy && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                startAiChatDrag();
              }}
              className={`w-4 h-full cursor-col-resize z-20 flex items-center justify-center relative group shrink-0 -mx-2 transition-opacity duration-500 ${!showAiChat ? 'opacity-0 pointer-events-none' : ''}`}
            >
              <div className="w-1.5 h-10 bg-indigo-500 rounded-full transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100" />
            </div>
          )}

          {/* RIGHT PANEL — AI Chat (always mounted for fluid transitions) */}
          {showAiBuddy && (
            <div
              className={`h-full shrink-0 min-h-0 border-l border-slate-200 bg-white overflow-hidden flex flex-col will-change-[width] ${dragMode ? 'pointer-events-none' : 'transition-[width] duration-500 ease-in-out'} ${!showAiChat ? 'opacity-0 pointer-events-none' : ''}`}
              style={{ width: `var(--chat-width)` }}
            >
                <AIChatContainer
                  className="w-full flex-1 rounded-none border-none shadow-none"
                  style={{ border: "none", boxShadow: "none" }}
                  contextGetter={getProblemContext}
                  welcomeMessage={`Hi! I'm your AI Buddy. Ready to help you with "${problem.title}". Ask me anything!`}
                  persistenceKey={chatSessionId}
                  chatTitle={`${problem.title} - AI Buddy`}
                  onNewChat={() => setChatSessionId(`chat-${problem.id}-${crypto.randomUUID()}`)}
                  onInsertCode={(code) => codeEditorRef.current?.insertText(code)}
                />
            </div>
          )}
        </div>
      )}

      {/* 3) Fullscreen editor mode */}
      {isEditorFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden">
          <div
            ref={containerRef}
            className={`flex-1 flex overflow-hidden relative bg-white ${dragMode ? 'select-none' : ''}`}
            style={{
              '--problem-width': showProblemDescription && !isSidebarCollapsed ? `${problemPanelWidth}%` : '0%',
              '--chat-width': showAiBuddy && showAiChat ? `${aiChatPanelWidth}%` : '0%'
            } as React.CSSProperties}
          >
            {/* Collapsed Left Panel Sidebar Strip */}
            {showProblemDescription && isSidebarCollapsed && (
              <div className="w-9 shrink-0 border-r border-slate-200 bg-white flex flex-col items-center pt-2 pb-4 gap-1 transition-all z-10 overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFullscreenChange(false)}
                  className="w-7 h-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all mb-1"
                  title="Exit fullscreen"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {[
                  { key: 'question', label: 'Description', icon: <BookOpen className="w-3 h-3" /> },
                  { key: 'hints', label: 'Hints', icon: <Lightbulb className="w-3 h-3" /> },
                  { key: 'solution', label: 'Solution', icon: <Key className="w-3 h-3" /> },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setLeftTab(t.key as any); setProblemPanelWidth(30); setIsSidebarCollapsed(false); }}
                    className={`w-full flex flex-col items-center gap-1 py-3 text-[8px] font-bold uppercase tracking-widest transition-all
                      ${leftTab === t.key ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                    title={t.label}
                  >
                    {t.icon}
                    <span className="[writing-mode:vertical-rl] rotate-180 leading-none">{t.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Expanded Left Panel — Problem Description (always mounted for fluid transitions) */}
            {showProblemDescription && (
              <div
                className={`h-full shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden will-change-[width] ${dragMode ? 'pointer-events-none' : 'transition-[width] duration-500 ease-in-out'} ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : ''}`}
                style={{ width: `var(--problem-width)` }}
              >
                  <div className="flex items-center gap-0 px-1 border-b border-gray-200 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFullscreenChange(false)}
                      className="h-7 w-7 p-0 mr-1 rounded-md text-gray-400 hover:text-red-600 shrink-0"
                      title="Exit fullscreen"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {[
                      { key: 'question', label: 'Description', icon: <BookOpen className="w-3.5 h-3.5" /> },
                      { key: 'hints', label: `Hints${problem.hints && problem.hints.length > 0 ? ` (${problem.hints.length})` : ''}`, icon: <Lightbulb className="w-3.5 h-3.5" /> },
                      { key: 'solution', label: 'Solution', icon: <Key className="w-3.5 h-3.5" /> },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setLeftTab(t.key as any)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all -mb-px
                          ${leftTab === t.key
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                      >
                        {t.icon}
                        {t.label}
                      </button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="h-7 w-7 p-0 ml-auto rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 shrink-0"
                      title="Collapse"
                    >
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden p-0 flex">
                    {renderLeftPanelContent()}
                  </div>
              </div>
            )}

            {/* Problem Resize Handle */}
            {showProblemDescription && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  startProblemDrag();
                }}
                className={`w-4 h-full cursor-col-resize z-20 flex items-center justify-center relative group shrink-0 -mx-2 transition-opacity duration-500 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <div className="w-1.5 h-10 bg-indigo-500 rounded-full transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100" />
              </div>
            )}

            {/* Main Area (Editor + Output) */}
            <div className={`h-full flex-1 flex flex-col overflow-hidden bg-white min-w-0 ${dragMode ? 'pointer-events-none' : ''}`}>
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

            {/* AI Chat Resize Handle (always mounted for fluid transitions) */}
            {showAiBuddy && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  startAiChatDrag();
                }}
                className={`w-4 h-full cursor-col-resize z-20 flex items-center justify-center relative group shrink-0 -mx-2 transition-opacity duration-500 ${!showAiChat ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <div className="w-1.5 h-10 bg-indigo-500 rounded-full transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100" />
              </div>
            )}

            {/* AI Chat Sidebar (always mounted for fluid transitions) */}
            {showAiBuddy && (
              <div
                className={`h-full shrink-0 min-h-0 bg-white border-l border-slate-200 overflow-hidden flex flex-col will-change-[width] ${dragMode ? 'pointer-events-none' : 'transition-[width] duration-500 ease-in-out'} ${!showAiChat ? 'opacity-0 pointer-events-none' : ''}`}
                style={{ width: `var(--chat-width)` }}
              >
                  <AIChatContainer
                    className="w-full flex-1 rounded-none border-none shadow-none"
                    style={{ border: "none", boxShadow: "none" }}
                    contextGetter={getProblemContext}
                    welcomeMessage="I'm active in fullscreen mode! Ask any questions about the problem or your code."
                    persistenceKey={chatSessionId}
                    chatTitle={`${problem.title} - AI Buddy`}
                    onNewChat={() => setChatSessionId(`chat-${problem.id}-${crypto.randomUUID()}`)}
                    onInsertCode={(code) => codeEditorRef.current?.insertText(code)}
                  />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning Dialogs */}
      <Dialog open={hintToReveal !== null} onOpenChange={(open) => !open && setHintToReveal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Score Penalty Warning
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-gray-700 py-4 text-base">
            Are you sure you want to reveal this hint?<br /><br />
            Viewing hints will result in a <strong>score of 0</strong> for this problem.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHintToReveal(null)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleRevealHint}>Acknowledge & Reveal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSolutionDialog} onOpenChange={setShowSolutionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <AlertTriangle className="w-5 h-5" />
              Score Penalty Warning
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-gray-700 py-4 text-base">
            Are you sure you want to reveal the official solution?<br /><br />
            Viewing the solution will permanently result in a <strong>score of 0</strong> for this problem.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSolutionDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRevealSolution}>Acknowledge & Reveal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

CodeEditorWithAI.displayName = 'CodeEditorWithAI';

export default CodeEditorWithAI;
