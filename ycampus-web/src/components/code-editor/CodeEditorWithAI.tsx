// AI-enhanced code editor that wraps CodeEditor with problem descriptions and AI chat functionality.
// For simpler use cases without AI features, use CodeEditor.tsx instead.
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, BrainCircuit, Target, Code, PanelsRightBottom, Layout, AlertTriangle, Lightbulb, Key, Shield, BookOpen, Download } from 'lucide-react';
import CodeEditor, { CodeEditorHandle } from './CodeEditor';
import type { Subject, Unit, CodingProblem } from '@/pages/student/CodePractice';
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
  subject: Subject;
  unit: Unit;
  subunitId?: string;
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
  onCodeChange?: (code: string) => void;
  hideSubmitButton?: boolean;
  initialCode?: string;
}

export interface CodeEditorWithAIHandle {
  openExampleGallery: () => void;
  getLanguage: () => string;
}

const CodeEditorWithAI = forwardRef<CodeEditorWithAIHandle, CodeEditorWithAIProps>(({
  problem,
  subject,
  unit,
  subunitId,
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
  onSubmissionComplete,
  onCodeChange,
  hideSubmitButton = false,
  initialCode = ""
}, ref) => {
  // UI state
  const [editorOpen, setEditorOpen] = useState(initialEditorOpen);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(initialFullscreen);
  const [showAiChat, setShowAiChat] = useState(initialAiChatOpen);
  const [chatSessionId, setChatSessionId] = useState(() => `chat-${problem.id}-${crypto.randomUUID()}`);

  // Lifted state to persist across view switches
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState("python");
  const [apiTemplates, setApiTemplates] = useState<Record<string, string>>({});

  // Custom drag-based resizing (like StudentVideos)
  const [problemPanelWidth, setProblemPanelWidth] = useState(35); // % width for problem description
  const [aiChatPanelWidth, setAiChatPanelWidth] = useState(30); // % width for AI chat
  const [dragMode, setDragMode] = useState<'problem' | 'ai-chat' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Custom drag handlers for resizing (like StudentVideos)
  const startProblemDrag = () => setDragMode('problem');
  const startAiChatDrag = () => setDragMode('ai-chat');
  const stopDrag = () => setDragMode(null);

  const COLLAPSE_THRESHOLD = 5;

  const onDrag = (e: MouseEvent) => {
    if (!dragMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const containerWidth = rect.width;

    if (dragMode === 'problem') {
      const newWidth = (relativeX / containerWidth) * 100;
      if (isSidebarCollapsed) {
        if (relativeX > 40) {
          setIsSidebarCollapsed(false);
          setProblemPanelWidth(Math.min(Math.max(newWidth, COLLAPSE_THRESHOLD + 1), 60));
        }
      } else {
        if (newWidth < COLLAPSE_THRESHOLD) {
          setIsSidebarCollapsed(true);
          setDragMode(null);
        } else if (newWidth <= 60) {
          setProblemPanelWidth(newWidth);
        }
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
    getLanguage: () => codeEditorRef.current?.getLanguage() || 'python',
    getCode: () => codeEditorRef.current?.getCode() || ''
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

  const containerClassName = isEditorFullscreen
    ? (isEmbedded ? 'h-full w-full bg-white relative flex flex-col' : 'h-screen bg-white')
    : (isEmbedded
      ? 'h-full w-full flex flex-col box-border bg-slate-50 font-sans overflow-hidden p-1.5'
      : 'flex-1 flex flex-col p-2 box-border bg-slate-50 font-sans overflow-hidden');

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
    } catch (err) {
      console.error('Failed to reveal solution:', err);
      toast.error('Failed to reveal solution');
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
                            ? 'border-slate-900 text-slate-900'
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
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300 hover:text-slate-900'
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
                        className="h-6 px-2 text-xs bg-slate-900 hover:bg-black text-white"
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
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold text-slate-700 mb-1.5">Complexity Analysis</p>
                        <p className="text-sm text-slate-900 leading-relaxed">{sol.complexity_analysis}</p>
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
    <div className={containerClassName}>



      {/* 1) Problem-only view (editor hidden) */}
      {showProblemDescription && !editorOpen && !isEditorFullscreen && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Card className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-8 bg-gray-50/50 border-b border-gray-100">
              <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-100">
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
                    <Layout className="w-3.5 h-3.5 text-slate-700" /> Challenge Overview
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
                              <pre className="bg-slate-50 p-4 rounded-xl text-sm font-mono text-slate-900 border border-slate-100">{ex.input}</pre>
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
          <div className="flex justify-center mt-12 mb-16">
            <Button
              onClick={() => setEditorOpen(true)}
              className="bg-slate-900 hover:bg-black text-white rounded-xl shadow-md font-bold px-10 py-4 h-14 transition-all active:scale-95 text-sm uppercase tracking-widest"
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
          className={`flex-1 min-h-0 overflow-hidden flex relative gap-1.5 p-1.5 ${dragMode ? 'select-none' : ''}`}
        >
          {/* Collapsed Sidebar — vertical tab buttons */}
          {showProblemDescription && isSidebarCollapsed && (
            <div className="w-9 shrink-0 border border-gray-200 bg-white rounded-xl flex flex-col items-center pt-2 pb-4 gap-1 transition-all shadow-sm overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarCollapsed(false)}
                className="w-7 h-7 p-0 text-gray-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all mb-1"
                title="Expand"
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
              {[
                { key: 'question', label: 'Description', icon: <BookOpen className="w-3 h-3" /> },
                { key: 'hints', label: 'Hints', icon: <Lightbulb className="w-3 h-3" /> },
                { key: 'solution', label: 'Solution', icon: <Key className="w-3 h-3" /> },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setLeftTab(t.key as any); setIsSidebarCollapsed(false); }}
                  className={`w-full flex flex-col items-center gap-1 py-3 text-[8px] font-bold uppercase tracking-widest transition-all
                    ${leftTab === t.key ? 'text-slate-900 bg-slate-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                  title={t.label}
                >
                  {t.icon}
                  <span className="[writing-mode:vertical-rl] rotate-180 leading-none">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* LEFT PANEL — Tabbed Problem Description */}
          {showProblemDescription && !isSidebarCollapsed && (
            <div
              className={`h-full shrink-0 ${dragMode ? 'pointer-events-none' : ''}`}
              style={{ width: `calc(${problemPanelWidth}% - 4px)` }}
            >
              <Card className="border border-gray-200 shadow-sm bg-white flex flex-col h-full rounded-xl overflow-hidden">
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
                    ...(problem.hints && problem.hints.length > 0 ? [{ key: 'hints', label: `Hints (${problem.hints.length})`, icon: <Lightbulb className="w-3.5 h-3.5" /> }] : []),
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
                </div>

                <div className="flex-1 overflow-hidden p-0 flex">
                  {renderLeftPanelContent()}
                </div>
              </Card>
            </div>
          )}

          {/* PROBLEM RESIZE HANDLE — always visible when problem description is shown */}
          {showProblemDescription && (
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
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
              <CodeEditor
                  ref={codeEditorRef}
                  initialCode={code}
                  onCodeChange={(newCode) => {
                    setCode(newCode);
                    onCodeChange?.(newCode);
                  }}
                  initialLanguage={language}
                  onLanguageChange={setLanguage}
                  problemTitle={problem.title}
                  problemId={problem.id}
                  subjectId={subject.id}
                  unitId={unit.id}
                  subunitId={subunitId}
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
                  hideSubmitButton={hideSubmitButton}
                />
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
                  onInsertCode={(code) => {
                    if (codeEditorRef.current && typeof codeEditorRef.current.insertCodeAtCursor === 'function') {
                      codeEditorRef.current.insertCodeAtCursor(code);
                    }
                  }}
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
                  onCodeChange={(newCode) => {
                    setCode(newCode);
                    onCodeChange?.(newCode);
                  }}
                  initialLanguage={language}
                  onLanguageChange={setLanguage}
                  problemTitle={problem.title}
                  problemId={problem.id}
                  subjectId={subject.id}
                  unitId={unit.id}
                  subunitId={subunitId}
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
                  hideSubmitButton={hideSubmitButton}
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
                    onInsertCode={(code) => {
                      if (codeEditorRef.current && typeof codeEditorRef.current.insertCodeAtCursor === 'function') {
                        codeEditorRef.current.insertCodeAtCursor(code);
                      }
                    }}
                  />
                </div>
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
    </div>
  );
});

CodeEditorWithAI.displayName = 'CodeEditorWithAI';

export default CodeEditorWithAI;
