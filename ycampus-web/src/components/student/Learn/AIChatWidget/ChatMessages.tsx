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

// Tracks which message IDs have already animated so re-renders don't re-trigger
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, activeStream]);

  // Stagger-animate new messages in
  useEffect(() => {
    messages.forEach((m, i) => {
      if (!animatedIds.has(m.id)) {
        animatedIds.add(m.id);
        const delay = i === messages.length - 1 ? 30 : 0; // only animate the newest
        setTimeout(() => {
          setVisibleIds(prev => new Set([...prev, m.id]));
        }, delay);
      }
    });
  }, [messages]);

  const isVisible = (id: string) => visibleIds.has(id);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4 bg-gray-50/40 custom-scrollbar"
      style={{ scrollBehavior: 'auto' }}
    >
      {/* Welcome state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-5 text-center select-none">
          <div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200"
            style={{ animation: 'buddyPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            <Sparkles size={28} className="text-white" />
          </div>
          <div style={{ animation: 'buddyFade 0.4s ease 0.15s both' }}>
            <p className="text-[15px] font-semibold text-gray-900">Hi, I'm Buddy!</p>
            <p className="text-[13px] text-gray-400 max-w-[200px] leading-relaxed mt-1">
              {welcomeMessage || 'Ask me anything about this topic.'}
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
            className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible
                ? 'translateY(0) scale(1)'
                : `translateY(10px) scale(0.97)`,
              transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.2,0.64,1)',
            }}
          >
            {/* AI avatar */}
            {!isUser && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
                <Sparkles size={12} className="text-white" />
              </div>
            )}

            {/* Bubble */}
            <div className={`max-w-[78%] text-[13px] leading-relaxed ${
              isUser
                ? 'bg-gray-900 text-white px-4 py-2.5 rounded-2xl rounded-br-md'
                : 'bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
            }`}>
              {isUser ? (
                <p className="whitespace-pre-wrap">{m.content}</p>
              ) : (
                <div className="prose prose-sm prose-gray max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 relative">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p({ children }) {
                        return <p className="mb-1 last:inline">{children}</p>;
                      },
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const codeId = Math.random().toString(36).substring(7);

                        if (inline) {
                          return (
                            <code className="bg-gray-100 text-violet-700 px-1.5 py-0.5 rounded-md text-[12px] font-mono" {...props}>
                              {children}
                            </code>
                          );
                        }

                        // If it's a streaming message, use a simplified code block to avoid lag
                        if (isStreaming) {
                          return (
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto my-2.5 font-mono text-[11px] border border-gray-800">
                              <code>{codeString}</code>
                            </pre>
                          );
                        }

                        return (
                          <div className="relative group rounded-xl overflow-hidden my-2.5 border border-gray-200">
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-900">
                              <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">{match?.[1] || 'code'}</span>
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyCode(codeString, codeId)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors text-[11px]"
                                >
                                  {copiedCodeId === codeId
                                    ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                                    : <><Copy size={11} /><span>Copy</span></>}
                                </button>
                                {onInsertCode && (
                                  <button
                                    onClick={() => onInsertCode(codeString)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors text-[11px]"
                                  >
                                    <Terminal size={11} /><span>Insert</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <SyntaxHighlighter
                              language={match?.[1] || 'text'}
                              style={vscDarkPlus}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '0.875rem', background: '#111827', fontSize: '12px', lineHeight: '1.6' }}
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

                  {/* Feedback */}
                  {!isLoading && !isStreaming && (
                    <div className="flex items-center gap-0.5 mt-2.5 pt-2 border-t border-gray-100 justify-end">
                      <button
                        onClick={() => onFeedback?.(m.id, true)}
                        className={`p-1 rounded-lg transition-colors ${m.feedback === 'positive' ? 'text-emerald-500 bg-emerald-50' : 'text-gray-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
                      >
                        <ThumbsUp size={12} className={m.feedback === 'positive' ? 'fill-current' : ''} />
                      </button>
                      <button
                        onClick={() => onFeedback?.(m.id, false)}
                        className={`p-1 rounded-lg transition-colors ${m.feedback === 'negative' ? 'text-red-400 bg-red-50' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                      >
                        <ThumbsDown size={12} className={m.feedback === 'negative' ? 'fill-current' : ''} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {isLoading && messages[messages.length - 1]?.message_type !== 'assistant' && (
        <div
          className="flex items-end gap-2"
          style={{ animation: 'buddyFade 0.2s ease both' }}
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles size={12} className="text-white" />
          </div>
          <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-gray-300"
                style={{ animation: `typingDot 1.2s ease-in-out ${delay}ms infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Keyframes injected once */}
      <style>{`
        @keyframes buddyPop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes buddyFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1;   }
        }
      `}</style>
    </div>
  );
};

export default ChatMessages;
