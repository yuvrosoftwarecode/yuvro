import React, { useState, useMemo } from 'react';
import { ChevronRight, Code2, ArrowLeft, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface SidebarUnit {
    id: string;
    name: string;
    progress?: number;
    completed?: boolean;
    problemCount?: number;
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
    backText?: string;
}

const generateAbbreviation = (title: string): string => {
    const words = title.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    const firstLetter = words[0].charAt(0).toUpperCase();
    const lastLetter = words[words.length - 1].charAt(0).toUpperCase();
    return firstLetter + lastLetter;
};

const UnitSidebar = ({
    subject,
    selectedUnit,
    onUnitSelect,
    isOpen,
    onToggle,
    showProgress = true,
    overallProgress,
    onBackToSubjects,
    backText,
}: UnitSidebarProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUnits = useMemo(() => {
        if (!searchQuery.trim()) return subject.units;
        const query = searchQuery.toLowerCase();
        return subject.units.filter(u => u.name.toLowerCase().includes(query));
    }, [searchQuery, subject.units]);

    return (
        <div
            className={cn(
                "flex-shrink-0 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col",
                isOpen ? "w-72" : "w-16"
            )}
        >
            {/* Header */}
            <div className="border-b border-slate-200 flex-shrink-0">
                {/* Back Button */}
                <div className="p-3 border-b border-slate-100 flex justify-start">
                    <button
                        onClick={onBackToSubjects}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors text-xs font-medium text-slate-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {isOpen && <p>{backText || "Interview Preparation"}</p>}
                    </button>
                </div>

                {/* Title and Collapse Button */}
                <div className={cn("flex items-center p-4", isOpen ? "justify-between" : "justify-center")}>
                    {isOpen && (
                        <div className="flex items-center space-x-2 min-w-0">
                            <Code2 className="h-4 w-4 text-slate-700" />
                            <h3 className="font-semibold text-sm truncate text-slate-800">
                                Practice Units
                            </h3>
                        </div>
                    )}
                    <button
                        onClick={onToggle}
                        className={cn(
                            "p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors",
                            !isOpen && "mx-auto"
                        )}
                        title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        <ChevronRight 
                            className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                isOpen && "rotate-180"
                            )} 
                        />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {isOpen && (
                <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Find modules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-8 text-xs bg-slate-50 border border-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300"
                        />
                    </div>
                </div>
            )}

            {/* Content list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scrollbar p-3">
                <div className="space-y-1">
                    {isOpen && filteredUnits.length > 0 && (
                        <div className="mb-4">
                            <p className="text-[10px] font-semibold text-slate-500 px-2 uppercase tracking-wider">
                                {subject.name} Modules
                            </p>
                        </div>
                    )}

                    {filteredUnits.length > 0 ? (
                        filteredUnits.map((unit) => {
                            const isSelected = selectedUnit?.id === unit.id;
                            const progress = unit.progress || 0;
                            const completed = unit.completed || (showProgress && progress === 100);
                            const abbrev = generateAbbreviation(unit.name);

                            return (
                                <button
                                    key={unit.id}
                                    onClick={() => onUnitSelect(unit)}
                                    className={cn(
                                        "flex items-center gap-2 w-full p-2.5 rounded-lg transition-all duration-200 group relative",
                                        isSelected 
                                            ? "bg-slate-100 text-slate-900 shadow-sm border border-slate-200" 
                                            : "hover:bg-slate-50 text-slate-500 hover:text-slate-900",
                                        !isOpen && "justify-center"
                                    )}
                                    title={!isOpen ? unit.name : undefined}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center h-8 w-8 rounded-md text-[10px] font-bold shrink-0 transition-colors",
                                        isSelected 
                                            ? "bg-white text-slate-600 border border-slate-200" 
                                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                                    )}>
                                        {abbrev}
                                    </div>

                                    {isOpen && (
                                        <div className="flex-1 text-left min-w-0 pr-6">
                                            <p className="text-sm font-medium truncate text-slate-800 leading-tight mb-0.5">{unit.name}</p>
                                            {showProgress && (
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className={cn(
                                                            'h-1 flex-1 rounded-full overflow-hidden ring-1 transition-colors',
                                                            isSelected
                                                                ? 'bg-slate-300 ring-slate-300/70'
                                                                : 'bg-slate-100 ring-slate-200 group-hover:bg-slate-200 group-hover:ring-slate-300/80',
                                                        )}
                                                    >
                                                        <div 
                                                            className={cn(
                                                                'h-full transition-all duration-300',
                                                                completed ? 'bg-green-500' : 'bg-primary',
                                                            )}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-semibold">{progress}%</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isOpen && completed && (
                                        <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
                                    )}

                                    {!isOpen && isSelected && (
                                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        isOpen && (
                            <div className="text-center py-10 px-4">
                                <Search className="h-8 w-8 text-muted/30 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">No matching units</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Overall Progress for Sidebar */}
            {isOpen && showProgress && overallProgress !== undefined && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/70">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Progress</span>
                        <span className="text-xs font-bold text-primary">{overallProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnitSidebar;
