import React from 'react';
import { Target, Layers, Book, Globe } from 'lucide-react';

export type LeaderboardScope = 'test' | 'unit' | 'subject' | 'global';

interface ScopePillsProps {
  currentScope: LeaderboardScope;
  onChangeScope: (scope: LeaderboardScope) => void;
}

const ScopePills: React.FC<ScopePillsProps> = ({ currentScope, onChangeScope }) => {
  const scopes = [
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'subject', label: 'Subject', icon: Book },
    { id: 'unit', label: 'Unit', icon: Layers },
    { id: 'test', label: 'Test', icon: Target },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {scopes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChangeScope(id as LeaderboardScope)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            currentScope === id
              ? 'bg-primary text-primary-foreground shadow-md scale-105'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
          }`}
        >
          <Icon className={`w-4 h-4 ${currentScope === id ? 'opacity-100' : 'opacity-70'}`} />
          {label}
        </button>
      ))}
    </div>
  );
};

export default ScopePills;
