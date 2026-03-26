import React, { useEffect, useRef } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export type ChatMessage = {
  id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
};

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  welcomeMessage?: string;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading, welcomeMessage }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4 bg-white/40 custom-scrollbar"
      style={{ scrollBehavior: 'auto' }}
    >
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-5 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Sparkles size={28} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900">Hi, I'm Buddy!</p>
            <p className="text-[13px] text-gray-400 max-w-[220px] leading-relaxed mt-1">
              {welcomeMessage || 'Ask me anything about this topic.'}
            </p>
          </div>
        </div>
      )}

      {messages.map((message) => {
        const isUser = message.message_type === 'user';

        return (
          <div key={message.id} className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isUser && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles size={12} className="text-white" />
              </div>
            )}

            <div
              className={`max-w-[78%] text-[13px] leading-relaxed whitespace-pre-wrap ${
                isUser
                  ? 'bg-gray-900 text-white px-4 py-2.5 rounded-2xl rounded-br-md'
                  : 'bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
              }`}
            >
              {message.content}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles size={12} className="text-white" />
          </div>
          <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
