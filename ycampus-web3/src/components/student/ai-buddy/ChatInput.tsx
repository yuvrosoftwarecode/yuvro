import React, { useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import SuggestedPrompts from './SuggestedPrompts';

interface AIChatInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  suggestedPrompts?: string[];
}

const ChatInput: React.FC<AIChatInputProps> = ({ onSend, disabled, suggestedPrompts = [] }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    setText('');
    inputRef.current?.focus();

    try {
      await onSend(trimmed);
    } catch (error) {
      console.error('Send failed', error);
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="flex flex-col gap-2">
      {suggestedPrompts.length > 0 && (
        <SuggestedPrompts
          prompts={suggestedPrompts}
          onSelect={(prompt) => {
            setText(prompt);
            inputRef.current?.focus();
          }}
          disabled={disabled}
        />
      )}

      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
        style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          boxShadow: canSend ? '0 0 0 3px rgba(139,92,246,0.1)' : 'none',
          borderColor: canSend ? '#a78bfa' : '#e5e7eb',
        }}
      >
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none"
          placeholder="Ask Buddy anything…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
            canSend
              ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95'
              : 'bg-white text-gray-300 cursor-not-allowed'
          }`}
        >
          <ArrowUp size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
