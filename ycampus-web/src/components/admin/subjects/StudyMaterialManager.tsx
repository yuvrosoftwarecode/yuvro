import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutTemplate, Save, X, Search,
  Type, AlignLeft, Minus, Code, Sigma, Lightbulb,
  Info, AlertTriangle, CheckCircle, HelpCircle, Sparkles,
  Image, Video, FileText, Table, Grid3X3, Columns2, Columns3,
  ArrowRight, ListOrdered, List, BookOpen,
} from 'lucide-react';
import { Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { updateSubUnit, SubUnit } from '@/services/subjectService';
import { v4 as uuidv4 } from 'uuid';
import { SortableItem } from './editor/SortableItem';
import { TipTapEditor } from './editor/TipTapEditor';
import { MediaBlock } from './editor/blocks/MediaBlock';
import { TableBlock } from './editor/blocks/TableBlock';
import { ProcessFlowBlock, StepperBlock } from './editor/blocks/FlowBlocks';
import {
  CalloutBlock, CardGridBlock, ColumnLayoutBlock,
  BulletListBlock, FormulaBlock, DividerBlock, CodeBlockEditor,
} from './editor/blocks/ContentBlocks';
import StudyMaterialRenderer from '@/components/shared/StudyMaterialRenderer';

// ─── Block Type Registry ────────────────────────────────────────────────────

export interface Block {
  id: string;
  type: string;
  content?: string;         // Used by TipTap-based blocks (HTML string)
  metadata?: Record<string, any>; // Used by structured blocks
}

interface BlockDefinition {
  type: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  defaultBlock: () => Omit<Block, 'id'>;
}

const blockDefs: BlockDefinition[] = [
  // Basic Content
  { type: 'heading', label: 'Heading', icon: <Type className="w-4 h-4" />, category: 'Basic Content',
    defaultBlock: () => ({ type: 'heading', content: '' }) },
  { type: 'subheading', label: 'Subheading', icon: <Type className="w-3.5 h-3.5 opacity-70" />, category: 'Basic Content',
    defaultBlock: () => ({ type: 'subheading', content: '' }) },
  { type: 'paragraph', label: 'Paragraph', icon: <AlignLeft className="w-4 h-4" />, category: 'Basic Content',
    defaultBlock: () => ({ type: 'paragraph', content: '' }) },
  { type: 'divider', label: 'Divider', icon: <Minus className="w-4 h-4" />, category: 'Basic Content',
    defaultBlock: () => ({ type: 'divider' }) },

  // Academic
  { type: 'formula', label: 'Formula', icon: <Sigma className="w-4 h-4" />, category: 'Academic',
    defaultBlock: () => ({ type: 'formula', content: '' }) },
  { type: 'code', label: 'Code Block', icon: <Code className="w-4 h-4" />, category: 'Academic',
    defaultBlock: () => ({ type: 'code', content: '', metadata: { language: 'javascript' } }) },

  // Informational (Callouts)
  { type: 'callout_info', label: 'Definition Box', icon: <Info className="w-4 h-4 text-blue-500" />, category: 'Informational',
    defaultBlock: () => ({ type: 'callout_info', content: '', metadata: { variant: 'info', title: 'Definition' } }) },
  { type: 'callout_warning', label: 'Important Note', icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, category: 'Informational',
    defaultBlock: () => ({ type: 'callout_warning', content: '', metadata: { variant: 'warning', title: 'Important' } }) },
  { type: 'callout_success', label: 'Key Point', icon: <CheckCircle className="w-4 h-4 text-green-500" />, category: 'Informational',
    defaultBlock: () => ({ type: 'callout_success', content: '', metadata: { variant: 'success', title: 'Key Point' } }) },
  { type: 'callout_question', label: 'Q&A Box', icon: <HelpCircle className="w-4 h-4 text-purple-500" />, category: 'Informational',
    defaultBlock: () => ({ type: 'callout_question', content: '', metadata: { variant: 'question', title: 'Why?' } }) },
  { type: 'callout_tip', label: 'Exam Tip', icon: <Lightbulb className="w-4 h-4 text-indigo-500" />, category: 'Informational',
    defaultBlock: () => ({ type: 'callout_tip', content: '', metadata: { variant: 'tip', title: 'Exam Tip' } }) },

  // Lists
  { type: 'bullet_list', label: 'Bullet List', icon: <List className="w-4 h-4" />, category: 'Lists',
    defaultBlock: () => ({ type: 'bullet_list', metadata: { items: ['', ''] } }) },
  { type: 'ordered_list', label: 'Numbered List', icon: <ListOrdered className="w-4 h-4" />, category: 'Lists',
    defaultBlock: () => ({ type: 'ordered_list', metadata: { items: ['', ''] } }) },

  // Media
  { type: 'image', label: 'Image', icon: <Image className="w-4 h-4" />, category: 'Media',
    defaultBlock: () => ({ type: 'image', metadata: { url: null, caption: '' } }) },
  { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" />, category: 'Media',
    defaultBlock: () => ({ type: 'video', metadata: { url: null, caption: '' } }) },
  { type: 'pdf', label: 'PDF Attachment', icon: <FileText className="w-4 h-4" />, category: 'Media',
    defaultBlock: () => ({ type: 'pdf', metadata: { url: null } }) },

  // Data
  { type: 'table', label: 'Table', icon: <Table className="w-4 h-4" />, category: 'Data',
    defaultBlock: () => ({ type: 'table', metadata: { rows: [['Header 1', 'Header 2'], ['', '']], hasHeader: true } }) },

  // Layout
  { type: 'card_grid', label: 'Card Grid', icon: <Grid3X3 className="w-4 h-4" />, category: 'Layout',
    defaultBlock: () => ({ type: 'card_grid', metadata: { cards: [{ title: 'Card 1', description: '' }, { title: 'Card 2', description: '' }, { title: 'Card 3', description: '' }] } }) },
  { type: 'two_columns', label: '2 Column Layout', icon: <Columns2 className="w-4 h-4" />, category: 'Layout',
    defaultBlock: () => ({ type: 'two_columns', metadata: { cols: 2, columns: [{ heading: 'Column 1', content: '' }, { heading: 'Column 2', content: '' }] } }) },
  { type: 'three_columns', label: '3 Column Layout', icon: <Columns3 className="w-4 h-4" />, category: 'Layout',
    defaultBlock: () => ({ type: 'three_columns', metadata: { cols: 3, columns: [{ heading: '', content: '' }, { heading: '', content: '' }, { heading: '', content: '' }] } }) },

  // Visualization
  { type: 'process_flow', label: 'Process Flow', icon: <ArrowRight className="w-4 h-4" />, category: 'Visualization',
    defaultBlock: () => ({ type: 'process_flow', metadata: { steps: ['Start', 'Process', 'End'] } }) },
  { type: 'stepper', label: 'Stepper', icon: <ListOrdered className="w-4 h-4 text-indigo-500" />, category: 'Visualization',
    defaultBlock: () => ({ type: 'stepper', metadata: { steps: [{ title: 'Step 1', description: '' }, { title: 'Step 2', description: '' }] } }) },
];

const blockDefMap = new Map(blockDefs.map(d => [d.type, d]));
const categories = [...new Set(blockDefs.map(d => d.category))];

// ─── Block Label/Icon helpers ────────────────────────────────────────────────

const blockLabel = (type: string) => blockDefMap.get(type)?.label ?? type;
const blockIcon = (type: string) => blockDefMap.get(type)?.icon ?? <BookOpen className="w-4 h-4" />;

// ─── Slash Command Palette ────────────────────────────────────────────────────

interface SlashPaletteProps {
  position: { x: number; y: number };
  query: string;
  onSelect: (type: string) => void;
  onClose: () => void;
}

const SlashPalette: React.FC<SlashPaletteProps> = ({ position, query, onSelect, onClose }) => {
  const filtered = blockDefs.filter(d =>
    d.label.toLowerCase().includes(query.toLowerCase()) ||
    d.category.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = categories.reduce<Record<string, BlockDefinition[]>>((acc, cat) => {
    const items = filtered.filter(d => d.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-72 max-h-80 overflow-y-auto"
      style={{ top: position.y + 8, left: position.x }}
    >
      <div className="p-2 border-b border-slate-100 bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Search className="w-3.5 h-3.5" />
          <span>Blocks — type to filter</span>
        </div>
      </div>
      <div className="p-1">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1.5 mt-1">{cat}</p>
            {items.map(def => (
              <button
                key={def.type}
                type="button"
                className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-sm text-slate-700 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); onSelect(def.type); }}
              >
                <span className="text-slate-500">{def.icon}</span>
                {def.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Add Block Panel ────────────────────────────────────────────────────────

interface AddBlockPanelProps {
  onAdd: (type: string) => void;
}

const AddBlockPanel: React.FC<AddBlockPanelProps> = ({ onAdd }) => {
  const [query, setQuery] = useState('');
  const filtered = blockDefs.filter(d =>
    d.label.toLowerCase().includes(query.toLowerCase()) ||
    d.category.toLowerCase().includes(query.toLowerCase())
  );
  const grouped = categories.reduce<Record<string, BlockDefinition[]>>((acc, cat) => {
    const items = filtered.filter(d => d.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-72 max-h-[480px] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks..."
            className="pl-8 h-8 text-sm bg-slate-50 border-slate-200"
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-1.5">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1.5 mt-1">{cat}</p>
            {items.map(def => (
              <button
                key={def.type}
                type="button"
                className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-sm text-slate-700 transition-colors"
                onClick={() => { onAdd(def.type); setQuery(''); }}
              >
                <span className="text-slate-500">{def.icon}</span>
                {def.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Block Content Renderer ─────────────────────────────────────────────────

interface BlockEditorContentProps {
  block: Block;
  onChange: (updates: Partial<Block>) => void;
}

const BlockEditorContent: React.FC<BlockEditorContentProps> = ({ block, onChange }) => {
  switch (block.type) {
    case 'heading':
      return (
        <div className="p-4">
          <input
            value={block.content || ''}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="Heading..."
            className="w-full text-2xl font-bold text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300"
          />
        </div>
      );
    case 'subheading':
      return (
        <div className="p-4">
          <input
            value={block.content || ''}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="Subheading..."
            className="w-full text-lg font-semibold text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-300"
          />
        </div>
      );
    case 'paragraph':
      return (
        <div className="p-3">
          <TipTapEditor
            content={block.content || ''}
            onChange={(html) => onChange({ content: html })}
            placeholder="Write paragraph content..."
          />
        </div>
      );
    case 'divider':
      return <DividerBlock />;
    case 'formula':
      return <FormulaBlock block={block} onChange={(u) => onChange(u)} />;
    case 'code':
      return <CodeBlockEditor block={block} onChange={(u) => onChange(u)} />;
    case 'callout_info':
    case 'callout_warning':
    case 'callout_success':
    case 'callout_question':
    case 'callout_tip':
      return <CalloutBlock block={block} onChange={(u) => onChange(u)} />;
    case 'bullet_list':
    case 'ordered_list':
      return <BulletListBlock block={block} onChange={(u) => onChange(u)} />;
    case 'image':
    case 'video':
    case 'pdf':
      return <MediaBlock block={block} onChange={(u) => onChange(u)} />;
    case 'table':
      return <TableBlock block={block} onChange={(u) => onChange(u)} />;
    case 'card_grid':
      return <CardGridBlock block={block} onChange={(u) => onChange(u)} />;
    case 'two_columns':
    case 'three_columns':
      return <ColumnLayoutBlock block={block} onChange={(u) => onChange(u)} />;
    case 'process_flow':
      return <ProcessFlowBlock block={block} onChange={(u) => onChange(u)} />;
    case 'stepper':
      return <StepperBlock block={block} onChange={(u) => onChange(u)} />;
    default:
      return (
        <div className="p-4 text-sm text-slate-400 italic">
          Unknown block type: {block.type}
        </div>
      );
  }
};

// ─── Block Header ────────────────────────────────────────────────────────────

const BlockHeader: React.FC<{ type: string }> = ({ type }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/80 border-b border-slate-100">
    <span className="text-slate-500">{blockIcon(type)}</span>
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{blockLabel(type)}</span>
  </div>
);

// ─── Main StudyMaterialManager ───────────────────────────────────────────────

interface StudyMaterialManagerProps {
  subUnit: SubUnit;
  onUpdate: (updatedSubUnit: SubUnit) => void;
}

const StudyMaterialManager: React.FC<StudyMaterialManagerProps> = ({ subUnit, onUpdate }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const addPanelRef = useRef<HTMLDivElement>(null);

  // Slash command state
  const [slashState, setSlashState] = useState<{ visible: boolean; position: { x: number; y: number }; query: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Load blocks from subUnit.content ──────────────────────────────────────
  useEffect(() => {
    if (subUnit.content) {
      try {
        const parsed = JSON.parse(subUnit.content);
        if (Array.isArray(parsed)) {
          // Migrate old format blocks
          const migrated = parsed.map((b: any) => {
            if (!b.type) return null;
            // Old format: box → callout_info
            if (b.type === 'box') return { id: b.id || uuidv4(), type: 'callout_info', content: b.content || '', metadata: { variant: 'info', title: b.title || '' } };
            if (b.type === 'bullet_points' || b.type === 'exam_strategy') return { id: b.id || uuidv4(), type: 'bullet_list', metadata: { items: b.items || [] } };
            if (b.type === 'array') return { id: b.id || uuidv4(), type: 'bullet_list', metadata: { items: b.items || [] } };
            return { id: b.id || uuidv4(), type: b.type, content: b.content, metadata: b.metadata };
          }).filter(Boolean) as Block[];
          setBlocks(migrated);
          return;
        }
      } catch {
        setBlocks([{ id: uuidv4(), type: 'paragraph', content: subUnit.content }]);
        return;
      }
    }
    setBlocks([]);
  }, [subUnit.id]);

  // ── Close add panel on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addPanelRef.current && !addPanelRef.current.contains(e.target as Node)) {
        setShowAddPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Block management ──────────────────────────────────────────────────────
  const addBlock = useCallback((type: string) => {
    const def = blockDefMap.get(type);
    if (!def) return;
    const newBlock: Block = { id: uuidv4(), ...def.defaultBlock() };
    setBlocks(prev => [...prev, newBlock]);
    setShowAddPanel(false);
    setSlashState(null);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const newBlocks = [...prev];
      const target = direction === 'up' ? idx - 1 : idx + 1;
      [newBlocks[idx], newBlocks[target]] = [newBlocks[target], newBlocks[idx]];
      return newBlocks;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks(prev => {
        const oldIndex = prev.findIndex(b => b.id === active.id);
        const newIndex = prev.findIndex(b => b.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSubUnit(subUnit.id, {
        name: subUnit.name,
        order_index: subUnit.order_index,
        unit: subUnit.unit,
        content: JSON.stringify(blocks),
      });
      toast.success('Study material saved successfully');
      onUpdate(updated as SubUnit);
    } catch {
      toast.error('Failed to save study material');
    } finally {
      setSaving(false);
    }
  };

  // ── Slash command: detect "/" at start of empty input ─────────────────────
  const handleAddAreaKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === '/' && !slashState?.visible) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setSlashState({ visible: true, position: { x: rect.left, y: rect.bottom }, query: '' });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Preview Mode ──
  if (previewMode) {
    return (
      <div className="flex flex-col h-full">
        {/* Preview top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-amber-50/60 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode(false)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-slate-200 hover:border-indigo-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Edit
            </button>
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
              👁 Student Preview
            </span>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        {/* Render exactly as student sees */}
        <div className="flex-1 overflow-auto">
          <StudyMaterialRenderer content={JSON.stringify(blocks)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/60 to-white min-h-[600px]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Study Material Editor</h3>
            <p className="text-xs text-slate-500">
              {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'} · Type <kbd className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono">/</kbd> anywhere to add a block
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Add Block popover */}
          <div className="relative" ref={addPanelRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddPanel(v => !v)}
              className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <LayoutTemplate className="w-4 h-4" />
              Add Block
            </Button>
            {showAddPanel && (
              <div className="absolute right-0 top-full mt-2 z-40">
                <AddBlockPanel onAdd={addBlock} />
              </div>
            )}
          </div>

          {/* Preview button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(true)}
            className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm shadow-indigo-200"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div
        className="flex-1 px-6 py-6 max-w-4xl mx-auto w-full"
        onKeyDown={handleAddAreaKeyDown}
      >
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <LayoutTemplate className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-700 mb-1">Start building your study material</p>
            <p className="text-sm text-slate-400 mb-6">Click "Add Block" or type <strong>/</strong> to insert content blocks</p>
            <Button
              onClick={() => setShowAddPanel(v => !v)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <LayoutTemplate className="w-4 h-4" />
              Add First Block
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {blocks.map((block, idx) => (
                  <SortableItem
                    key={block.id}
                    id={block.id}
                    onRemove={() => removeBlock(block.id)}
                    onMoveUp={() => moveBlock(block.id, 'up')}
                    onMoveDown={() => moveBlock(block.id, 'down')}
                    isFirst={idx === 0}
                    isLast={idx === blocks.length - 1}
                  >
                    <BlockHeader type={block.type} />
                    <BlockEditorContent
                      block={block}
                      onChange={(updates) => updateBlock(block.id, updates)}
                    />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Bottom "+ Add Block" strip */}
        {blocks.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAddPanel(v => !v)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-600 transition-colors py-2 px-4 rounded-xl hover:bg-indigo-50 border border-dashed border-slate-200 hover:border-indigo-300 w-full max-w-xs justify-center"
            >
              <span className="text-lg leading-none font-light">+</span>
              <span>Add Block</span>
              <span className="text-xs text-slate-300 ml-1">or type /</span>
            </button>
          </div>
        )}
      </div>

      {/* Slash command palette */}
      {slashState?.visible && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSlashState(null)} />
          <SlashPalette
            position={slashState.position}
            query={slashState.query}
            onSelect={(type) => { addBlock(type); setSlashState(null); }}
            onClose={() => setSlashState(null)}
          />
        </>
      )}
    </div>
  );
};

export default StudyMaterialManager;
