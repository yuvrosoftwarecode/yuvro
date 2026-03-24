import React from 'react';
import AIChatMessages from './ChatMessages';
import AIChatInput from './ChatInput';
import useAIChat from './useAIChat';
import { useAuth } from '@/contexts/AuthContext';
import { History as HistoryIcon, Clock, X, Plus } from 'lucide-react';
import './AIChatWidget.css';

const AIChatContainer: React.FC<{ className?: string, contextGetter?: () => string, welcomeMessage?: string, persistenceKey?: string, chatTitle?: string, onNewChat?: () => void, showHistory?: boolean, onInsertCode?: (code: string) => void }> = ({ className, contextGetter, welcomeMessage, persistenceKey, chatTitle, onNewChat, showHistory = true, onInsertCode }) => {
  const { user } = useAuth();
  const personalizedWelcome = welcomeMessage
    ? welcomeMessage.replace(/^Hi!/, `Hi ${user?.first_name || 'Student'}!`)
    : `Hi ${user?.first_name || 'Student'}! I'm here to help you. Ask me anything!`;

  const { 
    messages, sendMessage, isLoading, clearMessages, 
    history, loadSession, suggestedPrompts, provideFeedback, handleType, activeStream 
  } = useAIChat({ getContext: contextGetter, persistenceKey, chatTitle, userName: user?.first_name || 'Student' });
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  React.useEffect(() => {
    const handleAskBuddy = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string }>;
      if (customEvent.detail?.prompt) {
        sendMessage(customEvent.detail.prompt);
      }
    };

    window.addEventListener('ai-buddy-ask', handleAskBuddy);
    return () => window.removeEventListener('ai-buddy-ask', handleAskBuddy);
  }, [sendMessage]);

  return (
    <div
      className={`ai-chat-container relative flex flex-col rounded-2xl overflow-hidden ${className || 'w-[360px] h-[520px]'}`}
    >
      <div className="px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="text-sm font-bold text-slate-800 tracking-tight">AI Buddy</div>
          </div>
          <div className="flex items-center gap-3">
            {persistenceKey && (
              <>
                <button
                  onClick={onNewChat}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                  title="New Chat"
                >
                  <Plus size={20} className="stroke-[2.5px]" />
                </button>
                {showHistory && (
                  <button
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className={`p-1.5 rounded-xl transition-all active:scale-95 ${isHistoryOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    title="Recent Chats"
                  >
                    <HistoryIcon size={20} className="stroke-[2.5px]" />
                  </button>
                )}
              </>
            )}
            <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg tracking-wider">PLUS</span>
          </div>
        </div>

        {/* History Dropdown */}
        {showHistory && isHistoryOpen && (
          <div className="absolute top-[72px] left-4 right-4 bg-white rounded-3xl shadow-2xl border border-slate-100 z-30 max-h-[400px] overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Recent Reviews</span>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-xl transition-colors"
              >
                <X size={18} className="stroke-[2.5px]" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {history.length === 0 ? (
                <div className="p-12 text-center text-sm font-bold text-slate-300">No recent reviews</div>
              ) : (
                <div className="p-2 space-y-1">
                  {history.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => { loadSession(item.key); setIsHistoryOpen(false); }}
                      className={`w-full text-left px-4 py-4 hover:bg-slate-50 rounded-2xl transition-all group ${persistenceKey === item.key ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="text-sm font-black text-slate-700 group-hover:text-blue-600 truncate">{item.title}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock size={12} className="stroke-[2.5px]" />
                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AIChatMessages messages={messages} isLoading={isLoading} activeStream={activeStream} welcomeMessage={personalizedWelcome} onInsertCode={onInsertCode} onFeedback={provideFeedback} />

      <div className="p-4 border-t border-slate-50 bg-white shrink-0">
        <AIChatInput 
          onSend={sendMessage} 
          onType={handleType}
          disabled={isLoading} 
          suggestedPrompts={suggestedPrompts} 
        />
        <div className="flex justify-between items-center mt-3 px-2">
          <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Powered by Yuvro AI</span>

        </div>
      </div>
    </div>
  );
};

export default AIChatContainer;
