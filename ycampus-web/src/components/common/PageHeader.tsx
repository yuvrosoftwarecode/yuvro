import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, className }) => {
  return (
    <div className={cn("space-y-2 mb-8", className)}>
      <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] pl-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
