import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, Copy, Check, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  onInsertCode?: (code: string) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading, welcomeMessage, onInsertCode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

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
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm mb-1">
                <Sparkles size={12} className="text-white" />
              </div>
            )}

            <div
              className={`max-w-[85%] text-[13px] leading-relaxed relative group ${
                isUser
                  ? 'bg-gray-900 text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-sm'
                  : 'bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
              }`}
            >
              {isUser ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                <div className="prose prose-sm prose-slate max-w-none [&_p]:leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const codeId = Math.random().toString(36).substring(7);

                        if (inline) {
                          return (
                            <code className="bg-gray-100 text-indigo-600 px-1 py-0.5 rounded font-mono text-[11px]" {...props}>
                              {children}
                            </code>
                          );
                        }

                        return (
                          <div className="relative group/code rounded-xl overflow-hidden my-3 border border-gray-200 shadow-sm bg-gray-950">
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-white/5">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{match?.[1] || 'code'}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyCode(codeString, codeId)}
                                  className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white transition-all"
                                  title="Copy code"
                                >
                                  {copiedCodeId === codeId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>
                                {onInsertCode && (
                                  <button
                                    onClick={() => onInsertCode(codeString)}
                                    className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
                                    title="Insert code into editor"
                                  >
                                    <Terminal size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <SyntaxHighlighter
                              language={match?.[1] || 'text'}
                              style={vscDarkPlus}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '11px', lineHeight: '1.6' }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
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
            <span className="text-[12px]">Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
