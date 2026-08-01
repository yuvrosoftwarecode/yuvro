import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Copy, Check, Play, Loader2, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import codeExecutorService from '@/services/codeExecutorService';
import restApiUtilCodeExecuter from '@/utils/RestApiUtilCodeExecuter';

interface TestCase { input: string; expected_output: string; }
interface ExampleProblem { id: string; title: string; description: string; test_cases: TestCase[]; solutions: Record<string, string>; }
interface TestResultItem { passed: boolean; input: string; expected_output: string; actual_output: string; error?: string; execution_time?: number; }
interface ExecutionMetrics { total_time: number; passed: number; total: number; performance_warnings?: any[]; status?: string; }

interface ExamplesPanelProps {
    onClose: () => void;
    currentLanguage: string;
}

const ExamplesPanel: React.FC<ExamplesPanelProps> = ({ onClose, currentLanguage }) => {
    const [problems, setProblems] = useState<ExampleProblem[]>([]);
    const [selectedProblem, setSelectedProblem] = useState<ExampleProblem | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(currentLanguage);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<TestResultItem[] | null>(null);
    const [executionMetrics, setExecutionMetrics] = useState<ExecutionMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [sidebarWidth, setSidebarWidth] = useState(18);  
    const [middleWidth, setMiddleWidth] = useState(28);   

    const containerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ panel: 'sidebar' | 'middle' | null; startX: number; startVal: number }>({ panel: null, startX: 0, startVal: 0 });

    useEffect(() => {
        const fetchProblems = async () => {
            setIsLoading(true);
            try {
                const data = await restApiUtilCodeExecuter.get<any>('/supported-languages-and-templates');
                const fetched = data.example_problems || [];
                setProblems(fetched);
                if (fetched.length > 0) setSelectedProblem(fetched[0]);
            } catch { toast.error('Failed to load example problems'); }
            finally { setIsLoading(false); }
        };
        fetchProblems();
    }, []);

    const startDrag = (panel: 'sidebar' | 'middle', e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = { panel, startX: e.clientX, startVal: panel === 'sidebar' ? sidebarWidth : middleWidth };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        const { panel, startX, startVal } = dragRef.current;
        if (!panel || !containerRef.current) return;
        const containerW = containerRef.current.getBoundingClientRect().width;
        const delta = ((e.clientX - startX) / containerW) * 100;
        if (panel === 'sidebar') {
            const next = Math.min(Math.max(startVal + delta, 12), 35);
            setSidebarWidth(next);
        } else {
            const next = Math.min(Math.max(startVal + delta, 18), 45);
            setMiddleWidth(next);
        }
    }, []);

    const onMouseUp = useCallback(() => {
        dragRef.current.panel = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
    }, [onMouseMove, onMouseUp]);

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        toast.success('Code copied');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRun = async () => {
        if (!selectedProblem) return;
        const code = selectedProblem.solutions?.[selectedLanguage] || selectedProblem.solutions?.['python'] || '';
        if (!code) {
            toast.error('No solution available for this language');
            return;
        }
        setIsRunning(true); setTestResults(null); setExecutionMetrics(null);
        try {
            const extLang = selectedLanguage === 'py' ? 'python' : selectedLanguage === 'js' ? 'javascript' : selectedLanguage;
            const res = await codeExecutorService.executeCode({
                code: code, 
                language: extLang,
                test_cases: [],
                test_cases_custom: selectedProblem.test_cases.map(tc => ({ input: tc.input, expected_output: tc.expected_output, weight: 1 }))
            });
            
            if (res.test_results?.results) {
                setTestResults(res.test_results.results);
                const passed = res.test_results.passed || 0;
                const total = res.test_results.total || 0;
                const totalTime = res.test_results.results.reduce((a: number, r: any) => a + (r.execution_time || 0), 0);
                
                const warnings: any[] = [];
                const hasTLE = res.test_results.results.some((r: any) => r.error === 'Time Limit Exceeded' || r.error_message?.includes('Time Limit'));
                const hasMLE = res.test_results.results.some((r: any) => r.error === 'Memory Limit Exceeded' || r.error_message?.includes('Memory Limit'));
                
                if (hasTLE || res.status === 'timeout' || res.reason?.includes('Time Limit')) {
                    warnings.push({ type: 'Time Limit Exceeded', execution_time: totalTime });
                } else if (hasMLE || res.reason?.includes('Memory Limit')) {
                    warnings.push({ type: 'Memory Limit Exceeded', memory_usage: res.memory_usage });
                }

                setExecutionMetrics({ total_time: totalTime, passed, total, performance_warnings: warnings, status: res.status });
                
                if ((res.status === 'failed' || res.status === 'timeout') && warnings.length > 0) {
                    const isTLE = warnings[0].type === 'Time Limit Exceeded';
                    toast.error(isTLE ? 'Time Limit Exceeded' : 'Memory Limit Exceeded');
                } else {
                    passed === total ? toast.success(`All ${total} tests passed!`) : toast.error(`${passed}/${total} tests passed`);
                }
            } else { 
                toast.error(res.error_message || 'Execution failed'); 
            }
        } catch (e: any) { toast.error(e.message || 'Failed to run code'); }
        finally { setIsRunning(false); }
    };

    const solutionCode = selectedProblem?.solutions?.[selectedLanguage] || selectedProblem?.solutions?.['python'] || '// No solution available for this language.';
    const copyKey = selectedProblem ? selectedProblem.id + selectedLanguage : '';

    if (isLoading) return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-editor-bg rounded-2xl p-10 flex flex-col items-center gap-3 border border-border">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Loading examples...</p>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                ref={containerRef}
                className="bg-background rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden border border-border animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Examples Gallery</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Explore verified patterns and run them against your solution</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* ── Sidebar ── */}
                    <div
                        className="shrink-0 border-r border-border flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out bg-muted/10"
                        style={{ width: sidebarCollapsed ? '36px' : `${sidebarWidth}%` }}
                    >
                        {/* Sidebar header */}
                        <div className="h-10 flex items-center justify-between px-3 border-b border-border shrink-0">
                            {!sidebarCollapsed && (
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Library</span>
                            )}
                            <button
                                onClick={() => setSidebarCollapsed(p => !p)}
                                className="ml-auto h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                            >
                                {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                            </button>
                        </div>

                        {/* Problem list */}
                        {!sidebarCollapsed && (
                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                                {problems.map((problem) => (
                                    <button
                                        key={problem.id}
                                        onClick={() => { setSelectedProblem(problem); setTestResults(null); setExecutionMetrics(null); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${selectedProblem?.id === problem.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'}`}
                                    >
                                        <div className={`text-xs font-semibold truncate ${selectedProblem?.id === problem.id ? 'text-primary' : 'text-foreground'}`}>
                                            {problem.title}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">{problem.test_cases.length} scenarios</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Collapsed — vertical labels */}
                        {sidebarCollapsed && (
                            <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5">
                                {problems.map((problem) => (
                                    <button
                                        key={problem.id}
                                        onClick={() => { setSelectedProblem(problem); setSidebarCollapsed(false); setTestResults(null); setExecutionMetrics(null); }}
                                        className={`w-full py-3 flex items-center justify-center transition-all ${selectedProblem?.id === problem.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
                                        title={problem.title}
                                    >
                                        <span className={`text-[8px] font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 ${selectedProblem?.id === problem.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {problem.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Drag handle: sidebar ↔ middle ── */}
                    {!sidebarCollapsed && (
                        <div
                            onMouseDown={(e) => startDrag('sidebar', e)}
                            className="w-3 shrink-0 cursor-col-resize flex items-center justify-center group relative z-10 -mx-1.5"
                        >
                            <div className="w-1 h-10 bg-primary/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm" />
                        </div>
                    )}

                    {/* ── Middle panel ── */}
                    {selectedProblem && (
                        <>
                            <div
                                className="shrink-0 border-r border-border flex flex-col overflow-y-auto custom-scrollbar"
                                style={{ width: `${middleWidth}%` }}
                            >
                                <div className="p-5 space-y-5">
                                    <div>
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Problem Statement</p>
                                        <h3 className="text-base font-bold text-foreground">{selectedProblem.title}</h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">{selectedProblem.description}</p>
                                    </div>

                                    {executionMetrics && (
                                        <div className={`rounded-lg border px-3 py-2 flex items-center gap-5 text-xs ${executionMetrics.passed === executionMetrics.total ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                                            <span className="text-muted-foreground">Passed: <span className={`font-bold ${executionMetrics.passed === executionMetrics.total ? 'text-success' : 'text-destructive'}`}>{executionMetrics.passed}/{executionMetrics.total}</span></span>
                                            <span className="text-muted-foreground">Time: <span className="font-semibold text-foreground">{(executionMetrics.total_time * 1000).toFixed(0)}ms</span></span>
                                        </div>
                                    )}

                                    {executionMetrics && (executionMetrics.status === 'failed' || executionMetrics.status === 'timeout') && (() => {
                                        const warnings: any[] = executionMetrics.performance_warnings || [];
                                        if (warnings.length > 0) {
                                            const w = warnings[0];
                                            const isTLE = w.type === 'Time Limit Exceeded';
                                            return (
                                                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex flex-col mb-4">
                                                    <h4 className="text-warning font-bold text-sm flex items-center gap-2">
                                                        <Zap className="h-4 w-4" />
                                                        {isTLE ? 'Time Limit Exceeded' : 'Memory Limit Exceeded'}
                                                    </h4>
                                                    <p className="text-warning-foreground text-xs mt-1 opacity-80">
                                                        {isTLE
                                                            ? `Your output is correct, but execution took ${w.execution_time?.toFixed(2)}s — above the configured time limit. Optimize your algorithm.`
                                                            : `Your output is correct, but used ${(w.memory_usage / 1024)?.toFixed(1)} MB — above the configured memory limit. Reduce memory usage.`
                                                        }
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="space-y-4">
                                        {selectedProblem.test_cases.map((tc, idx) => (
                                            <div key={idx}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Case {idx + 1}</span>
                                                    {testResults?.[idx] && (
                                                        <span className={`text-[10px] font-bold uppercase ${testResults[idx].passed ? 'text-success' : 'text-destructive'}`}>
                                                            {testResults[idx].passed 
                                                                ? (testResults[idx].error === 'Time Limit Exceeded' ? 'Passed (TLE)' 
                                                                    : testResults[idx].error === 'Memory Limit Exceeded' ? 'Passed (MLE)' 
                                                                    : 'Passed') 
                                                                : 'Failed'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="bg-muted/30 rounded-lg border border-border p-3 space-y-1.5 font-mono text-xs">
                                                    <div><span className="font-bold text-muted-foreground">Input: </span><span className="text-foreground">{tc.input || '(none)'}</span></div>
                                                    <div><span className="font-bold text-muted-foreground">Output: </span><span className="text-success">{tc.expected_output}</span></div>
                                                    {testResults?.[idx] && !testResults[idx].passed && (
                                                        <div className="mt-2 pt-2 border-t border-border/50">
                                                            <div className="font-bold text-muted-foreground">Your Output:</div>
                                                            <div className="text-destructive whitespace-pre-wrap">{testResults[idx].actual_output || testResults[idx].error || '(no output)'}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── Drag handle: middle ↔ code ── */}
                            <div
                                onMouseDown={(e) => startDrag('middle', e)}
                                className="w-3 shrink-0 cursor-col-resize flex items-center justify-center group relative z-10 -mx-1.5"
                            >
                                <div className="w-1 h-10 bg-primary/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm" />
                            </div>

                            {/* ── Code panel ── */}
                            <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-editor-bg">
                                {/* Toolbar */}
                                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0">
                                    <Select
                                        value={selectedLanguage}
                                        onValueChange={(v) => { setSelectedLanguage(v); setTestResults(null); setExecutionMetrics(null); }}
                                    >
                                        <SelectTrigger className="h-8 w-36 bg-background border-border rounded-lg text-xs font-bold transition-all">
                                            <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border shadow-2xl bg-background z-[11000]">
                                            <SelectItem value="python" className="text-xs font-bold py-2 rounded-lg">Python</SelectItem>
                                            <SelectItem value="javascript" className="text-xs font-bold py-2 rounded-lg">JavaScript</SelectItem>
                                            <SelectItem value="java" className="text-xs font-bold py-2 rounded-lg">Java</SelectItem>
                                            <SelectItem value="cpp" className="text-xs font-bold py-2 rounded-lg">C++</SelectItem>
                                            <SelectItem value="c" className="text-xs font-bold py-2 rounded-lg">C</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg" onClick={() => handleCopy(solutionCode, copyKey)}>
                                            {copiedId === copyKey ? <Check className="h-3.5 w-3.5 mr-1.5 text-success" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                                            {copiedId === copyKey ? 'Copied' : 'Copy'}
                                        </Button>
                                        <Button size="sm" onClick={handleRun} disabled={isRunning} className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-xs transition-colors">
                                            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                                            Run Example Code
                                        </Button>
                                    </div>
                                </div>

                                {/* Read-only Code View */}
                                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                    <pre className="font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                        <code>{solutionCode}</code>
                                    </pre>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamplesPanel;
