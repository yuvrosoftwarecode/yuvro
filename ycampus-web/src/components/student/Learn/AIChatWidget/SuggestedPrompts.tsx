import React from 'react';

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ prompts, onSelect, disabled }) => {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className="shrink-0 whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl hover:bg-white hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};

export default SuggestedPrompts;
