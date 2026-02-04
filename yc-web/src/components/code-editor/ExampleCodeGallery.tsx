import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Copy, Check, Play, Loader2, Zap } from 'lucide-react';
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

const ExampleCodeGallery: React.FC<ExampleCodeGalleryProps> = ({ onClose, currentLanguage, onApplyCode }) => {
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
            <div className="bg-white rounded-2xl shadow-xl w-[95vw] max-w-[1400px] h-[85vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Examples Gallery</h2>
                        <p className="text-sm text-gray-500 mt-1">Explore verified implementations and patterns</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-10 px-4 gap-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                    >
                        <X className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Close</span>
                    </Button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar: Problem Selection */}
                    <div className="w-[280px] shrink-0 border-r border-gray-100 bg-white flex flex-col">
                        <div className="p-6 border-b border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Problem Library</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {problems.map((problem) => (
                                <button
                                    key={problem.id}
                                    onClick={() => {
                                        setSelectedProblem(problem);
                                        setTestResults(null);
                                        setExecutionMetrics(null);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all group ${selectedProblem?.id === problem.id
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'bg-transparent hover:bg-gray-50 text-gray-600'
                                        }`}
                                >
                                    <div className="font-bold text-sm truncate">{problem.title}</div>
                                    <div className={`text-[10px] mt-0.5 ${selectedProblem?.id === problem.id ? 'text-gray-400' : 'text-gray-400'}`}>
                                        {problem.test_cases.length} Scenarios
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    {selectedProblem && (
                        <div className="flex-1 flex overflow-hidden bg-white">
                            {/* Middle Panel: Problem Statement & Metrics */}
                            <div className="w-[400px] shrink-0 border-r border-gray-100 flex flex-col bg-white">
                                <div className="p-8 overflow-y-auto space-y-10">
                                    {/* Problem Description */}
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Problem Statement</span>
                                            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{selectedProblem.title}</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {selectedProblem.description}
                                        </p>
                                    </div>

                                    {/* Execution Metrics */}
                                    {executionMetrics && (
                                        <div className="space-y-4">
                                            <div className="h-px bg-gray-100" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30">
                                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">Accuracy</div>
                                                    <div className="text-xl font-bold text-gray-900">
                                                        {executionMetrics.passed} / {executionMetrics.total}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30">
                                                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">Runtime</div>
                                                    <div className="text-xl font-bold text-gray-900">
                                                        {(executionMetrics.total_time * 1000).toFixed(0)}ms
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Test Cases */}
                                    <div className="space-y-6">
                                        <div className="h-px bg-gray-100" />
                                        <div className="space-y-6">
                                            {selectedProblem.test_cases.map((tc, idx) => (
                                                <div key={idx} className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Case {idx + 1}</span>
                                                        {testResults && testResults[idx] && (
                                                            <span className={`text-[10px] font-bold uppercase ${testResults[idx].passed ? 'text-green-600' : 'text-red-600'}`}>
                                                                {testResults[idx].passed ? 'Passed' : 'Failed'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <div className="text-[9px] text-gray-400 uppercase font-bold tracking-widest pl-1">Input</div>
                                                            <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono text-gray-700 border border-gray-100">{tc.input || '(none)'}</div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="text-[9px] text-gray-400 uppercase font-bold tracking-widest pl-1">Expected</div>
                                                            <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono text-gray-700 border border-gray-100">{tc.expected_output}</div>
                                                        </div>
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
                                <div className="px-8 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compiler</span>
                                            <div className="text-xs font-bold text-gray-900 px-3 py-1 bg-gray-100 rounded-lg capitalize">
                                                {selectedLanguage}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-9 text-xs font-bold text-gray-500 hover:text-gray-900 rounded-xl px-4"
                                            onClick={() => handleCopy(solutionCode, selectedProblem.id + selectedLanguage)}
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            {copiedId === selectedProblem.id + selectedLanguage ? 'Copied' : 'Copy'}
                                        </Button>
                                        <div className="w-px h-6 bg-gray-100 mx-1" />
                                        <Button
                                            size="sm"
                                            onClick={handleRun}
                                            disabled={isRunning}
                                            className="h-9 px-6 bg-gray-900 hover:bg-black text-white rounded-xl shadow-lg shadow-gray-200 font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                                        >
                                            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Play className="h-3.5 w-3.5 mr-2 fill-current" />}
                                            Run Code
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => onApplyCode(solutionCode)}
                                            className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100 font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                                        >
                                            <Zap className="h-3.5 w-3.5 mr-2 fill-current" />
                                            Apply code
                                        </Button>
                                    </div>
                                </div>

                                {/* Language Selection (Internal to Editor) */}
                                <div className="px-8 py-3 bg-white border-b border-gray-50 shrink-0 overflow-x-auto no-scrollbar">
                                    <div className="flex items-center gap-2">
                                        {LANGUAGES.map(lang => (
                                            <button
                                                key={lang.id}
                                                onClick={() => { setSelectedLanguage(lang.id); setTestResults(null); setExecutionMetrics(null); }}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${selectedLanguage === lang.id
                                                    ? 'bg-gray-100 text-gray-900'
                                                    : 'bg-transparent text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Code Display Area */}
                                <div className="flex-1 p-8 bg-gray-50/50 overflow-hidden">
                                    <div className="h-full rounded-2xl overflow-hidden border border-gray-200 bg-white flex flex-col shadow-sm">
                                        <div className="flex-1 overflow-auto custom-scrollbar">
                                            <pre className="p-8 text-sm font-mono text-gray-800 leading-relaxed">
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
