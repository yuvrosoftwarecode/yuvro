import React from 'react';
import AIChatMessages from './ChatMessages';
import AIChatInput from './ChatInput';
import useAIChat from './useAIChat';
import { History as HistoryIcon, Clock, X, Plus } from 'lucide-react';

const AIChatContainer: React.FC<{ className?: string, contextGetter?: () => string, welcomeMessage?: string, persistenceKey?: string, chatTitle?: string, onNewChat?: () => void }> = ({ className, contextGetter, welcomeMessage, persistenceKey, chatTitle, onNewChat }) => {
  const { messages, sendMessage, isLoading, clearMessages, history, loadSession } = useAIChat({ getContext: contextGetter, persistenceKey, chatTitle });
  const [showHistory, setShowHistory] = React.useState(false);

  return (
<div
  className={`ai-chat-container relative flex flex-col bg-white shadow-xl rounded-2xl overflow-hidden  border border-slate-100 ${className || 'w-[360px] h-[500px]'}`}
>
      <div className="px-6 py-4 border-b border-slate-50 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <div className="text-base font-black text-slate-800 tracking-tight">AI Buddy</div>
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
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-1.5 rounded-xl transition-all active:scale-95 ${showHistory ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  title="Recent Chats"
                >
                  <HistoryIcon size={20} className="stroke-[2.5px]" />
                </button>
              </>
            )}
            <span className="text-[10px] font-black px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 tracking-wider">PLUS</span>
          </div>
        </div>

        {/* History Dropdown */}
        {showHistory && (
          <div className="absolute top-[72px] left-4 right-4 bg-white rounded-3xl shadow-2xl border border-slate-100 z-30 max-h-[400px] overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Recent Reviews</span>
              <button
                onClick={() => setShowHistory(false)}
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
                      onClick={() => { loadSession(item.key); setShowHistory(false); }}
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

      <AIChatMessages messages={messages} isLoading={isLoading} welcomeMessage={welcomeMessage} />

      <div className="p-4 border-t border-slate-50 bg-white shrink-0">
        <AIChatInput onSend={sendMessage} disabled={isLoading} />
        <div className="flex justify-between items-center mt-3 px-2">
          <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Powered by Yuvro AI</span>
          <button
            onClick={clearMessages}
            className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider"
          >
            Clear Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatContainer;
