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
import { applyDiffOrCode, type ParsedFileChange } from "@/lib/diffApplier";

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

  // View mode for active file: diff vs proposed/patched vs current/original
  const [viewMode, setViewMode] = useState<"diff" | "proposed" | "original">(() =>
    activeChange?.isDiff ? "diff" : "proposed"
  );
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

  const originalContent = activeChange ? existingFiles[activeChange.path] || "" : "";
  const proposedContent = activeChange ? activeChange.code : "";

  const patchedContent = useMemo(() => {
    if (!activeChange) return "";
    if (activeChange.isDiff) {
      const res = applyDiffOrCode(originalContent, activeChange.code, activeChange.path);
      return res.result;
    }
    return activeChange.code;
  }, [activeChange, originalContent]);

  const handleApplySelected = () => {
    const toApply: Record<string, string> = {};
    for (const c of changes) {
      if (selectedPaths.has(c.path)) {
        const orig = existingFiles[c.path] || "";
        const patched = c.isDiff ? applyDiffOrCode(orig, c.code, c.path).result : c.code;
        toApply[c.path] = patched;
      }
    }
    onApplySelected(toApply);
    onClose();
  };

  const handleApplyAll = () => {
    onApplyAll();
    onClose();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 animate-in fade-in duration-150">
      <div className="relative w-[98vw] max-w-[98vw] h-[95vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border shrink-0 bg-editor-panel">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f7931e]/10 text-[#f7931e] flex items-center justify-center border border-[#f7931e]/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Review Agent Changes</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f7931e]/10 text-[#f7931e] border border-[#f7931e]/20">
                  {changes.length} {changes.length === 1 ? "file" : "files"}
                </span>
              </div>
              {explanation && (
                <p className="text-xs text-muted-foreground truncate max-w-xl mt-0.5">{explanation}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Split View */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          
          {/* Left: Files List */}
          <div className="w-80 shrink-0 border-r border-border flex flex-col bg-editor-panel/70">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 text-xs">
              <span className="font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Changed Files</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                >
                  All
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
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
                        ? "bg-[#f7931e]/10 border border-[#f7931e]/40 shadow-xs"
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
                        className="rounded border-border text-[#f7931e] focus:ring-0 cursor-pointer accent-[#f7931e]"
                      />
                      {isNew ? (
                        <FilePlus className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <FileEdit className="w-4 h-4 text-[#f7931e] shrink-0" />
                      )}
                      <span className="font-mono text-foreground font-medium truncate" title={change.path}>
                        {change.path}
                      </span>
                    </div>

                    <span
                      className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-1.5 ${
                        isNew
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-[#f7931e]/10 text-[#f7931e] border border-[#f7931e]/20"
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

          {/* Right: Code / Preview View following Vitarka IDE theme */}
          <div className="flex-1 min-h-0 flex flex-col bg-editor-bg">
            
            {/* View Mode Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-editor-panel text-xs">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-primary" />
                <span className="font-mono text-foreground font-semibold text-[12px]">
                  {activeChange?.path}
                </span>
                {activeChange?.isDiff && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/30">
                    Patch / Diff
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-md bg-muted/60 p-0.5 border border-border">
                  {activeChange?.isDiff && (
                    <button
                      type="button"
                      onClick={() => setViewMode("diff")}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        viewMode === "diff"
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Diff View
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewMode("proposed")}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      viewMode === "proposed"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {activeChange?.isDiff ? "Patched File" : "Proposed"}
                  </button>
                  {originalContent && (
                    <button
                      type="button"
                      onClick={() => setViewMode("original")}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        viewMode === "original"
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Current File
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyCode(
                      viewMode === "diff"
                        ? (activeChange?.gitPatch || proposedContent)
                        : viewMode === "proposed"
                        ? patchedContent
                        : originalContent
                    )
                  }
                  className="px-2.5 py-1 rounded bg-muted/60 hover:bg-muted text-foreground border border-border/80 flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                  title={viewMode === "diff" ? "Copy Git diff patch" : "Copy code"}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-muted-foreground" />
                      <span>{viewMode === "diff" ? "Copy Patch" : "Copy"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Content with subtle line numbers */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar font-mono text-[12px] leading-relaxed bg-editor-bg text-foreground">
              {viewMode === "diff" ? (
                <div className="space-y-0.5">
                  {(() => {
                    let inSearch = false;
                    let inReplace = false;
                    return (activeChange?.gitPatch || proposedContent).split("\n").map((line, lIdx) => {
                      let lineCls = "text-foreground";
                      if (line.startsWith("<<<<<<< SEARCH")) {
                        inSearch = true;
                        inReplace = false;
                        lineCls = "text-rose-400 bg-rose-500/20 font-semibold px-1 rounded-xs block";
                      } else if (line.startsWith("=======")) {
                        inSearch = false;
                        inReplace = true;
                        lineCls = "text-emerald-400 bg-emerald-500/20 font-semibold px-1 rounded-xs block";
                      } else if (line.startsWith(">>>>>>> REPLACE")) {
                        inSearch = false;
                        inReplace = false;
                        lineCls = "text-emerald-400 bg-emerald-500/20 font-semibold px-1 rounded-xs block";
                      } else if (inSearch) {
                        lineCls = "text-rose-300 bg-rose-500/10 px-1 block";
                      } else if (inReplace) {
                        lineCls = "text-emerald-300 bg-emerald-500/10 px-1 block";
                      } else if (line.startsWith("+")) {
                        lineCls = "text-emerald-400 bg-emerald-500/10 px-1 block";
                      } else if (line.startsWith("-")) {
                        lineCls = "text-rose-400 bg-rose-500/10 px-1 block";
                      } else if (
                        line.startsWith("@@") ||
                        line.startsWith("---") ||
                        line.startsWith("+++") ||
                        line.startsWith("Index:")
                      ) {
                        lineCls = "text-cyan-400 font-semibold block";
                      }
                      return (
                        <div key={lIdx} className={`whitespace-pre font-mono text-[11.5px] ${lineCls}`}>
                          <span className="inline-block w-8 text-right pr-3 select-none text-muted-foreground/40 font-mono">
                            {lIdx + 1}
                          </span>
                          {line || " "}
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="flex font-mono">
                  <div className="select-none pr-3 text-right text-muted-foreground/40 border-r border-border/50 mr-3 shrink-0">
                    {(viewMode === "proposed" ? patchedContent : originalContent)
                      .split("\n")
                      .map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                  </div>
                  <div className="flex-1 overflow-x-auto text-foreground">
                    {(viewMode === "proposed" ? patchedContent : originalContent)
                      .split("\n")
                      .map((line, i) => (
                        <div key={i} className="whitespace-pre">
                          {line || " "}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border shrink-0 bg-editor-panel">
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
                className="px-4 py-2 rounded-lg text-xs font-medium border border-[#f7931e]/40 bg-[#f7931e]/10 text-[#f7931e] hover:bg-[#f7931e]/20 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Apply Selected ({selectedPaths.size})
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyAll}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#f7931e] hover:bg-[#e5820f] active:bg-[#d6750d] text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
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
