import React, { useState, useRef, useEffect, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { Block } from "./BlockRegistry";
import { TipTapEditor } from "./TipTapEditor";
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PropertiesPanelProps {
  block: Block;
  onChange: (updates: Partial<Block>) => void;
}

const PRESET_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Slate", value: "#1e293b" },
  { label: "Muted", value: "#64748b" },
  { label: "White", value: "#ffffff" },
  { label: "Light Gray", value: "#f1f5f9" },

  { label: "Indigo", value: "#6366f1" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Violet", value: "#8b5cf6" },

  { label: "Success", value: "#22c55e" },
  { label: "Warning", value: "#f59e0b" },
  { label: "Danger", value: "#ef4444" },
  { label: "Info", value: "#06b6d4" },
];

let _recentColors: string[] = [];

const addRecent = (color: string) => {
  _recentColors = [color, ..._recentColors.filter((c) => c !== color)].slice(
    0,
    6,
  );
};

const ColorSwatch: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value || "");
  const [recents, setRecents] = useState<string[]>(_recentColors);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(value || "");
  }, [value]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const commit = useCallback(
    (color: string) => {
      onChange(color);
      addRecent(color);
      setRecents([..._recentColors]);
    },
    [onChange],
  );

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handlePickerChange = (c: string) => {
    setHexInput(c);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onChange(c);
    }, 150);
  };

  const handleHexInputCommit = () => {
    const trimmed = hexInput.trim();
    const isValid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
    if (isValid) commit(trimmed);
    else setHexInput(value || "");
  };

  return (
    <div ref={containerRef}>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
        {label}
      </label>

      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setPickerOpen((p) => !p)}
          title="Open color picker"
          className="w-8 h-8 rounded-lg border-2 border-slate-200 hover:border-indigo-400 transition-colors shrink-0 shadow-sm"
          style={{ backgroundColor: value || "#ffffff" }}
        />
        <Input
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={handleHexInputCommit}
          onKeyDown={(e) => e.key === "Enter" && handleHexInputCommit()}
          placeholder="#000000"
          className="h-8 text-xs font-mono flex-1 bg-slate-50 border-slate-200"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              setHexInput("");
            }}
            title="Clear color"
            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESET_COLORS.map(({ label: l, value: c }) => (
          <button
            key={c}
            onClick={() => commit(c)}
            title={l}
            className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
              value === c
                ? "border-indigo-500 ring-2 ring-indigo-300 ring-offset-1 scale-110"
                : "border-slate-200 hover:border-slate-400"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {recents.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Recent
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recents.map((c) => (
              <button
                key={c}
                onClick={() => commit(c)}
                title={c}
                className={`w-5 h-5 rounded-md border-2 transition-all hover:scale-110 ${
                  value === c
                    ? "border-indigo-500 ring-2 ring-indigo-300 ring-offset-1 scale-110"
                    : "border-slate-200 hover:border-slate-400"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {pickerOpen && (
        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 shadow-lg">
          <HexColorPicker
            color={hexInput || value || "#6366f1"}
            onChange={handlePickerChange}
            onMouseUp={() => {
              commit(hexInput || value);
            }}
            style={{ width: "100%", height: "160px" }}
          />
          <div className="flex items-center gap-2 px-2 pb-2 pt-1 bg-white">
            <div
              className="w-5 h-5 rounded border border-slate-200 shrink-0"
              style={{ backgroundColor: hexInput || value || "#6366f1" }}
            />
            <span className="text-xs font-mono text-slate-600 flex-1">
              {hexInput || value || "#6366f1"}
            </span>
            <button
              onClick={() => {
                commit(hexInput || value);
                setPickerOpen(false);
              }}
              className="text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
};

const SpacingInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder = "0px" }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
      {label}
    </label>
    <Input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-7 text-xs bg-slate-50 border-slate-200"
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
      {label}
    </label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-800"
    >
      <option value="">Default</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  block,
  onChange,
}) => {
  const meta = block.metadata || {};

  const setMeta = (key: string, value: any) =>
    onChange({ metadata: { ...meta, [key]: value } });
  const setRoot = (key: string, value: any) =>
    onChange({ [key]: value } as any);

  const renderList = (label: string, field: string, isMeta = false) => {
    const items: string[] = isMeta
      ? meta[field] || []
      : (block as any)[field] || [];
    return (
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <Input
                value={item}
                onChange={(e) => {
                  const n = [...items];
                  n[idx] = e.target.value;
                  isMeta ? setMeta(field, n) : setRoot(field, n);
                }}
                className="h-7 text-xs bg-slate-50 border-slate-200 flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => {
                  const n = items.filter((_, i) => i !== idx);
                  isMeta ? setMeta(field, n) : setRoot(field, n);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            onClick={() => {
              const n = [...items, ""];
              isMeta ? setMeta(field, n) : setRoot(field, n);
            }}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      </div>
    );
  };

  const renderStr = (
    label: string,
    field: string,
    isMeta = false,
    placeholder?: string,
  ) => {
    const val = isMeta ? meta[field] || "" : (block as any)[field] || "";
    return (
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
          {label}
        </label>
        <Input
          value={val}
          onChange={(e) =>
            isMeta
              ? setMeta(field, e.target.value)
              : setRoot(field, e.target.value)
          }
          placeholder={placeholder || `Enter ${label}...`}
          className="h-8 text-xs bg-slate-50 border-slate-200"
        />
      </div>
    );
  };

  const renderRich = (label: string, field: string, isMeta = false) => {
    const val = isMeta ? meta[field] || "" : (block as any)[field] || "";
    return (
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
          {label}
        </label>
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white min-h-[60px]">
          <TipTapEditor
            content={val}
            onChange={(html) =>
              isMeta ? setMeta(field, html) : setRoot(field, html)
            }
            placeholder={`Enter ${label}...`}
            minimal
          />
        </div>
      </div>
    );
  };

  const renderContentSection = () => {
    switch (block.type) {
      case "heading":
      case "subheading":
      case "paragraph":
        return (
          <CollapsibleSection title="Content" icon="📝">
            {renderRich("Text Content", "content")}
          </CollapsibleSection>
        );
      case "hero":
        return (
          <CollapsibleSection title="Hero Content" icon="🚀">
            {renderStr("Title", "title")}
            {renderRich("Description", "description")}
          </CollapsibleSection>
        );
      case "info-box":
      case "warning-box":
      case "success-box":
      case "tip-box":
      case "fact-box":
      case "analogy-box":
      case "concept-card":
      case "definition-card":
        return (
          <CollapsibleSection title="Card Content" icon="📋">
            {renderStr("Title", "title")}
            {renderRich("Body", "content")}
          </CollapsibleSection>
        );
      case "bullet-list":
      case "numbered-list":
        return (
          <CollapsibleSection title="List Items" icon="🔢">
            {renderList("Items", "items")}
          </CollapsibleSection>
        );
      case "complexity-card":
        return (
          <CollapsibleSection title="Complexity" icon="?">
            {renderStr(
              "Time Complexity",
              "time_complexity",
              false,
              "e.g. O(N log N)",
            )}
            {renderStr(
              "Space Complexity",
              "space_complexity",
              false,
              "e.g. O(1)",
            )}
          </CollapsibleSection>
        );
      case "comparison-card":
        return (
          <>
            <CollapsibleSection title="Left Side" icon="⬅️">
              {renderStr("Title", "left_title")}
              {renderList("Points", "left_points")}
            </CollapsibleSection>
            <CollapsibleSection title="Right Side" icon="➡️">
              {renderStr("Title", "right_title")}
              {renderList("Points", "right_points")}
            </CollapsibleSection>
          </>
        );
      case "revision-card":
        return (
          <CollapsibleSection title="Revision Points" icon="?">
            {renderList("Points", "points")}
          </CollapsibleSection>
        );
      case "quiz":
        return (
          <>
            <CollapsibleSection title="Question" icon="?">
              {renderRich("Question Text", "question")}
            </CollapsibleSection>
            <CollapsibleSection title="Options & Answer" icon="?">
              {renderList("Options", "options")}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                  Correct Answer
                </label>
                <select
                  value={(block as any).answer || ""}
                  onChange={(e) => setRoot("answer", e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-800"
                >
                  <option value="">Select correct option...</option>
                  {((block as any).options || []).map(
                    (opt: string, i: number) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </CollapsibleSection>
          </>
        );
      case "accordion":
        return (
          <CollapsibleSection title="Accordion" icon="📑">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Edit the title and answer directly in the block editor on the left
              canvas.
            </p>
          </CollapsibleSection>
        );
      case "diagram":
      case "step-flow":
      case "flow-diagram":
        return (
          <CollapsibleSection title="Flow Steps" icon="🔄">
            {renderStr("Title", "title", false, "Optional...")}
            {renderList("Steps", "steps")}
          </CollapsibleSection>
        );
      case "array-diagram":
        return (
          <CollapsibleSection title="Array" icon="📦">
            {renderStr("Title", "title")}
            {renderList("Array Values", "items")}
          </CollapsibleSection>
        );
      case "array-operation-diagram":
        return (
          <>
            <CollapsibleSection title="Operation" icon="⚙️">
              {renderStr("Title", "title")}
            </CollapsibleSection>
            <CollapsibleSection title="Arrays" icon="📦">
              {renderList("Before Array", "before", true)}
              {renderList("After Array", "after", true)}
            </CollapsibleSection>
          </>
        );
      case "code-example":
        return (
          <CollapsibleSection title="Code" icon="💻">
            {renderStr("Title", "title")}
            {renderStr("Language", "language", true, "javascript")}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Code
              </label>
              <textarea
                value={block.content || ""}
                onChange={(e) => setRoot("content", e.target.value)}
                rows={8}
                className="w-full p-3 text-xs font-mono bg-slate-900 text-slate-50 rounded-lg border-0 resize-y"
                placeholder="// Write code here..."
                spellCheck={false}
              />
            </div>
          </CollapsibleSection>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full w-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[11px] uppercase">
          {block.type.substring(0, 2)}
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800 capitalize">
            {block.type.replace(/-/g, " ")}
          </h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">
            Block Properties
          </p>
        </div>
      </div>

      {renderContentSection()}

      <CollapsibleSection title="Colors" icon="🎨" defaultOpen={false}>
        <ColorSwatch
          label="Background Color"
          value={meta.bgColor || ""}
          onChange={(v) => setMeta("bgColor", v)}
        />
        <ColorSwatch
          label="Border Color"
          value={meta.borderColor || ""}
          onChange={(v) => setMeta("borderColor", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Spacing" icon="📏" defaultOpen={false}>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pb-1">
          Margin
        </p>
        <div className="grid grid-cols-2 gap-2">
          <SpacingInput
            label="Top"
            value={meta.marginTop || ""}
            onChange={(v) => setMeta("marginTop", v)}
          />
          <SpacingInput
            label="Bottom"
            value={meta.marginBottom || ""}
            onChange={(v) => setMeta("marginBottom", v)}
          />
          <SpacingInput
            label="Left"
            value={meta.marginLeft || ""}
            onChange={(v) => setMeta("marginLeft", v)}
          />
          <SpacingInput
            label="Right"
            value={meta.marginRight || ""}
            onChange={(v) => setMeta("marginRight", v)}
          />
        </div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-2 pb-1">
          Padding
        </p>
        <div className="grid grid-cols-2 gap-2">
          <SpacingInput
            label="Top"
            value={meta.paddingTop || ""}
            onChange={(v) => setMeta("paddingTop", v)}
          />
          <SpacingInput
            label="Bottom"
            value={meta.paddingBottom || ""}
            onChange={(v) => setMeta("paddingBottom", v)}
          />
          <SpacingInput
            label="Left"
            value={meta.paddingLeft || ""}
            onChange={(v) => setMeta("paddingLeft", v)}
          />
          <SpacingInput
            label="Right"
            value={meta.paddingRight || ""}
            onChange={(v) => setMeta("paddingRight", v)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Border & Radius" icon="🔲" defaultOpen={false}>
        <SpacingInput
          label="Border Width"
          value={meta.borderWidth || ""}
          onChange={(v) => setMeta("borderWidth", v)}
          placeholder="1px"
        />
        <SelectField
          label="Border Style"
          value={meta.borderStyle || ""}
          options={[
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ]}
          onChange={(v) => setMeta("borderStyle", v)}
        />
        <SpacingInput
          label="Border Radius"
          value={meta.borderRadius || ""}
          onChange={(v) => setMeta("borderRadius", v)}
          placeholder="8px"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Layout & Size" icon="📐" defaultOpen={false}>
        <SpacingInput
          label="Width"
          value={meta.width || ""}
          onChange={(v) => setMeta("width", v)}
          placeholder="100%"
        />
        <SpacingInput
          label="Max Width"
          value={meta.maxWidth || ""}
          onChange={(v) => setMeta("maxWidth", v)}
          placeholder="none"
        />
        <SelectField
          label="Block Alignment"
          value={meta.alignSelf || ""}
          options={[
            { label: "Auto", value: "auto" },
            { label: "Start", value: "flex-start" },
            { label: "Center", value: "center" },
            { label: "End", value: "flex-end" },
          ]}
          onChange={(v) => setMeta("alignSelf", v)}
        />
      </CollapsibleSection>

      <div className="h-12" />
    </div>
  );
};
