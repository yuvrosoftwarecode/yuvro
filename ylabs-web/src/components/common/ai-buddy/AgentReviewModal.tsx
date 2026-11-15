import React, { useState, useMemo } from "react";
import {
  Check,
  X,
  FileCode2,
  FilePlus,
  FileEdit,
  Download,
  Copy,
  ChevronRight,
  Eye,
  Layers,
  Sparkles,
} from "lucide-react";
import type { ParsedFileChange } from "@/lib/diffApplier";

interface AgentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ParsedFileChange[];
  existingFiles?: Record<string, string>;
  onApplySelected: (selectedFiles: Record<string, string>) => void;
  onApplyAll: () => void;
  explanation?: string;
}

export function AgentReviewModal({
  isOpen,
  onClose,
  changes,
  existingFiles = {},
  onApplySelected,
  onApplyAll,
  explanation,
}: AgentReviewModalProps) {
  if (!isOpen || changes.length === 0) return null;

  // Track which files are checked for application (all checked by default)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(
    () => new Set(changes.map((c) => c.path))
  );

  // Active file currently being previewed in right pane
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const activeChange = changes[activePreviewIndex] || changes[0];

  // View mode for active file: proposed vs diff vs original
  const [viewMode, setViewMode] = useState<"proposed" | "original">("proposed");
  const [copied, setCopied] = useState(false);

  const toggleSelectPath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPaths(new Set(changes.map((c) => c.path)));
  };

  const deselectAll = () => {
    setSelectedPaths(new Set());
  };

  const handleApplySelected = () => {
    const toApply: Record<string, string> = {};
    for (const c of changes) {
      if (selectedPaths.has(c.path)) {
        toApply[c.path] = c.code;
      }
    }
    onApplySelected(toApply);
    onClose();
  };

  const handleApplyAll = () => {
    onApplyAll();
    onClose();
  };

  const originalContent = activeChange ? existingFiles[activeChange.path] || "" : "";
  const proposedContent = activeChange ? activeChange.code : "";

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl h-[85vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Review Agent Changes</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  {changes.length} {changes.length === 1 ? "file" : "files"}
                </span>
              </div>
              {explanation && (
                <p className="text-xs text-muted-foreground truncate max-w-lg mt-0.5">{explanation}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Split View */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          
          {/* Left: Files List */}
          <div className="w-72 shrink-0 border-r border-border flex flex-col bg-muted/10">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 text-xs">
              <span className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Changed Files</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  All
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                >
                  None
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {changes.map((change, idx) => {
                const isSelected = selectedPaths.has(change.path);
                const isActive = activePreviewIndex === idx;
                const isNew = change.status === "new" || !existingFiles[change.path];

                return (
                  <div
                    key={change.path}
                    onClick={() => setActivePreviewIndex(idx)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                      isActive
                        ? "bg-accent border border-primary/40 shadow-xs"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectPath(change.path);
                        }}
                        className="rounded border-border text-primary focus:ring-0 cursor-pointer"
                      />
                      {isNew ? (
                        <FilePlus className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <FileEdit className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                      <span className="font-mono text-foreground font-medium truncate" title={change.path}>
                        {change.path}
                      </span>
                    </div>

                    <span
                      className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-1.5 ${
                        isNew
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      }`}
                    >
                      {isNew ? "New" : "Modified"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-border/60 text-[11px] text-muted-foreground">
              {selectedPaths.size} of {changes.length} files selected to apply
            </div>
          </div>

          {/* Right: Code / Preview View */}
          <div className="flex-1 min-h-0 flex flex-col bg-[#141416]">
            
            {/* View Mode Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#1c1c1f] text-xs">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-primary" />
                <span className="font-mono text-zinc-200 font-semibold text-[12px]">
                  {activeChange?.path}
                </span>
                {activeChange?.isDiff && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                    Patch / Diff
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {originalContent && (
                  <div className="flex rounded-md bg-white/5 p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setViewMode("proposed")}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        viewMode === "proposed" ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Proposed ({activeChange?.code?.split("\n").length || 0} lines)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("original")}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        viewMode === "original" ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Current ({originalContent.split("\n").length} lines)
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleCopyCode(viewMode === "proposed" ? proposedContent : originalContent)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar font-mono text-[11.5px] leading-relaxed text-zinc-100">
              <pre className="whitespace-pre">
                <code>{viewMode === "proposed" ? proposedContent : originalContent}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border shrink-0 bg-muted/20">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="font-semibold text-foreground">{selectedPaths.size}</span> files will be written to workspace
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-border bg-background hover:bg-accent text-foreground transition-colors"
            >
              Cancel
            </button>
            {changes.length > 1 && (
              <button
                type="button"
                onClick={handleApplySelected}
                disabled={selectedPaths.size === 0}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
              >
                Apply Selected ({selectedPaths.size})
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyAll}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Apply All ({changes.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
