import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
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
      
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
        style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          boxShadow: text.trim().length > 0 && !disabled ? '0 0 0 3px rgba(139,92,246,0.1)' : 'none',
          borderColor: text.trim().length > 0 && !disabled ? '#a78bfa' : '#e5e7eb',
        }}
      >
        <input
          className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none"
          placeholder="Ask Buddy anything…"
          value={text}
          onChange={(e) => {
            const val = e.target.value;
            setText(val);
            if (onType) onType(val);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
        />

        <button
          onClick={handleSend}
          disabled={text.trim().length === 0 || disabled}
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
            text.trim().length > 0 && !disabled
              ? 'bg-gradient-to-br from-violet-500 to-saffron-600 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95'
              : 'bg-white text-gray-300 cursor-not-allowed'
          }`}
        >
          <ArrowUp size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default AIChatInput;
