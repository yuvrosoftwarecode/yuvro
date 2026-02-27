import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navigation: React.FC = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [notificationCount] = useState(3);
    const profileRef = useRef<HTMLDivElement>(null);

    // Role-based navigation setup
    const role = user?.role || 'student';

    const roleTabs: Record<string, { label: string; path: string }[]> = {
        student: [
            { label: 'Dashboard', path: '/student/dashboard' },
            { label: 'Learn', path: '/student/learn' },
            { label: 'Code Practice', path: '/student/code-practice' },
            { label: 'Skill Test', path: '/student/skill-test' },
            { label: 'Mock Interview', path: '/student/mock-interview' },
            { label: 'Jobs', path: '/student/jobs' },
            { label: 'Contests', path: '/student/contests' },
            { label: 'Certify', path: '/student/certifications' },
        ],
        admin: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'User Management', path: '/admin/users' },
            { label: 'Subjects', path: '/admin/subjects' },
            { label: 'Skill Tests', path: '/admin/skill-tests' },
            { label: 'Mock Interview', path: '/admin/mock-interview' },
            { label: 'Jobs', path: '/admin/jobs' },
            { label: 'Contests', path: '/admin/contests' },
            { label: 'Certify', path: '/admin/certifications' },
        ],
        instructor: [
            { label: 'Dashboard', path: '/admin/dashboard' },
            { label: 'Subjects', path: '/admin/subjects' },
            { label: 'Skill Tests', path: '/admin/skill-tests' },
            { label: 'Mock Interview', path: '/admin/mock-interview' },
            { label: 'Contests', path: '/admin/contests' },
        ],
        recruiter: [
            { label: 'Dashboard', path: '/recruiter/dashboard' },
            { label: 'Jobs', path: '/recruiter/jobs' },
            { label: 'Candidates', path: '/recruiter/candidates' },
            { label: 'Contests', path: '/admin/contests' },
        ],
        faculty: [
            { label: 'Dashboard', path: '/faculty/dashboard' },
            { label: 'Syllabus', path: '/faculty/syllabus' },
            { label: 'Revise', path: '/faculty/revise' },
            { label: 'Assessment', path: '/faculty/assessment' },
            { label: 'Attendance', path: '/faculty/attendance' },
            { label: 'Task', path: '/faculty/task' },
            { label: 'Reports', path: '/faculty/reports' },
        ],
    };

    const roleProfileMenu: Record<string, { label: string; path: string; icon: string }[]> = {
        student: [
            { label: 'Profile', path: '/student/profile', icon: 'profile' },
            { label: 'Certifications', path: '/student/certifications', icon: 'certifications' },
        ],
        admin: [
            { label: 'Profile', path: '/admin/profile', icon: 'profile' },
            { label: 'User Management', path: '/admin/users', icon: 'users' },
            { label: 'Settings', path: '/admin/settings', icon: 'settings' },
        ],
        instructor: [
            { label: 'Profile', path: '/admin/profile', icon: 'profile' },
            { label: 'Settings', path: '/admin/settings', icon: 'settings' },
        ],
        recruiter: [
            { label: 'Profile', path: '/recruiter/profile', icon: 'profile' },
            { label: 'Company Management', path: '/recruiter/companies', icon: 'company' },
            { label: 'Settings', path: '/recruiter/settings', icon: 'settings' },
        ],
        faculty: [
            { label: 'Profile', path: '/faculty/profile', icon: 'profile' },
            { label: 'Settings', path: '/faculty/settings', icon: 'settings' },
        ],
    };

    const mainTabs = roleTabs[role] || [];
    const profileMenu = roleProfileMenu[role] || [];

    const handleLogout = () => logout();

    // Redirect base route
    useEffect(() => {
        if (location.pathname === '/') {
            navigate('/dashboard', { replace: true });
        }
    }, [location.pathname, navigate]);

    const currentPath = location.pathname;

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

    if (!isAuthenticated) return null;

    return (
        <nav className="bg-white shadow sticky top-0 z-[100]">
            <div className="w-full mx-auto px-2 sm:px-3 lg:px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Left: Logo + Tabs */}
                    <div className="flex items-center space-x-2">
                        <Link to="/" className="flex items-center space-x-2">
                            <span className="text-xl font-bold text-indigo-600">Yuvro Campus</span>
                            {role !== 'student' && (
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${role === 'admin' ? 'bg-red-100 text-red-700' :
                                    role === 'instructor' ? 'bg-green-100 text-green-700' :
                                        role === 'recruiter' ? 'bg-purple-100 text-purple-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}>
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                </span>
                            )}
                        </Link>

                        {/* Tabs */}
                        <div className="hidden md:flex space-x-3 ml-3">
                            {mainTabs.map((tab) => {
                                const isActive =
                                    currentPath === tab.path ||
                                    currentPath.startsWith(tab.path + "/") ||
                                    (tab.label === 'Skill Test' && currentPath.includes('/skill-tests'));

                                return (
                                    <Link
                                        key={tab.path}
                                        to={tab.path}
                                        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${isActive
                                            ? 'bg-black text-white ring-1 ring-black'
                                            : 'text-gray-700 hover:text-black'
                                            }`}
                                    >
                                        {tab.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    {/* Right: Hamburger + Notification + Profile */}
                    <div className="flex items-center space-x-4">
                        {/* Hamburger */}
                        <button
                            type="button"
                            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? (
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>

                        {/* Notification Bell */}
                        <button
                            type="button"
                            className="p-2 rounded-full text-black-500 hover:bg-indigo-50 focus:outline-none relative"
                            aria-label="View notifications"
                        >
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                            </svg>
                            {notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                                    {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                            )}
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileRef} key={`profile-${role}`}>
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center space-x-3 focus:outline-none hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 ease-in-out transform hover:scale-105"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-lg transition-all duration-300 ${role === 'admin' ? 'bg-gradient-to-r from-red-600 to-pink-600' :
                                    role === 'instructor' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                                        role === 'recruiter' ? 'bg-gradient-to-r from-purple-600 to-violet-600' :
                                            'bg-gradient-to-r from-indigo-600 to-blue-600'
                                    }`}>
                                    {(user?.first_name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden md:block text-left">
                                    <div className="text-sm font-medium text-gray-900">
                                        {user?.first_name && user?.last_name
                                            ? `${user.first_name} ${user.last_name}`
                                            : user?.username || 'User'}
                                    </div>
                                    <div className={`text-xs font-medium capitalize ${role === 'admin' ? 'text-red-600' :
                                        role === 'instructor' ? 'text-green-600' :
                                            role === 'recruiter' ? 'text-purple-600' :
                                                'text-indigo-600'
                                        }`}>{user?.role || 'Student'}</div>
                                </div>
                                <svg className={`w-4 h-4 hidden md:block transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''
                                    } ${role === 'admin' ? 'text-red-400' :
                                        role === 'instructor' ? 'text-green-400' :
                                            role === 'recruiter' ? 'text-purple-400' :
                                                'text-indigo-400'
                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isProfileMenuOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-72 bg-white shadow-2xl rounded-2xl py-2 border border-gray-100 z-[9999] overflow-hidden transform transition-all duration-200 ease-out opacity-100 scale-100"
                                    style={{ minHeight: '200px' }}
                                >
                                    {/* Debug Info */}
                                    <div className="px-2 py-1 text-xs text-gray-500 border-b">
                                        Role: {role} | User: {user?.username || 'N/A'}
                                    </div>

                                    {/* User Info Header */}
                                    <div className={`px-6 py-4 border-b border-gray-100 ${role === 'admin' ? 'bg-gradient-to-br from-red-50 via-pink-50 to-red-100' :
                                        role === 'instructor' ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100' :
                                            role === 'recruiter' ? 'bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100' :
                                                'bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100'
                                        }`}>
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ring-4 ring-white ${role === 'admin' ? 'bg-gradient-to-br from-red-600 to-pink-600' :
                                                role === 'instructor' ? 'bg-gradient-to-br from-green-600 to-emerald-600' :
                                                    role === 'recruiter' ? 'bg-gradient-to-br from-purple-600 to-violet-600' :
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
                                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold capitalize mt-1 ${role === 'admin' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                    role === 'instructor' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                        role === 'recruiter' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                            'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full mr-1 ${role === 'admin' ? 'bg-red-500' :
                                                        role === 'instructor' ? 'bg-green-500' :
                                                            role === 'recruiter' ? 'bg-purple-500' :
                                                                'bg-indigo-500'
                                                        }`}></div>
                                                    {user?.role || 'Student'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Menu Items */}
                                    <div className="py-3">
                                        {profileMenu.map((item, index) => {
                                            const getIcon = (iconType: string) => {
                                                const iconClass = `w-5 h-5 mr-3 transition-colors duration-200 ${role === 'admin' ? 'text-red-400 group-hover:text-red-600' :
                                                    role === 'instructor' ? 'text-green-400 group-hover:text-green-600' :
                                                        role === 'recruiter' ? 'text-purple-400 group-hover:text-purple-600' :
                                                            'text-indigo-400 group-hover:text-indigo-600'
                                                    }`;

                                                switch (iconType) {
                                                    case 'profile':
                                                        return (
                                                            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        );
                                                    case 'settings':
                                                        return (
                                                            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        );
                                                    case 'certifications':
                                                        return (
                                                            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                            </svg>
                                                        );
                                                    case 'users':
                                                        return (
                                                            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                            </svg>
                                                        );
                                                    case 'analytics':
                                                        return (
                                                            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                            </svg>
                                                        );
                                                    case 'company':
                                                        return (
                                                            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                            </svg>
                                                        );
                                                    default:
                                                        return (
                                                            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                                            </svg>
                                                        );
                                                }
                                            };
                                            return (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                    className={`group flex items-center px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r transition-all duration-200 transform hover:translate-x-1 ${role === 'admin' ? 'hover:from-red-50 hover:to-pink-50 hover:text-red-700' :
                                                        role === 'instructor' ? 'hover:from-green-50 hover:to-emerald-50 hover:text-green-700' :
                                                            role === 'recruiter' ? 'hover:from-purple-50 hover:to-violet-50 hover:text-purple-700' :
                                                                'hover:from-indigo-50 hover:to-blue-50 hover:text-indigo-700'
                                                        }`}
                                                    style={{ animationDelay: `${index * 50}ms` }}
                                                >
                                                    {getIcon(item.icon)}
                                                    <span className="flex-1">{item.label}</span>
                                                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </Link>
                                            );
                                        })}
                                    </div>

                                    {/* Logout Button */}
                                    <div className="border-t border-gray-200 mt-2 pt-3">
                                        <button
                                            onClick={handleLogout}
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

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 shadow-inner">
                    <div className="px-4 py-3 space-y-2">
                        {mainTabs.map((tab) => {
                            const isActive =
                                currentPath === tab.path || currentPath.startsWith(tab.path + "/");

                            return (
                                <Link
                                    key={tab.path}
                                    to={tab.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground-700 focus-visible:ring-offset-2 h-10 px-3 py-2 ${isActive
                                        ? 'bg-black text-white'
                                        : 'text-gray-700 hover:text-black'
                                        }`}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navigation;