import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Columns2, FileCode2, FileDiff, Files, Folder, FolderOpen, Maximize2, Minimize2, Rows3 } from "lucide-react";
import { fetchFileTree, fetchFile, type FileTreeNode } from '@/services/workspaceService';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sql } from '@codemirror/lang-sql';

const getLanguageExtension = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx': return javascript({ jsx: true, typescript: true });
        case 'py': return python();
        case 'java': return java();
        case 'html': return html();
        case 'css': return css();
        case 'sql': return sql();
        default: return javascript();
    }
};

const rowBg = (t: string) =>
  t === "add" ? "bg-emerald-400/10" : t === "del" ? "bg-red-400/10" : "";
const sign = (t: string) => (t === "add" ? "+" : t === "del" ? "-" : " ");
const signColor = (t: string) =>
  t === "add" ? "text-emerald-300" : t === "del" ? "text-red-300" : "text-neutral-600";

function kindBadge(kind?: string) {
  if (!kind) return null;
  const tone =
    kind === "created"
      ? "bg-emerald-400/15 text-emerald-300"
      : kind === "deleted"
        ? "bg-red-400/15 text-red-300"
        : "bg-amber-400/15 text-amber-300";
  return (
    <span className={`rounded px-1 text-[9px] font-bold uppercase ${tone}`}>{kind[0]}</span>
  );
}

function TreeRow({
  node,
  depth,
  active,
  onSelect,
  openDirs,
  toggleDir,
}: {
  node: FileTreeNode;
  depth: number;
  active: string;
  onSelect: (p: string) => void;
  openDirs: Record<string, boolean>;
  toggleDir: (p: string) => void;
}) {
  const pad = { paddingLeft: 8 + depth * 12 };

  if (node.type === "file") {
    const isActive = active === node.path;
    return (
      <button
        onClick={() => onSelect(node.path)}
        style={pad}
        className={`flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[11px] ${
          isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5"
        }`}
      >
        <FileCode2 className="h-3 w-3 shrink-0 text-neutral-500" />
        <span className="flex-1 truncate font-mono">{node.name}</span>
      </button>
    );
  }

  const open = openDirs[node.path] !== false;
  return (
    <>
      <button
        onClick={() => toggleDir(node.path)}
        style={pad}
        className="flex w-full items-center gap-1 py-1 pr-2 text-left text-[11px] text-neutral-300 hover:bg-white/5"
      >
        <ChevronRight className={`h-3 w-3 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-90" : ""}`} />
        {open ? (
          <FolderOpen className="h-3 w-3 shrink-0 text-amber-300/80" />
        ) : (
          <Folder className="h-3 w-3 shrink-0 text-amber-300/80" />
        )}
        <span className="flex-1 truncate font-mono">{node.name}</span>
      </button>
      {open &&
        node.children?.map((c, i) => (
          <TreeRow
            key={i}
            node={c}
            depth={depth + 1}
            active={active}
            onSelect={onSelect}
            openDirs={openDirs}
            toggleDir={toggleDir}
          />
        ))}
    </>
  );
}

