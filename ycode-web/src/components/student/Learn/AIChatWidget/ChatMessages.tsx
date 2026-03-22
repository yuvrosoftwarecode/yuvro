import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Loader2, Copy, Check, Terminal, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './AIChatWidget.css';

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

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading, activeStream, welcomeMessage, onInsertCode, onFeedback }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

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
        const isStreaming = !!(activeStream && activeStream.id === m.id);
        const displayContent = isStreaming ? activeStream!.content : m.content;
        
        return (
          <div key={m.id} className={`flex items-start gap-3 animate-fade-in-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110 ${isUser ? 'bg-indigo-600' : 'bg-white border border-gray-100'}`}>
              {isUser ? <User size={14} className="text-white" /> : <Bot size={16} className={`${isStreaming ? 'text-emerald-500 animate-pulse' : 'text-emerald-500'}`} />}
            </div>

            <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm ${isUser
              ? 'user-bubble rounded-tr-sm'
              : 'assistant-bubble text-gray-800 rounded-tl-sm'
              }`}>
              {isUser ? (
                <div className="whitespace-pre-wrap font-medium">{m.content}</div>
              ) : (
                <div className="prose prose-sm prose-blue max-w-none dark:prose-invert leading-relaxed relative flex flex-col">
                  {/* UX Illusion: Minimalist SubtleShimmer for waiting state */}
                  {displayContent.includes("...") && !isStreaming && !isUser ? (
                    <div className="flex flex-col gap-3 py-2">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buddy is thinking</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 skeleton-shimmer w-full" />
                        <div className="h-2 skeleton-shimmer w-5/6" />
                      </div>
                    </div>
                  ) : (
                    <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const codeId = Math.random().toString(36).substring(7); // simple unique ID for copy state
                        
                        // Don't render custom block if it's inline code
                        if (inline) {
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                        
                        // If it's a streaming message, use a simplified code block to avoid lag
                        const isStreaming = activeStream && activeStream.id === m.id;
                        
                        if (isStreaming) {
                          return (
                            <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto my-3 font-mono text-xs">
                              <code>{codeString}</code>
                            </pre>
                          );
                        }

                        return (
                          <div className="relative group rounded-lg overflow-hidden my-3 border border-slate-700 w-[calc(100%+1.25rem)] -ml-5 sm:ml-0 sm:w-full">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
                              <span className="text-xs font-mono text-slate-400 capitalize">{match?.[1] || 'Code'}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyCode(codeString, codeId)}
                                  className="p-1.5 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
                                  title="Copy code"
                                >
                                  {copiedCodeId === codeId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                  {copiedCodeId === codeId ? <span className="text-[10px] font-medium text-emerald-400">Copied!</span> : <span className="text-[10px] font-medium hidden sm:inline-block">Copy</span>}
                                </button>
                                {onInsertCode && (
                                  <>
                                    <div className="w-px h-4 bg-slate-600 mx-0.5"></div>
                                    <button
                                      onClick={() => onInsertCode(codeString)}
                                      className="p-1.5 rounded bg-blue-600/80 hover:bg-blue-600 text-white transition-colors flex items-center gap-1.5"
                                      title="Insert code at cursor"
                                    >
                                      <Terminal size={14} />
                                      <span className="text-[10px] font-medium hidden sm:inline-block">Insert</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-[13px] leading-relaxed relative">
                              <SyntaxHighlighter
                                language={match?.[1] || 'text'}
                                style={vscDarkPlus}
                                PreTag="div"
                                customStyle={{ margin: 0, padding: '1rem', background: '#1e1e1e' }}
                                {...props}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        );
                      }
                    }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                )}
                  {/* UI Perception: Modern Blinking Cursor for active stream */}
                  {!isUser && isStreaming && (
                    <span className="typing-cursor" />
                  )}
                  
                  {!isUser && !isLoading && !activeStream && (
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100/60 justify-end">
                      <button
                        onClick={() => onFeedback?.(m.id, true)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${m.feedback === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                        title="Helpful"
                      >
                        <ThumbsUp size={14} className={m.feedback === 'positive' ? 'fill-current' : ''} />
                      </button>
                      <button
                        onClick={() => onFeedback?.(m.id, false)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${m.feedback === 'negative' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        title="Not helpful"
                      >
                        <ThumbsDown size={14} className={m.feedback === 'negative' ? 'fill-current' : ''} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Only show "Thinking..." if we don't have a placeholder message already */}
      {isLoading && messages[messages.length - 1]?.message_type !== 'assistant' && (
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
