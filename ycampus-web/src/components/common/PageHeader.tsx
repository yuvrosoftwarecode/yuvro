import React from 'react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, className, actions }) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 mb-8", className)}>
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] pl-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
