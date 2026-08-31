import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Columns2, FileCode2, FileDiff, Files, Folder, FolderOpen, Maximize2, Minimize2, Rows3 } from "lucide-react";
import { getLabRepo, type RepoDiffLine, type RepoFile } from "@/lib/labRepo";

const rowBg = (t: RepoDiffLine["type"]) =>
  t === "add" ? "bg-emerald-400/10" : t === "del" ? "bg-red-400/10" : "";
const sign = (t: RepoDiffLine["type"]) => (t === "add" ? "+" : t === "del" ? "-" : " ");
const signColor = (t: RepoDiffLine["type"]) =>
  t === "add" ? "text-emerald-300" : t === "del" ? "text-red-300" : "text-neutral-600";

function kindBadge(kind?: RepoFile["kind"]) {
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

type TreeNode = {
  name: string;
  path: string;
  file?: RepoFile;
  children: TreeNode[];
};

function buildTree(files: RepoFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      let next = node.children.find(c => c.name === part && (i === parts.length - 1 ? !!c.file : !c.file));
      if (!next) {
        next = { name: part, path, children: [] };
        node.children.push(next);
      }
      if (i === parts.length - 1) next.file = f;
      node = next;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const af = !!a.file, bf = !!b.file;
      if (af !== bf) return af ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sort(n.children));
  };
  sort(root.children);
  return root.children;
}

