import React, { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit3, Trash2, Code, Maximize2, AlertCircle, XCircle, Terminal, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import codeEditorService from '@/services/codeEditorService';

export interface Solution {
    id?: string;
    title: string;
    approach: string;
    language: string;
    code: string;
    complexity_analysis?: string;
    is_primary: boolean;
}

interface SolutionManagerProps {
    solutions: Solution[];
    onChange: (solutions: Solution[]) => void;
    testCases?: { input: string; expected_output: string }[];
}

const SolutionManager: React.FC<SolutionManagerProps> = ({
    solutions,
    onChange,
    testCases = [],
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const [currentSolution, setCurrentSolution] = useState<Solution>({
        title: '',
        approach: 'optimal',
        language: 'python',
        code: '',
        complexity_analysis: '',
        is_primary: false
    });

    const [isRunning, setIsRunning] = useState(false);
    const [executionResult, setExecutionResult] = useState<any>(null);

    const handleOpenModal = (index?: number) => {
        if (index !== undefined) {
            setEditingIndex(index);
            setCurrentSolution({ ...solutions[index] });
        } else {
            setEditingIndex(null);
            setCurrentSolution({
                title: '',
                approach: 'optimal',
                language: 'python',
                code: '',
                complexity_analysis: '',
                is_primary: solutions.length === 0
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
            const result = await codeEditorService.runCode({
                code: currentSolution.code,
                language: currentSolution.language,
                test_cases: testCases.map(tc => ({
                    input: tc.input || '',
                    expected_output: tc.expected_output || '',
                    weight: 1
                })),
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
                <div className="flex items-center gap-2">
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
                                            {solution.approach && (
                                                <Badge variant="outline" className="text-[10px] capitalize text-indigo-600 border-indigo-200 bg-indigo-50">
                                                    {{ brute_force: 'Brute Force', better: 'Better', optimal: 'Optimal' }[solution.approach] || solution.approach}
                                                </Badge>
                                            )}
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

            {/* Solution Editor Modal */}            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0 bg-slate-50 rounded-2xl overflow-visible">
                    <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200 shrink-0 rounded-t-2xl">
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
                        {/* Sidebar */}
                        <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solution Title</Label>
                                    <Input
                                        value={currentSolution.title}
                                        onChange={(e) => setCurrentSolution({ ...currentSolution, title: e.target.value })}
                                        placeholder="e.g. Brute Force Approach"
                                        className="mt-1.5"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approach</Label>
                                    <Select
                                        value={currentSolution.approach}
                                        onValueChange={(val) => setCurrentSolution({ ...currentSolution, approach: val })}
                                    >
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue placeholder="Select approach" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="brute_force">Brute Force</SelectItem>
                                            <SelectItem value="better">Better</SelectItem>
                                            <SelectItem value="optimal">Optimal</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                                    {executionResult.test_results?.results?.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-slate-700">
                                                            <div className="text-blue-400 mb-2">
                                                                Test Cases ({executionResult.test_results.passed}/{executionResult.test_results.total}):
                                                            </div>
                                                            <div className="space-y-1">
                                                                {executionResult.test_results.results.map((res: any, i: number) => (
                                                                    <div key={i} className={`flex items-center gap-2 ${res.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {res.passed ? <CheckCircle className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                                                                        <span>Case {i + 1}: {res.passed ? 'Passed' : `Failed — expected: ${res.expected_output}, got: ${res.actual_output}`}</span>
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

                    <DialogFooter className="px-6 py-4 bg-white border-t border-slate-200 shrink-0 rounded-b-2xl">
                        <div className="flex items-center justify-between w-full">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRunCode}
                                disabled={isRunning}
                                className="border-slate-300 text-slate-600 hover:bg-slate-50"
                            >
                                {isRunning ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4 mr-2" />Run Code</>
                                )}
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="button" onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">
                                    {editingIndex !== null ? 'Update Solution' : 'Add Solution'}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SolutionManager;
