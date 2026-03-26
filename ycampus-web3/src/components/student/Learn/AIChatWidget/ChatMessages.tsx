import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Copy, Check, Terminal, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type ChatMessage = {
  id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  feedback?: 'positive' | 'negative';
};

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  welcomeMessage?: string;
  onInsertCode?: (code: string) => void;
  onFeedback?: (messageId: string, isPositive: boolean) => void;
  activeStream?: { id: string; content: string } | null;
}

const animatedIds = new Set<string>();

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading, activeStream, welcomeMessage, onInsertCode, onFeedback }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, activeStream]);

  useEffect(() => {
    messages.forEach((m, i) => {
      if (!animatedIds.has(m.id)) {
        animatedIds.add(m.id);
        const delay = i === messages.length - 1 ? 30 : 0;
        setTimeout(() => {
          setVisibleIds(prev => new Set([...prev, m.id]));
        }, delay);
      }
    });
  }, [messages]);

  const isVisible = (id: string) => visibleIds.has(id);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/10 custom-scrollbar"
      style={{ scrollBehavior: 'auto' }}
    >
      {/* Welcome state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-6 text-center select-none animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-200 rotate-6 hover:rotate-0 transition-transform duration-500">
            <Sparkles size={32} className="text-white" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-black text-slate-800 tracking-tight">Neural Sync Ready</p>
            <p className="text-xs font-bold text-slate-400 max-w-[240px] leading-relaxed uppercase tracking-widest px-4">
              {welcomeMessage || 'Establishing connection to cognitive logic core.'}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((m) => {
        const isUser = m.message_type === 'user';
        const visible = isVisible(m.id);
        const isStreaming = !!(activeStream && activeStream.id === m.id);
        const displayContent = isStreaming ? `${activeStream!.content}|` : m.content;

        return (
          <div
            key={m.id}
            className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : `translateY(15px) scale(0.95)`,
              transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {!isUser && (
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 mb-1 shadow-lg shadow-indigo-100 border border-indigo-500/20">
                <Sparkles size={16} className="text-white" />
              </div>
            )}

            <div className={`max-w-[85%] relative group ${
              isUser
                ? 'bg-slate-900 text-white px-5 py-3.5 rounded-[2rem] rounded-br-[0.5rem] shadow-xl'
                : 'bg-white text-slate-800 px-6 py-5 rounded-[2.5rem] rounded-bl-[0.5rem] shadow-sm border border-slate-100'
            }`}>
              {isUser ? (
                <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{m.content}</p>
              ) : (
                <div className="prose prose-sm prose-slate max-w-none [&_p]:leading-relaxed relative font-semibold">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const codeId = Math.random().toString(36).substring(7);

                        if (inline) {
                          return (
                            <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[11px] font-black" {...props}>
                              {children}
                            </code>
                          );
                        }

                        if (isStreaming) {
                          return (
                            <pre className="bg-slate-950 text-indigo-100 p-5 rounded-3xl overflow-x-auto my-4 font-mono text-[11px] border border-slate-800 shadow-2xl">
                              <code>{codeString}</code>
                            </pre>
                          );
                        }

                        return (
                          <div className="relative group rounded-[2rem] overflow-hidden my-6 border border-slate-800 shadow-2xl bg-slate-950">
                            <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-white/5">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{match?.[1] || 'logic buffer'}</span>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyCode(codeString, codeId)}
                                  className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                >
                                  {copiedCodeId === codeId
                                    ? <><Check size={10} className="text-emerald-400" /><span>Copied</span></>
                                    : <><Copy size={10} /><span>Copy</span></>}
                                </button>
                                {onInsertCode && (
                                  <button
                                    onClick={() => onInsertCode(codeString)}
                                    className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                  >
                                    <Terminal size={10} /><span>Inject</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <SyntaxHighlighter
                              language={match?.[1] || 'text'}
                              style={vscDarkPlus}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '12px', lineHeight: '1.7' }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      },
                    }}
                  >
                    {displayContent}
                  </ReactMarkdown>

                  {!isLoading && !isStreaming && (
                    <div className="flex items-center gap-1 mt-4 pt-4 border-t border-slate-50 justify-end transition-opacity opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => onFeedback?.(m.id, true)}
                        className={`p-2 rounded-xl transition-all ${m.feedback === 'positive' ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
                      >
                        <ThumbsUp size={14} fill={m.feedback === 'positive' ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => onFeedback?.(m.id, false)}
                        className={`p-2 rounded-xl transition-all ${m.feedback === 'negative' ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                      >
                        <ThumbsDown size={14} fill={m.feedback === 'negative' ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && messages[messages.length - 1]?.message_type !== 'assistant' && (
        <div className="flex items-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-100 border border-indigo-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="bg-white border border-slate-100 shadow-sm px-6 py-4 rounded-[2.5rem] rounded-bl-[0.5rem] flex items-center gap-2">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-2 h-2 rounded-full bg-indigo-200"
                style={{ animation: `typingDot 1.4s ease-in-out ${delay}ms infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1;   }
        }
      `}</style>
    </div>
  );
};

export default ChatMessages;
