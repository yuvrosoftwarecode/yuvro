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
      
      <div className="relative input-focus-area rounded-xl transition-all border border-slate-200 bg-white">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <Sparkles size={16} className="text-slate-400" />
        </div>
        <input
        className="w-full pl-11 pr-12 py-3 bg-transparent text-sm font-medium text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-medium transition-all"
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
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <button
          className={`p-2 rounded-lg transition-all ${text.trim() === '' || disabled
            ? 'text-slate-200'
            : 'text-indigo-600 hover:bg-indigo-50 active:scale-90'
            }`}
          onClick={handleSend}
          disabled={disabled || text.trim() === ''}
        >
          <Send size={18} strokeWidth={2.5} />
        </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatInput;
