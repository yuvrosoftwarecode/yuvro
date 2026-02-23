import React from 'react';
import RoleSidebar from './RoleSidebar';
import RoleHeader from './RoleHeader';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    roleHeader?: React.ReactNode; // Optional custom header if needed, otherwise uses standard RoleHeader
    sidebarClassName?: string;
    contentClassName?: string;
    hideHeader?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    title,
    subtitle,
    actions,
    roleHeader,
    sidebarClassName = '',
    contentClassName = '',
    hideHeader = false
}) => {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <RoleSidebar className={`flex-shrink-0 ${sidebarClassName}`} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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

                <main className={`flex-1 overflow-y-auto ${contentClassName}`}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
