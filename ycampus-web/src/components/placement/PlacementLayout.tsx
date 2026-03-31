import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import PlacementSidebar from './PlacementSidebar';

interface PlacementLayoutProps {
  children: React.ReactNode;
  title: string;
}

const PlacementLayout: React.FC<PlacementLayoutProps> = ({ children, title }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: 'hsl(240, 20%, 98.5%)' }}>
        <PlacementSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6">
            {title && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PlacementLayout;