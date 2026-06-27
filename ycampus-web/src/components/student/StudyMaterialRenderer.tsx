import React from 'react';
import { ArrowRight, CheckCircle, FileText } from 'lucide-react';

type Block = {
  id: string;
  type: string;
  content?: string;
  metadata?: Record<string, any>;
};

// ─── Callout Variants ─────────────────────────────────────────────────────────

const calloutStyle: Record<string, { bg: string; border: string; icon: string; titleColor: string; bodyColor: string }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-l-blue-500',
    icon: 'ℹ️',
    titleColor: 'text-blue-800',
    bodyColor: 'text-blue-900',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    icon: '⚠️',
    titleColor: 'text-amber-800',
    bodyColor: 'text-amber-900',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-l-green-500',
    icon: '✅',
    titleColor: 'text-green-800',
    bodyColor: 'text-green-900',
  },
  question: {
    bg: 'bg-purple-50',
    border: 'border-l-purple-500',
    icon: '❓',
    titleColor: 'text-purple-800',
    bodyColor: 'text-purple-900',
  },
  tip: {
    bg: 'bg-indigo-50',
    border: 'border-l-indigo-500',
    icon: '💡',
    titleColor: 'text-indigo-800',
    bodyColor: 'text-indigo-900',
  },
};

// ─── Individual Block Renderers ────────────────────────────────────────────────

const RenderHeading: React.FC<{ block: Block }> = ({ block }) => (
  <h2 
    className="text-2xl font-bold text-slate-900 mt-8 mb-2 leading-tight"
    dangerouslySetInnerHTML={{ __html: block.content || '' }}
  />
);

const RenderSubheading: React.FC<{ block: Block }> = ({ block }) => (
  <h3 
    className="text-lg font-semibold text-slate-800 mt-6 mb-2 leading-snug"
    dangerouslySetInnerHTML={{ __html: block.content || '' }}
  />
);

const RenderParagraph: React.FC<{ block: Block }> = ({ block }) => (
  <div
    className="text-slate-700 leading-relaxed prose prose-sm max-w-none prose-a:text-indigo-600 prose-strong:text-slate-900"
    dangerouslySetInnerHTML={{ __html: block.content || '' }}
  />
);

const RenderDivider: React.FC = () => (
  <div className="flex items-center gap-3 my-6">
    <div className="flex-1 h-px bg-slate-200" />
    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
    <div className="flex-1 h-px bg-slate-200" />
  </div>
);

const RenderFormula: React.FC<{ block: Block }> = ({ block }) => (
  <div className="my-4 bg-slate-900 rounded-xl p-5 flex items-center justify-center shadow-lg">
    <span className="text-white font-mono text-lg tracking-wide select-all">{block.content}</span>
  </div>
);

const RenderCode: React.FC<{ block: Block }> = ({ block }) => (
  <div className="my-4 rounded-xl overflow-hidden shadow-sm border border-slate-200">
    <div className="bg-slate-800 flex items-center justify-between px-4 py-2">
      <span className="text-xs text-slate-400 font-mono">{block.metadata?.language || 'code'}</span>
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
    </div>
    <pre className="bg-slate-900 text-green-400 font-mono text-sm p-5 overflow-x-auto leading-relaxed">
      <code>{block.content}</code>
    </pre>
  </div>
);

const RenderCallout: React.FC<{ block: Block }> = ({ block }) => {
  const variant = block.metadata?.variant || 'info';
  const style = calloutStyle[variant] || calloutStyle.info;
  return (
    <div className={`my-4 border-l-4 rounded-r-xl p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{style.icon}</span>
        {block.metadata?.title && (
          <span className={`font-bold text-sm ${style.titleColor} prose prose-sm max-w-none prose-p:my-0`} dangerouslySetInnerHTML={{ __html: block.metadata.title }} />
        )}
      </div>
      <div
        className={`text-sm leading-relaxed prose prose-sm max-w-none ${style.bodyColor}`}
        dangerouslySetInnerHTML={{ __html: block.content || '' }}
      />
    </div>
  );
};

const RenderBulletList: React.FC<{ block: Block }> = ({ block }) => {
  const items: string[] = block.metadata?.items || [];
  const isOrdered = block.type === 'ordered_list';
  if (isOrdered) {
    return (
      <ol className="my-3 space-y-1.5 pl-1">
        {items.filter(Boolean).map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-slate-700">
            <span className="text-sm font-bold text-indigo-600 w-6 shrink-0 mt-0.5">{i + 1}.</span>
            <span className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-0" dangerouslySetInnerHTML={{ __html: item }} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="my-3 space-y-1.5 pl-1">
      {items.filter(Boolean).map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-slate-700">
          <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
          <span className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-0" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
};

const RenderTable: React.FC<{ block: Block }> = ({ block }) => {
  const rows: string[][] = block.metadata?.rows || [];
  const hasHeader: boolean = block.metadata?.hasHeader !== false;
  if (!rows.length) return null;
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm">
        {hasHeader && (
          <thead>
            <tr className="bg-indigo-50">
              {rows[0].map((cell, ci) => (
                <th key={ci} className="px-4 py-3 text-left font-semibold text-indigo-800 border-b border-indigo-100">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.slice(hasHeader ? 1 : 0).map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-slate-700 border-b border-slate-100">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RenderCardGrid: React.FC<{ block: Block }> = ({ block }) => {
  const cards: { title: string; description?: string }[] = block.metadata?.cards || [];
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-yellow-600',
  ];
  return (
    <div className="my-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-gradient-to-br ${colors[idx % colors.length]} text-white rounded-xl p-5 shadow-md`}
        >
          <div className="font-bold text-base mb-1 prose prose-invert max-w-none prose-p:my-0" dangerouslySetInnerHTML={{ __html: card.title }} />
          {card.description && <div className="text-sm text-white/80 leading-relaxed prose prose-invert max-w-none prose-p:my-0 mt-1" dangerouslySetInnerHTML={{ __html: card.description }} />}
        </div>
      ))}
    </div>
  );
};

