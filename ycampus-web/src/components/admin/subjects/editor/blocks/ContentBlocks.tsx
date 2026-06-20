import React from 'react';
import { TipTapEditor } from '../TipTapEditor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export type CalloutVariant = 'info' | 'warning' | 'success' | 'question' | 'tip';

const calloutConfig: Record<CalloutVariant, { label: string; bgClass: string; borderClass: string; titleClass: string; icon: string }> = {
  info: {
    label: 'Info / Definition',
    icon: 'ℹ️',
    bgClass: 'bg-blue-50',
    borderClass: 'border-l-blue-500',
    titleClass: 'text-blue-800',
  },
  warning: {
    label: 'Warning / Important',
    icon: '⚠️',
    bgClass: 'bg-amber-50',
    borderClass: 'border-l-amber-500',
    titleClass: 'text-amber-800',
  },
  success: {
    label: 'Key Point / Success',
    icon: '✅',
    bgClass: 'bg-green-50',
    borderClass: 'border-l-green-500',
    titleClass: 'text-green-800',
  },
  question: {
    label: 'Question & Explanation',
    icon: '❓',
    bgClass: 'bg-purple-50',
    borderClass: 'border-l-purple-500',
    titleClass: 'text-purple-800',
  },
  tip: {
    label: 'Exam Tip',
    icon: '💡',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-l-indigo-500',
    titleClass: 'text-indigo-800',
  },
};

interface CalloutBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({ block, onChange }) => {
  const variant: CalloutVariant = block.metadata?.variant || 'info';
  const config = calloutConfig[variant];