function TreeRow({
  node,
  depth,
  active,
  onSelect,
  openDirs,
  toggleDir,
}: {
  node: TreeNode;
  depth: number;
  active: string;
  onSelect: (p: string) => void;
  openDirs: Record<string, boolean>;
  toggleDir: (p: string) => void;
}) {
  const pad = { paddingLeft: 8 + depth * 12 };

  if (node.file) {
    const isActive = active === node.file.path;
    return (
      <button
        onClick={() => onSelect(node.file!.path)}
        style={pad}
        className={`flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[11px] ${
          isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5"
        }`}
      >
        <FileCode2 className="h-3 w-3 shrink-0 text-neutral-500" />
        <span className="flex-1 truncate font-mono">{node.name}</span>
        {kindBadge(node.file.kind)}
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
        node.children.map(c => (
          <TreeRow
            key={c.path + (c.file ? "#f" : "#d")}
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

function FileTree({
  files,
  active,
  onSelect,
}: {
  files: RepoFile[];
  active: string;
  onSelect: (p: string) => void;
}) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});
  const toggleDir = (p: string) => setOpenDirs(s => ({ ...s, [p]: s[p] === false }));
  return (
    <div>
      {tree.map(n => (
        <TreeRow
          key={n.path + (n.file ? "#f" : "#d")}
          node={n}
          depth={0}
          active={active}
          onSelect={onSelect}
          openDirs={openDirs}
          toggleDir={toggleDir}
        />
      ))}
    </div>
  );
}


function Unified({ file }: { file: RepoFile }) {
  return (
    <div className="font-mono text-[11.5px] leading-5">
      {file.diff.map((l, i) => (
        <div key={i} className={`flex ${rowBg(l.type)}`}>
          <span className="w-9 shrink-0 select-none px-2 text-right text-neutral-600">{l.oldNo ?? ""}</span>
          <span className="w-9 shrink-0 select-none px-2 text-right text-neutral-600">{l.newNo ?? ""}</span>
          <span className={`w-4 shrink-0 select-none ${signColor(l.type)}`}>{sign(l.type)}</span>
          <span className="whitespace-pre-wrap break-all pr-3 text-neutral-300">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

function Split({ file }: { file: RepoFile }) {
  const rows: { left?: RepoDiffLine; right?: RepoDiffLine }[] = [];
  const q: RepoDiffLine[] = [];
  const flush = () => {
    const dels = q.filter(l => l.type === "del");
    const adds = q.filter(l => l.type === "add");
    for (let i = 0; i < Math.max(dels.length, adds.length); i++) rows.push({ left: dels[i], right: adds[i] });
    q.length = 0;
  };
  for (const l of file.diff) {
    if (l.type === "ctx") {
      flush();
      rows.push({ left: l, right: l });
    } else q.push(l);
  }
  flush();

  const Cell = ({ l, side }: { l?: RepoDiffLine; side: "left" | "right" }) => (
    <div className={`flex min-w-0 flex-1 ${l ? rowBg(l.type) : "bg-white/[0.02]"}`}>
      <span className="w-9 shrink-0 select-none px-2 text-right text-neutral-600">
        {(side === "left" ? l?.oldNo : l?.newNo) ?? ""}
      </span>
      <span className={`w-4 shrink-0 select-none ${l ? signColor(l.type) : ""}`}>{l ? sign(l.type) : ""}</span>
      <span className="whitespace-pre-wrap break-all pr-3 text-neutral-300">{l?.text ?? ""}</span>
    </div>
  );

  return (
    <div className="font-mono text-[11.5px] leading-5">
      {rows.map((r, i) => (
        <div key={i} className="flex divide-x divide-white/10">
          <Cell l={r.left} side="left" />
          <Cell l={r.right} side="right" />
        </div>
      ))}
    </div>
  );
}

function Workspace({
  files,
  fullscreen,
  onToggleFullscreen,
}: {
  files: RepoFile[];
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const changed = files.filter(f => f.changed);
  const [view, setView] = useState<"files" | "diff">("files");
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const list = view === "files" ? files : changed;
  const [active, setActive] = useState(files[0]?.path ?? "");
  const current = list.find(f => f.path === active) ?? list[0];

  const adds = changed.reduce((a, f) => a + f.additions, 0);
  const dels = changed.reduce((a, f) => a + f.deletions, 0);

  const NavBtn = ({
    id,
    icon: Icon,
    label,
  }: { id: "files" | "diff"; icon: typeof Files; label: string }) => (
    <button
      onClick={() => setView(id)}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
        view === id ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div
      className={`flex flex-col overflow-hidden border border-white/10 bg-neutral-950 ${
        fullscreen ? "h-full rounded-none" : "h-[560px] rounded-xl"
      }`}
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          {view === "files" ? "File view" : "Diff view"}
        </span>
        <span className="text-[11px] text-neutral-500">
          {view === "files" ? `${files.length} files · ${changed.length} changed` : `${changed.length} changed files`}
          <span className="ml-2 text-emerald-300">+{adds}</span>
          <span className="ml-1 text-red-300">−{dels}</span>
        </span>

        {view === "diff" && (
          <div className="ml-auto inline-flex overflow-hidden rounded-md border border-white/10 text-[11px]">
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
          className={`inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-white/5 ${view === "diff" ? "" : "ml-auto"}`}
        >
          {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-white/[0.02] py-2">
          <NavBtn id="files" icon={Files} label="File view" />
          <NavBtn id="diff" icon={FileDiff} label="Diff view" />
        </div>

        {/* Explorer */}
        <div className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-white/[0.02]">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            Explorer
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            <FileTree files={list} active={current?.path ?? ""} onSelect={setActive} />
            {list.length === 0 && (
              <div className="px-3 py-6 text-center text-[11px] text-neutral-500">No files changed.</div>
            )}

          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!current ? (
            <div className="flex flex-1 items-center justify-center text-[12px] text-neutral-500">
              Select a file to view its contents
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5 text-[11px]">
                <span className="font-mono text-neutral-300">{current.path}</span>
                {kindBadge(current.kind)}
                {current.changed ? (
                  <span className="ml-auto text-[10px]">
                    <span className="text-emerald-300">+{current.additions}</span>{" "}
                    <span className="text-red-300">−{current.deletions}</span>
                  </span>
                ) : (
                  <span className="ml-auto text-[10px] text-neutral-500">unchanged</span>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {view === "diff" ? (
                  mode === "unified" ? <Unified file={current} /> : <Split file={current} />
                ) : (
                  <div className="font-mono text-[11.5px] leading-5">
                    {current.content.map((line, i) => (
                      <div key={i} className="flex">
                        <span className="w-10 shrink-0 select-none px-2 text-right text-neutral-600">{i + 1}</span>
                        <span className="whitespace-pre-wrap break-all pr-3 text-neutral-300">{line}</span>
                      </div>
                    ))}
                  </div>
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
  labId,
  changedFiles,
}: {
  labId: string;
  changedFiles: { path: string; kind: "modified" | "created" | "deleted" }[];
}) {
  const files = useMemo(() => getLabRepo(labId, changedFiles), [labId, changedFiles]);
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
        <Workspace key="full" files={files} fullscreen onToggleFullscreen={() => setFull(false)} />
      </div>
    );
  }
  return <Workspace key="inline" files={files} fullscreen={false} onToggleFullscreen={() => setFull(true)} />;
}

