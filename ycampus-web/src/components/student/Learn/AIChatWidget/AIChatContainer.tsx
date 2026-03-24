import React from 'react';
import AIChatMessages from './ChatMessages';
import AIChatInput from './ChatInput';
import useAIChat from './useAIChat';
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
  const { messages, sendMessage, isLoading, suggestedPrompts, provideFeedback } = useAIChat({
    getContext: contextGetter,
    persistenceKey,
    chatTitle,
  });

  return (
    <div className={`flex flex-col ${className || 'w-[360px] h-[500px]'}`}>
      <div
        className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden bg-white"
        style={{ border: '1px solid #e5e7eb', boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white shrink-0" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">AI Buddy</p>
            <p className="text-[11px] text-emerald-500 font-medium mt-0.5">Online</p>
          </div>
        </div>

        {/* Messages */}
        <AIChatMessages
          messages={messages}
          isLoading={isLoading}
          welcomeMessage={welcomeMessage}
          onInsertCode={onInsertCode}
          onFeedback={provideFeedback}
        />

        {/* Input footer */}
        <div className="px-3 pb-3 pt-2 bg-white shrink-0" style={{ borderTop: '1px solid #f3f4f6' }}>
          <AIChatInput
            onSend={sendMessage}
            disabled={isLoading}
            suggestedPrompts={suggestedPrompts}
          />
          <p className="text-[10px] text-gray-300 text-center mt-2 tracking-wide">Powered by Yuvro AI</p>
        </div>
      </div>
    </div>
  );
};

export default AIChatContainer;
