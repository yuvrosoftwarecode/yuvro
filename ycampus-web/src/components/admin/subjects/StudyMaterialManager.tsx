import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Type,
  AlignLeft,
  Layout,
  List,
  Box,
  Hash,
  Lightbulb,
  Code,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Sigma
} from 'lucide-react';
import { toast } from 'sonner';
import { updateSubUnit, SubUnit } from '@/services/subjectService';
import { v4 as uuidv4 } from 'uuid';

interface StudyMaterialManagerProps {
  subUnit: SubUnit;
  onUpdate: (updatedSubUnit: SubUnit) => void;
}

export type BlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'box'
  | 'array'
  | 'bullet_points'
  | 'formula'
  | 'exam_strategy'
  | 'code';

export interface ContentBlock {
  id: string;
  type: BlockType;
  content?: string;
  title?: string;
  items?: string[];
  codeLanguage?: string;
}

const blockTemplates: Record<BlockType, Omit<ContentBlock, 'id'>> = {
  heading: { type: 'heading', content: '' },
  subheading: { type: 'subheading', content: '' },
  paragraph: { type: 'paragraph', content: '' },
  box: { type: 'box', title: '', content: '' },
  array: { type: 'array', items: ['', '', ''] },
  bullet_points: { type: 'bullet_points', items: ['', '', ''] },
  formula: { type: 'formula', content: '' },
  exam_strategy: { type: 'exam_strategy', items: ['', '', ''] },
  code: { type: 'code', content: '', codeLanguage: 'javascript' },
};

const blockIcons: Record<BlockType, React.ReactNode> = {
  heading: <Type className="w-4 h-4" />,
  subheading: <Type className="w-4 h-4 opacity-70" />,
  paragraph: <AlignLeft className="w-4 h-4" />,
  box: <Layout className="w-4 h-4" />,
  array: <Box className="w-4 h-4" />,
  bullet_points: <List className="w-4 h-4" />,
  formula: <Sigma className="w-4 h-4" />,
  exam_strategy: <Lightbulb className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
};

const blockLabels: Record<BlockType, string> = {
  heading: 'Heading',
  subheading: 'Subheading',
  paragraph: 'Paragraph',
  box: 'Real-Life Example',
  array: 'Visual Array',
  bullet_points: 'Bullet Points',
  formula: 'Formula',
  exam_strategy: 'Exam Strategy',
  code: 'Code Block',
};

