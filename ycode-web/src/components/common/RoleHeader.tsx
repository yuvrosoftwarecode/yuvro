import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell } from 'lucide-react';

interface RoleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

const RoleHeader: React.FC<RoleHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = ''
}) => {
  const [notificationCount] = React.useState(3);

  return (
    <div className={`bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-30 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Left Side: Title & Subtitle */}
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm font-medium text-gray-500">{subtitle}</p>}
        </div>

        {/* Right Side: Actions & Notifications */}
        <div className="flex items-center space-x-6">
          {/* Custom Page Actions (Buttons, Search, etc.) */}
          {actions && <div className="flex items-center space-x-3">{actions}</div>}

          {/* Notification Bell */}
          <button
            type="button"
            className="p-2.5 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-200 focus:outline-none relative transition-all duration-200"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleHeader;