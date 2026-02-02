import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'; // Assuming generic Sheet/Drawer components exist or using simple div
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trophy, Calendar } from 'lucide-react';
import StreakCalendarWidget from './StreakCalendarWidget';
import LeaderboardWidget from './LeaderboardWidget';
import { Stats } from './types';

interface GamificationSidebarProps {
    stats: Stats;
    isOpen: boolean;
    onToggle: () => void;
}

const GamificationSidebar: React.FC<GamificationSidebarProps> = ({ stats, isOpen, onToggle }) => {
    return (
        <>
            {/* Backdrop Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[90] transition-opacity"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`
                    fixed top-[4.5rem] right-2 bottom-4 w-[380px] z-[100] flex flex-col
                    bg-gradient-to-b from-white/80 via-white/40 to-white/20 backdrop-blur-3xl
                    border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] 
                    rounded-3xl overflow-hidden ring-1 ring-white/50
                    transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}
                `}
            >
                {/* Glossy Header */}
                <div className="flex-none p-5 pb-4 flex items-center justify-between border-b border-gray-100/50 bg-gradient-to-b from-white/50 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-tr from-yellow-100 to-orange-100 rounded-lg shadow-sm">
                            <Trophy className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800 text-lg leading-tight">My Progress</h2>
                            <p className="text-xs text-gray-500 font-medium">Keep up the momentum!</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="rounded-full hover:bg-gray-100/50 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-slate-50/30">
                    {/* Streak Section */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        <StreakCalendarWidget
                            currentStreak={stats.streak || 0}
                            maxStreak={stats.streak || 0}
                        />
                    </div>

                    {/* Leaderboard Section */}
                    <div className="flex-1 min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <LeaderboardWidget />
                    </div>
                </div>
            </div>
        </>
    );
};

export default GamificationSidebar;
