import React, { useState } from 'react';
import { ArrowRight, ArrowDown, CheckCircle, FileText, Lightbulb, ChevronDown, ChevronUp, BookOpen, Zap, Star } from 'lucide-react';

// ─── Extended Block Type ────────────────────────────────────────────────────────

type Block = {
  id?: string;
  type: string;
  content?: string;
  metadata?: Record<string, any>;
  // New top-level keys from AI-generated JSON
  title?: string;
  description?: string;
  variant?: string;
  color?: string;
  items?: string[];
  steps?: string[];
  points?: string[];
  headers?: string[];
  rows?: string[][];
  question?: string;
  options?: string[];
  answer?: string;
  time_complexity?: string | { value: string; color?: string };
  space_complexity?: string | { value: string; color?: string };
  left_title?: string;
  right_title?: string;
  left_points?: string[];
  right_points?: string[];
  icon?: string;
};

// ─── Callout Style Map ──────────────────────────────────────────────────────────

const calloutStyleMap: Record<string, { bg: string; border: string; icon: string; titleColor: string; bodyColor: string }> = {
  info:    { bg: 'bg-blue-50',   border: 'border-l-blue-500',   icon: '💡', titleColor: 'text-blue-800',   bodyColor: 'text-blue-900' },
  blue:    { bg: 'bg-blue-50',   border: 'border-l-blue-500',   icon: '💡', titleColor: 'text-blue-800',   bodyColor: 'text-blue-900' },
  warning: { bg: 'bg-amber-50',  border: 'border-l-amber-500',  icon: '⚠️', titleColor: 'text-amber-800',  bodyColor: 'text-amber-900' },
  yellow:  { bg: 'bg-amber-50',  border: 'border-l-amber-500',  icon: '⚠️', titleColor: 'text-amber-800',  bodyColor: 'text-amber-900' },
  success: { bg: 'bg-green-50',  border: 'border-l-green-500',  icon: '✅', titleColor: 'text-green-800',  bodyColor: 'text-green-900' },
  green:   { bg: 'bg-green-50',  border: 'border-l-green-500',  icon: '✅', titleColor: 'text-green-800',  bodyColor: 'text-green-900' },
  tip:     { bg: 'bg-purple-50', border: 'border-l-purple-500', icon: '🎯', titleColor: 'text-purple-800', bodyColor: 'text-purple-900' },
  purple:  { bg: 'bg-purple-50', border: 'border-l-purple-500', icon: '🎯', titleColor: 'text-purple-800', bodyColor: 'text-purple-900' },
  question:{ bg: 'bg-violet-50', border: 'border-l-violet-500', icon: '❓', titleColor: 'text-violet-800', bodyColor: 'text-violet-900' },
};

const conceptColorMap: Record<string, { border: string; bg: string; badge: string; title: string }> = {
  blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   title: 'text-blue-800' },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', title: 'text-purple-800' },
  green:  { border: 'border-green-200',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700',  title: 'text-green-800' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', title: 'text-orange-800' },
  red:    { border: 'border-red-200',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700',    title: 'text-red-800' },
};

const complexityColorMap: Record<string, string> = {
  green:  'bg-green-100 text-green-800 border-green-300',
  red:    'bg-red-100 text-red-800 border-red-300',
  blue:   'bg-blue-100 text-blue-800 border-blue-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
};

// ─── Helper ─────────────────────────────────────────────────────────────────────

const resolveVariant = (block: Block): string => {
  return block.variant || block.metadata?.variant || 'info';
};

const resolveTitle = (block: Block): string => {
  return block.title || block.metadata?.title || '';
};

const resolveItems = (block: Block): string[] => {
  return block.items || block.metadata?.items || [];
};

const resolveSteps = (block: Block): string[] => {
  return block.steps || block.metadata?.steps || [];
};

const resolvePoints = (block: Block): string[] => {
  return block.points || block.metadata?.points || [];
};

// ─── Existing Block Renderers (Updated) ─────────────────────────────────────────

const RenderHeading: React.FC<{ block: Block }> = ({ block }) => (
  <h2
    className="text-xl font-bold text-slate-900 mt-8 mb-3 leading-tight flex items-center gap-2"
    dangerouslySetInnerHTML={{ __html: block.content || '' }}
  />
);

