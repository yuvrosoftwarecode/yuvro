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
  activeStream?: { id: string; content: string } | null;
  activeFile?: string;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading, welcomeMessage, onInsertCode, activeStream, activeFile }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [appliedCodeId, setAppliedCodeId] = useState<string | null>(null);

  const staticTypingSentences = [
    "Alright, give me a second to think...",
"Let me look through this...",
"Okay, I’m checking what fits best here...",
"Hmm… analyzing this step by step...",
"Let me connect a few things...",
"I’m putting the pieces together...",
"Checking if there’s a better way to explain this...",
"Making this simple and clear for you...",
"Almost there, just refining the answer...",
"Okay, got it. Here’s what I think..."
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderCursor, setPlaceholderCursor] = useState(0);
  const [placeholderText, setPlaceholderText] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const shouldShowPlaceholderTyping = isLoading;

  useEffect(() => {
    if (!shouldShowPlaceholderTyping) {
      setPlaceholderIndex(0);
      setPlaceholderCursor(0);
      setPlaceholderText('');
      return;
    }

    const sentence = staticTypingSentences[placeholderIndex];
    if (!sentence) return;

    const typingInterval = setInterval(() => {
      setPlaceholderCursor(prev => {
        const next = prev + 1;
        if (next <= sentence.length) {
          setPlaceholderText(sentence.slice(0, next));
          return next;
        }
        clearInterval(typingInterval);
        setTimeout(() => {
          setPlaceholderIndex((idx) => Math.min(idx + 1, staticTypingSentences.length - 1));
          setPlaceholderCursor(0);
          setPlaceholderText('');
        }, 400);
        return prev;
      });
    }, 35);

    return () => clearInterval(typingInterval);
  }, [shouldShowPlaceholderTyping, placeholderIndex]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleApplyCode = (code: string, id: string) => {
    if (onInsertCode) {
      onInsertCode(code);
      setAppliedCodeId(id);
      setTimeout(() => setAppliedCodeId(null), 2000);
    }
  };

  const filteredMessages = messages.filter((message) => {
    if (
      message.message_type === 'assistant' &&
      !message.content &&
      isLoading &&
      !(activeStream && activeStream.id === message.id)
    ) {
      return false;
    }
    return true;
  });

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

      {filteredMessages.map((message) => {
        const isUser = message.message_type === 'user';
        const isStreaming = !!(activeStream && activeStream.id === message.id);
        const displayContent = isStreaming ? `${activeStream!.content}|` : message.content;

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
                                  className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white transition-all flex items-center gap-1"
                                  title="Copy code"
                                >
                                  {copiedCodeId === codeId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>
                                {onInsertCode && (
                                  <button
                                    onClick={() => handleApplyCode(codeString, codeId)}
                                    className={`px-2 py-1 rounded-md text-white transition-all shadow-sm flex items-center gap-1 text-[11px] font-medium ${
                                      appliedCodeId === codeId
                                        ? 'bg-emerald-600'
                                        : 'bg-indigo-600 hover:bg-indigo-500'
                                    }`}
                                    title={activeFile ? `Apply to ${activeFile}` : 'Apply code to editor'}
                                  >
                                    {appliedCodeId === codeId ? (
                                      <>
                                        <Check size={12} />
                                        <span>Applied ✓</span>
                                      </>
                                    ) : (
                                      <>
                                        <Terminal size={12} />
                                        <span>{activeFile ? `Apply to ${activeFile}` : 'Apply'}</span>
                                      </>
                                    )}
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
                    {displayContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && !activeStream && (
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles size={12} className="text-white" />
          </div>
          <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-[12px]">{placeholderText}<span className="animate-pulse">|</span></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;