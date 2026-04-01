import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code2, ChevronRight, Terminal, Search, Info } from 'lucide-react';
import {
    fetchUnitsBySubject,
    fetchSubUnitsByUnit,
} from '@/services/subjectService';
import { fetchQuestions } from '@/services/questionService';
import { Subject, Unit, CodingProblem } from '@/types/codePractice';
import { toast } from 'sonner';
import UnitSidebar, { SidebarSubject, SidebarUnit } from '@/components/student/skill-test/UnitSidebar';
import { cn } from '@/lib/utils';

interface UnitSelectionProps {
    subject: Subject;
    selectedUnit: Unit | null;
    onUnitSelect: (unit: Unit) => void;
    onProblemSelect: (problem: CodingProblem) => void;
    onBack: () => void;
}

interface BackendUnit {
    id: string;
    name: string;
    order_index: number;
    total_problems?: number;
    progress_percentage?: number;
}

const UnitSelection = ({
    subject,
    selectedUnit,
    onUnitSelect,
    onProblemSelect,
    onBack,
}: UnitSelectionProps) => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [problems, setProblems] = useState<CodingProblem[]>([]);
    const [problemsLoading, setProblemsLoading] = useState(false);
    const [difficulty, setDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const loadUnits = async () => {
            try {
                const fetchedUnits = await fetchUnitsBySubject(subject.id);
                const unitsWithCounts = fetchedUnits.map((unit: BackendUnit) => ({
                    id: unit.id,
                    name: unit.name,
                    problemCount: unit.total_problems || 0,
                    order_index: unit.order_index,
                    progress: Math.round(unit.progress_percentage || 0)
                }));
                setUnits(unitsWithCounts.sort((a: any, b: any) => a.order_index - b.order_index));
            } catch (error) {
                toast.error('Failed to load units');
            }
        };
        loadUnits();
    }, [subject.id]);

    useEffect(() => {
        if (selectedUnit) loadProblems(selectedUnit.id);
    }, [selectedUnit, difficulty]);

    const loadProblems = async (unitId: string) => {
        setProblemsLoading(true);
        try {
            const unitFilters: any = { unit: unitId, type: 'coding' };
            if (difficulty !== 'All') unitFilters.difficulty = difficulty.toLowerCase();
            
            let questions = await fetchQuestions(unitFilters);
            
            if (questions.length === 0) {
                const subunits = await fetchSubUnitsByUnit(unitId);
                if (subunits && subunits.length > 0) {
                    const subunitQuestionPromises = subunits.map((su: any) => 
                        fetchQuestions({
                            sub_unit: su.id,
                            type: 'coding',
                            ...(difficulty !== 'All' ? { difficulty: difficulty.toLowerCase() as any } : {})
                        })
                    );
                    const subunitQuestionsResults = await Promise.all(subunitQuestionPromises);
                    questions = subunitQuestionsResults.flat();
                }
            }

            const transformedProblems: CodingProblem[] = questions.map((q: any) => ({
                id: q.id,
                title: q.title,
                difficulty: q.difficulty === 'easy' ? 'Easy' : q.difficulty === 'medium' ? 'Medium' : 'Hard',
                score: q.marks,
                description: q.content,
                test_cases_basic: (q.test_cases_basic || []).map((tc: any) => ({ input: tc.input || '', expected_output: tc.expected_output || '', weight: tc.weight || 1 })),
                test_cases_advanced: (q.test_cases_advanced || []).map((tc: any) => ({ input: tc.input || '', expected_output: tc.expected_output || '', weight: tc.weight || 1 })),
            }));
            setProblems(transformedProblems);
        } catch (error) {
            console.error('Failed to load problems:', error);
            toast.error('Failed to load problems');
        } finally {
            setProblemsLoading(false);
        }
    };

    const getDifficultyStyles = (diff: string) => {
        const d = diff.toLowerCase();
        if (d === 'easy') return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200';
        if (d === 'medium') return 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200';
        if (d === 'hard') return 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200';
        return 'bg-secondary text-secondary-foreground';
    };

    const sidebarSubject: SidebarSubject = {
        id: subject.id,
        name: subject.name,
        units: units.map(u => ({ id: u.id, name: u.name, problemCount: u.problemCount, progress: u.progress }))
    };

    return (
        <div className="flex flex-1 w-full h-full min-h-0 bg-background overflow-hidden">
            <UnitSidebar
                subject={sidebarSubject}
                selectedUnit={selectedUnit as SidebarUnit}
                onUnitSelect={(u) => {
                    const original = units.find(orig => orig.id === u.id);
                    if (original) onUnitSelect(original);
                }}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                showProgress={true}
                overallProgress={subject.progress}
                onBackToSubjects={onBack}
            />

            <main className="flex-1 overflow-y-auto bg-slate-50/40 custom-scrollbar">
                <div className="p-6 space-y-8 max-w-7xl mx-auto">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                        <button onClick={onBack} className="hover:text-primary transition-colors">Interview Preparation</button>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-700">{subject.name}</span>
                        {selectedUnit && (
                            <>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-primary">{selectedUnit.name}</span>
                            </>
                        )}
                    </nav>

                    {!selectedUnit ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Code2 className="h-10 w-10 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-semibold tracking-tight">Select a Practice Module</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Choose a unit from the sidebar to browse available practice problems and start coding.
                                </p>
                            </div>
                            {!sidebarOpen && (
                                <Button onClick={() => setSidebarOpen(true)} variant="outline" size="lg" className="rounded-full px-8">
                                    Browse Units
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">{selectedUnit.name}</h2>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Info className="h-4 w-4" />
                                        <span>{problems.length} problems available for practice</span>
                                    </div>
                                </div>

                                {/* Difficulty Filter */}
                                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                    {(['All', 'Easy', 'Medium', 'Hard'] as const).map((level) => (
                                        <button
                                            key={level}
                                            className={cn(
                                                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                                                difficulty === level
                                                    ? "bg-slate-900 text-white shadow-sm"
                                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                            )}
                                            onClick={() => setDifficulty(level)}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Problems Grid */}
                            {problemsLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-48 bg-white animate-pulse rounded-xl border border-slate-200"></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {problems.map((problem) => (
                                        <Card
                                            key={problem.id}
                                            className="group hover:shadow-md transition-shadow border-slate-200 rounded-xl cursor-pointer flex flex-col"
                                            onClick={() => onProblemSelect(problem)}
                                        >
                                            <CardHeader className="px-6 pt-5 pb-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-2.5 min-w-0">
                                                        <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border", getDifficultyStyles(problem.difficulty))}>
                                                            {problem.difficulty}
                                                        </Badge>
                                                        <CardTitle className="text-[18px] font-semibold text-slate-900 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                                                            {problem.title}
                                                        </CardTitle>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-50 border border-slate-200 shrink-0 min-w-[66px]">
                                                        <span className="text-[10px] font-semibold text-slate-500 uppercase leading-none mb-1">Score</span>
                                                        <span className="text-base font-bold text-slate-900">{problem.score}</span>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="flex-1 px-6 pb-5 pt-0 space-y-5">
                                                <p className="text-sm font-normal text-slate-500 min-h-[40px] leading-relaxed">
                                                    {problem.description}
                                                </p>

                                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                    <div className="flex items-center gap-2 text-xs font-normal text-slate-500">
                                                        <Terminal className="h-3.5 w-3.5" />
                                                        <span>Ready for attempt</span>
                                                    </div>

                                                    <Button
                                                        onClick={(e) => { e.stopPropagation(); onProblemSelect(problem); }}
                                                        size="sm"
                                                        className="rounded-lg h-9 font-semibold text-sm px-4"
                                                    >
                                                        Solve Challenge
                                                        <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {problems.length === 0 && (
                                        <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
                                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                                                <Search className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-semibold text-slate-900">No Challenges Found</h3>
                                                <p className="text-sm text-slate-500">Try adjusting your difficulty filter or selecting another unit.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UnitSelection;
