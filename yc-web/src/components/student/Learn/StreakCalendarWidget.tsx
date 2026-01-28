import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { CustomCalendarIcon } from '@/components/common/CustomIcons';
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
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    parseISO
} from 'date-fns';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

interface StreakCalendarProps {
    currentStreak: number;
    maxStreak: number; // You might want to pass this if available, or just current
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
                const month = currentDate.getMonth() + 1; // API expects 1-12
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
        // Calculate the set of dates that belong to the "Current Streak"
        const sorted = [...activeDates].sort();
        const streakSet = new Set<string>();

        // Helper to check if a date string is in activeDates
        const hasDate = (d: Date) => activeDates.includes(format(d, 'yyyy-MM-dd'));

        const today = new Date();
        const yesterday = subMonths(today, 0); // cloning today to manipulate
        yesterday.setDate(today.getDate() - 1);

        // Determine start point for backward check
        let pointer = new Date();

        // If today is active, start here. If not, check yesterday (if streak is kept from yesterday)
        if (!hasDate(pointer)) {
            // If today is NOT active, we check yesterday. 
            // If yesterday is active, the streak is "alive" (waiting for today).
            // If yesterday is NOT active, then current streak is broken/0, so exact set is empty (or just today if we eventually do it).
            // But visually, we only highlight "completed" streak days. 
            // So if today is empty, we start looking at yesterday.
            pointer.setDate(pointer.getDate() - 1);
        }

        // Iterate backwards
        // Safety break to prevent infinite loops (though subDays should work)
        let safeCounter = 0;
        while (hasDate(pointer) && safeCounter < 365) {
            streakSet.add(format(pointer, 'yyyy-MM-dd'));
            pointer.setDate(pointer.getDate() - 1);
            safeCounter++;
        }

        setCurrentStreakSet(streakSet);
    }, [activeDates]);

    // ... (rest of imports like subMonths logic was used above, ensure subDays/subMonths is correct)
    // Actually standard date manipulation is cleaner.

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Fill in empty slots for start of week if you want a perfect grid (optional, simpler list for now or grid)
    // Let's do a 7-col grid. We need to know the start day of the week.
    const startDayOfWeek = monthStart.getDay(); // 0 = Sun, 1 = Mon...
    const emptySlots = Array(startDayOfWeek).fill(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i); // 2022 to 2027 roughly

    const handleMonthChange = (value: string) => {
        const monthIndex = months.indexOf(value);
        const newDate = new Date(currentDate.getFullYear(), monthIndex, 1);
        setCurrentDate(newDate);
    };

    const handleYearChange = (value: string) => {
        const year = parseInt(value, 10);
        const newDate = new Date(year, currentDate.getMonth(), 1);
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const today = new Date();
    const currentActualMonth = months[today.getMonth()];
    const currentActualYear = today.getFullYear();

    return (
        <div className="bg-white rounded-xl shadow p-4 w-full">
            <div className="flex items-center justify-between mb-4 px-2">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-800">
                    <CustomCalendarIcon className="h-4 w-4 text-gray-600" />
                    Streak Calendar
                </CardTitle>
                <button
                    onClick={handleToday}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                >
                    Today
                </button>
            </div>

            {/* Header with Dropdowns */}
            <div className="flex items-center justify-between px-2 mb-6 relative z-50">
                {/* Month Select */}
                <div className="w-[120px]">
                    <Select value={format(currentDate, 'MMMM')} onValueChange={handleMonthChange}>
                        <SelectTrigger className="h-8 text-xs font-semibold text-gray-700 border-gray-200 focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] z-[9999] bg-white" position="popper" sideOffset={5}>
                            {months.map(month => (
                                <SelectItem key={month} value={month} className="text-xs cursor-pointer focus:bg-gray-50">
                                    {month}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Year Select */}
                <div className="w-[80px]">
                    <Select value={String(currentDate.getFullYear())} onValueChange={handleYearChange}>
                        <SelectTrigger className="h-8 text-xs font-semibold text-gray-700 border-gray-200 focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] z-[9999] bg-white" position="popper" sideOffset={5}>
                            {years.map(year => (
                                <SelectItem key={year} value={String(year)} className="text-xs cursor-pointer focus:bg-gray-50">
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <CardContent className="p-0 relative z-0">
                {/* MUI-style Stats Row (custom addition to fit context) */}
                <div className="flex justify-between items-center mb-6 px-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">Current Streak</span>
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                            <span className="text-xl font-semibold text-gray-900">{currentStreak}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">Max Streak</span>
                        <span className="text-xl font-semibold text-gray-900 pt-0.5">{maxStreak || currentStreak}</span>
                    </div>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="h-9 flex items-center justify-center text-[11px] font-medium text-gray-500">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 text-center">
                    {emptySlots.map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {calendarDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isActive = activeDates.includes(dateStr);
                        const isCurrentStreak = currentStreakSet.has(dateStr);
                        const isTodayDate = isToday(day);

                        // Styling Logic
                        // Current Streak: Flame Icon (No Number)
                        // Past Active: Saffron Circle with Number
                        // Inactive/Standard: Number only

                        return (
                            <div
                                key={dateStr}
                                className="h-9 flex items-center justify-center relative group"
                            >
                                <button
                                    className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-[13px] transition-all duration-200
                                        ${isTodayDate && !isActive ? 'border border-blue-500 text-blue-500 font-medium' : ''}
                                        ${isActive && !isCurrentStreak ? 'bg-orange-100 text-orange-700 font-bold' : ''}
                                        ${!isActive ? 'text-gray-900 hover:bg-gray-100' : ''}
                                        ${isCurrentStreak ? 'bg-transparent' : ''}
                                    `}
                                >
                                    {isCurrentStreak ? (
                                        <div className="relative flex items-center justify-center w-full h-full">
                                            <Flame className="h-5 w-5 fill-orange-500 text-orange-500 drop-shadow-sm animate-pulse" />
                                        </div>
                                    ) : (
                                        <span>{format(day, 'd')}</span>
                                    )}
                                </button>

                                {/* Enhanced Tooltip */}
                                {isActive && (
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none transform group-hover:-translate-y-1">
                                        <div className="bg-gray-900 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap relative">
                                            {isCurrentStreak ? "Current Streak!" : "Activity Recorded"}
                                            {/* Tooltip Arrow */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </div>
    );
};

export default StreakCalendarWidget;
