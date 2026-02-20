import React, { useState } from 'react';
import { TestCase } from '@/services/questionService';
import MonacoCodeEditor from '@/components/code-editor/MonacoCodeEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit3, Trash2, Code, Maximize2, CheckCircle, AlertCircle, Play, XCircle, Terminal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import codeEditorService from '@/services/codeEditorService';

export interface Solution {
    id?: string;
    title: string;
    language: string;
    code: string;
    complexity_analysis?: string;
    is_primary: boolean;
}

interface SolutionManagerProps {
    solutions: Solution[];
    onChange: (solutions: Solution[]) => void;
    testCases?: TestCase[];
    onTestCasesChange?: (testCases: TestCase[]) => void;
}

const SolutionManager: React.FC<SolutionManagerProps> = ({ solutions, onChange, testCases = [], onTestCasesChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const [currentSolution, setCurrentSolution] = useState<Solution>({
        title: '',
        language: 'python',
        code: '',
        complexity_analysis: '',
        is_primary: false
    });

    const [isRunning, setIsRunning] = useState(false);
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [sidebarTab, setSidebarTab] = useState<'solution' | 'testcases'>('solution');

    const handleOpenModal = (index?: number) => {
        if (index !== undefined) {
            setEditingIndex(index);
            setCurrentSolution({ ...solutions[index] });
        } else {
            setEditingIndex(null);
            setCurrentSolution({
                title: '',
                language: 'python',
                code: '',
                complexity_analysis: '',
                is_primary: solutions.length === 0 // Make primary if it's the first one
            });
        }
        setExecutionResult(null);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!currentSolution.title.trim()) {
            toast.error('Please enter a title for the solution');
            return;
        }
        if (!currentSolution.code.trim()) {
            toast.error('Please enter solution code');
            return;
        }

        const newSolutions = solutions.map(s => ({ ...s }));

        // If setting as primary, unset others
        if (currentSolution.is_primary) {
            newSolutions.forEach(s => s.is_primary = false);
        }

        if (editingIndex !== null) {
            newSolutions[editingIndex] = currentSolution;
            toast.success('Solution updated');
        } else {
            newSolutions.push(currentSolution);
            toast.success('Solution added');
        }

        onChange(newSolutions);
        setIsModalOpen(false);
    };

    const handleDelete = (index: number) => {
        const newSolutions = solutions.filter((_, i) => i !== index);
        // If deleted was primary, make the first remaining one primary (optional logic)
        if (solutions[index].is_primary && newSolutions.length > 0) {
            newSolutions[0].is_primary = true;
        }
        onChange(newSolutions);
        toast.success('Solution removed');
    };

    const handleRunCode = async () => {
        if (!currentSolution.code.trim()) {
            toast.error("Please enter some code to run");
            return;
        }

        setIsRunning(true);
        setExecutionResult(null);

        try {
            const formattedTestCases = testCases.map(tc => ({
                input: tc.input || '',
                expected_output: tc.expected_output || '',
                weight: 1
            }));

            const result = await codeEditorService.runCode({
                code: currentSolution.code,
                language: currentSolution.language,
                test_cases: formattedTestCases,
                problem_title: "Solution Test Run"
            });

            setExecutionResult(result);
            if (result.status === 'completed' && result.test_results?.success) {
                toast.success("Code executed successfully!");
            } else {
                toast.warning("Code execution finished with errors");
            }

        } catch (error) {
            console.error("Run code error:", error);
            toast.error("Failed to execute code");
            setExecutionResult({
                status: 'error',
                error_message: error instanceof Error ? error.message : "Unknown error occurred"
            });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">Reference Solutions</Label>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenModal()}
                    className="border-dashed border-amber-300 text-amber-600 hover:bg-amber-50"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Solution
                </Button>
            </div>

            {solutions.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <Code className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No reference solutions added yet.</p>
                    <p className="text-xs text-slate-400">Add solutions to help students learn different approaches.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {solutions.map((solution, index) => (
                        <Card key={index} className="bg-white border hover:shadow-sm transition-shadow">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-md">
                                        <Code className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-slate-900">{solution.title}</h4>
                                            {solution.is_primary && (
                                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                                                    Primary
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <Badge variant="outline" className="uppercase text-[10px]">{solution.language}</Badge>
                                            {solution.complexity_analysis && (
                                                <span className="flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Has complexity notes
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleOpenModal(index)}
                                        className="text-slate-500 hover:text-amber-600"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(index)}
                                        className="text-slate-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Maximized Editor Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0 bg-slate-50 rounded-lg overflow-hidden">
                    <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                        <DialogTitle className="flex items-center justify-between">
                            <span>{editingIndex !== null ? 'Edit Solution' : 'Add New Solution'}</span>
                            <div className="flex items-center gap-2 mr-8">
                                <Badge variant="outline" className="font-normal text-slate-500">
                                    <Maximize2 className="w-3 h-3 mr-1" />
                                    Maximized View
                                </Badge>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Tabbed Sidebar */}
                        <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
                            {/* Tab Buttons */}
                            <div className="flex border-b border-slate-200 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setSidebarTab('solution')}
                                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${sidebarTab === 'solution'
                                            ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/50'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <Code className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                                    Solution
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSidebarTab('testcases')}
                                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${sidebarTab === 'testcases'
                                            ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/50'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <CheckCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                                    Test Cases
                                    {testCases.length > 0 && (
                                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-slate-200 text-slate-600">
                                            {testCases.length}
                                        </Badge>
                                    )}
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto p-5">
                                {sidebarTab === 'solution' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solution Title</Label>
                                            <Input
                                                value={currentSolution.title}
                                                onChange={(e) => setCurrentSolution({ ...currentSolution, title: e.target.value })}
                                                placeholder="e.g. Brute Force Approach"
                                                className="mt-1.5"
                                            />
                                        </div>

                                        <div className="flex items-center space-x-2 pt-1">
                                            <Checkbox
                                                id="is_primary"
                                                checked={currentSolution.is_primary}
                                                onCheckedChange={(checked) => setCurrentSolution({ ...currentSolution, is_primary: checked === true })}
                                            />
                                            <Label htmlFor="is_primary" className="text-sm font-medium leading-none cursor-pointer">
                                                Set as Primary Solution
                                            </Label>
                                        </div>

                                        <div>
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Complexity Analysis / Notes</Label>
                                            <Textarea
                                                value={currentSolution.complexity_analysis || ''}
                                                onChange={(e) => setCurrentSolution({ ...currentSolution, complexity_analysis: e.target.value })}
                                                placeholder="Explain time and space complexity..."
                                                className="mt-1.5 min-h-[150px]"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Test Cases</Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const updated = [...testCases, { input: '', expected_output: '', description: '' }];
                                                    onTestCasesChange?.(updated);
                                                }}
                                                className="h-7 text-xs border-dashed border-amber-300 text-amber-600 hover:bg-amber-50"
                                            >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Add
                                            </Button>
                                        </div>

                                        {testCases.length === 0 ? (
                                            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                                <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                                <p className="text-xs text-slate-500">No test cases defined yet.</p>
                                                <p className="text-[10px] text-slate-400 mt-1">Add test cases to verify your solution.</p>
                                            </div>
                                        ) : (
                                            testCases.map((tc, idx) => (
                                                <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-slate-600">Case {idx + 1}</span>
                                                        {testCases.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    const updated = testCases.filter((_, i) => i !== idx);
                                                                    onTestCasesChange?.(updated);
                                                                }}
                                                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] text-slate-500">Input</Label>
                                                        <Textarea
                                                            value={tc.input}
                                                            onChange={(e) => {
                                                                const updated = [...testCases];
                                                                updated[idx] = { ...updated[idx], input: e.target.value };
                                                                onTestCasesChange?.(updated);
                                                            }}
                                                            placeholder="Enter input"
                                                            rows={2}
                                                            className="text-xs font-mono mt-0.5"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] text-slate-500">Expected Output</Label>
                                                        <Textarea
                                                            value={tc.expected_output}
                                                            onChange={(e) => {
                                                                const updated = [...testCases];
                                                                updated[idx] = { ...updated[idx], expected_output: e.target.value };
                                                                onTestCasesChange?.(updated);
                                                            }}
                                                            placeholder="Enter expected output"
                                                            rows={2}
                                                            className="text-xs font-mono mt-0.5"
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Code Editor & Output Area */}
                        <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0">
                            <div className="flex-1 p-6 pb-2 min-h-0">
                                <div className="h-full relative rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                    <MonacoCodeEditor
                                        value={currentSolution.code}
                                        onChange={(value) => setCurrentSolution({ ...currentSolution, code: value })}
                                        language={currentSolution.language}
                                        onLanguageChange={(value) => setCurrentSolution({ ...currentSolution, language: value })}
                                        height="100%"
                                        theme="custom-light"
                                    />
                                </div>
                            </div>

                            {/* Execution Result Panel */}
                            {executionResult && (
                                <div className="h-48 px-6 pb-4 shrink-0 transition-all duration-300">
                                    <div className="h-full bg-slate-900 rounded-xl overflow-hidden flex flex-col border border-slate-700 shadow-lg">
                                        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Terminal className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Execution Output</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {executionResult.status === 'completed' ? (
                                                    executionResult.test_results?.success ? (
                                                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20">
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Passed
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">
                                                            <XCircle className="w-3 h-3 mr-1" /> Failed
                                                        </Badge>
                                                    )
                                                ) : (
                                                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">
                                                        Error
                                                    </Badge>
                                                )}
                                                <button
                                                    onClick={() => setExecutionResult(null)}
                                                    className="text-slate-500 hover:text-slate-300"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300">
                                            {executionResult.error_message ? (
                                                <div className="text-red-400 whitespace-pre-wrap">{executionResult.error_message}</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="text-emerald-400">Output:</div>
                                                    <div className="whitespace-pre-wrap text-slate-400 pl-2 border-l-2 border-slate-700">{executionResult.output}</div>

                                                    {executionResult.test_results?.results && (
                                                        <div className="mt-4 pt-4 border-t border-slate-700">
                                                            <div className="text-blue-400 mb-2">Test Cases ({executionResult.test_results.passed}/{executionResult.test_results.total}):</div>
                                                            <div className="space-y-1">
                                                                {executionResult.test_results.results.map((res: any, i: number) => (
                                                                    <div key={i} className={`flex items-center gap-2 ${res.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {res.passed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                                        <span>Case {i + 1}: {res.passed ? 'Passed' : 'Failed'}</span>
                                                                        {!res.passed && <span className="text-slate-500">- Expected: {res.expected_output}, Got: {res.actual_output}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between sm:justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRunCode}
                                disabled={isRunning}
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                            >
                                {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                                {isRunning ? 'Running...' : 'Run Code'}
                            </Button>
                            {testCases.length === 0 && (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    No test cases defined
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">
                                {editingIndex !== null ? 'Update Solution' : 'Add Solution'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SolutionManager;
