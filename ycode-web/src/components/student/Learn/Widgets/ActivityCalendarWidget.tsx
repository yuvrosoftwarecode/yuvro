import React from 'react';
import { ChevronLeft, ChevronRight, Share2, Info } from 'lucide-react';

interface ActivityCalendarWidgetProps {
  initialMonth?: string;
  initialYear?: number;
  // Map of "YYYY-MM-DD" -> true for active days
  activityMap?: Record<string, boolean>;
}

const ActivityCalendarWidget: React.FC<ActivityCalendarWidgetProps> = ({
  initialMonth,
  initialYear,
  activityMap = {}
}) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const displayMonth = currentDate.toLocaleString('default', { month: 'long' });
  const displayYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="px-3 py-4">
      {/* Calendar Header (Centered) */}
      <div className="flex items-center justify-between mb-4 relative">
        <button className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
          <Info className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-50 rounded-md text-gray-400 transition-all active:scale-90"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium text-gray-900 bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg shadow-sm">
            {displayMonth} {displayYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-50 rounded-md text-gray-400 transition-all active:scale-90"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Week Day Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-tight leading-none">{day}</div>
        ))}
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => {
          const dayNum = i + 1;
          const realToday = new Date();

          // Format date key for the map: YYYY-MM-DD
          const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
          const dayStr = String(dayNum).padStart(2, '0');
          const dateKey = `${displayYear}-${monthStr}-${dayStr}`;

          const isPastMonth = (displayYear < realToday.getFullYear()) ||
            (displayYear === realToday.getFullYear() && currentDate.getMonth() < realToday.getMonth());
          const isFutureMonth = (displayYear > realToday.getFullYear()) ||
            (displayYear === realToday.getFullYear() && currentDate.getMonth() > realToday.getMonth());
          const isCurrentMonth = displayYear === realToday.getFullYear() && currentDate.getMonth() === realToday.getMonth();

          // Action logic: Solved, Watched, or Clicked
          const isActive = activityMap[dateKey] && (isPastMonth || isCurrentMonth);
          const isMissed = (isPastMonth || (isCurrentMonth && dayNum < realToday.getDate())) && !isActive;

          return (
            <div
              key={i}
              className={`
                aspect-[1.2/1] rounded-lg flex items-center justify-center text-[10px] font-medium transition-all relative group
                ${isActive
                  ? 'border-2 border-blue-500 bg-blue-50/50 text-blue-700'
                  : (isMissed && dayNum <= daysInMonth)
                    ? 'border border-orange-200 text-orange-400 bg-orange-50/20 shadow-sm'
                    : 'bg-gray-50/50 text-gray-400 border border-gray-100'}
                ${isFutureMonth || (isCurrentMonth && dayNum > realToday.getDate()) ? 'opacity-100 text-gray-300' : 'opacity-100'}
              `}
            >
              {dayNum <= daysInMonth ? dayNum : ''}

              {dayNum <= daysInMonth && isActive && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[9px] px-2 py-1 rounded invisible group-hover:visible opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all pointer-events-none whitespace-nowrap z-50 font-medium shadow-xl">
                  Solved/Watched
                  {/* Tiny arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-2 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend (High-Value Actions) */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-2 rounded-sm border border-blue-500 bg-blue-50"></div>
          <span className="text-[10px] font-medium text-gray-400">Solved/Watched</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-2 rounded-sm border border-orange-200 bg-orange-50/20"></div>
          <span className="text-[10px] font-medium text-gray-400">Missed</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityCalendarWidget;
