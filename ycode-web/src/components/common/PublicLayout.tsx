import React from 'react';
import Header from './Header';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 overflow-auto">
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PublicLayout;
