import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Sparkles, Search, X, Send, Bot, Zap, BookOpen,
  List, Brain, AlertTriangle, Lightbulb, MessageCircle, Map,
  ChevronRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToolkitTab = 'revision' | 'points' | 'formulas' | 'mindmap' | 'mistakes' | 'tricks' | 'viva';

interface ToolkitTabDef {
  id: ToolkitTab;
  label: string;
  icon: React.ElementType;
}

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

interface StudyToolkitPanelProps {
  subunit: { id: string; name: string; content?: string | null } | null;
  onClose?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const toolkitTabs: ToolkitTabDef[] = [
  { id: 'revision',  label: 'Quick Revision', icon: Zap },
  { id: 'points',    label: 'Key Points',     icon: List },
  { id: 'formulas',  label: 'Formulas',       icon: BookOpen },
  { id: 'mindmap',   label: 'Mind Map',       icon: Map },
  { id: 'mistakes',  label: 'Mistakes',       icon: AlertTriangle },
  { id: 'tricks',    label: 'Tricks',         icon: Lightbulb },
  { id: 'viva',      label: 'Viva',           icon: MessageCircle },
];

const aiQuickActions = [
  'Explain simply',
  'Give an example',
  'Quiz me',
  'Summarize',
  'Common mistakes',
];

// ─── Helper: extract plain text from content blocks ──────────────────────────

function extractPlainText(content: string | null | undefined): string {
  if (!content) return '';
  try {
    const blocks = JSON.parse(content);
    if (!Array.isArray(blocks)) return content;
    return blocks
      .map((b: any) => {
        const parts: string[] = [];
        if (b.title) parts.push(b.title);
        if (b.content) parts.push(b.content.replace(/<[^>]+>/g, ''));
        if (b.description) parts.push(b.description.replace(/<[^>]+>/g, ''));
        if (Array.isArray(b.items)) parts.push(b.items.join(', '));
        if (Array.isArray(b.points)) parts.push(b.points.join(', '));
        if (Array.isArray(b.steps)) parts.push(b.steps.join(', '));
        return parts.join(' ');
      })
      .join('\n')
      .trim();
  } catch {
    return content.replace(/<[^>]+>/g, '');
  }
}

// ─── AI API call ─────────────────────────────────────────────────────────────

async function callAI(prompt: string): Promise<string> {
  try {
    const response = await restApiAuthUtil.post<{ response?: string; answer?: string; text?: string; message?: string }>(
      '/ai/chat/',
      { message: prompt }
    );
    return response.response || response.answer || response.text || response.message || 'No response from AI.';
  } catch {
    return 'Sorry, AI is unavailable right now.';
  }
}

// ─── Mind Map Node ───────────────────────────────────────────────────────────

const MindMapNode: React.FC<{ label: string; children?: React.ReactNode; depth?: number }> = ({
  label,
  children,
  depth = 0,
}) => (
  <div className={cn('border-l border-slate-200', depth > 0 ? 'pl-3 ml-1' : 'pl-0 border-none ml-0')}>
    <div className="flex items-center gap-1.5 py-0.5">
      {depth > 0 && <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />}
      <span className={cn('text-[12px] font-medium text-slate-700', depth === 0 && 'font-bold text-slate-900 text-[13px]')}>
        {label}
      </span>
    </div>
    {children && <div className="ml-1">{children}</div>}
  </div>
);

// ─── Toolkit Content ─────────────────────────────────────────────────────────

const ToolkitContent: React.FC<{
  tab: ToolkitTab;
  data: Record<ToolkitTab, any>;
  loading: boolean;
}> = ({ tab, data, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-[12px]">Generating {tab} content…</p>
      </div>
    );
  }

  const tabData = data[tab];

