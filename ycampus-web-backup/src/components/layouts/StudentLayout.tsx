import React from 'react';
import RoleSidebar from '../common/RoleSidebar';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex">
      <RoleSidebar />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
