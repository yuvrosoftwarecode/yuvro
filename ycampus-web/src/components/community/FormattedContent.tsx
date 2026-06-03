import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FormattedContentProps {
  content: string;
}

export function FormattedContent({ content }: FormattedContentProps) {
  if (!content) return null;

  // Split content by <u>...</u> tags to handle underlining separately
  // Since standard ReactMarkdown does not parse HTML unless rehype-raw is installed,
  // we split the content and wrap <u> matches in an underline span.
  const parts = content.split(/(<u>[\s\S]*?<\/u>)/g);

  const markdownComponents = {
    p: ({ children }: any) => <span className="inline">{children}</span>,
    code({ inline, children, ...props }: any) {
      if (inline) {
        return (
          <code 
            className="bg-muted text-destructive dark:bg-muted/30 dark:text-red-400 px-1.5 py-0.5 rounded font-mono text-[13px] font-semibold"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-slate-950 text-slate-100 dark:bg-slate-900/80 p-3 rounded-lg overflow-x-auto my-2 font-mono text-[12px] border border-slate-800/20 shadow-sm">
          <code {...props}>{children}</code>
        </pre>
      );
    },
    a: ({ href, children, ...props }: any) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-primary hover:underline font-medium break-all" 
        onClick={(e) => e.stopPropagation()} // Stop propagation to avoid triggering card click details
        {...props}
      >
        {children}
      </a>
    ),
    ul: ({ children }: any) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
    li: ({ children }: any) => <li className="text-sm leading-relaxed">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2 text-muted-foreground bg-muted/20 py-1 pr-2 rounded-r">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('<u>') && part.endsWith('</u>')) {
          const innerText = part.slice(3, -4);
          return (
            <span key={index} className="underline inline">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {innerText}
              </ReactMarkdown>
            </span>
          );
        }
        return (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
