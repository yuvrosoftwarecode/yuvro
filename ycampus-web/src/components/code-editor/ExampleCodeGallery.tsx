import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Copy, Check, Play, BookOpen, Loader2, CheckCircle2, XCircle, Code2, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import codeEditorService from '@/services/codeEditorService';
import restApiUtilCodeExecuter from '@/utils/RestApiUtilCodeExecuter';

interface TestCase {
    input: string;
    expected_output: string;
}

interface ExampleProblem {
    id: string;
    title: string;
    description: string;
    test_cases: TestCase[];
    solutions: Record<string, string>;
}

interface TestResultItem {
    passed: boolean;
    input: string;
    expected_output: string;
    actual_output: string;
    error?: string;
    execution_time?: number;
}

interface ExecutionMetrics {
    total_time: number;
    passed: number;
    total: number;
}

const LANGUAGES = [
    { id: 'python', label: 'Python', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'javascript', label: 'JavaScript', color: 'bg-amber-100 text-amber-700' },
    { id: 'java', label: 'Java', color: 'bg-red-100 text-red-700' },
    { id: 'cpp', label: 'C++', color: 'bg-blue-100 text-blue-700' },
    { id: 'c', label: 'C', color: 'bg-gray-100 text-gray-700' },
];

interface ExampleCodeGalleryProps {
    onClose: () => void;
    currentLanguage: string;
    onApplyCode: (code: string) => void;
}

