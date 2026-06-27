import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { blockDefs, categories } from './BlockRegistry';

interface BlockLibraryPanelProps {
  onAdd: (type: string) => void;
}

export const BlockLibraryPanel: React.FC<BlockLibraryPanelProps> = ({ onAdd }) => {
  const [query, setQuery] = useState('');
  
  const filtered = blockDefs.filter(d =>
    d.label.toLowerCase().includes(query.toLowerCase()) ||
    d.category.toLowerCase().includes(query.toLowerCase())
  );
  
  const grouped = categories.reduce<Record<string, typeof blockDefs>>((acc, cat) => {
    const items = filtered.filter(d => d.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="w-full flex-col h-full bg-white flex transition-all">
      <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10">

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks..."
            className="pl-9 h-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-lg"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              {cat}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.map(def => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => onAdd(def.type)}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-all group shadow-sm"
                >
                  <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                    {def.icon}
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {def.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No blocks found
          </div>
        )}
      </div>
    </div>
  );
};
