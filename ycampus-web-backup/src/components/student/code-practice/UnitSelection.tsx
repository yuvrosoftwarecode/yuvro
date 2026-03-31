// src/components/student/code-practice/UnitSelection.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code2 } from 'lucide-react';
import {
    fetchUnitsBySubject,
    fetchSubUnitsByUnit,
} from '@/services/subjectService';
import { fetchQuestions } from '@/services/questionService';
import type { Subject, Unit, CodingProblem } from '@/pages/student/CodePractice';
import { toast } from 'sonner';
import UnitSidebar, { SidebarSubject, SidebarUnit } from '@/components/student/skill-test/UnitSidebar';

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
    const [loading, setLoading] = useState(true);
    const [problemsLoading, setProblemsLoading] = useState(false);
    const [difficulty, setDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');

    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Load units
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

                setUnits(
                    unitsWithCounts.sort((a: any, b: any) => a.order_index - b.order_index)
                );
            } catch (error) {
                toast.error('Failed to load units');
            } finally {
                setLoading(false);
            }
        };

        loadUnits();
    }, [subject.id]);

    // Load problems when unit or difficulty changes
    useEffect(() => {
        if (selectedUnit) loadProblems(selectedUnit.id);
    }, [selectedUnit, difficulty]);

    const loadProblems = async (unitId: string) => {
        setProblemsLoading(true);
        try {
            // 1. Try fetching questions directly for the unit
            const unitFilters: any = {
                unit: unitId,
                type: 'coding'
            };
            
            if (difficulty !== 'All') {
                unitFilters.difficulty = difficulty.toLowerCase();
            }

            console.log('Fetching unit questions with filters:', unitFilters);
            let questions = await fetchQuestions(unitFilters);
            
            // 2. If no questions found at unit level, try fetching sub-units and their questions
            // This is because often questions are linked to sub-units in this platform
            if (questions.length === 0) {
                console.log('No unit-level questions, trying sub-units...');
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

            console.log('Total questions found:', questions.length);

            const transformedProblems: CodingProblem[] = questions.map((q: any) => ({
                id: q.id,
                title: q.title,
                difficulty: q.difficulty === 'easy' ? 'Easy' :
                    q.difficulty === 'medium' ? 'Medium' : 'Hard',
                score: q.marks,
                description: q.content,
                test_cases_basic: q.test_cases_basic?.map((tc: any) => ({
                    input: tc.input || '',
                    expected_output: tc.expected_output || '',
                    weight: tc.weight || 1
                })) || [],
                test_cases_advanced: q.test_cases_advanced?.map((tc: any) => ({
                    input: tc.input || '',
                    expected_output: tc.expected_output || '',
                    weight: tc.weight || 1
                })) || [],
            }));

            setProblems(transformedProblems);
        } catch (error) {
            console.error('Failed to load problems:', error);
            toast.error('Failed to load problems');
        } finally {
            setProblemsLoading(false);
        }
    };

    // Problems are already filtered by the server based on difficulty
    const filteredProblems = problems;

    // Difficulty badge colors (pure Tailwind)
    const difficultyColors = {
        Easy: 'bg-green-100 text-green-700 border border-green-300',
        Medium: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
        Hard: 'bg-red-100 text-red-700 border border-red-300',
    };

    // Construct SidebarSubject object for UnitSidebar
    const sidebarSubject: SidebarSubject = {
        id: subject.id,
        name: subject.name,
        icon: '💻', // Or subject.icon if available
        units: units.map(u => ({
            id: u.id,
            name: u.name,
            problemCount: u.problemCount,
            progress: u.progress
        }))
    };

    return (
        <div className="flex flex-1 w-full h-full min-h-0 overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm">
            {/* Reusable Sidebar */}
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
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto">
                <div className="p-6 min-h-full">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
                        <Button variant="ghost" size="sm" onClick={onBack} className="h-auto p-0 hover:bg-transparent hover:text-gray-900 transition-colors">
                            Code Practice
                        </Button>
                        <span>/</span>
                        <span className="text-gray-700 font-medium">{subject.name}</span>
                        {selectedUnit && (
                            <>
                                <span>/</span>
                                <span className="text-gray-900 font-semibold">{selectedUnit.name}</span>
                            </>
                        )}
                    </div>

                    {!selectedUnit ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
                            <div className="bg-blue-50 p-4 rounded-full mb-4">
                                <Code2 className="h-10 w-10 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Select a Unit
                            </h3>
                            <p className="text-gray-500 max-w-md">
                                Choose a unit from the sidebar to view practice problems and start coding.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedUnit.name}</h2>
                                    <p className="text-gray-500 text-sm mt-1">
                                        {filteredProblems.length} problems available
                                    </p>
                                </div>

                                {/* Difficulty Filter */}
                                <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                                    {(['All', 'Easy', 'Medium', 'Hard'] as const).map((level) => (
                                        <button
                                            key={level}
                                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${difficulty === level
                                                ? 'bg-black text-white shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                }`}
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
                                        <div
                                            key={i}
                                            className="h-48 bg-gray-200 rounded animate-pulse"
                                        ></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {filteredProblems.map((problem) => (
                                        <Card
                                            key={problem.id}
                                            className="group border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <CardTitle className="text-base font-semibold text-gray-900 leading-tight">
                                                        {problem.title}
                                                    </CardTitle>
                                                    <Badge
                                                        variant="outline"
                                                        className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border-0 ${difficultyColors[problem.difficulty]}`}
                                                    >
                                                        {problem.difficulty}
                                                    </Badge>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="space-y-4">
                                                <p className="text-sm text-gray-600 line-clamp-2 h-10">
                                                    {problem.description}
                                                </p>

                                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                    <span className="text-xs font-medium text-gray-500">
                                                        Score: <span className="text-gray-900">{problem.score}</span>
                                                    </span>

                                                    <Button
                                                        size="sm"
                                                        className="bg-gray-900 text-white hover:bg-black transition-colors shadow-sm text-xs h-8"
                                                        onClick={() => onProblemSelect(problem)}
                                                    >
                                                        Solve Challenge
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {filteredProblems.length === 0 && (
                                        <div className="col-span-full py-16 text-center bg-white rounded-xl border border-gray-200 border-dashed">
                                            <Code2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                                                No Problems Found
                                            </h3>
                                            <p className="text-gray-500 text-sm">
                                                Try selecting a different difficulty level.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnitSelection;
