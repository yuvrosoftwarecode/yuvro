import React from 'react';
import { cn } from '@/lib/utils';

interface RoleHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const RoleHeader: React.FC<RoleHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = '',
  noPadding = false
}) => {
  return (
    <div className={cn(
      'flex items-center justify-between py-5 flex-shrink-0',
      !noPadding && 'px-6 lg:px-8',
      className
    )}>
      <div className="flex flex-col justify-center min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 leading-tight truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default RoleHeader;
