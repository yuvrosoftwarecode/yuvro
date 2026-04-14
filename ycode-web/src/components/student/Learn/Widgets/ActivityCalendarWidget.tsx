import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ActivityCalendarWidgetProps {
  initialMonth?: string;
  initialYear?: number;
  activityMap?: Record<string, boolean>;
}

const ActivityCalendarWidget: React.FC<ActivityCalendarWidgetProps> = ({
  initialMonth,
  initialYear,
  activityMap = {}
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialYear && initialMonth) {
      return new Date(initialYear, parseInt(initialMonth) - 1, 1);
    }
    return new Date();
  });

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const realToday = new Date();
  const isCurrentMonth = currentMonth.getFullYear() === realToday.getFullYear() && currentMonth.getMonth() === realToday.getMonth();
  const todayNum = isCurrentMonth ? realToday.getDate() : 999; 

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [startDayOfWeek, daysInMonth]);

  // Helper to check if a specific day in the current month is active
  const isActiveDay = (day: number) => {
    const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${currentMonth.getFullYear()}-${monthStr}-${dayStr}`;
    return !!activityMap[dateKey];
  };

  const getDayEmoji = (day: number) => {
    if (isCurrentMonth && day > realToday.getDate()) return null;
    
    if (isActiveDay(day)) {
      let streak = 0;
      for (let d = day; d >= 1; d--) {
        if (isActiveDay(d)) streak++;
        else break;
      }
      if (streak >= 7) return '🤩';
      if (streak >= 4) return '😄';
      if (streak >= 2) return '😊';
      return '🙂';
    }
    
    // It's a missed day if it's before today and not active
    const isPastOrToday = currentMonth.getFullYear() < realToday.getFullYear() || 
                          (currentMonth.getFullYear() === realToday.getFullYear() && currentMonth.getMonth() < realToday.getMonth()) ||
                          (isCurrentMonth && day <= realToday.getDate());
                          
    if (isPastOrToday && !isActiveDay(day)) return '😢';
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-foreground tracking-tight">Activity</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <span className="text-[10px] font-semibold text-muted-foreground min-w-[90px] text-center">{monthName}</span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-gray-100 bg-gray-100">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-[9px] font-bold text-gray-400 text-center py-1.5 bg-gray-50 uppercase">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square bg-white" />;
          
          const isActive = isActiveDay(day);
          
          const isPastOrToday = currentMonth.getFullYear() < realToday.getFullYear() || 
              (currentMonth.getFullYear() === realToday.getFullYear() && currentMonth.getMonth() < realToday.getMonth()) ||
              (isCurrentMonth && day <= realToday.getDate());
              
          const isMissed = isPastOrToday && !isActive;
          const isToday = isCurrentMonth && day === realToday.getDate();
          const emoji = getDayEmoji(day);
          const isFuture = isCurrentMonth && day > realToday.getDate();

          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center text-[10px] font-semibold transition-all ${
                isToday
                  ? 'bg-saffron text-white'
                  : isActive
                    ? 'bg-emerald-50 text-emerald-600'
                    : isMissed
                      ? 'bg-rose-50 text-rose-400'
                      : isFuture
                        ? 'bg-white text-gray-200'
                        : 'bg-white text-gray-300'
              }`}
              title={emoji ? `${emoji} Day ${day}` : `Day ${day}`}
            >
              {emoji && !isToday ? (
                <span className="text-[11px]">{emoji}</span>
              ) : (
                <span>{day}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pb-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px]">😊</span>
          <span className="text-[9px] text-muted-foreground font-medium">Active</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px]">😢</span>
          <span className="text-[9px] text-muted-foreground font-medium">Missed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-saffron" />
          <span className="text-[9px] text-muted-foreground font-medium">Today</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityCalendarWidget;

