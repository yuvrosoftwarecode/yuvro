import React, { useState, useRef } from 'react';
import { ArrowUp, Terminal } from 'lucide-react';
import SuggestedPrompts from './SuggestedPrompts';

interface AIChatInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  suggestedPrompts?: string[];
}

const AIChatInput: React.FC<AIChatInputProps> = ({ onSend, disabled, suggestedPrompts = [] }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText('');
    inputRef.current?.focus();
    try {
      await onSend(trimmed);
    } catch (err) {
      console.error('Send failed', err);
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="flex flex-col gap-4">
      {suggestedPrompts.length > 0 && (
        <SuggestedPrompts
          prompts={suggestedPrompts}
          onSelect={(p) => { setText(p); inputRef.current?.focus(); }}
          disabled={disabled}
        />
      )}

      <div
        className={`flex items-center gap-3 rounded-[1.25rem] px-5 py-3 transition-all duration-300 border-2 ${
            canSend 
            ? 'bg-white border-indigo-500 shadow-xl shadow-indigo-100/50' 
            : 'bg-slate-50 border-slate-100 hover:border-slate-200'
        }`}
      >
        <div className="shrink-0 flex items-center justify-center">
             <Terminal size={14} className={canSend ? 'text-indigo-600' : 'text-slate-400'} />
        </div>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:outline-none"
          placeholder="Inject prompt sequence..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            canSend
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-110 active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
          }`}
        >
          <ArrowUp size={18} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default AIChatInput;
