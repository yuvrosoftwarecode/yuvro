import React from 'react';
import { TipTapEditor } from '../TipTapEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { Block } from '../BlockRegistry';

interface AIBlockProps {
  block: Block & any;
  onChange: (updates: any) => void;
}

// ─── HERO BLOCK ─────────────────────────────────────────────────────────────

export const HeroBlockEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  return (
    <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg text-white space-y-3">
      <div className="text-xs font-bold uppercase tracking-widest text-indigo-200">Hero Section</div>
      <TipTapEditor
        minimal
        content={block.title || block.content || ''}
        onChange={(html) => onChange({ title: html })}
        placeholder="Hero Title..."
        className="text-lg font-bold bg-white/10 text-white placeholder:text-white/50 border-none shadow-none focus-visible:ring-0 p-2 rounded"
      />
      <TipTapEditor
        minimal
        content={block.description || ''}
        onChange={(html) => onChange({ description: html })}
        placeholder="Hero Description..."
        className="text-sm bg-white/10 text-white placeholder:text-white/50 border-none shadow-none focus-visible:ring-0 p-2 rounded"
      />
    </div>
  );
};

// ─── INFO BOX (Callouts) ────────────────────────────────────────────────────

export const InfoBoxEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  const colorMap: Record<string, string> = {
    'info-box': 'bg-blue-50 border-blue-300 text-blue-800',
    'warning-box': 'bg-amber-50 border-amber-300 text-amber-800',
    'success-box': 'bg-green-50 border-green-300 text-green-800',
    'tip-box': 'bg-purple-50 border-purple-300 text-purple-800',
  };
  const iconMap: Record<string, string> = { 'info-box': '💡', 'warning-box': '⚠️', 'success-box': '✅', 'tip-box': '🎯' };

  return (
    <div className={`p-4 border-l-4 rounded-r-lg ${colorMap[block.type]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span>{iconMap[block.type]}</span>
        <TipTapEditor
          minimal
          content={block.title || ''}
          onChange={(html) => onChange({ title: html })}
          placeholder="Title..."
          className="font-bold text-sm flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 p-0 m-0"
        />
      </div>
      <TipTapEditor
        minimal
        content={block.content || block.description || ''}
        onChange={(html) => onChange({ content: html })}
        placeholder="Write content here..."
        className="text-sm bg-white/50 border border-black/10 rounded p-2"
      />
    </div>
  );
};

// ─── LIST BLOCK ─────────────────────────────────────────────────────────────

export const ListBlockEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  const items: string[] = block.items || [];
  const isNum = block.type === 'numbered-list';

  const updateItem = (idx: number, html: string) => {
    const newItems = [...items];
    newItems[idx] = html;
    onChange({ items: newItems });
  };
  const addItem = () => onChange({ items: [...items, ''] });
  const removeItem = (idx: number) => onChange({ items: items.filter((_, i) => i !== idx) });

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{isNum ? 'Numbered List' : 'Bullet List'}</div>
      <div className="space-y-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold shrink-0 mt-2">{isNum ? `${i + 1}.` : '•'}</span>
            <div className="flex-1 bg-white border border-slate-200 rounded">
              <TipTapEditor
                minimal
                content={item}
                onChange={(html) => updateItem(i, html)}
                placeholder="List item content..."
                className="text-sm border-none shadow-none focus-visible:ring-0 p-2"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-red-500 shrink-0 mt-1 h-8 w-8">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
    </div>
  );
};

// ─── CONCEPT CARD ───────────────────────────────────────────────────────────

export const ConceptCardEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  return (
    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <span>⚡</span>
        <TipTapEditor
          minimal
          content={block.title || ''}
          onChange={(html) => onChange({ title: html })}
          placeholder="Concept Title..."
          className="font-bold text-blue-800 text-sm flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
        />
      </div>
      <TipTapEditor
        minimal
        content={block.description || ''}
        onChange={(html) => onChange({ description: html })}
        placeholder="Concept description..."
        className="text-sm text-slate-700 bg-white border border-blue-100 rounded p-2"
      />
    </div>
  );
};

// ─── COMPLEXITY CARD ────────────────────────────────────────────────────────

export const ComplexityCardEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  const time = typeof block.time_complexity === 'object' ? block.time_complexity?.value : block.time_complexity;
  const space = typeof block.space_complexity === 'object' ? block.space_complexity?.value : block.space_complexity;

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Complexity Card</div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-slate-600">Time:</span>
          <Input 
            value={time || ''} 
            onChange={e => onChange({ time_complexity: { value: e.target.value, color: 'red' } })} 
            placeholder="O(n)" 
            className="font-mono text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-slate-600">Space:</span>
          <Input 
            value={space || ''} 
            onChange={e => onChange({ space_complexity: { value: e.target.value, color: 'green' } })} 
            placeholder="O(1)" 
            className="font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
};

// ─── COMPARISON CARD ────────────────────────────────────────────────────────

export const ComparisonCardEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  const leftPts: string[] = block.left_points || [];
  const rightPts: string[] = block.right_points || [];

  const updateList = (side: 'left' | 'right', newPts: string[]) => {
    onChange({ [`${side}_points`]: newPts });
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Comparison Card</div>
      <div className="grid grid-cols-2 gap-4">
        {/* Left Side */}
        <div className="space-y-2 bg-blue-50 border border-blue-100 rounded p-2">
          <Input 
            value={block.left_title || ''} 
            onChange={e => onChange({ left_title: e.target.value })} 
            placeholder="Left Title (e.g. Array)" 
            className="font-bold text-sm bg-white"
          />
          {leftPts.map((p, i) => (
            <div key={i} className="flex gap-1">
              <Input value={p} onChange={e => { const a = [...leftPts]; a[i] = e.target.value; updateList('left', a); }} className="text-xs h-7 bg-white" />
              <Button variant="ghost" size="icon" onClick={() => updateList('left', leftPts.filter((_, idx) => idx !== i))} className="h-7 w-7 text-red-500"><Trash2 className="w-3 h-3"/></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateList('left', [...leftPts, ''])} className="w-full h-7 text-xs">Add Point</Button>
        </div>

        {/* Right Side */}
        <div className="space-y-2 bg-purple-50 border border-purple-100 rounded p-2">
          <Input 
            value={block.right_title || ''} 
            onChange={e => onChange({ right_title: e.target.value })} 
            placeholder="Right Title (e.g. Linked List)" 
            className="font-bold text-sm bg-white"
          />
          {rightPts.map((p, i) => (
            <div key={i} className="flex gap-1">
              <Input value={p} onChange={e => { const a = [...rightPts]; a[i] = e.target.value; updateList('right', a); }} className="text-xs h-7 bg-white" />
              <Button variant="ghost" size="icon" onClick={() => updateList('right', rightPts.filter((_, idx) => idx !== i))} className="h-7 w-7 text-red-500"><Trash2 className="w-3 h-3"/></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateList('right', [...rightPts, ''])} className="w-full h-7 text-xs">Add Point</Button>
        </div>
      </div>
    </div>
  );
};

// ─── REVISION CARD ──────────────────────────────────────────────────────────

export const RevisionCardEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  const points: string[] = block.points || [];

  return (
    <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
      <div className="font-bold text-indigo-800 text-sm mb-3">⭐ Quick Revision</div>
      <div className="space-y-2 mb-3">
        {points.map((pt, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold shrink-0 mt-2">✓</span>
            <div className="flex-1 bg-white border border-indigo-100 rounded">
              <TipTapEditor
                minimal
                content={pt}
                onChange={(html) => { const a = [...points]; a[i] = html; onChange({ points: a }); }}
                placeholder="Revision point..."
                className="text-sm border-none shadow-none focus-visible:ring-0 p-2"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => onChange({ points: points.filter((_, idx) => idx !== i) })} className="text-red-500 shrink-0 mt-1 h-8 w-8"><Trash2 className="w-4 h-4"/></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => onChange({ points: [...points, ''] })}><Plus className="w-4 h-4 mr-1"/> Add Point</Button>
    </div>
  );
};

// ─── FACT & ANALOGY BOX ─────────────────────────────────────────────────────

export const FactBoxEditor: React.FC<AIBlockProps> = ({ block, onChange }) => (
  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
    <span className="text-xl">💡</span>
    <div className="flex-1">
      <div className="text-xs font-bold text-yellow-700 mb-1">Did You Know?</div>
      <TipTapEditor
        minimal
        content={block.content || ''}
        onChange={(html) => onChange({ content: html })}
        placeholder="Enter fact..."
        className="text-sm text-yellow-900 bg-white/50 border border-yellow-200/50 rounded p-2"
      />
    </div>
  </div>
);

export const AnalogyBoxEditor: React.FC<AIBlockProps> = ({ block, onChange }) => (
  <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <span>🌍</span>
      <TipTapEditor
        minimal
        content={block.title || ''}
        onChange={(html) => onChange({ title: html })}
        placeholder="Analogy Title..."
        className="font-bold text-teal-800 text-sm flex-1 bg-transparent border-none p-0"
      />
    </div>
    <TipTapEditor
      minimal
      content={block.content || block.description || ''}
      onChange={(html) => onChange({ content: html })}
      placeholder="Analogy description..."
      className="text-sm text-teal-900 bg-white/50 border border-teal-200/50 rounded p-2"
    />
  </div>
);

// ─── QUIZ BLOCK ─────────────────────────────────────────────────────────────

export const QuizBlockEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  const opts: string[] = block.options || [];

  return (
    <div className="p-4 bg-white border-2 border-indigo-200 rounded-lg space-y-3">
      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Quiz Editor</div>
      
      <TipTapEditor
        minimal
        content={block.question || ''}
        onChange={html => onChange({ question: html })}
        placeholder="Enter your question here..."
        className="font-semibold text-sm bg-slate-50 border border-slate-200 rounded p-2"
      />

      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500">Options (Select the radio button for the correct answer):</div>
        {opts.map((opt, i) => (
          <div key={i} className="flex items-start gap-2">
            <input 
              type="radio" 
              name={`quiz-${block.id}`} 
              checked={opt === block.answer && opt !== ''} 
              onChange={() => onChange({ answer: opt })} 
              className="mt-3"
            />
            <div className="flex-1 bg-white border border-slate-200 rounded">
              <TipTapEditor
                minimal
                content={opt}
                onChange={html => {
                  const a = [...opts]; a[i] = html;
                  // If we modified the correct answer, update the answer state too
                  if (opts[i] === block.answer) onChange({ options: a, answer: html });
                  else onChange({ options: a });
                }}
                placeholder={`Option ${String.fromCharCode(65 + i)}...`}
                className="text-sm border-none p-2"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => {
              const newOpts = opts.filter((_, idx) => idx !== i);
              onChange({ options: newOpts, answer: opt === block.answer ? '' : block.answer });
            }} className="text-red-500 mt-1"><Trash2 className="w-4 h-4"/></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => onChange({ options: [...opts, ''] })}><Plus className="w-4 h-4 mr-1"/> Add Option</Button>
    </div>
  );
};

// ─── ACCORDION BLOCK ────────────────────────────────────────────────────────

export const AccordionBlockEditor: React.FC<AIBlockProps> = ({ block, onChange }) => (
  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
    <TipTapEditor
      minimal
      content={block.title || ''}
      onChange={html => onChange({ title: html })}
      placeholder="Accordion Title..."
      className="font-semibold text-slate-800 text-sm bg-white border border-slate-200 rounded p-2 mb-2"
    />
    <TipTapEditor
      minimal
      content={block.description || ''}
      onChange={html => onChange({ description: html })}
      placeholder="Accordion expanded content..."
      className="text-xs text-slate-600 bg-white border border-slate-200 rounded p-2"
    />
  </div>
);

// ─── DIAGRAM BLOCK ──────────────────────────────────────────────────────────

export const DiagramBlockEditor: React.FC<AIBlockProps> = ({ block, onChange }) => {
  const steps: string[] = block.steps || [];
  const isFlow = block.type === 'flow-diagram';

  return (
    <div className={`p-4 rounded-lg border ${isFlow ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`text-xs font-bold uppercase tracking-wide ${isFlow ? 'text-indigo-600' : 'text-slate-600'}`}>
          {isFlow ? 'Flow Diagram' : 'DSA Diagram'}
        </div>
        {!isFlow && (
          <Input 
            value={block.title || ''} 
            onChange={e => onChange({ title: e.target.value })} 
            placeholder="Optional Title..." 
            className="h-7 text-xs flex-1 bg-white"
          />
        )}
      </div>

      <div className="space-y-2 mb-3">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-xs font-bold text-slate-400 w-4">{i+1}.</span>
            <Input 
              value={s} 
              onChange={e => { const a = [...steps]; a[i] = e.target.value; onChange({ steps: a }); }} 
              className={`h-8 font-mono text-sm bg-white ${isFlow ? 'border-indigo-200' : ''}`}
            />
            <Button variant="ghost" size="icon" onClick={() => onChange({ steps: steps.filter((_, idx) => idx !== i) })} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4"/></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => onChange({ steps: [...steps, ''] })}><Plus className="w-4 h-4 mr-1"/> Add Step</Button>
    </div>
  );
};
