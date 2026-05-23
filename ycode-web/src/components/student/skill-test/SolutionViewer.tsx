import React, { useState } from 'react';
import MonacoCodeEditor from '@/components/code-editor/MonacoCodeEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code, Split, FileText, CheckCircle } from 'lucide-react';
import { Solution } from '@/components/instructor/courses/SolutionManager';

interface SolutionViewerProps {
    solutions: Solution[];
    defaultSolutionCode?: string;
    defaultSolutionLanguage?: string;
    studentCode?: string;
    studentLanguage?: string;
}

const SolutionViewer: React.FC<SolutionViewerProps> = ({
    solutions,
    defaultSolutionCode,
    defaultSolutionLanguage,
    studentCode,
    studentLanguage
}) => {
    const [viewMode, setViewMode] = useState<'standard' | 'diff'>('standard');
    const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);

    // normalize solutions or use default
    const effectiveSolutions: Solution[] = (solutions && solutions.length > 0)
        ? solutions
        : (defaultSolutionCode
            ? [{
                title: 'Reference Solution',
                approach: 'optimal',
                language: defaultSolutionLanguage || 'python',
                code: defaultSolutionCode,
                is_primary: true
            }]
            : []);

    if (effectiveSolutions.length === 0) return null;

    const currentSolution = effectiveSolutions[activeSolutionIndex];
    const canCompare = !!studentCode;

    return (
        <div className="space-y-4 border rounded-xl p-4 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                {/* Solution Tabs */}
                <div className="flex flex-wrap gap-2">
                    {effectiveSolutions.map((s, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveSolutionIndex(idx)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border flex items-center gap-2 ${activeSolutionIndex === idx
                                ? 'bg-white border-saffron-200 text-saffron-700 shadow-sm ring-1 ring-saffron-50'
                                : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            {s.title || `Solution ${idx + 1}`}
                            {s.is_primary && <CheckCircle className="w-3 h-3 text-green-500" />}
                        </button>
                    ))}
                </div>

                {/* View Toggle */}
                {canCompare && (
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('standard')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'standard'
                                ? 'bg-slate-100 text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <Code className="w-3.5 h-3.5" />
                            Code
                        </button>
                        <button
                            onClick={() => setViewMode('diff')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'diff'
                                ? 'bg-slate-100 text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <Split className="w-3.5 h-3.5" />
                            Diff vs Your Code
                        </button>
                    </div>
                )}
            </div>

            {/* Info Bar */}
            <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
                <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-normal">
                    {currentSolution.language}
                </Badge>
                {currentSolution.complexity_analysis && (
                    <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        <FileText className="w-3 h-3" />
                        Complexity Notes Available
                    </span>
                )}
            </div>

            {/* Editor Content */}
            <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
                {viewMode === 'standard' ? (
                    <MonacoCodeEditor
                        value={currentSolution.code}
                        onChange={() => { }}
                        language={currentSolution.language}
                        readOnly={true}
                        height="300px"
                    />
                ) : (
                    <MonacoCodeEditor
                        value={currentSolution.code}
                        onChange={() => { }}
                        language={currentSolution.language}
                        mode="diff"
                        original={studentCode || ''}
                        readOnly={true}
                        height="400px"
                    />
                )}
            </div>

            {/* Complexity Analysis Section */}
            {currentSolution.complexity_analysis && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 mt-2">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Complexity Analysis
                    </h4>
                    <p className="text-sm text-amber-900/80 whitespace-pre-wrap leading-relaxed">
                        {currentSolution.complexity_analysis}
                    </p>
                </div>
            )}
        </div>
    );
};

export default SolutionViewer;