const RenderSubheading: React.FC<{ block: Block }> = ({ block }) => (
  <h3
    className="text-base font-semibold text-slate-800 mt-5 mb-2 leading-snug"
    dangerouslySetInnerHTML={{ __html: block.content || '' }}
  />
);

const RenderParagraph: React.FC<{ block: Block }> = ({ block }) => (
  <div
    className="text-slate-700 leading-relaxed prose prose-sm max-w-none prose-a:text-indigo-600 prose-strong:text-slate-900 prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded"
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

// ─── Updated Callout (supports new type names & root-level keys) ─────────────────

const RenderCallout: React.FC<{ block: Block; forceVariant?: string }> = ({ block, forceVariant }) => {
  const variant = forceVariant || resolveVariant(block);
  const style = calloutStyleMap[variant] || calloutStyleMap.info;
  const title = resolveTitle(block);
  const bodyContent = block.content || block.description || '';

  return (
    <div className={`my-4 border-l-4 rounded-r-xl p-4 shadow-sm ${style.bg} ${style.border}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg leading-none">{style.icon}</span>
        {title && (
          <span
            className={`font-bold text-sm ${style.titleColor}`}
            dangerouslySetInnerHTML={{ __html: title }}
          />
        )}
      </div>
      <div
        className={`text-sm leading-relaxed prose prose-sm max-w-none ${style.bodyColor}`}
        dangerouslySetInnerHTML={{ __html: bodyContent }}
      />
    </div>
  );
};

// ─── Updated Bullet / Numbered List (supports root-level `items`) ─────────────

const RenderBulletList: React.FC<{ block: Block }> = ({ block }) => {
  const items = resolveItems(block);
  const isOrdered = block.type === 'ordered_list' || block.type === 'numbered-list';

  if (!items.length) return null;

  if (isOrdered) {
    return (
      <ol className="my-3 space-y-2 pl-1">
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
    <ul className="my-3 space-y-2 pl-1">
      {items.filter(Boolean).map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-slate-700">
          <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
          <span className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-0" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
};

// ─── Updated Table (supports root-level `headers` + `rows`) ─────────────────────

const RenderTable: React.FC<{ block: Block }> = ({ block }) => {
  const headers: string[] = block.headers || block.metadata?.headers || [];
  const rows: string[][] = block.rows || block.metadata?.rows || [];

  if (!headers.length && !rows.length) return null;

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm">
        {headers.length > 0 && (
          <thead>
            <tr className="bg-indigo-600">
              {headers.map((h, ci) => (
                <th key={ci} className="px-4 py-3 text-left font-semibold text-white border-b border-indigo-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
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

// ─── NEW: Hero Block ─────────────────────────────────────────────────────────────

const RenderHero: React.FC<{ block: Block }> = ({ block }) => {
  const title = resolveTitle(block) || block.content || '';
  const description = block.description || block.metadata?.description || '';
  const difficulty = block.metadata?.difficulty || '';
  const difficultyColor: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  return (
    <div className="my-2 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            {difficulty && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColor[difficulty.toLowerCase()] || 'bg-white/20 text-white'}`}>
                {difficulty}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight mb-2" dangerouslySetInnerHTML={{ __html: title }} />
          {description && (
            <p className="text-indigo-100 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── NEW: Concept Card ───────────────────────────────────────────────────────────

const RenderConceptCard: React.FC<{ block: Block }> = ({ block }) => {
  const title = resolveTitle(block) || block.content || '';
  const description = block.description || block.metadata?.description || '';
  const color = block.color || block.metadata?.color || 'blue';
  const styles = conceptColorMap[color] || conceptColorMap.blue;

  return (
    <div className={`my-3 rounded-xl border-2 ${styles.border} ${styles.bg} p-4 shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${styles.badge} flex items-center justify-center shrink-0`}>
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <h4 className={`font-bold text-sm mb-1 ${styles.title}`} dangerouslySetInnerHTML={{ __html: title }} />
          {description && (
            <p className="text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── NEW: Complexity Card ────────────────────────────────────────────────────────

const RenderComplexityCard: React.FC<{ block: Block }> = ({ block }) => {
  const rawTime = block.time_complexity || block.metadata?.time_complexity;
  const rawSpace = block.space_complexity || block.metadata?.space_complexity;

  const timeVal = typeof rawTime === 'object' ? rawTime.value : rawTime || 'O(n)';
  const spaceVal = typeof rawSpace === 'object' ? rawSpace.value : rawSpace || 'O(1)';
  const timeColor = typeof rawTime === 'object' ? rawTime.color || 'red' : 'red';
  const spaceColor = typeof rawSpace === 'object' ? rawSpace.color || 'green' : 'green';

  const timeStyles = complexityColorMap[timeColor] || complexityColorMap.red;
  const spaceStyles = complexityColorMap[spaceColor] || complexityColorMap.green;

  return (
    <div className="my-4 rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Complexity Analysis</p>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">⏱ Time:</span>
          <span className={`text-sm font-bold px-3 py-1 rounded-full border font-mono ${timeStyles}`}>
            {timeVal}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">🗃 Space:</span>
          <span className={`text-sm font-bold px-3 py-1 rounded-full border font-mono ${spaceStyles}`}>
            {spaceVal}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── NEW: Comparison Card ────────────────────────────────────────────────────────

const RenderComparisonCard: React.FC<{ block: Block }> = ({ block }) => {
  const leftTitle = block.left_title || block.metadata?.left_title || 'Option A';
  const rightTitle = block.right_title || block.metadata?.right_title || 'Option B';
  const leftPoints: string[] = block.left_points || block.metadata?.left_points || [];
  const rightPoints: string[] = block.right_points || block.metadata?.right_points || [];

  return (
    <div className="my-4 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="grid grid-cols-2">
        <div className="bg-blue-600 text-white px-4 py-2 text-sm font-bold text-center">{leftTitle}</div>
        <div className="bg-purple-600 text-white px-4 py-2 text-sm font-bold text-center border-l border-white/20">{rightTitle}</div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="p-4 bg-blue-50">
          <ul className="space-y-2">
            {leftPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-blue-500 font-bold mt-0.5">+</span>
                <span dangerouslySetInnerHTML={{ __html: pt }} />
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 bg-purple-50">
          <ul className="space-y-2">
            {rightPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-purple-500 font-bold mt-0.5">+</span>
                <span dangerouslySetInnerHTML={{ __html: pt }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// ─── NEW: Revision Card ──────────────────────────────────────────────────────────

const RenderRevisionCard: React.FC<{ block: Block }> = ({ block }) => {
  const points = resolvePoints(block);

  return (
    <div className="my-6 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
          <Star className="w-4 h-4 text-white fill-white" />
        </div>
        <h4 className="font-bold text-indigo-800 text-sm uppercase tracking-wide">Quick Revision</h4>
      </div>
      <ul className="space-y-2">
        {points.filter(Boolean).map((pt, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
            <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span dangerouslySetInnerHTML={{ __html: pt }} />
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── NEW: Fact Box ───────────────────────────────────────────────────────────────

const RenderFactCard: React.FC<{ block: Block }> = ({ block }) => {
  const content = block.content || block.description || '';

  return (
    <div className="my-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex gap-3 shadow-sm">
      <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center shrink-0">
        <Lightbulb className="w-4 h-4 text-yellow-700" />
      </div>
      <div>
        <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1">Did You Know?</p>
        <p className="text-sm text-yellow-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

// ─── NEW: Analogy Box ────────────────────────────────────────────────────────────

const RenderAnalogyBox: React.FC<{ block: Block }> = ({ block }) => {
  const title = resolveTitle(block) || 'Real Life Example';
  const content = block.content || block.description || '';

  return (
    <div className="my-4 rounded-xl border border-teal-200 bg-teal-50 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🌍</span>
        <h4 className="font-bold text-teal-800 text-sm" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <div
        className="text-sm text-teal-900 leading-relaxed prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

// ─── NEW: Interactive Quiz ────────────────────────────────────────────────────────

const RenderQuiz: React.FC<{ block: Block }> = ({ block }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const question = block.question || block.metadata?.question || '';
  const options: string[] = block.options || block.metadata?.options || [];
  const answer = block.answer || block.metadata?.answer || '';

  const getOptionStyle = (opt: string) => {
    if (!selected) return 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer';
    if (opt === answer) return 'border-green-400 bg-green-50 text-green-800';
    if (opt === selected && opt !== answer) return 'border-red-400 bg-red-50 text-red-800';
    return 'border-slate-200 bg-slate-50 text-slate-400 cursor-default';
  };

  return (
    <div className="my-4 rounded-xl border-2 border-indigo-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-indigo-600 px-4 py-2 flex items-center gap-2">
        <span className="text-white font-bold text-xs uppercase tracking-wide">Quiz</span>
      </div>
      <div className="p-4">
        <p className="font-semibold text-slate-800 text-sm mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: question }} />
        <div className="space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => !selected && setSelected(opt)}
              className={`w-full text-left text-sm px-4 py-3 rounded-lg border-2 transition-all ${getOptionStyle(opt)}`}
            >
              <span className="font-bold mr-2 text-indigo-500">{String.fromCharCode(65 + i)}.</span>
              <span dangerouslySetInnerHTML={{ __html: opt }} />
              {selected && opt === answer && <span className="ml-2 text-green-600 font-bold">✓</span>}
              {selected && opt === selected && opt !== answer && <span className="ml-2 text-red-600 font-bold">✗</span>}
            </button>
          ))}
        </div>
        {selected && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg font-medium ${selected === answer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {selected === answer ? '🎉 Correct! Well done.' : `❌ Incorrect. The answer is: ${answer}`}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── NEW: Accordion ──────────────────────────────────────────────────────────────

const RenderAccordion: React.FC<{ block: Block }> = ({ block }) => {
  const [open, setOpen] = useState(false);
  const title = resolveTitle(block) || block.content || '';
  const content = block.description || block.metadata?.content || '';

  return (
    <div className="my-2 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="font-semibold text-slate-800 text-sm" dangerouslySetInnerHTML={{ __html: title }} />
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-white border-t border-slate-200">
          <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      )}
    </div>
  );
};

// ─── NEW: Diagram Block ───────────────────────────────────────────────────────────

const RenderDiagram: React.FC<{ block: Block }> = ({ block }) => {
  const title = resolveTitle(block) || block.metadata?.title || '';
  const steps = resolveSteps(block);

  return (
    <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
      {title && (
        <div className="bg-slate-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider">
          {title}
        </div>
      )}
      <div className="p-4 space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 font-mono text-sm bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 shadow-sm">
              {step}
            </div>
            {i < steps.length - 1 && (
              <div className="text-slate-400 text-lg">↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── NEW: Flow Diagram ────────────────────────────────────────────────────────────

const RenderFlowDiagram: React.FC<{ block: Block }> = ({ block }) => {
  const steps = resolveSteps(block);

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
            {idx < steps.length - 1 && <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ─── Existing Renderers ──────────────────────────────────────────────────────────

const RenderCardGrid: React.FC<{ block: Block }> = ({ block }) => {
  const cards: { title: string; description?: string }[] = block.metadata?.cards || [];
  const colors = [
    'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600', 'from-orange-500 to-red-500',
    'from-pink-500 to-rose-600', 'from-amber-500 to-yellow-600',
  ];
  return (
    <div className="my-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card, idx) => (
        <div key={idx} className={`bg-gradient-to-br ${colors[idx % colors.length]} text-white rounded-xl p-5 shadow-md`}>
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
          <div className="p-4 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: col.content || '' }} />
        </div>
      ))}
    </div>
  );
};

// ─── NEW: Additional Missing AI Blocks ────────────────────────────────────────

const RenderDefinitionCard: React.FC<{ block: Block }> = ({ block }) => {
  return (
    <div className="my-4 p-4 border border-indigo-200 bg-white rounded-xl shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
      <div className="flex gap-3">
        <div className="text-2xl mt-0.5">📖</div>
        <div>
          <h4 className="font-bold text-indigo-900 text-base mb-1" dangerouslySetInnerHTML={{ __html: block.title || block.metadata?.title || 'Definition' }} />
          <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.description || block.content || block.metadata?.description || '' }} />
        </div>
      </div>
    </div>
  );
};

const RenderArrayDiagram: React.FC<{ block: Block }> = ({ block }) => {
  const values = block.items || block.metadata?.items || [];
  return (
    <div className="my-4 bg-slate-50 p-6 rounded-xl border border-slate-200 overflow-x-auto">
      {block.title && <div className="text-sm font-bold text-slate-700 mb-4">{block.title}</div>}
      <div className="flex items-center gap-1 min-w-max">
        {values.map((val: any, idx: number) => (
          <div key={idx} className="flex flex-col items-center">
            <div className="w-12 h-12 flex items-center justify-center bg-white border-2 border-indigo-200 text-indigo-900 font-mono font-bold text-lg rounded-md shadow-sm">
              {val}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">{idx}</div>
          </div>
        ))}
      </div>
      {block.description && <div className="text-sm text-slate-600 mt-4 italic" dangerouslySetInnerHTML={{ __html: block.description }} />}
    </div>
  );
};

const RenderArrayOperationDiagram: React.FC<{ block: Block }> = ({ block }) => {
  const before = block.metadata?.before || [];
  const after = block.metadata?.after || [];
  
  return (
    <div className="my-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      {block.title && <div className="text-sm font-bold text-slate-800 mb-3">{block.title}</div>}
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Before</div>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {before.map((val: string, idx: number) => (
              <div key={idx} className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-300 text-slate-700 font-mono text-sm rounded">
                {val}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium border border-indigo-100 flex items-center gap-2">
            <ArrowDown className="w-3 h-3" /> Operation <ArrowDown className="w-3 h-3" />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">After</div>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {after.map((val: string, idx: number) => (
              <div key={idx} className="w-10 h-10 flex items-center justify-center bg-indigo-50 border-2 border-indigo-300 text-indigo-900 font-mono text-sm rounded font-bold shadow-sm">
                {val}
              </div>
            ))}
          </div>
        </div>
      </div>
      {block.description && <div className="text-sm text-slate-600 mt-3 border-t border-slate-100 pt-3" dangerouslySetInnerHTML={{ __html: block.description }} />}
    </div>
  );
};

const RenderStepFlow: React.FC<{ block: Block }> = ({ block }) => {
  const steps = block.steps || block.metadata?.steps || [];
  return (
    <div className="my-4 space-y-3">
      {block.title && <h4 className="font-bold text-slate-800 mb-2">{block.title}</h4>}
      {steps.map((step: any, idx: number) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-200 z-10 shrink-0">
              {idx + 1}
            </div>
            {idx < steps.length - 1 && <div className="w-0.5 h-full bg-indigo-100 my-1"></div>}
          </div>
          <div className="pb-4 pt-0.5 text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: step }} />
        </div>
      ))}
    </div>
  );
};

const RenderCodeExample: React.FC<{ block: Block }> = ({ block }) => {
  const code = block.content || block.metadata?.code || '';
  const language = block.metadata?.language || 'javascript';
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
        <span className="text-slate-300 text-xs font-mono">{language}</span>
        {block.title && <span className="text-slate-400 text-xs">{block.title}</span>}
      </div>
      <pre className="p-4 bg-slate-900 text-slate-50 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      {block.description && <div className="bg-slate-50 p-3 text-xs text-slate-600 border-t border-slate-200" dangerouslySetInnerHTML={{ __html: block.description }} />}
    </div>
  );
};

// ─── Block Dispatcher ──────────────────────────────────────────────────────────

const RenderStepper: React.FC<{ block: Block }> = ({ block }) => {
  const steps = block.metadata?.steps || [];
  return (
    <div className="my-8">
      <div className="space-y-4">
        {steps.map((step: any, idx: number) => (
          <div key={idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                {idx + 1}
              </div>
              {idx < steps.length - 1 && <div className="w-px h-full bg-slate-200 my-2" />}
            </div>
            <div className="pb-6 pt-1">
              <h4 className="font-semibold text-slate-900">{step.title}</h4>
              <p className="text-slate-600 text-sm mt-1">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RenderDrawing: React.FC<{ block: Block }> = ({ block }) => {
  if (!block.content) return null;
  return (
    <div className="my-6 flex justify-center w-full">
      <div className="max-w-full overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: block.content }} />
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
    const embedId = isYoutube ? (url.split('v=')[1]?.split('&')[0] || url.split('/').pop()) : null;
    return (
      <figure className="my-4">
        <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-md bg-black">
          {isYoutube ? (
            <iframe src={`https://www.youtube.com/embed/${embedId}`} className="w-full h-full" allowFullScreen />
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
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-red-600 hover:text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:shadow-sm transition-all shrink-0">
          Download
        </a>
      </div>
    );
  }

  return null;
};

// ─── Main Block Dispatch ────────────────────────────────────────────────────────

export const RenderBlock: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.type) {
    // ── Core typography
    case 'heading':        return <RenderHeading block={block} />;
    case 'subheading':     return <RenderSubheading block={block} />;
    case 'paragraph':      return <RenderParagraph block={block} />;
    case 'divider':        return <RenderDivider />;
    case 'formula':        return <RenderFormula block={block} />;
    case 'code':           return <RenderCode block={block} />;

    // ── Callouts (legacy types)
    case 'callout_info':   return <RenderCallout block={block} forceVariant="info" />;
    case 'callout_warning':return <RenderCallout block={block} forceVariant="warning" />;
    case 'callout_success':return <RenderCallout block={block} forceVariant="success" />;
    case 'callout_question':return <RenderCallout block={block} forceVariant="question" />;
    case 'callout_tip':    return <RenderCallout block={block} forceVariant="tip" />;
    case 'box':            return <RenderCallout block={block} forceVariant="info" />;

    // ── NEW callout types (from AI-generated JSON)
    case 'info-box':       return <RenderCallout block={block} forceVariant={resolveVariant(block) || 'info'} />;
    case 'warning-box':    return <RenderCallout block={block} forceVariant="warning" />;
    case 'success-box':    return <RenderCallout block={block} forceVariant="success" />;
    case 'tip-box':        return <RenderCallout block={block} forceVariant="tip" />;

    // ── Lists
    case 'bullet_list':
    case 'bullet_points':
    case 'bullet-list':    return <RenderBulletList block={block} />;
    case 'ordered_list':
    case 'numbered-list':  return <RenderBulletList block={block} />;
    case 'exam_strategy':  return <RenderBulletList block={{ ...block, items: block.items || block.metadata?.items || [] }} />;

    // ── Media
    case 'image':
    case 'video':
    case 'pdf':            return <RenderMedia block={block} />;

    // ── Table (updated to support root-level headers/rows)
    case 'table':          return <RenderTable block={block} />;

    // ── Layouts
    case 'card_grid':      return <RenderCardGrid block={block} />;
    case 'two_columns':
    case 'three_columns':  return <RenderColumnLayout block={block} />;
    case 'stepper':        return <RenderStepper block={block} />;
    case 'drawing':        return <RenderDrawing block={block} />;

    // ── NEW Visual Components
    case 'hero':           return <RenderHero block={block} />;
    case 'concept-card':   return <RenderConceptCard block={block} />;
    case 'complexity-card':return <RenderComplexityCard block={block} />;
    case 'comparison-card':return <RenderComparisonCard block={block} />;
    case 'revision-card':  return <RenderRevisionCard block={block} />;
    case 'fact-box':       return <RenderFactCard block={block} />;
    case 'analogy-box':    return <RenderAnalogyBox block={block} />;
    case 'quiz':           return <RenderQuiz block={block} />;
    case 'accordion':      return <RenderAccordion block={block} />;
    case 'diagram':        return <RenderDiagram block={block} />;
    case 'flow-diagram':
    case 'process_flow':   return <RenderFlowDiagram block={block} />;

    case 'definition-card':return <RenderDefinitionCard block={block} />;
    case 'array-diagram':  return <RenderArrayDiagram block={block} />;
    case 'array-operation-diagram': return <RenderArrayOperationDiagram block={block} />;
    case 'step-flow':      return <RenderStepFlow block={block} />;
    case 'code-example':   return <RenderCodeExample block={block} />;

    default:               return null;
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
      <div className="space-y-3">
        {blocks.map((block, idx) => (
          <RenderBlock key={block.id || idx} block={block} />
        ))}
      </div>
    </div>
  );
};

export default StudyMaterialRenderer;