const ExampleCodeGallery: React.FC<ExampleCodeGalleryProps> = ({ onClose, currentLanguage }) => {
    const [problems, setProblems] = useState<ExampleProblem[]>([]);
    const [selectedProblem, setSelectedProblem] = useState<ExampleProblem | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(currentLanguage);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<TestResultItem[] | null>(null);
    const [executionMetrics, setExecutionMetrics] = useState<ExecutionMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProblems = async () => {
            setIsLoading(true);
            try {
                const data = await restApiUtilCodeExecuter.get<any>('/supported-languages-and-templates');
                const fetchedProblems = data.example_problems || [];
                setProblems(fetchedProblems);
                if (fetchedProblems.length > 0) {
                    setSelectedProblem(fetchedProblems[0]);
                }
            } catch (err) {
                console.error('Failed to fetch example problems:', err);
                toast.error('Failed to load example problems');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProblems();
    }, []);

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        toast.success('Code copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRun = async () => {
        if (!selectedProblem) return;
        setIsRunning(true);
        setTestResults(null);
        setExecutionMetrics(null);

        const code = selectedProblem.solutions[selectedLanguage];
        if (!code) {
            toast.error('No solution available for this language');
            setIsRunning(false);
            return;
        }

        try {
            const testCases = selectedProblem.test_cases.map(tc => ({
                input: tc.input,
                expected_output: tc.expected_output,
                weight: 1,
            }));

            const res = await codeEditorService.runCode({
                code,
                language: selectedLanguage,
                test_cases: testCases,
                test_cases_custom: [],
                problem_title: selectedProblem.title,
            });

            if (res.test_results?.results) {
                setTestResults(res.test_results.results);
                const passed = res.test_results.passed || 0;
                const total = res.test_results.total || 0;
                const totalTime = res.test_results.results.reduce((acc: number, r: any) => acc + (r.execution_time || 0), 0);
                setExecutionMetrics({ total_time: totalTime, passed, total });

                if (passed === total) {
                    toast.success(`All ${total} tests passed!`);
                } else {
                    toast.error(`${passed}/${total} tests passed`);
                }
            } else {
                toast.error(res.error_message || 'Execution failed');
            }
        } catch (err) {
            console.error('Run error:', err);
            toast.error('Failed to run code');
        } finally {
            setIsRunning(false);
        }
    };

    const solutionCode = selectedProblem?.solutions[selectedLanguage] || "// No solution available";

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    <p className="text-gray-600 font-medium">Loading example problems...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[10000] flex flex-col items-center justify-start bg-black/60 backdrop-blur-sm pt-20 pb-4 px-4 animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-[98vw] max-w-[1600px] flex-1 flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                            <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-none mb-1">Example Code Gallery</h2>
                            <p className="text-xs text-gray-500 font-medium">Explore and test verified patterns and implementations</p>
                        </div>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onClose}
                        className="h-10 px-5 gap-2 shadow-sm font-bold uppercase tracking-wide"
                    >
                        <X className="h-4 w-4" />
                        Close Gallery
                    </Button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar: Problem Selection */}
                    <div className="w-[280px] shrink-0 border-r border-gray-100 bg-gray-50/50 flex flex-col">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Available Problems</h3>
                            <p className="text-[10px] text-gray-500">Select a problem to view solution</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {problems.map((problem) => (
                                <button
                                    key={problem.id}
                                    onClick={() => {
                                        setSelectedProblem(problem);
                                        setTestResults(null);
                                        setExecutionMetrics(null);
                                    }}
                                    className={`w-full text-left p-3 rounded-xl transition-all group ${selectedProblem?.id === problem.id
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-white hover:bg-gray-100 border border-gray-200 border-transparent text-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedProblem?.id === problem.id ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'
                                            }`}>
                                            <Code2 className={`h-4 w-4 ${selectedProblem?.id === problem.id ? 'text-white' : 'text-gray-500'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm truncate">{problem.title}</div>
                                            <div className={`text-[10px] truncate ${selectedProblem?.id === problem.id ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {problem.test_cases.length} Test Cases
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    {selectedProblem && (
                        <div className="flex-1 flex overflow-hidden bg-white">
                            {/* Middle Panel: Problem Statement & Metrics */}
                            <div className="w-[450px] shrink-0 border-r border-gray-100 flex flex-col bg-white">
                                <div className="p-6 overflow-y-auto space-y-8">
                                    {/* Problem Description */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] font-bold uppercase tracking-tighter">Description</Badge>
                                            <div className="h-px flex-1 bg-gray-100"></div>
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedProblem.title}</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                            {selectedProblem.description}
                                        </p>
                                    </div>

                                    {/* Execution Metrics (if available) */}
                                    {executionMetrics && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-[10px] font-bold uppercase tracking-tighter">Last Run Analytics</Badge>
                                                <div className="h-px flex-1 bg-gray-100"></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                                                    </div>
                                                    <div className="text-[10px] text-green-600 uppercase font-black mb-1">Accuracy</div>
                                                    <div className="text-2xl font-black text-green-700 tracking-tighter">
                                                        {executionMetrics.passed}/{executionMetrics.total}
                                                    </div>
                                                    <div className="text-[10px] text-green-500 font-bold">Passed Test Cases</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                                                        <Clock className="h-10 w-10 text-blue-600" />
                                                    </div>
                                                    <div className="text-[10px] text-blue-600 uppercase font-black mb-1">Performance</div>
                                                    <div className="text-2xl font-black text-blue-700 tracking-tighter">
                                                        {(executionMetrics.total_time * 1000).toFixed(1)}<span className="text-xs ml-0.5">ms</span>
                                                    </div>
                                                    <div className="text-[10px] text-blue-500 font-bold">Total Execution Time</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Test Cases */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-purple-50 text-purple-700 border-purple-100 text-[10px] font-bold uppercase tracking-tighter">Test Scenarios</Badge>
                                            <div className="h-px flex-1 bg-gray-100"></div>
                                        </div>
                                        <div className="space-y-4">
                                            {selectedProblem.test_cases.map((tc, idx) => (
                                                <div key={idx} className={`rounded-2xl border-2 transition-all p-4 ${testResults && testResults[idx]
                                                    ? testResults[idx].passed
                                                        ? 'border-green-200 bg-green-50/30'
                                                        : 'border-red-200 bg-red-50/30'
                                                    : 'border-gray-100 bg-white'
                                                    }`}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${testResults && testResults[idx]
                                                                ? testResults[idx].passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                                : 'bg-gray-900 text-white'
                                                                }`}>
                                                                {idx + 1}
                                                            </div>
                                                            <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Case #{idx + 1}</span>
                                                        </div>
                                                        {testResults && testResults[idx] && (
                                                            testResults[idx].passed
                                                                ? <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] h-5">Verified</Badge>
                                                                : <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] h-5">Failed</Badge>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest px-1">Input Data</div>
                                                            <pre className="bg-gray-50 p-3 rounded-xl text-xs font-mono text-gray-800 border border-gray-100">{tc.input || '(none)'}</pre>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest px-1">Expected Signature</div>
                                                            <pre className="bg-gray-50 p-3 rounded-xl text-xs font-mono text-gray-800 border border-gray-100">{tc.expected_output}</pre>
                                                        </div>
                                                        {testResults && testResults[idx] && !testResults[idx].passed && (
                                                            <div className="mt-2 space-y-2 pt-2 border-t border-red-100">
                                                                <div className="text-[9px] text-red-500 uppercase font-black tracking-widest px-1">Actual Result</div>
                                                                <pre className="bg-red-50 p-3 rounded-xl text-xs font-mono text-red-700 border border-red-100">
                                                                    {testResults[idx].actual_output || '(empty output)'}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Solution & Editor View */}
                            <div className="flex-1 flex flex-col bg-gray-50/30 overflow-hidden">
                                {/* Editor Header */}
                                <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-px h-4 bg-gray-200"></div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500">Language:</span>
                                            <Badge className={`${LANGUAGES.find(l => l.id === selectedLanguage)?.color} text-[10px] font-bold uppercase`}>
                                                {LANGUAGES.find(l => l.id === selectedLanguage)?.label}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-9 text-xs font-bold gap-2 border-gray-200 bg-white hover:bg-gray-50 px-4 rounded-xl"
                                            onClick={() => handleCopy(solutionCode, selectedProblem.id + selectedLanguage)}
                                        >
                                            {copiedId === selectedProblem.id + selectedLanguage ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            {copiedId === selectedProblem.id + selectedLanguage ? 'Copied to Clipboard' : 'Copy Solution'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-9 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md px-6 rounded-xl transition-all active:scale-95"
                                            onClick={handleRun}
                                            disabled={isRunning}
                                        >
                                            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                            {isRunning ? 'Running...' : 'Run Code'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Language Tabs */}
                                <div className="px-6 pt-4 bg-white shrink-0">
                                    <Tabs
                                        value={selectedLanguage}
                                        onValueChange={(v) => { setSelectedLanguage(v); setTestResults(null); setExecutionMetrics(null); }}
                                        className="w-full"
                                    >
                                        <TabsList className="bg-gray-100/50 p-1 rounded-2xl w-fit">
                                            {LANGUAGES.map(lang => (
                                                <TabsTrigger
                                                    key={lang.id}
                                                    value={lang.id}
                                                    className="px-6 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl data-[state=active]:text-indigo-600 uppercase tracking-widest"
                                                >
                                                    {lang.label}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </Tabs>
                                </div>

                                {/* Code Display Area */}
                                <div className="flex-1 p-6 overflow-hidden">
                                    <div className="h-full rounded-3xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-950 flex flex-col relative group">
                                        <div className="flex-1 overflow-auto custom-scrollbar p-1">
                                            <pre className="p-8 text-sm font-mono text-gray-300 leading-relaxed selection:bg-indigo-500/30 selection:text-white">
                                                <code>
                                                    {selectedProblem.solutions[selectedLanguage] || '// No solution available for this environment'}
                                                </code>
                                            </pre>
                                        </div>

                
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
};

export default ExampleCodeGallery;
