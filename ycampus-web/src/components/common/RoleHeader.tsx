import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown } from 'lucide-react';

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
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [notificationCount] = useState(3);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProfileMenuItems = () => {
    const role = user?.role || 'instructor';
    switch (role) {
      case 'admin':
        return [
          { label: 'Profile', path: '/instructor/profile' },
          { label: 'Settings', path: '/instructor/settings' }
        ];
      case 'instructor':
        return [
          { label: 'Profile', path: '/instructor/profile' },
          { label: 'Settings', path: '/instructor/settings' }
        ];
      case 'recruiter':
        return [
          { label: 'Profile', path: '/recruiter/profile' },
          { label: 'Settings', path: '/recruiter/settings' }
        ];
      default:
        return [
          { label: 'Profile', path: '/profile' },
          { label: 'Settings', path: '/settings' },
        ];
    }
  };

  const profileMenuItems = getProfileMenuItems();

  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Actions */}
          {actions && <div className="flex items-center space-x-3">{actions}</div>}
          
          {/* Notification Bell */}
          <button
            type="button"
            className="p-2 rounded-full text-gray-500 hover:bg-gray-50 focus:outline-none relative"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
          
          {/* User Profile Section */}
          <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-3 focus:outline-none hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 ease-in-out transform hover:scale-105"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-lg transition-all duration-300 ${
                  user?.role === 'admin' ? 'bg-gradient-to-r from-red-600 to-pink-600' :
                  user?.role === 'instructor' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                  user?.role === 'recruiter' ? 'bg-gradient-to-r from-purple-600 to-violet-600' :
                  'bg-gradient-to-r from-indigo-600 to-blue-600'
                }`}>
                  {(user?.first_name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-sm text-left">
                  <p className="font-medium text-gray-900">
                    {user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : user?.username || 'User'}
                  </p>
                  <p className={`text-xs font-medium capitalize ${
                    user?.role === 'admin' ? 'text-red-600' :
                    user?.role === 'instructor' ? 'text-green-600' :
                    user?.role === 'recruiter' ? 'text-purple-600' :
                    'text-indigo-600'
                  }`}>{user?.role || 'User'}</p>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  isProfileMenuOpen ? 'rotate-180' : ''
                } ${
                  user?.role === 'admin' ? 'text-red-400' :
                  user?.role === 'instructor' ? 'text-green-400' :
                  user?.role === 'recruiter' ? 'text-purple-400' :
                  'text-indigo-400'
                }`} />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white shadow-2xl rounded-2xl py-2 border border-gray-100 z-[9999] overflow-hidden transform transition-all duration-200 ease-out opacity-100 scale-100">
                  {/* User Info Header */}
                  <div className={`px-6 py-4 border-b border-gray-100 ${
                    user?.role === 'admin' ? 'bg-gradient-to-br from-red-50 via-pink-50 to-red-100' :
                    user?.role === 'instructor' ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100' :
                    user?.role === 'recruiter' ? 'bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100' :
                    'bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-white ${
                        user?.role === 'admin' ? 'bg-gradient-to-br from-red-600 to-pink-600' :
                        user?.role === 'instructor' ? 'bg-gradient-to-br from-green-600 to-emerald-600' :
                        user?.role === 'recruiter' ? 'bg-gradient-to-br from-purple-600 to-violet-600' :
                        'bg-gradient-to-br from-indigo-600 to-blue-600'
                      }`}>
                        {(user?.first_name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-base truncate">
                          {user?.first_name && user?.last_name 
                            ? `${user.first_name} ${user.last_name}` 
                            : user?.username || 'User'}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{user?.email}</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold capitalize mt-1 ${
                          user?.role === 'admin' ? 'bg-red-100 text-red-700 border border-red-200' :
                          user?.role === 'instructor' ? 'bg-green-100 text-green-700 border border-green-200' :
                          user?.role === 'recruiter' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            user?.role === 'admin' ? 'bg-red-500' :
                            user?.role === 'instructor' ? 'bg-green-500' :
                            user?.role === 'recruiter' ? 'bg-purple-500' :
                            'bg-indigo-500'
                          }`}></div>
                          {user?.role || 'User'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-3">
                    {profileMenuItems.map((item, index) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsProfileMenuOpen(false)}
                        className={`group flex items-center px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r transition-all duration-200 transform hover:translate-x-1 ${
                          user?.role === 'admin' ? 'hover:from-red-50 hover:to-pink-50 hover:text-red-700' :
                          user?.role === 'instructor' ? 'hover:from-green-50 hover:to-emerald-50 hover:text-green-700' :
                          user?.role === 'recruiter' ? 'hover:from-purple-50 hover:to-violet-50 hover:text-purple-700' :
                          'hover:from-indigo-50 hover:to-blue-50 hover:text-indigo-700'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {item.label === 'Profile' ? (
                          <svg className={`w-5 h-5 mr-3 transition-colors duration-200 ${
                            user?.role === 'admin' ? 'text-red-400 group-hover:text-red-600' :
                            user?.role === 'instructor' ? 'text-green-400 group-hover:text-green-600' :
                            user?.role === 'recruiter' ? 'text-purple-400 group-hover:text-purple-600' :
                            'text-indigo-400 group-hover:text-indigo-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className={`w-5 h-5 mr-3 transition-colors duration-200 ${
                            user?.role === 'admin' ? 'text-red-400 group-hover:text-red-600' :
                            user?.role === 'instructor' ? 'text-green-400 group-hover:text-green-600' :
                            user?.role === 'recruiter' ? 'text-purple-400 group-hover:text-purple-600' :
                            'text-indigo-400 group-hover:text-indigo-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        <span className="flex-1">{item.label}</span>
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>

                  {/* Logout Button */}
                  <div className="border-t border-gray-200 mt-2 pt-3">
                    <button
                      onClick={() => {
                        logout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="group flex items-center w-full px-6 py-3 text-sm font-medium text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200 transform hover:translate-x-1"
                    >
                      <svg className="w-5 h-5 mr-3 text-red-400 group-hover:text-red-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="flex-1">Logout</span>
                      <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleHeader;