import React from 'react';

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ prompts, onSelect, disabled }) => {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className="shrink-0 whitespace-nowrap px-3 py-1.5 text-[11px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded-full hover:bg-violet-100 hover:border-violet-200 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};

export default SuggestedPrompts;