const StudyMaterialManager: React.FC<StudyMaterialManagerProps> = ({ subUnit, onUpdate }) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subUnit.content) {
      try {
        const parsed = JSON.parse(subUnit.content);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
          return;
        }
      } catch (e) {
        // Fallback: it's plain text. Convert to a single paragraph block for now
        setBlocks([{ id: uuidv4(), type: 'paragraph', content: subUnit.content }]);
      }
    } else {
      setBlocks([]);
    }
  }, [subUnit]);

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock = { id: uuidv4(), ...blockTemplates[type] };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    setBlocks(newBlocks);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
  };

  const updateBlock = (index: number, updates: Partial<ContentBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    setBlocks(newBlocks);
  };

  const updateItem = (blockIndex: number, itemIndex: number, value: string) => {
    const block = blocks[blockIndex];
    if (!block.items) return;
    const newItems = [...block.items];
    newItems[itemIndex] = value;
    updateBlock(blockIndex, { items: newItems });
  };

  const addItem = (blockIndex: number) => {
    const block = blocks[blockIndex];
    if (!block.items) return;
    updateBlock(blockIndex, { items: [...block.items, ''] });
  };

  const removeItem = (blockIndex: number, itemIndex: number) => {
    const block = blocks[blockIndex];
    if (!block.items) return;
    const newItems = [...block.items];
    newItems.splice(itemIndex, 1);
    updateBlock(blockIndex, { items: newItems });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const stringifiedContent = JSON.stringify(blocks);
      const payload = { 
        name: subUnit.name,
        order_index: subUnit.order_index,
        unit: subUnit.unit,
        content: stringifiedContent 
      };
      const updated = await updateSubUnit(subUnit.id, payload);
      toast.success('Study materials saved successfully');
      onUpdate(updated as SubUnit);
    } catch (err) {
      toast.error('Failed to save study materials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Study Material Editor</h3>
          <p className="text-sm text-slate-600">Build interactive study materials for this sub-unit</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Add Block
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              {(Object.keys(blockLabels) as BlockType[]).map((type) => (
                <DropdownMenuItem key={type} onClick={() => addBlock(type)} className="gap-3 cursor-pointer">
                  {blockIcons[type]}
                  <span>{blockLabels[type]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Material'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Layout className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-slate-700">No content yet</p>
            <p className="text-sm">Click 'Add Block' to start building study materials.</p>
          </div>
        ) : (
          blocks.map((block, index) => (
            <div key={block.id} className="group bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  {blockIcons[block.type]}
                  {blockLabels[block.type]}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="h-7 w-7 text-slate-400 hover:text-slate-800">
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="h-7 w-7 text-slate-400 hover:text-slate-800">
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <Button variant="ghost" size="icon" onClick={() => removeBlock(index)} className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {block.type === 'heading' && (
                  <Input
                    value={block.content || ''}
                    onChange={(e) => updateBlock(index, { content: e.target.value })}
                    placeholder="Enter main heading..."
                    className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                  />
                )}
                
                {block.type === 'subheading' && (
                  <Input
                    value={block.content || ''}
                    onChange={(e) => updateBlock(index, { content: e.target.value })}
                    placeholder="Enter subheading..."
                    className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                  />
                )}

                {block.type === 'paragraph' && (
                  <Textarea
                    value={block.content || ''}
                    onChange={(e) => updateBlock(index, { content: e.target.value })}
                    placeholder="Enter paragraph text..."
                    className="min-h-[100px] resize-none border-none shadow-none focus-visible:ring-0 px-0"
                  />
                )}

                {block.type === 'formula' && (
                  <Input
                    value={block.content || ''}
                    onChange={(e) => updateBlock(index, { content: e.target.value })}
                    placeholder="e.g. Area = π × r²"
                    className="font-mono text-sm border-none shadow-none focus-visible:ring-0 px-0"
                  />
                )}

                {block.type === 'code' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Language</span>
                      <Input 
                        value={block.codeLanguage || ''} 
                        onChange={(e) => updateBlock(index, { codeLanguage: e.target.value })} 
                        className="h-7 text-xs w-32" 
                        placeholder="e.g. python, javascript"
                      />
                    </div>
                    <Textarea
                      value={block.content || ''}
                      onChange={(e) => updateBlock(index, { content: e.target.value })}
                      placeholder="Paste your code here..."
                      className="font-mono text-sm min-h-[150px] bg-slate-900 text-slate-100 rounded-lg border-none"
                    />
                  </div>
                )}

                {block.type === 'box' && (
                  <div className="space-y-3">
                    <Input
                      value={block.title || ''}
                      onChange={(e) => updateBlock(index, { title: e.target.value })}
                      placeholder="Box Title (e.g. Real-Life Example)"
                      className="font-semibold text-indigo-700 bg-indigo-50 border-indigo-100 px-3 h-10"
                    />
                    <Textarea
                      value={block.content || ''}
                      onChange={(e) => updateBlock(index, { content: e.target.value })}
                      placeholder="Box content..."
                      className="min-h-[100px]"
                    />
                  </div>
                )}

                {(block.type === 'array' || block.type === 'bullet_points' || block.type === 'exam_strategy') && (
                  <div className="space-y-2">
                    {block.type === 'exam_strategy' && (
                       <div className="mb-4">
                         <span className="text-xs font-bold text-amber-600 uppercase">Exam Strategy Items</span>
                       </div>
                    )}
                    {block.items?.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        {block.type === 'bullet_points' && <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />}
                        {block.type === 'array' && <div className="text-xs font-mono text-slate-400 w-12 shrink-0">idx {itemIndex}</div>}
                        {block.type === 'exam_strategy' && <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">✓</div>}
                        
                        <Input
                          value={item}
                          onChange={(e) => updateItem(index, itemIndex, e.target.value)}
                          placeholder={`Item ${itemIndex + 1}`}
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index, itemIndex)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addItem(index)} className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudyMaterialManager;
