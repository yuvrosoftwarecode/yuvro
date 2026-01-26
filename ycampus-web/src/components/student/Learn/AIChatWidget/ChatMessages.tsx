import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Loader2 } from 'lucide-react';

export type ChatMessage = {
  id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
};

const ChatMessages: React.FC<{ messages: ChatMessage[]; isLoading?: boolean; welcomeMessage?: string }> = ({ messages, isLoading, welcomeMessage }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="ai-chat-messages flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center min-h-full text-center p-8 text-slate-500 space-y-6">
          <div className="w-24 h-24 bg-blue-50/50 rounded-full flex items-center justify-center mb-2 ring-8 ring-blue-50/30">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-blue-50">
              <Bot size={48} className="text-blue-600" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-black text-slate-800 text-2xl tracking-tight">Hi, I'm your AI Buddy!</p>
            <p className="text-sm font-bold text-slate-400 max-w-[280px] leading-relaxed">
              {welcomeMessage || "I'm here to help you with your assessment review. Ask me anything!"}
            </p>
          </div>
        </div>
      )}

      {messages.map((m) => {
        const isUser = m.message_type === 'user';
        return (
          <div key={m.id} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isUser ? 'bg-blue-600' : 'bg-white border border-gray-100'}`}>
              {isUser ? <User size={14} className="text-white" /> : <Bot size={16} className="text-emerald-500" />}
            </div>

            <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm shadow-sm ${isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
              }`}>
              {isUser ? (
                <div className="whitespace-pre-wrap font-medium">{m.content}</div>
              ) : (
                <div className="prose prose-sm prose-blue max-w-none dark:prose-invert leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
            <Bot size={16} className="text-emerald-500 animate-pulse" />
          </div>
          <div className="bg-white px-5 py-3.5 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 size={14} className="animate-spin text-emerald-500" />
            <span>Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
