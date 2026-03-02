import React from 'react';
import { Lightbulb } from 'lucide-react';

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ prompts, onSelect, disabled }) => {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar scroll-smooth">
      <div className="shrink-0 flex items-center justify-center p-1.5 rounded-full bg-amber-50 text-amber-500 shadow-sm border border-amber-100">
        <Lightbulb size={14} className="stroke-[2.5px]" />
      </div>
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className="shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};

export default SuggestedPrompts;
