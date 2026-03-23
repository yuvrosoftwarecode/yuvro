import React from 'react';

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
  noPadding = false,
}) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${noPadding ? '' : 'px-6 lg:px-8 py-4'} border-b border-gray-100 bg-white ${className}`}>
      <div className="space-y-0.5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-500 text-[13px] font-medium max-w-2xl">
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

export default RoleHeader;