  return (
    <div className={`p-4 border-l-4 rounded-r-xl ${config.bgClass} ${config.borderClass}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg">{config.icon}</span>
        <select
          value={variant}
          onChange={(e) => onChange({ metadata: { ...block.metadata, variant: e.target.value } })}
          className={`text-xs font-bold uppercase bg-transparent border-0 focus:outline-none ${config.titleClass} cursor-pointer`}
        >
          {(Object.entries(calloutConfig) as [CalloutVariant, typeof calloutConfig[CalloutVariant]][]).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
      </div>

      <Input
        value={block.metadata?.title || ''}
        onChange={(e) => onChange({ metadata: { ...block.metadata, title: e.target.value } })}
        placeholder="Title (optional)..."
        className={`font-semibold bg-transparent border-none shadow-none focus-visible:ring-0 px-0 mb-2 ${config.titleClass} placeholder:opacity-50`}
      />

      <TipTapEditor
        content={block.content || ''}
        onChange={(html) => onChange({ content: html })}
        placeholder="Write content..."
        className="bg-transparent"
      />
    </div>
  );
};


interface CardGridBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const CardGridBlock: React.FC<CardGridBlockProps> = ({ block, onChange }) => {
  const cards: { title: string; description?: string; icon?: string }[] = block.metadata?.cards || [
    { title: 'Card 1', description: '' },
    { title: 'Card 2', description: '' },
    { title: 'Card 3', description: '' },
  ];

  const updateCard = (idx: number, field: string, value: string) => {
    const updated = cards.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
    onChange({ metadata: { ...block.metadata, cards: updated } });
  };

  const addCard = () => {
    onChange({ metadata: { ...block.metadata, cards: [...cards, { title: `Card ${cards.length + 1}`, description: '' }] } });
  };

  const removeCard = (idx: number) => {
    if (cards.length <= 1) return;
    onChange({ metadata: { ...block.metadata, cards: cards.filter((_, i) => i !== idx) } });
  };

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {cards.map((card, idx) => (
          <div key={idx} className="relative group border border-slate-200 rounded-xl p-3 bg-white hover:border-indigo-300 transition-colors space-y-2">
            <button
              type="button"
              onClick={() => removeCard(idx)}
              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-opacity hover:bg-red-600"
            >
              ×
            </button>
            <Input
              value={card.title}
              onChange={(e) => updateCard(idx, 'title', e.target.value)}
              placeholder="Card title"
              className="font-semibold text-sm border-none shadow-none focus-visible:ring-0 px-1 h-7"
            />
            <Input
              value={card.description || ''}
              onChange={(e) => updateCard(idx, 'description', e.target.value)}
              placeholder="Optional description..."
              className="text-xs text-slate-500 border-none shadow-none focus-visible:ring-0 px-1 h-6"
            />
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addCard} className="gap-1 text-xs">
        <Plus className="w-3 h-3" /> Add Card
      </Button>
    </div>
  );
};


interface ColumnLayoutBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const ColumnLayoutBlock: React.FC<ColumnLayoutBlockProps> = ({ block, onChange }) => {
  const cols: number = block.metadata?.cols || 2;
  const columns: { heading?: string; content: string }[] = block.metadata?.columns || Array(cols).fill({ heading: '', content: '' });

  const updateColumn = (idx: number, field: 'heading' | 'content', value: string) => {
    const updated = columns.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
    onChange({ metadata: { ...block.metadata, columns: updated } });
  };

  const gridClass = cols === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="p-4">
      <div className={`grid ${gridClass} gap-3`}>
        {columns.map((col, idx) => (
          <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
              <Input
                value={col.heading || ''}
                onChange={(e) => updateColumn(idx, 'heading', e.target.value)}
                placeholder={`Column ${idx + 1} heading...`}
                className="border-none shadow-none focus-visible:ring-0 px-0 h-6 text-xs font-semibold text-slate-600"
              />
            </div>
            <div className="p-2">
              <TipTapEditor
                content={col.content || ''}
                onChange={(html) => updateColumn(idx, 'content', html)}
                placeholder="Column content..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


interface BulletListBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const BulletListBlock: React.FC<BulletListBlockProps> = ({ block, onChange }) => {
  const items: string[] = block.metadata?.items || [''];
  const isOrdered = block.type === 'ordered_list';

  const updateItem = (idx: number, value: string) => {
    const updated = items.map((it, i) => (i === idx ? value : it));
    onChange({ metadata: { ...block.metadata, items: updated } });
  };

  const addItem = () => onChange({ metadata: { ...block.metadata, items: [...items, ''] } });
  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    onChange({ metadata: { ...block.metadata, items: items.filter((_, i) => i !== idx) } });
  };

  return (
    <div className="p-4 space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          {isOrdered ? (
            <span className="text-sm font-bold text-indigo-600 w-5 shrink-0">{idx + 1}.</span>
          ) : (
            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 ml-1" />
          )}
          <Input
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder={`Item ${idx + 1}...`}
            className="flex-1 border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
          />
          <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length <= 1} className="h-7 w-7 text-slate-400 hover:text-red-500">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addItem} className="ml-5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1">
        <Plus className="w-3 h-3" /> Add Item
      </Button>
    </div>
  );
};


interface FormulaBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const FormulaBlock: React.FC<FormulaBlockProps> = ({ block, onChange }) => {
  return (
    <div className="p-4 space-y-3">
      <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-center min-h-[60px]">
        <span className="text-white font-mono text-lg">
          {block.content || <span className="text-slate-400 text-sm">Enter formula below...</span>}
        </span>
      </div>
      <Input
        value={block.content || ''}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="e.g.  PV = nRT  or  E = mc²"
        className="font-mono text-center text-slate-700"
      />
    </div>
  );
};


interface DividerBlockProps {}
export const DividerBlock: React.FC<DividerBlockProps> = () => (
  <div className="px-4 py-6 flex items-center gap-3">
    <div className="flex-1 h-px bg-slate-200" />
    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
    <div className="flex-1 h-px bg-slate-200" />
  </div>
);


interface CodeBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const CodeBlockEditor: React.FC<CodeBlockProps> = ({ block, onChange }) => {
  const languages = ['javascript', 'python', 'java', 'c', 'cpp', 'typescript', 'sql', 'html', 'css', 'bash'];

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase">Language</span>
        <select
          value={block.metadata?.language || 'javascript'}
          onChange={(e) => onChange({ metadata: { ...block.metadata, language: e.target.value } })}
          className="text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <textarea
        value={block.content || ''}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="// Paste your code here..."
        rows={8}
        className="w-full font-mono text-sm bg-slate-900 text-green-400 p-4 rounded-xl border-none resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
};
