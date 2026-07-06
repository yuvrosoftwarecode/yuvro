import React, { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Save, Eye, ArrowLeft, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { updateSubUnit, SubUnit } from "@/services/subjectService";
import { v4 as uuidv4 } from "uuid";

import { SortableItem } from "./editor/SortableItem";
import { TipTapEditor } from "./editor/TipTapEditor";
import { MediaBlock } from "./editor/blocks/MediaBlock";
import { TableBlock } from "./editor/blocks/TableBlock";
import { ProcessFlowBlock, StepperBlock } from "./editor/blocks/FlowBlocks";
import {
  CalloutBlock,
  AccordionBlock,
  CardGridBlock,
  ColumnLayoutBlock,
  BulletListBlock,
  FormulaBlock,
  DividerBlock,
  CodeBlockEditor,
} from "./editor/blocks/ContentBlocks";
import { DrawingBlock } from "./editor/blocks/DrawingBlock";
import { EditorSidebar } from "./editor/EditorSidebar";
import StudyMaterialRenderer from "@/components/shared/StudyMaterialRenderer";
import { RenderBlock } from "@/components/shared/StudyMaterialRenderer";
import {
  Block,
  blockDefMap,
  blockLabel,
  blockIcon,
} from "./editor/BlockRegistry";
import { EditorProvider } from "@/contexts/EditorContext";
import { GlobalFormattingToolbar } from "./editor/GlobalFormattingToolbar";
import { BlockWrapper } from "@/components/shared/BlockWrapper";

interface BlockEditorContentProps {
  block: Block;
  onChange: (updates: Partial<Block>) => void;
}

const BlockEditorContentInner: React.FC<BlockEditorContentProps> = ({
  block,
  onChange,
}) => {
  switch (block.type) {
    case "heading":
      return (
        <div className="px-4 py-3">
          <TipTapEditor
            minimal
            content={block.content || ""}
            onChange={(html) => onChange({ content: html })}
            placeholder="Type heading..."
            className="w-full text-2xl font-bold text-slate-900 bg-transparent outline-none"
          />
        </div>
      );
    case "subheading":
      return (
        <div className="px-4 py-2">
          <TipTapEditor
            minimal
            content={block.content || ""}
            onChange={(html) => onChange({ content: html })}
            placeholder="Type subheading..."
            className="w-full text-lg font-semibold text-slate-800 bg-transparent outline-none"
          />
        </div>
      );
    case "paragraph":
      return (
        <div className="px-4 py-2">
          <TipTapEditor
            content={block.content || ""}
            onChange={(html) => onChange({ content: html })}
            placeholder="Write paragraph content..."
          />
        </div>
      );
    case "divider":
      return <DividerBlock />;
    case "formula":
      return <FormulaBlock block={block} onChange={(u) => onChange(u)} />;
    case "code":
      return <CodeBlockEditor block={block} onChange={(u) => onChange(u)} />;
    case "drawing":
      return <DrawingBlock block={block} onChange={(u) => onChange(u)} />;
    case "callout_info":
    case "callout_warning":
    case "callout_success":
    case "callout_question":
    case "callout_tip":
      return <CalloutBlock block={block} onChange={(u) => onChange(u)} />;
    case "bullet_list":
    case "ordered_list":
      return <BulletListBlock block={block} onChange={(u) => onChange(u)} />;
    case "image":
    case "video":
    case "pdf":
      return <MediaBlock block={block} onChange={(u) => onChange(u)} />;
    case "table":
      return <TableBlock block={block} onChange={(u) => onChange(u)} />;
    case "card_grid":
      return <CardGridBlock block={block} onChange={(u) => onChange(u)} />;
    case "two_columns":
    case "three_columns":
      return <ColumnLayoutBlock block={block} onChange={(u) => onChange(u)} />;
    case "accordion":
      return <AccordionBlock block={block} onChange={(u) => onChange(u)} />;
    case "process_flow":
      return <ProcessFlowBlock block={block} onChange={(u) => onChange(u)} />;
    case "stepper":
      return <StepperBlock block={block} onChange={(u) => onChange(u)} />;
    default:
      return (
        <div className="relative group/preview">
          <span className="absolute top-2 right-2 z-10 opacity-0 group-hover/preview:opacity-100 transition-opacity text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium pointer-events-none">
            Edit via Properties Panel →
          </span>
          <RenderBlock block={block} />
        </div>
      );
  }
};

const BlockEditorContent: React.FC<BlockEditorContentProps> = (props) => {
  const isCustomRendered = [
    "heading",
    "subheading",
    "paragraph",
    "divider",
    "formula",
    "code",
    "drawing",
    "callout_info",
    "callout_warning",
    "callout_success",
    "callout_question",
    "callout_tip",
    "bullet_list",
    "ordered_list",
    "image",
    "video",
    "pdf",
    "table",
    "card_grid",
    "two_columns",
    "three_columns",
    "process_flow",
    "stepper",
    "accordion",
  ].includes(props.block.type);

  if (!isCustomRendered) {
    return <BlockEditorContentInner {...props} />;
  }

  return (
    <BlockWrapper block={props.block}>
      <BlockEditorContentInner {...props} />
    </BlockWrapper>
  );
};

const BlockHeader: React.FC<{ type: string }> = ({ type }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/80 border-b border-slate-100">
    <span className="text-slate-500">{blockIcon(type)}</span>
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {blockLabel(type)}
    </span>
  </div>
);

interface StudyMaterialManagerProps {
  subUnit: SubUnit;
  onUpdate: (updatedSubUnit: SubUnit) => void;
}

const StudyMaterialManager: React.FC<StudyMaterialManagerProps> = ({
  subUnit,
  onUpdate,
}) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (subUnit.content) {
      try {
        const parsed = JSON.parse(subUnit.content);
        if (Array.isArray(parsed)) {
          const migrated = parsed
            .map((b: any) => {
              if (!b.type) return null;
              if (b.type === "box")
                return {
                  id: b.id || uuidv4(),
                  type: "callout_info",
                  content: b.content || "",
                  metadata: { variant: "info", title: b.title || "" },
                };
              if (b.type === "bullet_points" || b.type === "exam_strategy")
                return {
                  id: b.id || uuidv4(),
                  type: "bullet_list",
                  metadata: { items: b.items || [] },
                };
              if (b.type === "array")
                return {
                  id: b.id || uuidv4(),
                  type: "bullet_list",
                  metadata: { items: b.items || [] },
                };
              return { ...b, id: b.id || uuidv4() };
            })
            .filter(Boolean) as Block[];
          setBlocks(migrated);
          return;
        }
      } catch {
        setBlocks([
          { id: uuidv4(), type: "paragraph", content: subUnit.content },
        ]);
        return;
      }
    }
    setBlocks([]);
  }, [subUnit.id]);

  const addBlock = useCallback((type: string) => {
    const def = blockDefMap.get(type);
    if (!def) return;
    const newBlock: Block = { id: uuidv4(), ...def.defaultBlock() };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    );
  }, []);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;
      const newBlocks = [...prev];
      const target = direction === "up" ? idx - 1 : idx + 1;
      [newBlocks[idx], newBlocks[target]] = [newBlocks[target], newBlocks[idx]];
      return newBlocks;
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((prev) => {
        const oldIndex = prev.findIndex((b) => b.id === active.id);
        const newIndex = prev.findIndex((b) => b.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSubUnit(subUnit.id, {
        name: subUnit.name,
        order_index: subUnit.order_index,
        content: JSON.stringify(blocks),
      });
      toast.success("Study material saved successfully");
      onUpdate(updated as SubUnit);
    } catch (error: any) {
      console.error("Save failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save study material",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorProvider>
      <div className="flex bg-slate-100 h-[calc(100vh-100px)] min-h-[600px] border border-slate-200 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm z-10 min-h-[52px]">
            <div className="flex-1 min-w-0 overflow-hidden">
              {previewMode ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 hover:border-indigo-200 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Edit
                  </button>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full shadow-sm">
                    👁 Student Preview
                  </span>
                </div>
              ) : (
                <GlobalFormattingToolbar />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!previewMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(true)}
                  className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 shadow-sm h-8 text-xs px-3"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md shadow-indigo-200 h-8 text-xs px-3"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="flex-1 px-8 py-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {previewMode ? (
              <div className="max-w-4xl mx-auto">
                <StudyMaterialRenderer content={JSON.stringify(blocks)} />
              </div>
            ) : blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
                  <LayoutTemplate className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-lg font-semibold text-slate-800 mb-1">
                  Start building your study material
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  Click a block from the right panel to insert it
                </p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full pb-20">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={blocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {blocks.map((block, idx) => (
                        <SortableItem
                          key={block.id}
                          id={block.id}
                          onRemove={() => removeBlock(block.id)}
                          onMoveUp={() => moveBlock(block.id, "up")}
                          onMoveDown={() => moveBlock(block.id, "down")}
                          isFirst={idx === 0}
                          isLast={idx === blocks.length - 1}
                          isSelected={selectedBlockId === block.id}
                          onClick={() => setSelectedBlockId(block.id)}
                        >
                          <BlockHeader type={block.type} />
                          <BlockEditorContent
                            block={block}
                            onChange={(updates) =>
                              updateBlock(block.id, updates)
                            }
                          />
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </div>

        {!previewMode && (
          <EditorSidebar
            onAdd={addBlock}
            selectedBlock={blocks.find((b) => b.id === selectedBlockId) || null}
            onUpdateBlock={updateBlock}
          />
        )}
      </div>
    </EditorProvider>
  );
};

export default StudyMaterialManager;
