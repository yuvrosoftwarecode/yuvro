// AI-enhanced code editor that wraps CodeEditor with problem descriptions and AI chat functionality.
// For simpler use cases without AI features, use CodeEditor.tsx instead.
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import CodeEditor, { CodeEditorHandle } from './CodeEditor';
import type { Subject, Unit, CodingProblem } from '@/pages/student/CodePractice';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import AIChatContainer from '@/components/student/Learn/AIChatWidget/AIChatContainer';
import codeEditorService from '@/services/codeEditorService';

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

  // Difficulty badge style (pure Tailwind)
  const difficultyBadgeClass =
    problem.difficulty === 'Easy'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : problem.difficulty === 'Medium'
        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        : problem.difficulty === 'Hard'
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-gray-50 text-gray-700 border border-gray-200';

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
    <div className={`${isEditorFullscreen ? (isEmbedded ? 'h-full w-full bg-white relative flex flex-col' : 'h-screen bg-white') : 'h-full flex flex-col mx-auto px-[3px] py-6 max-w-[1500px]'}`}>
      {/* Breadcrumb */}
      {!isEditorFullscreen && showBreadcrumb && (
        <div className="flex-none flex items-center gap-2 mb-3 ml-2 text-sm text-gray-500">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-auto p-0 hover:bg-transparent hover:text-gray-900 transition-colors">
            {unit.name}
          </Button>
          <span>/</span>
          <span className="text-gray-800 font-medium">{problem.title}</span>
        </div>
      )}

      {/* 1) Problem-only view (editor hidden) */}
      {showProblemDescription && !editorOpen && !isEditorFullscreen && (
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

              {/* Test Cases - Basic Only */}
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
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup
            direction="horizontal"
            className="w-full h-full flex"
            key={`split-view-${showProblemDescription ? 'desc' : 'nodesc'}-${isSidebarCollapsed ? 'collapsed' : 'expanded'}-${showAiChat ? 'chat' : 'nochat'}`}
          >
            {/* LEFT PANEL — Problem */}
            {showProblemDescription && !isSidebarCollapsed && (
              <ResizablePanel
                id="problem-panel"
                order={1}
                defaultSize={35}
                minSize={20}
                maxSize={50}
              >
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
            )}
            {/* COLLAPSED SIDEBAR GHOST */}
            {showProblemDescription && isSidebarCollapsed && (
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
            {showProblemDescription && !isSidebarCollapsed && (
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
            <ResizablePanel
              id="editor-panel"
              order={2}
              defaultSize={showProblemDescription && !isSidebarCollapsed ? 65 : (showAiBuddy && showAiChat ? 65 : 100)}
              minSize={30}
            >
              <div className="h-full overflow-hidden pl-1 flex flex-col">
                {/* Use CodeEditor component */}
                <CodeEditor
                  ref={codeEditorRef}
                  initialCode={code}
                  onCodeChange={setCode}
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
                />
              </div>
            </ResizablePanel>

            {/* AI Chat Sidebar in Split View */}
            {showAiBuddy && showAiChat && (
              <>
                <ResizableHandle className="w-1.5 bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="block w-1 h-1 bg-gray-400 rounded-full" />
                  </div>
                </ResizableHandle>
                <ResizablePanel
                  id="ai-chat-panel"
                  order={3}
                  defaultSize={35}
                  minSize={25}
                  maxSize={50}
                >
                  <div className="h-full min-h-0 border-l border-gray-200 bg-white shadow-lg overflow-hidden flex flex-col">
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
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden">
          {/* Fullscreen Header - Hidden if embedded since the page has its own header */}
          {!isEmbedded && (
            <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between shadow-md shrink-0 relative z-[50]">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <h2 className="text-xl font-bold text-gray-900 truncate">{problem.title}</h2>
                <Badge className={`px-3 py-1 rounded shrink-0 hidden md:inline-flex ${difficultyBadgeClass}`}>
                  {problem.difficulty}
                </Badge>
              </div>
              {!isEditorFullscreen && showBreadcrumb && (
                <div className="flex-none flex items-center gap-2 mb-3 ml-2 text-sm text-gray-500">
                  <Button variant="ghost" size="sm" onClick={onBack} className="h-auto p-0 hover:bg-transparent hover:text-gray-900 transition-colors">
                    {unit.name}
                  </Button>
                  <span>/</span>
                  <span className="text-gray-800 font-medium">{problem.title}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Fullscreen Layout - Always use ResizablePanelGroup */}
            <ResizablePanelGroup
              direction="horizontal"
              className="flex-1 overflow-hidden"
              key={`fullscreen-view-${showAiChat ? 'chat' : 'nochat'}`}
            >
              {/* Main Area (Editor + Output) */}
              <ResizablePanel
                id="fullscreen-editor-panel"
                order={1}
                defaultSize={showAiBuddy && showAiChat ? 65 : 100}
                minSize={showAiBuddy && showAiChat ? 40 : 100}
                maxSize={showAiBuddy && showAiChat ? 80 : 100}
              >
                <div className="h-full flex flex-col overflow-hidden">
                  <CodeEditor
                    ref={codeEditorRef}
                    initialCode={code}
                    onCodeChange={setCode}
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
                  />
                </div>
              </ResizablePanel>

              {/* AI Chat Sidebar - Only render when needed */}
              {showAiBuddy && showAiChat && (
                <>
                  <ResizableHandle className="w-1.5 bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                    </div>
                  </ResizableHandle>
                  <ResizablePanel
                    id="fullscreen-ai-chat-panel"
                    order={2}
                    defaultSize={35}
                    minSize={20}
                    maxSize={60}
                  >
                    <div className="h-full min-h-0 bg-white border-l border-gray-200 shadow-lg overflow-hidden flex flex-col">
                      <AIChatContainer
                        className="w-full flex-1"
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
    </div>
  );
});

export default CodeEditorWithAI;