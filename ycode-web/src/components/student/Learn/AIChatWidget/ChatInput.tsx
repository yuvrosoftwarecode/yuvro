import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import SuggestedPrompts from './SuggestedPrompts';

interface AIChatInputProps {
  onSend: (text: string) => Promise<void>;
  onType?: (text: string) => void;
  disabled?: boolean;
  suggestedPrompts?: string[];
  onSelectSuggestedPrompt?: (prompt: string) => void;
}

const AIChatInput: React.FC<AIChatInputProps> = ({ 
  onSend, 
  onType,
  disabled, 
  suggestedPrompts = [], 
  onSelectSuggestedPrompt 
}) => {
  const [text, setText] = useState('');

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      await onSend(trimmed);
    } catch (err) {
      console.error('Send failed', err);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {suggestedPrompts.length > 0 && (
        <SuggestedPrompts
          prompts={suggestedPrompts}
          onSelect={(prompt) => {
            if (onSelectSuggestedPrompt) onSelectSuggestedPrompt(prompt);
            else {
              setText(prompt);
              // Optional auto-send behavior could go here, or let user edit it
            }
          }}
          disabled={disabled}
        />
      )}
      
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <Sparkles size={18} className="text-emerald-500 stroke-[2.5px]" />
        </div>
        <input
        className="w-full pl-12 pr-14 py-4 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-200 transition-all placeholder:text-slate-400 placeholder:font-bold"
        placeholder="Ask Buddy..."
        value={text}
        onChange={(e) => {
          const val = e.target.value;
          setText(val);
          if (onType) onType(val);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
        disabled={disabled}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          className={`p-2.5 rounded-full transition-all active:scale-90 ${text.trim() === '' || disabled
            ? 'text-slate-300 bg-slate-100/50'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
            }`}
          onClick={handleSend}
          disabled={disabled || text.trim() === ''}
        >
          <Send size={18} className="stroke-[2.5px]" />
        </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatInput;
