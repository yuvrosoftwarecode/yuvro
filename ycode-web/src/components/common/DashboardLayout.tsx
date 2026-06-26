import React from 'react';
import RoleSidebar from './RoleSidebar';
import RoleHeader from './RoleHeader';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';

interface FooterLink {
    label: string;
    to?: string;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    roleHeader?: React.ReactNode; // Optional custom header if needed, otherwise uses standard RoleHeader
    sidebarClassName?: string;
    contentClassName?: string;
    hideHeader?: boolean;
    hideFooter?: boolean;
    footerLinks?: FooterLink[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    title,
    subtitle,
    actions,
    roleHeader,
    sidebarClassName = '',
    contentClassName = '',
    hideHeader = false,
    hideFooter = false,
    footerLinks
}) => {
    const { user } = useAuth();
    const userRole = user?.role || 'student';
    const isInstructorOrAdmin = userRole === 'admin' || userRole === 'instructor';
    const shouldHideFooter = hideFooter || isInstructorOrAdmin;

    return (
        <div className="flex h-screen overflow-hidden bg-background relative">
            <RoleSidebar className={`flex-shrink-0 ${sidebarClassName}`} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
                {/* Render provided custom header, or default RoleHeader if title is provided and not hidden */}
                {!hideHeader && (
                    roleHeader ? (
                        roleHeader
                    ) : (
                        title && (
                            <RoleHeader
                                title={title}
                                subtitle={subtitle}
                                actions={actions}
                            />
                        )
                    )
                )}

                <main className={`flex-1 overflow-auto ${!shouldHideFooter ? 'pb-12' : ''} ${contentClassName}`}>
                    {children}
                </main>
            </div>

            {!shouldHideFooter && (
                <div className="fixed bottom-0 left-0 right-0 z-40">
                    <Footer variant="compact" compactLinks={footerLinks} />
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
