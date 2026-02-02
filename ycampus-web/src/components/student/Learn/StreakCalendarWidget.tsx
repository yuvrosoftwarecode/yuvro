import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
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

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Fill in empty slots for start of week if you want a perfect grid (optional, simpler list for now or grid)
    // Let's do a 7-col grid. We need to know the start day of the week.
    const startDayOfWeek = monthStart.getDay(); // 0 = Sun, 1 = Mon...
    const emptySlots = Array(startDayOfWeek).fill(null);

    return (
        <Card className="border shadow-sm bg-white text-sm">
            <CardHeader className="pb-2 border-b border-gray-100 px-4 pt-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-800">
                        <CalendarIcon className="h-4 w-4 text-blue-500" />
                        Streak Calendar
                    </CardTitle>
                    <div className="flex gap-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
                            <ChevronLeft className="h-4 w-4 text-gray-500" />
                        </button>
                        <span className="font-semibold text-gray-700 w-24 text-center">
                            {format(currentDate, 'MMMM yyyy')}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 py-4">
                {/* Stats Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Current</span>
                        <div className="flex items-center gap-1 text-orange-500 font-bold text-lg">
                            <Flame className="h-5 w-5 fill-orange-500" />
                            {currentStreak}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Max</span>
                        {/* We assume maxStreak is passed or handled similarly */}
                        <span className="text-gray-700 font-bold text-lg">{maxStreak || currentStreak}</span>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-xs font-bold text-gray-400">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {emptySlots.map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {calendarDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isActive = activeDates.includes(dateStr);
                        const isFuture = day > new Date();
                        const isTodayDate = isToday(day);

                        return (
                            <div
                                key={dateStr}
                                className={`
                                    h-9 w-9 flex items-center justify-center rounded-lg text-xs relative group
                                    ${isTodayDate ? 'border border-blue-400' : ''}
                                    ${isActive ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}
                                `}
                            >
                                {isActive ? (
                                    <Flame className="h-5 w-5 fill-orange-500 text-orange-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <span>{format(day, 'd')}</span>
                                )}

                                {/* Tooltip for status */}
                                {isActive && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                        Streak Active!
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default StreakCalendarWidget;
