import React, { useEffect, useState } from 'react';
import { CardContent } from '@/components/ui/card';
import { Flame, Trophy } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isToday
} from 'date-fns';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

interface StreakCalendarProps {
    currentStreak: number;
    maxStreak: number;
}

const StreakCalendarWidget: React.FC<StreakCalendarProps> = ({ currentStreak, maxStreak }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeDates, setActiveDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchActivity = async () => {
            setLoading(true);
            try {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const res = await restApiAuthUtil.get<{ active_dates: string[] }>(
                    `/course/student-course-progress/calendar_activity/?year=${year}&month=${month}`
                );
                setActiveDates(res.active_dates || []);
            } catch (err) {
                console.error("Failed to fetch calendar activity", err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [currentDate]);

    const [currentStreakSet, setCurrentStreakSet] = useState<Set<string>>(new Set());

    useEffect(() => {
        const streakSet = new Set<string>();
        const hasDate = (d: Date) => activeDates.includes(format(d, 'yyyy-MM-dd'));
        const today = new Date();
        let pointer = new Date(today);

        if (!hasDate(pointer)) {
            pointer.setDate(pointer.getDate() - 1);
        }

        let safeCounter = 0;
        while (hasDate(pointer) && safeCounter < 365) {
            streakSet.add(format(pointer, 'yyyy-MM-dd'));
            pointer.setDate(pointer.getDate() - 1);
            safeCounter++;
        }

        setCurrentStreakSet(streakSet);
    }, [activeDates]);

    const handleDateChange = (value: string) => {
        const [yearStr, monthIndexStr] = value.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthIndexStr, 10);
        const newDate = new Date(year, monthIndex, 1);
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = monthStart.getDay();
    const emptySlots = Array(startDayOfWeek).fill(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);

    return (
        <div className="w-full flex flex-col gap-2 overflow-visible">
            {/* Header: Controls */}
            <div className="flex items-center justify-between mb-0.5">
                <button
                    onClick={handleToday}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 h-6 rounded flex items-center transition-colors"
                >
                    Today
                </button>
                <div className="flex gap-1.5">
                    <Select value={`${currentDate.getFullYear()}-${currentDate.getMonth()}`} onValueChange={handleDateChange}>
                        <SelectTrigger className="h-6 px-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm hover:border-gray-300 hover:bg-gray-50/50 focus:ring-1 focus:ring-gray-200 focus:ring-offset-0 min-w-[110px] transition-all duration-200">
                            <SelectValue>{format(currentDate, 'MMMM yyyy')}</SelectValue>
                        </SelectTrigger>
                        <SelectContent
                            className="max-h-[280px] z-[9999] bg-white border-none rounded-lg shadow-xl overflow-hidden p-1 min-w-[140px]"
                            position="popper"
                            sideOffset={4}
                            align="end"
                        >
                            {years.flatMap(year =>
                                months.map((month, index) => {
                                    const val = `${year}-${index}`;
                                    const label = `${month} ${year}`;
                                    return (
                                        <SelectItem
                                            key={val}
                                            value={val}
                                            className="text-[10px] font-medium cursor-pointer rounded-md focus:bg-blue-50 focus:text-blue-700 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-700 py-1 px-2 my-0.5 transition-colors"
                                        >
                                            {label}
                                        </SelectItem>
                                    );
                                })
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <CardContent className="p-0 relative z-0 flex flex-col gap-0.5">
                {/* Stats Row */}
                <div className="flex items-center justify-between mb-0.5 px-0.5">
                    <div className="flex items-center gap-1.5">
                        <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                        <span className="text-xs font-bold text-gray-900">{currentStreak || 0} Day Streak</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs font-bold text-gray-700">Max: {maxStreak || 0}</span>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex flex-col justify-start">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-0.5 text-center">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={`day-header-${i}`} className="flex items-center justify-center text-[10px] font-bold text-gray-400 h-3">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 text-center gap-y-0.5">
                        {emptySlots.map((_, i) => (
                            <div key={`empty-${i}`} />
                        ))}
                        {calendarDays.map(day => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const isActive = activeDates.includes(dateStr);

                            const isStreakMember = currentStreakSet.has(dateStr);
                            let isCurrentStreak = false;
                            if (isStreakMember) {
                                const allStreak = Array.from(currentStreakSet);
                                if (allStreak.length > 0) {
                                    allStreak.sort();
                                    if (dateStr === allStreak[allStreak.length - 1]) {
                                        isCurrentStreak = true;
                                    }
                                }
                            }

                            const isTodayDate = isToday(day);

                            const buttonClass = `
                                w-6 h-5 rounded-full flex flex-col items-center justify-center text-xs font-medium transition-all duration-200
                                ${isTodayDate && !isActive ? 'border border-blue-500 text-blue-500 font-bold' : ''}
                                ${isActive && !isCurrentStreak ? 'border border-orange-400 text-orange-600 font-bold bg-orange-50/50' : ''}
                                ${!isActive ? 'text-gray-900 hover:bg-gray-50' : ''}
                                ${isCurrentStreak ? 'bg-transparent' : ''}
                            `;

                            if (isCurrentStreak) {
                                return (
                                    <div key={dateStr} className="flex items-center justify-center relative group h-5">
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button className={buttonClass}>
                                                        <div className="relative flex items-center justify-center w-full h-full">
                                                            <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500 drop-shadow-sm" />
                                                        </div>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-orange-600 text-white border-none text-xs font-bold py-1 px-2 mb-1">
                                                    <p>Current Streak! 🔥</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                );
                            }

                            return (
                                <div key={dateStr} className="flex items-center justify-center relative group h-5">
                                    <button className={buttonClass}>
                                        <span className="leading-none">{format(day, 'd')}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </div>
    );
};

export default StreakCalendarWidget;
