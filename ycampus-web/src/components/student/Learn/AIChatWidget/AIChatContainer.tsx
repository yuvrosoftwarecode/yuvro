import React from 'react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import useAIChat from './useAIChat';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

const AIChatContainer: React.FC<{
  className?: string;
  contextGetter?: () => string;
  welcomeMessage?: string;
  persistenceKey?: string;
  chatTitle?: string;
  onNewChat?: () => void;
  showHistory?: boolean;
  onInsertCode?: (code: string) => void;
}> = ({ className, contextGetter, welcomeMessage, persistenceKey, chatTitle, onInsertCode }) => {
  const { user } = useAuth();
  const { messages, sendMessage, isLoading, suggestedPrompts, provideFeedback, activeStream } = useAIChat({
    getContext: contextGetter,
    persistenceKey,
    chatTitle,
    userName: user?.first_name || 'Student',
  });

  return (
    <div className={`flex flex-col min-h-0 ${className || 'w-[360px] h-[500px]'}`}>
      <div className={`flex flex-col flex-1 min-h-0 bg-white overflow-hidden ${!className ? 'rounded-2xl border border-slate-200 shadow-xl' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 rotate-3">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 tracking-tight leading-none uppercase">Neural Bridge</p>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1.5 animate-pulse">Sync Active</p>
          </div>
        </div>

        {/* Messages */}
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          activeStream={activeStream}
          welcomeMessage={welcomeMessage}
          onInsertCode={onInsertCode}
          onFeedback={provideFeedback}
        />

        {/* Input footer */}
        <div className="px-4 pb-4 pt-3 bg-white border-t border-slate-100 shrink-0">
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            suggestedPrompts={suggestedPrompts}
          />
          <div className="flex items-center justify-center gap-2 mt-4">
             <div className="h-px w-8 bg-slate-100"></div>
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">YUVRO COGNITIVE CORE v4.0</p>
             <div className="h-px w-8 bg-slate-100"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatContainer;
