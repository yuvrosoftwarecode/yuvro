import React, { useState } from 'react';
import {
  Zap, ListChecks, Network, AlertTriangle, Brain,
  MessageSquareQuote, Search, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ---------- Types ----------
type ToolkitTab = 'revision' | 'points' | 'formulas' | 'mindmap' | 'mistakes' | 'tricks' | 'viva';

// ---------- Sigma icon (inline) ----------
const SigmaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M18 7V4H6l6 8-6 8h12v-3" />
  </svg>
);

// ---------- Tabs config ----------
const toolkitTabs: { id: ToolkitTab; label: string; icon: React.ElementType }[] = [
  { id: 'revision',  label: 'Quick Revision', icon: Zap },
  { id: 'points',   label: 'Key Points',      icon: ListChecks },
  { id: 'formulas', label: 'Formulas',         icon: SigmaIcon },
  { id: 'mindmap',  label: 'Mind Map',         icon: Network },
  { id: 'mistakes', label: 'Mistakes',         icon: AlertTriangle },
  { id: 'tricks',   label: 'Tricks',           icon: Brain },
  { id: 'viva',     label: 'Viva',             icon: MessageSquareQuote },
];

// ---------- Node (Mind Map tree) ----------
const Node: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div className="pl-3 border-l border-slate-200 ml-1">
    <p className="py-0.5 font-medium text-slate-700">{label}</p>
    {children && <div className="ml-1">{children}</div>}
  </div>
);

// ---------- Toolkit content ----------
const ToolkitContent: React.FC<{ tab: ToolkitTab; search: string }> = ({ tab, search }) => {
  switch (tab) {
    case 'revision':
      return (
        <div className="space-y-2">
          {[
            'Hardness is caused by Ca²⁺ and Mg²⁺ ions in water.',
            'Two types: Temporary (bicarbonates) & Permanent (chlorides/sulphates).',
            'Measured in ppm of CaCO₃ equivalent.',
            'Removed by boiling, lime-soda, or ion-exchange methods.',
          ].filter(p => !search || p.toLowerCase().includes(search.toLowerCase()))
           .map((p, i) => (
            <div key={i} className="flex gap-2 rounded-md bg-white border border-slate-200 p-2.5">
              <span className="text-[11px] text-blue-600 font-semibold shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[12px] leading-relaxed text-slate-700">{p}</span>
            </div>
          ))}
        </div>
      );

    case 'points':
      return (
        <ul className="space-y-1.5 text-[12px] text-slate-700">
          {[
            'Standard unit: ppm (parts per million)',
            'CaCO₃ equivalent is universal reference',
            'Temporary hardness = boiling removes it',
            'EDTA method is most accurate measurement',
          ].filter(p => !search || p.toLowerCase().includes(search.toLowerCase()))
           .map((p) => (
            <li key={p} className="flex gap-2 rounded-md bg-white border border-slate-200 px-2.5 py-2">
              <span className="text-blue-500">•</span>{p}
            </li>
          ))}
        </ul>
      );

    case 'formulas':
      return (
        <div className="space-y-2">
          {[
            { f: 'Hardness (ppm)',    e: '(mass of salt × 100) / molecular weight' },
            { f: 'CaCO₃ Equivalent', e: 'Mass × (100 / Mol. Wt of salt)' },
            { f: 'Degree (°Clark)',   e: '1 grain CaCO₃ per gallon' },
          ].filter(x => !search || x.f.toLowerCase().includes(search.toLowerCase()) || x.e.toLowerCase().includes(search.toLowerCase()))
           .map((x) => (
            <div key={x.f} className="rounded-md bg-white border border-slate-200 p-2.5">
              <p className="text-[12px] font-semibold text-slate-900">{x.f}</p>
              <p className="text-[11px] font-mono text-slate-500 mt-1">{x.e}</p>
            </div>
          ))}
        </div>
      );

    case 'mindmap':
      return (
        <div className="space-y-1 text-[12px] text-slate-700">
          <Node label="Hardness of Water">
            <Node label="Types">
              <Node label="Temporary" />
              <Node label="Permanent" />
            </Node>
            <Node label="Measurement">
              <Node label="EDTA Method" />
              <Node label="O. Hehner's" />
            </Node>
            <Node label="Removal">
              <Node label="Boiling" />
              <Node label="Lime-Soda" />
              <Node label="Ion Exchange" />
            </Node>
          </Node>
        </div>
      );

    case 'mistakes':
      return (
        <div className="space-y-2 text-[12px]">
          {[
            'Confusing ppm with mg/L conversion when not equal.',
            'Forgetting buffer in EDTA titration — wrong end point.',
            'Mixing up temporary vs permanent removal methods.',
          ].filter(m => !search || m.toLowerCase().includes(search.toLowerCase()))
           .map((m) => (
            <div key={m} className="rounded-md border border-amber-200 bg-amber-50/60 text-amber-900 p-2.5">
              {m}
            </div>
          ))}
        </div>
      );

    case 'tricks':
      return (
        <div className="space-y-2 text-[12px]">
          <div className="rounded-md border border-slate-200 bg-white p-2.5">
            <p className="font-semibold text-slate-900">"BC for Boiling, CS for Chemical"</p>
            <p className="text-slate-500 mt-1">BiCarbonates → Boil. Chlorides/Sulphates → Chemical.</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-2.5">
            <p className="font-semibold text-slate-900">CaMg = Hardness twins</p>
            <p className="text-slate-500 mt-1">Always remember Ca²⁺ & Mg²⁺ as the culprits.</p>
          </div>
        </div>
      );

    case 'viva':
      return (
        <div className="space-y-2 text-[12px]">
          {[
            { q: 'What is hardness of water?',          a: 'Property preventing soap from lathering due to dissolved Ca/Mg salts.' },
            { q: 'Why is hardness expressed as CaCO₃?', a: 'It is the most common reference standard with molecular weight 100.' },
            { q: 'Name two methods of softening.',      a: 'Lime-Soda process and Ion-Exchange (Zeolite) process.' },
          ].filter(v => !search || v.q.toLowerCase().includes(search.toLowerCase()) || v.a.toLowerCase().includes(search.toLowerCase()))
           .map((v) => (
            <div key={v.q} className="rounded-md border border-slate-200 bg-white p-2.5">
              <p className="font-semibold text-slate-900">Q. {v.q}</p>
              <p className="text-slate-500 mt-1">A. {v.a}</p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
};

// ---------- Main exported panel ----------
export const StudyToolkitPanel: React.FC<{ onOpenAi: () => void }> = ({ onOpenAi }) => {
  const [activeTab, setActiveTab] = useState<ToolkitTab>('revision');
  const [search, setSearch] = useState('');

  return (
    <div className="h-full flex flex-col bg-slate-50/60 border-l border-slate-200">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-slate-900">Study Toolkit</h3>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onOpenAi}
          >
            <Sparkles className="h-3 w-3" /> AI Mentor
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search toolkit..."
            className="h-8 pl-8 text-xs border-slate-200 bg-slate-50/50 focus-visible:ring-blue-500"
          />
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap gap-1">
          {toolkitTabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200'
                )}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3.5">
          <ToolkitContent tab={activeTab} search={search} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default StudyToolkitPanel;