const RenderColumnLayout: React.FC<{ block: Block }> = ({ block }) => {
  const columns: { heading?: string; content: string }[] = block.metadata?.columns || [];
  const cols = block.metadata?.cols || 2;
  const gridClass = cols === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3';
  return (
    <div className={`my-4 grid ${gridClass} gap-4`}>
      {columns.map((col, idx) => (
        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
          {col.heading && (
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-700 prose prose-sm max-w-none prose-p:my-0" dangerouslySetInnerHTML={{ __html: col.heading }} />
            </div>
          )}
          <div
            className="p-4 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: col.content || '' }}
          />
        </div>
      ))}
    </div>
  );
};

const RenderProcessFlow: React.FC<{ block: Block }> = ({ block }) => {
  const steps: string[] = block.metadata?.steps || [];
  return (
    <div className="my-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-xl p-5 border border-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold shadow-sm shrink-0">
                {idx + 1}
              </div>
              <span className="text-sm font-medium text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const RenderStepper: React.FC<{ block: Block }> = ({ block }) => {
  const steps: { title: string; description?: string }[] = block.metadata?.steps || [];
  return (
    <div className="my-4 space-y-0">
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm flex items-center justify-center font-bold shadow-md shrink-0 z-10">
              {idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-300 to-slate-200 mt-1" />
            )}
          </div>
          <div className="pb-6 pt-1 flex-1">
            <p className="font-semibold text-slate-900 text-sm leading-snug mb-0.5">{step.title}</p>
            {step.description && (
              <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const RenderMedia: React.FC<{ block: Block }> = ({ block }) => {
  const { url, caption, filename } = block.metadata || {};
  if (!url) return null;

  if (block.type === 'image') {
    return (
      <figure className="my-4">
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
          <img src={url} alt={caption || ''} className="w-full object-contain max-h-[480px]" />
        </div>
        {caption && <figcaption className="text-center text-sm text-slate-500 mt-2 italic">{caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === 'video') {
    const isYoutube = url.includes('youtube') || url.includes('youtu.be');
    const embedId = isYoutube
      ? (url.split('v=')[1]?.split('&')[0] || url.split('/').pop())
      : null;
    return (
      <figure className="my-4">
        <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-md bg-black">
          {isYoutube ? (
            <iframe
              src={`https://www.youtube.com/embed/${embedId}`}
              className="w-full h-full"
              allowFullScreen
            />
          ) : (
            <video src={url} controls className="w-full h-full" />
          )}
        </div>
        {caption && <figcaption className="text-center text-sm text-slate-500 mt-2 italic">{caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === 'pdf') {
    return (
      <div className="my-4 flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="font-semibold text-sm text-slate-800 truncate">{filename || 'Document.pdf'}</p>
          <p className="text-xs text-slate-500">PDF Document</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-red-600 hover:text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:shadow-sm transition-all shrink-0"
        >
          Download
        </a>
      </div>
    );
  }

  return null;
};

// ─── Main Block Dispatch ────────────────────────────────────────────────────────

const RenderBlock: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.type) {
    case 'heading':       return <RenderHeading block={block} />;
    case 'subheading':    return <RenderSubheading block={block} />;
    case 'paragraph':     return <RenderParagraph block={block} />;
    case 'divider':       return <RenderDivider />;
    case 'formula':       return <RenderFormula block={block} />;
    case 'code':          return <RenderCode block={block} />;
    case 'callout_info':
    case 'callout_warning':
    case 'callout_success':
    case 'callout_question':
    case 'callout_tip':   return <RenderCallout block={block} />;
    // Legacy support
    case 'box':           return <RenderCallout block={{ ...block, metadata: { ...block.metadata, variant: 'info' } }} />;
    case 'exam_strategy': return <RenderBulletList block={{ ...block, metadata: { items: block.metadata?.items || [] } }} />;
    case 'bullet_list':
    case 'bullet_points': return <RenderBulletList block={block} />;
    case 'ordered_list':  return <RenderBulletList block={block} />;
    case 'image':
    case 'video':
    case 'pdf':           return <RenderMedia block={block} />;
    case 'table':         return <RenderTable block={block} />;
    case 'card_grid':     return <RenderCardGrid block={block} />;
    case 'two_columns':
    case 'three_columns': return <RenderColumnLayout block={block} />;
    case 'process_flow':  return <RenderProcessFlow block={block} />;
    case 'stepper':       return <RenderStepper block={block} />;
    default:              return null;
  }
};

// ─── Main Renderer Component ────────────────────────────────────────────────────

interface StudyMaterialRendererProps {
  content: string | null | undefined;
  title?: string;
}

const StudyMaterialRenderer: React.FC<StudyMaterialRendererProps> = ({ content, title }) => {
  const blocks = React.useMemo<Block[]>(() => {
    if (!content) return [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback: plain text
      return [{ id: 'fallback', type: 'paragraph', content }];
    }
    return [];
  }, [content]);

  if (!blocks.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No study material available yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-2 py-4">
      {title && (
        <h1 className="text-3xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-200">{title}</h1>
      )}
      <div className="space-y-2">
        {blocks.map((block) => (
          <RenderBlock key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
};

export default StudyMaterialRenderer;