  if (!tabData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
        <Brain className="h-8 w-8 opacity-30" />
        <p className="text-[12px] text-center">No data yet. Open this tab to generate AI content.</p>
      </div>
    );
  }

  switch (tab) {
    case 'revision':
      return (
        <div className="space-y-2">
          {(tabData as string[]).map((point, i) => (
            <div key={i} className="flex gap-2 rounded-md bg-white border border-slate-200 p-2.5">
              <span className="text-[11px] text-blue-600 font-semibold shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[12px] leading-relaxed text-slate-700">{point}</span>
            </div>
          ))}
        </div>
      );

    case 'points':
      return (
        <ul className="space-y-1.5">
          {(tabData as string[]).map((p, i) => (
            <li key={i} className="flex gap-2 rounded-md bg-white border border-slate-200 px-2.5 py-2">
              <span className="text-blue-500 shrink-0">•</span>
              <span className="text-[12px] text-slate-700">{p}</span>
            </li>
          ))}
        </ul>
      );

    case 'formulas':
      return (
        <div className="space-y-2">
          {(tabData as { name: string; formula: string }[]).map((x, i) => (
            <div key={i} className="rounded-md bg-white border border-slate-200 p-2.5">
              <p className="text-[12px] font-semibold text-slate-900">{x.name}</p>
              <p className="text-[11px] font-mono text-slate-500 mt-1">{x.formula}</p>
            </div>
          ))}
        </div>
      );

    case 'mindmap': {
      const mm = tabData as { topic: string; branches: { label: string; children?: string[] }[] };
      return (
        <div className="space-y-1 text-[12px]">
          <MindMapNode label={mm.topic} depth={0}>
            {mm.branches.map((branch, i) => (
              <MindMapNode key={i} label={branch.label} depth={1}>
                {branch.children?.map((child, j) => (
                  <MindMapNode key={j} label={child} depth={2} />
                ))}
              </MindMapNode>
            ))}
          </MindMapNode>
        </div>
      );
    }

    case 'mistakes':
      return (
        <div className="space-y-2">
          {(tabData as string[]).map((m, i) => (
            <div key={i} className="rounded-md border border-amber-200 bg-amber-50/60 text-amber-900 p-2.5 text-[12px]">
              {m}
            </div>
          ))}
        </div>
      );

    case 'tricks':
      return (
        <div className="space-y-2">
          {(tabData as { mnemonic: string; explanation: string }[]).map((t, i) => (
            <div key={i} className="rounded-md border border-slate-200 bg-white p-2.5">
              <p className="font-semibold text-slate-900 text-[12px]">"{t.mnemonic}"</p>
              <p className="text-slate-500 mt-1 text-[11px]">{t.explanation}</p>
            </div>
          ))}
        </div>
      );

    case 'viva':
      return (
        <div className="space-y-2">
          {(tabData as { q: string; a: string }[]).map((v, i) => (
            <div key={i} className="rounded-md border border-slate-200 bg-white p-2.5">
              <p className="font-semibold text-slate-900 text-[12px]">Q. {v.q}</p>
              <p className="text-slate-500 mt-1 text-[12px]">A. {v.a}</p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
};

// ─── AI Mentor Panel ─────────────────────────────────────────────────────────

const AIMentorPanel: React.FC<{
  topic: string;
  context: string;
  onClose: () => void;
}> = ({ topic, context, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: `Hi! I'm your AI Mentor for "${topic}". Ask me anything about this topic!`, isUser: false },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput('');
    const userMsg: Message = { id: Date.now(), text: trimmed, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);
    const prompt = `Topic: ${topic}\n\nContext:\n${context}\n\nStudent question: ${trimmed}\n\nPlease give a clear, helpful answer focused on the topic.`;
    const reply = await callAI(prompt);
    setMessages(prev => [...prev, { id: Date.now() + 1, text: reply, isUser: false }]);
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-blue-50 flex items-center justify-center border border-blue-100">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 leading-none">AI Mentor</p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[160px]">Topic · {topic}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={cn('flex gap-2', m.isUser && 'flex-row-reverse')}>
            <div className={cn(
              'h-6 w-6 rounded-md flex items-center justify-center shrink-0 border',
              m.isUser ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-blue-50 border-blue-100'
            )}>
              {m.isUser
                ? <span className="text-[10px] font-semibold">U</span>
                : <Bot className="h-3.5 w-3.5 text-blue-600" />}
            </div>
            <div className={cn(
              'rounded-lg px-3 py-2 text-[12px] max-w-[80%] leading-relaxed',
              m.isUser ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            )}>
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 border bg-blue-50 border-blue-100">
              <Bot className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-white border border-slate-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-3 pt-2 border-t border-slate-200 bg-white shrink-0">
        <div className="flex flex-wrap gap-1 mb-2">
          {aiQuickActions.map(a => (
            <button
              key={a}
              onClick={() => send(a)}
              className="text-[10px] px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition"
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask anything..."
            className="h-8 text-xs border-slate-200 focus-visible:ring-blue-500"
          />
          <Button
            size="icon"
            className="h-8 w-8 bg-blue-600 hover:bg-blue-700 shrink-0"
            onClick={() => send(input)}
            disabled={sending}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Prompt builders for each tab ────────────────────────────────────────────

function buildPrompt(tab: ToolkitTab, topic: string, context: string): string {
  const base = `Topic: "${topic}"\n\nContent:\n${context}\n\n`;
  switch (tab) {
    case 'revision':
      return base + `Generate 5-7 quick revision points that capture the most important facts. Return ONLY a JSON array of strings. Example: ["Point 1", "Point 2"]`;
    case 'points':
      return base + `Extract 5-8 key points a student must know. Return ONLY a JSON array of strings.`;
    case 'formulas':
      return base + `Extract all formulas, equations, or definitions. Return ONLY a JSON array of objects like: [{"name": "Formula Name", "formula": "expression or definition"}]. If none exist, return [].`;
    case 'mindmap':
      return base + `Create a mind map hierarchy. Return ONLY a JSON object: {"topic": "Main Topic", "branches": [{"label": "Branch 1", "children": ["Child 1", "Child 2"]}, ...]}`;
    case 'mistakes':
      return base + `List 4-6 common mistakes students make on this topic. Return ONLY a JSON array of strings.`;
    case 'tricks':
      return base + `Provide 3-4 memory tricks or mnemonics. Return ONLY a JSON array of objects: [{"mnemonic": "The trick phrase", "explanation": "What it helps remember"}]`;
    case 'viva':
      return base + `Generate 5 viva/oral exam Q&A pairs. Return ONLY a JSON array of objects: [{"q": "Question?", "a": "Answer."}]`;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

const StudyToolkitPanel: React.FC<StudyToolkitPanelProps> = ({ subunit, onClose }) => {
  const [activeTab, setActiveTab] = useState<ToolkitTab>('revision');
  const [search, setSearch] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [tabData, setTabData] = useState<Partial<Record<ToolkitTab, any>>>({});
  const [loadingTab, setLoadingTab] = useState<ToolkitTab | null>(null);

  const plainText = useMemo(() => extractPlainText(subunit?.content), [subunit?.content]);

  // Auto-load initial tab when subunit changes
  useEffect(() => {
    if (subunit && plainText && !tabData['revision']) {
      loadTab('revision');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subunit?.id, plainText]);

  const loadTab = async (tab: ToolkitTab) => {
    if (tabData[tab] || loadingTab || !plainText) return;
    setLoadingTab(tab);
    try {
      const prompt = buildPrompt(tab, subunit?.name || 'this topic', plainText);
      const raw = await callAI(prompt);
      // Extract JSON from the response
      const jsonMatch = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setTabData(prev => ({ ...prev, [tab]: parsed }));
      } else {
        // Fallback: wrap as array of strings
        setTabData(prev => ({ ...prev, [tab]: [raw] }));
      }
    } catch {
      setTabData(prev => ({ ...prev, [tab]: [`Could not generate ${tab} content.`] }));
    } finally {
      setLoadingTab(null);
    }
  };

  const handleTabClick = (tab: ToolkitTab) => {
    setActiveTab(tab);
    setAiMode(false);
    loadTab(tab);
  };

  const filteredTabs = toolkitTabs.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase())
  );

  if (!subunit) return null;

  if (aiMode) {
    return (
      <div className="flex flex-col h-full bg-white">
        <AIMentorPanel
          topic={subunit.name}
          context={plainText}
          onClose={() => setAiMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 space-y-3 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-slate-900">Study Toolkit</h3>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-7 gap-1.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setAiMode(true)}
            >
              <Sparkles className="h-3 w-3" /> AI Mentor
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search toolkit..."
            className="h-8 pl-8 text-xs border-slate-200 bg-slate-50/50 focus-visible:ring-blue-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1">
          {filteredTabs.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
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
          <ToolkitContent
            tab={activeTab}
            data={tabData as Record<ToolkitTab, any>}
            loading={loadingTab === activeTab}
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default StudyToolkitPanel;
