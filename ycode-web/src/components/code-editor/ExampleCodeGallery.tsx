import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Copy, Check, Play, Loader2, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import codeEditorService from '@/services/codeEditorService';
import restApiUtilCodeExecuter from '@/utils/RestApiUtilCodeExecuter';
import MonacoCodeEditor from './MonacoCodeEditor';

interface TestCase { input: string; expected_output: string; }
interface ExampleProblem { id: string; title: string; description: string; test_cases: TestCase[]; solutions: Record<string, string>; }
interface TestResultItem { passed: boolean; input: string; expected_output: string; actual_output: string; error?: string; execution_time?: number; }
interface ExecutionMetrics { total_time: number; passed: number; total: number; performance_warnings?: any[]; status?: string; }

interface ExampleCodeGalleryProps {
    onClose: () => void;
    currentLanguage: string;
    onApplyCode: (code: string) => void;
}

const ExampleCodeGallery: React.FC<ExampleCodeGalleryProps> = ({ onClose, currentLanguage, onApplyCode }) => {
    const [problems, setProblems] = useState<ExampleProblem[]>([]);
    const [selectedProblem, setSelectedProblem] = useState<ExampleProblem | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(currentLanguage);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<TestResultItem[] | null>(null);
    const [executionMetrics, setExecutionMetrics] = useState<ExecutionMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Sidebar collapse
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Panel widths (percent of container)
    const [sidebarWidth, setSidebarWidth] = useState(18);   // ~224px at 1200px
    const [middleWidth, setMiddleWidth] = useState(28);     // ~336px

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

    // Drag logic
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
        const code = selectedProblem.solutions[selectedLanguage];
        if (!code) { toast.error('No solution for this language'); return; }
        setIsRunning(true); setTestResults(null); setExecutionMetrics(null);
        try {
            const res = await codeEditorService.runCode({
                code, language: selectedLanguage,
                test_cases: selectedProblem.test_cases.map(tc => ({ input: tc.input, expected_output: tc.expected_output, weight: 1 })),
                test_cases_custom: [], problem_title: selectedProblem.title,
            });
            if (res.test_results?.results) {
                setTestResults(res.test_results.results);
                const passed = res.test_results.passed || 0;
                const total = res.test_results.total || 0;
                const totalTime = res.test_results.results.reduce((a: number, r: any) => a + (r.execution_time || 0), 0);
                setExecutionMetrics({ total_time: totalTime, passed, total, performance_warnings: res.performance_warnings, status: res.status });
                if (res.status === 'failed' && res.performance_warnings && res.performance_warnings.length > 0) {
                    const isTLE = res.performance_warnings[0].type === 'Time Limit Exceeded';
                    toast.error(isTLE ? 'Time Limit Exceeded' : 'Memory Limit Exceeded');
                } else {
                    passed === total ? toast.success(`All ${total} tests passed!`) : toast.error(`${passed}/${total} tests passed`);
                }
            } else { toast.error(res.error_message || 'Execution failed'); }
        } catch { toast.error('Failed to run code'); }
        finally { setIsRunning(false); }
    };

    const solutionCode = selectedProblem?.solutions[selectedLanguage] || '// No solution available';
    const copyKey = selectedProblem ? selectedProblem.id + selectedLanguage : '';

    if (isLoading) return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-saffron-600" />
                <p className="text-sm text-gray-500 font-medium">Loading examples...</p>
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Examples Gallery</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Explore verified implementations and patterns</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* ── Sidebar ── */}
                    <div
                        className="shrink-0 border-r border-gray-100 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
                        style={{ width: sidebarCollapsed ? '36px' : `${sidebarWidth}%` }}
                    >
                        {/* Sidebar header */}
                        <div className="h-10 flex items-center justify-between px-3 border-b border-gray-100 shrink-0">
                            {!sidebarCollapsed && (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Library</span>
                            )}
                            <button
                                onClick={() => setSidebarCollapsed(p => !p)}
                                className="ml-auto h-6 w-6 flex items-center justify-center text-gray-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-md transition-all"
                                title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                            >
                                {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                            </button>
                        </div>

                        {/* Problem list */}
                        {!sidebarCollapsed && (
                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                {problems.map((problem) => (
                                    <button
                                        key={problem.id}
                                        onClick={() => { setSelectedProblem(problem); setTestResults(null); setExecutionMetrics(null); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${selectedProblem?.id === problem.id ? 'bg-saffron-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className={`text-xs font-semibold truncate ${selectedProblem?.id === problem.id ? 'text-saffron-700' : 'text-gray-800'}`}>
                                            {problem.title}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{problem.test_cases.length} scenarios</div>
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
                                        className={`w-full py-3 flex items-center justify-center transition-all ${selectedProblem?.id === problem.id ? 'bg-saffron-50' : 'hover:bg-gray-50'}`}
                                        title={problem.title}
                                    >
                                        <span className={`text-[8px] font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 ${selectedProblem?.id === problem.id ? 'text-saffron-600' : 'text-gray-400'}`}>
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
                            <div className="w-1 h-10 bg-saffron-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm" />
                        </div>
                    )}

                    {/* ── Middle panel ── */}
                    {selectedProblem && (
                        <>
                            <div
                                className="shrink-0 border-r border-gray-100 flex flex-col overflow-y-auto"
                                style={{ width: `${middleWidth}%` }}
                            >
                                <div className="p-5 space-y-5">
                                    <div>
                                        <p className="text-[10px] font-bold text-saffron-600 uppercase tracking-widest mb-1">Problem Statement</p>
                                        <h3 className="text-base font-bold text-gray-900">{selectedProblem.title}</h3>
                                        <p className="text-xs text-gray-500 leading-relaxed mt-2">{selectedProblem.description}</p>
                                    </div>

                                    {executionMetrics && (
                                        <div className={`rounded-lg border px-3 py-2 flex items-center gap-5 text-xs ${executionMetrics.passed === executionMetrics.total ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                                            <span className="text-gray-600">Passed: <span className={`font-bold ${executionMetrics.passed === executionMetrics.total ? 'text-green-600' : 'text-red-500'}`}>{executionMetrics.passed}/{executionMetrics.total}</span></span>
                                            <span className="text-gray-600">Time: <span className="font-semibold text-gray-800">{(executionMetrics.total_time * 1000).toFixed(0)}ms</span></span>
                                        </div>
                                    )}

                                    {executionMetrics && executionMetrics.status === 'failed' && (() => {
                                        const warnings: any[] = executionMetrics.performance_warnings || [];
                                        if (warnings.length > 0) {
                                            const w = warnings[0];
                                            const isTLE = w.type === 'Time Limit Exceeded';
                                            return (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col mb-4">
                                                    <h4 className="text-amber-800 font-bold text-sm flex items-center gap-2">
                                                        <Zap className="h-4 w-4" />
                                                        {isTLE ? 'Time Limit Exceeded' : 'Memory Limit Exceeded'}
                                                    </h4>
                                                    <p className="text-amber-700 text-xs mt-1">
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
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Case {idx + 1}</span>
                                                    {testResults?.[idx] && (
                                                        <span className={`text-[10px] font-bold uppercase ${testResults[idx].passed ? 'text-green-600' : 'text-red-500'}`}>
                                                            {testResults[idx].passed 
                                                                ? (testResults[idx].error === 'Time Limit Exceeded' ? 'Passed (TLE)' 
                                                                    : testResults[idx].error === 'Memory Limit Exceeded' ? 'Passed (MLE)' 
                                                                    : 'Passed') 
                                                                : 'Failed'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 space-y-1.5 font-mono text-xs">
                                                    <div><span className="font-bold text-gray-500">Input: </span><span className="text-gray-800">{tc.input || '(none)'}</span></div>
                                                    <div><span className="font-bold text-gray-500">Output: </span><span className="text-emerald-700">{tc.expected_output}</span></div>
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
                                <div className="w-1 h-10 bg-saffron-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm" />
                            </div>

                            {/* ── Code panel ── */}
                            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                                {/* Toolbar */}
                                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-slate-50">
                                    {/* Language dropdown */}
                                    <Select
                                        value={selectedLanguage}
                                        onValueChange={(v) => { setSelectedLanguage(v); setTestResults(null); setExecutionMetrics(null); }}
                                    >
                                        <SelectTrigger className="h-8 w-36 bg-white border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-saffron-100 transition-all">
                                            <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-gray-100 shadow-2xl bg-white z-[11000]">
                                            <SelectItem value="python" className="text-xs font-bold py-2 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Python 3</SelectItem>
                                            <SelectItem value="javascript" className="text-xs font-bold py-2 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">JavaScript</SelectItem>
                                            <SelectItem value="java" className="text-xs font-bold py-2 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Java</SelectItem>
                                            <SelectItem value="cpp" className="text-xs font-bold py-2 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">C++</SelectItem>
                                            <SelectItem value="c" className="text-xs font-bold py-2 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">C</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" className="h-8 px-3 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg" onClick={() => handleCopy(solutionCode, copyKey)}>
                                            {copiedId === copyKey ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                                            {copiedId === copyKey ? 'Copied' : 'Copy'}
                                        </Button>
                                        <Button size="sm" onClick={handleRun} disabled={isRunning} className="h-8 px-4 bg-gray-900 hover:bg-black text-white rounded-lg font-semibold text-xs">
                                            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                                            Run
                                        </Button>
                                        <Button size="sm" onClick={() => onApplyCode(solutionCode)} className="h-8 px-4 bg-saffron-600 hover:bg-saffron-700 text-white rounded-lg font-semibold text-xs">
                                            <Zap className="h-3.5 w-3.5 mr-1.5" />
                                            Apply
                                        </Button>
                                    </div>
                                </div>

                                {/* Monaco read-only */}
                                <div className="flex-1 overflow-hidden">
                                    <MonacoCodeEditor
                                        value={solutionCode}
                                        onChange={() => {}}
                                        language={selectedLanguage}
                                        readOnly={true}
                                        height="100%"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExampleCodeGallery;
