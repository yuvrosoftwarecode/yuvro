// src/components/student/skill-test/UnitSidebar.tsx
import { ChevronLeft, ChevronRight, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ProgressBar from '@/components/ui/ProgressBar';

export interface SidebarUnit {
    id: string;
    name: string;
    progress?: number;
    completed?: boolean;
    problemCount?: number; // Added for CodePractice compatibility
}

export interface SidebarSubject {
    id: string;
    name: string;
    icon?: React.ReactNode;
    units: SidebarUnit[];
}

interface UnitSidebarProps {
    subject: SidebarSubject;
    selectedUnit: SidebarUnit | null;
    onUnitSelect: (unit: SidebarUnit) => void;
    isOpen: boolean;
    onToggle: () => void;
    showProgress?: boolean;
    overallProgress?: number;
    onBackToSubjects?: () => void;
}

const UnitSidebar = ({
    subject,
    selectedUnit,
    onUnitSelect,
    isOpen,
    onToggle,
    showProgress = true,
    overallProgress,
    onBackToSubjects,
}: UnitSidebarProps) => {
    return (
        <div
            className={cn(
                'bg-white shadow-none transition-all duration-300 ease-in-out flex flex-col relative z-20 border-r border-gray-200'
            )}
            style={{
                width: isOpen ? "300px" : "70px",
                minWidth: isOpen ? "300px" : "70px",
            }}
        >
            {/* Scrollable content container */}
            <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                {/* CONTENT AREA */}
                {!isOpen ? (
                    <div className="flex flex-col items-center h-full py-6 gap-6 animate-fade-in">
                        <div className="w-10 h-10 flex items-center justify-center text-2xl font-semibold mb-2 bg-gray-50 rounded-xl" title={subject.name}>
                            {subject.icon || '🗂️'}
                        </div>
                        <div className="flex flex-col items-center gap-3 w-full px-2">
                            {subject.units.map((unit) => {
                                const progress = unit.progress || 0;
                                const isCompleted = showProgress ? (progress === 100) : false;

                                return (
                                    <div
                                        key={unit.id}
                                        className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer border-2 shadow-none transition-all
                      ${isCompleted
                                                ? "bg-green-500 text-white border-gray-600 hover:bg-green-600"
                                                : selectedUnit?.id === unit.id
                                                    ? "bg-blue-600 text-white border-transparent"
                                                    : "bg-white text-gray-700 border-transparent hover:border-gray-200 hover:bg-gray-50"
                                            }`}
                                        title={unit.name}
                                        onClick={() => {
                                            onToggle();
                                            onUnitSelect(unit);
                                        }}
                                    >
                                        {unit.name.charAt(0)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="p-5 animate-fade-in opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 flex items-center justify-center text-xl bg-gray-100 rounded-lg">
                                {subject.icon || '🗂️'}
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 leading-tight line-clamp-2">{subject.name}</h2>
                        </div>

                        <p className="text-sm text-gray-500 mb-3 ml-1">
                            {showProgress ? "Track your progress" : "Browse units"}
                        </p>

                        {showProgress && overallProgress !== undefined && (
                            <div className="mb-5 px-1">
                                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                                    <span>{overallProgress}% Completed</span>
                                </div>
                                <ProgressBar
                                    value={overallProgress}
                                    height={8}
                                    trackClassName="bg-gray-100 rounded-full"
                                    barClassName="bg-blue-600 rounded-full"
                                />
                            </div>
                        )}

                        <div className="h-px bg-gray-100 w-full mb-5" />

                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 ml-1">Subject Units</h3>

                        <div className="space-y-3 pb-4">
                            {subject.units.map((unit) => {
                                const isSelected = selectedUnit?.id === unit.id;
                                const progress = unit.progress || 0;
                                const completed = unit.completed || (showProgress && progress === 100);

                                return (
                                    <div
                                        key={unit.id}
<<<<<<< HEAD
                                        className={`border border-gray-200 rounded-xl overflow-hidden shadow-none hover:shadow-sm transition-all duration-200 cursor-pointer ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                                        onClick={() => onUnitSelect(unit)}
                                    >
                                        {/* Unit header */}
                                        <div
                                            className={`flex items-center justify-between w-full p-3 transition-colors ${isSelected ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`p-1 rounded-full ${isSelected ? 'bg-blue-100' : 'bg-transparent'}`}>
                                                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                                                </div>
                                                <span className={`font-semibold truncate text-sm ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{unit.name}</span>
                                            </div>

                                            {/* Show Checkmark if completed (and progress enabled), OR show problem count if strictly not showing progress */}
                                            {showProgress && completed && (
                                                <span className="flex items-center justify-center rounded-full bg-green-500 text-white w-5 h-5 shadow-none">
                                                    <Check className="w-3 h-3" strokeWidth={4} />
                                                </span>
                                            )}

                                            {unit.problemCount !== undefined && (
                                                <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                                                    {unit.problemCount}
                                                </span>
                                            )}
                                        </div>

                                        {showProgress && (
                                            <div className="px-3 pb-3 pt-0">
                                                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 mt-1">
                                                    <span>Progress</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <ProgressBar
                                                    value={progress}
                                                    height={6}
                                                    trackClassName="bg-gray-100 rounded-full"
                                                    barClassName={isSelected ? "bg-blue-500 rounded-full" : "bg-green-500 rounded-full"}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Switch Subject Button at the bottom */}
                {onBackToSubjects && (
                    <div className="mt-auto p-4 border-t border-gray-100 flex-shrink-0">
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full flex items-center justify-center transition-all bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm",
                                isOpen ? "gap-2 px-4 py-2" : "p-2"
                            )}
                            onClick={onBackToSubjects}
                            title="Switch Subject"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {isOpen && <span className="font-semibold text-sm">Switch Subject</span>}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnitSidebar;