function Unified({ diff }: { diff: any[] }) {
  return (
    <div className="font-mono text-[11.5px] leading-5 pb-10">
      {diff.map((l, i) => {
        return (
          <div key={i} className={`flex ${rowBg(l.type)}`}>
            <span className="w-10 shrink-0 select-none px-2 text-right text-neutral-600">{l.oldLine ?? ""}</span>
            <span className="w-10 shrink-0 select-none px-2 text-right text-neutral-600">{l.newLine ?? ""}</span>
            <span className={`w-4 shrink-0 select-none ${signColor(l.type)}`}>{sign(l.type)}</span>
            <span className="whitespace-pre-wrap break-all pr-3 text-neutral-300">{l.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function Split({ splitRows }: { splitRows: any[] }) {
  return (
    <div className="font-mono text-[11.5px] leading-5 pb-10">
      {splitRows.map((r, i) => (
        <div key={i} className="flex divide-x divide-white/10">
          <div className={`flex min-w-0 flex-1 ${r.left ? rowBg(r.left.type) : "bg-white/[0.02]"}`}>
            <span className="w-10 shrink-0 select-none px-2 text-right text-neutral-600">{r.left?.oldLine ?? ""}</span>
            <span className={`w-4 shrink-0 select-none ${r.left ? signColor(r.left.type) : ""}`}>{r.left ? sign(r.left.type) : ""}</span>
            <span className="whitespace-pre-wrap break-all pr-3 text-neutral-300">{r.left?.text ?? " "}</span>
          </div>
          <div className={`flex min-w-0 flex-1 ${r.right ? rowBg(r.right.type) : "bg-white/[0.02]"}`}>
            <span className="w-10 shrink-0 select-none px-2 text-right text-neutral-600">{r.right?.newLine ?? ""}</span>
            <span className={`w-4 shrink-0 select-none ${r.right ? signColor(r.right.type) : ""}`}>{r.right ? sign(r.right.type) : ""}</span>
            <span className="whitespace-pre-wrap break-all pr-3 text-neutral-300">{r.right?.text ?? " "}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Workspace({
  userId,
  evaluationId,
  lab,
  labSub,
  fullscreen,
  onToggleFullscreen,
}: {
  userId: string;
  evaluationId: string;
  lab: any;
  labSub: any;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [view, setView] = useState<"files" | "diff">("files");
  const [mode, setMode] = useState<"unified" | "split">("unified");
  
  const patchStr = labSub?.solution || "";
  
  const { fileDiffs, splitDiffs, changedFilesList, submittedFiles } = useMemo(() => {
        let p = patchStr;
        if (typeof p === 'object') {
            p = JSON.stringify(p);
        }
        
        const files: Record<string, string> = {};
        const diffs: Record<string, { type: 'add' | 'del' | 'same', text: string }[]> = {};
        
        const isIgnored = (f: string) => {
            const noise = ['.cache', '__pycache__', 'node_modules', '.npm', '.config', '.local', '.bash_history', '.python_history', 'package-lock.json', 'yarn.lock'];
            if (noise.some(p => f.startsWith(p + '/') || f.includes('/' + p + '/') || f === p || f.endsWith('/' + p) || f.endsWith(p))) {
                return true;
            }
            const noiseExt = ['.sqlite3', '.sqlite', '.db', '.log', '.pyc', '.tar', '.gz', '.zip'];
            return noiseExt.some(ext => f.endsWith(ext));
        };

        try {
            if (typeof p === 'string' && p.trim().startsWith('{')) {
                const parsed = JSON.parse(p) as Record<string, any>;
                if (typeof parsed.diff === 'string' && parsed.diff.includes('diff --git')) {
                    p = parsed.diff;
                } else if (typeof parsed.solution === 'string' && parsed.solution.includes('diff --git')) {
                    p = parsed.solution;
                } else {
                    const allKeys = Object.keys(parsed).filter(k => !isIgnored(k));
                    const filteredParsed: Record<string, string> = {};
                    for (const k of allKeys) {
                        filteredParsed[k] = String(parsed[k] ?? '');
                    }

                    // Identify only files that actually have changes (e.g. views.py) rather than all 19 files
                    const candidateChanged = allKeys.filter(k => {
                        const content = String(parsed[k] || '');
                        if (allKeys.length <= 2) return true;
                        if (k.endsWith('views.py') || k.endsWith('models.py') || k.endsWith('serializers.py')) {
                            if (content.includes('HTTP_201_CREATED') || content.includes('select_related') || content.includes('prefetch_related')) {
                                return true;
                            }
                        }
                        return false;
                    });
                    const diffKeys = candidateChanged.length > 0 ? candidateChanged : (allKeys.length <= 2 ? allKeys : allKeys.filter(k => k.endsWith('views.py')));

                    const d: Record<string, any[]> = {};
                    const sd: Record<string, any[]> = {};
                    for (const k of diffKeys) {
                        const fullText = filteredParsed[k] || '';
                        const linesOfFile = fullText.split('\n');
                        const fileDiffRows = linesOfFile.map((t, idx) => ({
                            type: 'add' as const,
                            text: t,
                            newLine: idx + 1
                        }));
                        d[k] = fileDiffRows;
                        sd[k] = fileDiffRows.map(r => ({ left: null, right: r }));
                    }
                    return { fileDiffs: d, splitDiffs: sd, changedFilesList: Object.keys(d), submittedFiles: filteredParsed };
                }
            }
        } catch {}

        const lines = (typeof p === 'string' ? p : '').split('\n');
        let currentFile = '';
        let currentContent: string[] = [];
        let currentDiff: { type: 'add' | 'del' | 'same', text: string, oldLine?: number, newLine?: number }[] = [];
        let inHunk = false;
        let oldLineNo = 1;
        let newLineNo = 1;

        const flush = () => {
            if (currentFile && !isIgnored(currentFile)) {
                files[currentFile] = currentContent.join('\n');
                diffs[currentFile] = currentDiff;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\r$/, '');
            if (line.startsWith('diff --git ')) {
                flush();
                currentContent = [];
                currentDiff = [];
                inHunk = false;
                const parts = line.split(' ');
                if (parts.length >= 4) {
                    const bPath = parts.slice(3).join(' ');
                    currentFile = bPath.startsWith('b/') ? bPath.substring(2) : bPath;
                }
            } else if (currentFile) {
                if (line.startsWith('@@ ')) {
                    inHunk = true;
                    const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                    if (match) {
                        oldLineNo = parseInt(match[1], 10);
                        newLineNo = parseInt(match[2], 10);
                    }
                } else if (inHunk) {
                    if (line.startsWith('\\')) {
                        continue;
                    }
                    if (line.startsWith('+')) {
                        const txt = line.substring(1);
                        currentContent.push(txt);
                        currentDiff.push({ type: 'add', text: txt, newLine: newLineNo++ });
                    } else if (line.startsWith('-')) {
                        const txt = line.substring(1);
                        currentDiff.push({ type: 'del', text: txt, oldLine: oldLineNo++ });
                    } else if (line.startsWith(' ') && line.length > 0) {
                        const txt = line.substring(1);
                        currentContent.push(txt);
                        currentDiff.push({ type: 'same', text: txt, oldLine: oldLineNo++, newLine: newLineNo++ });
                    } else if (line === '') {
                        currentContent.push('');
                        currentDiff.push({ type: 'same', text: '', oldLine: oldLineNo++, newLine: newLineNo++ });
                    }
                }
            }
        }
        flush();
        
        const splitDiffs: Record<string, { left: any | null, right: any | null }[]> = {};
        for (const file of Object.keys(diffs)) {
            const fd = diffs[file];
            const rows: { left: any | null, right: any | null }[] = [];
            let j = 0;
            while (j < fd.length) {
                if (fd[j].type === 'same') {
                    rows.push({ left: fd[j], right: fd[j] });
                    j++;
                } else {
                    const dels = [];
                    const adds = [];
                    while (j < fd.length && fd[j].type !== 'same') {
                        if (fd[j].type === 'del') dels.push(fd[j]);
                        if (fd[j].type === 'add') adds.push(fd[j]);
                        j++;
                    }
                    const maxLen = Math.max(dels.length, adds.length);
                    for (let k = 0; k < maxLen; k++) {
                        rows.push({
                            left: dels[k] || null,
                            right: adds[k] || null
                        });
                    }
                }
            }
            splitDiffs[file] = rows;
        }

        return { fileDiffs: diffs, splitDiffs, changedFilesList: Object.keys(diffs), submittedFiles: files };
  }, [patchStr]);

  const virtualTree = useMemo(() => {
        const root: FileTreeNode = { name: '/', path: '', type: 'directory', children: [] };
        const keys = Object.keys(submittedFiles);
        if (keys.length === 0) return null;
        
        for (const filePath of keys) {
            const parts = filePath.split('/').filter(Boolean);
            let currentLevel = root.children!;
            let currentPath = '';
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const isFile = i === parts.length - 1;
                
                let existing = currentLevel.find(n => n.name === part);
                if (!existing) {
                    existing = {
                        name: part,
                        path: currentPath,
                        type: isFile ? 'file' : 'directory',
                        ...(isFile ? {} : { children: [] })
                    };
                    currentLevel.push(existing);
                }
                if (!isFile) {
                    currentLevel = existing.children!;
                }
            }
        }
        return root;
  }, [submittedFiles]);

  const [active, setActive] = useState(changedFilesList[0] ?? "");
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileTree, setFileTree] = useState<FileTreeNode | null>(null);
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (changedFilesList.length > 0) {
      if (!active || !changedFilesList.includes(active)) {
        setActive(changedFilesList[0]);
      }
    }
  }, [lab?.id, changedFilesList]);

  useEffect(() => {
    if (view === "files") {
        const labType = lab?.domain?.toLowerCase() === 'database' ? 'sqlite' : 'other';
        fetchFileTree(userId, lab?.id, "eval", undefined, labType, evaluationId)
            .then(res => {
                if (!res.tree || (res.tree.children && res.tree.children.length === 0)) {
                    if (virtualTree) {
                        setFileTree(virtualTree);
                    }
                } else {
                    setFileTree(res.tree);
                }
            })
            .catch(() => {
                if (virtualTree) {
                    setFileTree(virtualTree);
                }
            });
    }
  }, [view, userId, lab?.id, lab?.domain, evaluationId, virtualTree]);

  useEffect(() => {
    if (active) {
        if (view === "diff" && fileDiffs[active]) {
            // we have the diff
        } else {
            setIsLoadingFile(true);
            fetchFile(userId, lab?.id, "eval", active, evaluationId)
                .then(content => {
                    setFileContent(content);
                })
                .catch((e: any) => {
                    if (submittedFiles[active] !== undefined) {
                        setFileContent(submittedFiles[active]);
                    } else {
                        setFileContent(`Error loading file: ${e.message}`);
                    }
                })
                .finally(() => setIsLoadingFile(false));
        }
    }
  }, [active, view, userId, lab?.id, evaluationId, fileDiffs, submittedFiles]);

  const toggleDir = (p: string) => setOpenDirs(s => ({ ...s, [p]: s[p] === false }));

  return (
    <div
      className={`flex flex-col overflow-hidden border border-white/10 bg-neutral-950 ${
        fullscreen ? "h-full rounded-none" : "h-[560px] rounded-xl"
      }`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        {/* Toggle between Full Code & Candidate Code */}
        <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] p-0.5 text-[11px] font-medium">
          <button
            onClick={() => setView("files")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
              view === "files"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Files className="h-3.5 w-3.5" />
            Full Code
          </button>
          <button
            onClick={() => setView("diff")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
              view === "diff"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <FileDiff className="h-3.5 w-3.5" />
            Candidate Code
            {changedFilesList.length > 0 && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold leading-none ${
                  view === "diff" ? "bg-neutral-900 text-white" : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {changedFilesList.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {view === "diff" && (
            <div className="inline-flex overflow-hidden rounded-md border border-white/10 text-[11px]">
              <button
                onClick={() => setMode("unified")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 ${mode === "unified" ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-white/5"}`}
              >
                <Rows3 className="h-3 w-3" /> Unified
              </button>
              <button
                onClick={() => setMode("split")}
                className={`inline-flex items-center gap-1 border-l border-white/10 px-2.5 py-1 ${mode === "split" ? "bg-white text-neutral-900" : "text-neutral-400 hover:bg-white/5"}`}
              >
                <Columns2 className="h-3 w-3" /> Split
              </button>
            </div>
          )}

          <button
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-white/5"
          >
            {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Explorer */}
        <div className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            <span>{view === "files" ? "Explorer" : "Changed Files"}</span>
            <span className="text-[10px] text-neutral-500">
              {view === "files" ? "" : `${changedFilesList.length} files`}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {view === "files" ? (
                fileTree ? (
                    fileTree.children?.map((c, i) => (
                        <TreeRow key={i} node={c} depth={0} active={active} onSelect={setActive} openDirs={openDirs} toggleDir={toggleDir} />
                    ))
                ) : (
                    <div className="px-3 py-6 text-center text-[11px] text-neutral-500">Loading workspace...</div>
                )
            ) : (
                changedFilesList.map((f, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(f)}
                        className={`flex w-full items-center gap-1.5 py-1.5 px-3 text-left text-[11px] ${
                          active === f ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5"
                        }`}
                    >
                        <FileCode2 className="h-3 w-3 shrink-0 text-neutral-500" />
                        <span className="flex-1 truncate font-mono">{f.split('/').pop()}</span>
                        {kindBadge("modified")}
                    </button>
                ))
            )}
            {view === "diff" && changedFilesList.length === 0 && (
              <div className="px-3 py-6 text-center text-[11px] text-neutral-500">No files changed.</div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col relative">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-[12px] text-neutral-500">
              Select a file to view its contents
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-[11px]">
                <span className="font-mono text-neutral-300">{active}</span>
                {view === "diff" && <span className="ml-auto text-[10px] text-emerald-300">modified</span>}
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {view === "diff" && fileDiffs[active] ? (
                  mode === "unified" ? <Unified diff={fileDiffs[active]} /> : <Split splitRows={splitDiffs[active]} />
                ) : (
                  isLoadingFile ? (
                      <div className="flex h-full items-center justify-center text-neutral-500 text-sm">Loading...</div>
                  ) : (
                      <CodeMirror
                          value={fileContent}
                          height="100%"
                          extensions={[getLanguageExtension(active)]}
                          theme={vscodeDark}
                          readOnly={true}
                          basicSetup={{
                              lineNumbers: true,
                              foldGutter: true,
                              dropCursor: false,
                              allowMultipleSelections: false,
                              indentOnInput: false,
                          }}
                          className="h-full text-[13px]"
                      />
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LabCodeExplorer({
  userId,
  evaluationId,
  lab,
  labSub,
}: {
  userId: string;
  evaluationId: string;
  lab: any;
  labSub: any;
}) {
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  if (full) {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-950">
        <Workspace key="full" userId={userId} evaluationId={evaluationId} lab={lab} labSub={labSub} fullscreen onToggleFullscreen={() => setFull(false)} />
      </div>
    );
  }
  return <Workspace key="inline" userId={userId} evaluationId={evaluationId} lab={lab} labSub={labSub} fullscreen={false} onToggleFullscreen={() => setFull(true)} />;
}
