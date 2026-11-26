import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Wand2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode2,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type TreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
};

export function buildTree(paths: readonly string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFile: false, children: [] };
  for (const full of paths) {
    if (!full || !full.trim()) continue;
    if (
      full.startsWith("yuvro_scoring_rules") ||
      full.includes("/yuvro_scoring_rules") ||
      full.startsWith("__pycache__") ||
      full.includes("/__pycache__")
    )
      continue;
    const parts = full.split("/");
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      if (!seg) continue;
      const isLast = i === parts.length - 1;
      const segPath = parts.slice(0, i + 1).join("/");
      let next = cursor.children.find((c) => c.name === seg && c.isFile === isLast);
      if (!next) {
        next = { name: seg, path: segPath, isFile: isLast, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) =>
      a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1
    );
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

export type InlineTreeAction =
  | { type: "new-file"; folderPath: string }
  | { type: "new-folder"; folderPath: string }
  | { type: "rename-file"; path: string; currentName: string }
  | { type: "rename-folder"; path: string; currentName: string };

function InlineInput({
  initialValue = "",
  placeholder = "",
  icon,
  onCommit,
  onCancel,
  paddingLeft,
}: {
  initialValue?: string;
  placeholder?: string;
  icon: React.ReactNode;
  onCommit: (val: string) => void;
  onCancel: () => void;
  paddingLeft: number;
}) {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (initialValue) {
        const dot = initialValue.lastIndexOf(".");
        if (dot > 0) {
          inputRef.current.setSelectionRange(0, dot);
        } else {
          inputRef.current.select();
        }
      }
    }
  }, [initialValue]);

  return (
    <div
      style={{ paddingLeft }}
      className="flex items-center gap-1.5 py-0.5 pr-2 bg-accent/40 rounded my-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="w-3" />
      {icon}
      <input
        ref={inputRef}
        type="text"
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onCommit(val);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        onBlur={() => {
          onCommit(val);
        }}
        className="flex-1 bg-background border border-primary text-foreground text-xs px-1.5 py-0.5 rounded outline-none h-6 min-w-0"
      />
    </div>
  );
}

export type FileTreeProps = {
  rootLabel: string;
  paths: readonly string[];
  activeFile: string;
  dirty: Record<string, boolean>;
  inlineAction: InlineTreeAction | null;
  setInlineAction: (action: InlineTreeAction | null) => void;
  onOpenFile: (path: string) => void;
  onCreateFile: (path: string, contents?: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (prefix: string) => void;
  onFormatFile?: (path: string) => void;
  onCopyFilePath?: (path: string) => void;
  isFolderOpen: (key: string) => boolean;
  toggleFolder: (key: string) => void;
};

export function SystemDesignFileTree(props: FileTreeProps) {
  const tree = useMemo(() => buildTree(props.paths), [props.paths]);
  return (
    <div className="space-y-0.5">
      <TreeFolderNode
        node={{ ...tree, name: props.rootLabel, path: "" }}
        depth={0}
        isRoot
        {...props}
      />
    </div>
  );
}

function TreeFolderNode({
  node,
  depth,
  isRoot,
  activeFile,
  dirty,
  inlineAction,
  setInlineAction,
  onOpenFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onDeleteFolder,
  onFormatFile,
  onCopyFilePath,
  isFolderOpen,
  toggleFolder,
}: { node: TreeNode; depth: number; isRoot?: boolean } & Omit<
  FileTreeProps,
  "paths" | "rootLabel"
>) {
  const key = node.path || "__root__";
  const open = isFolderOpen(key);
  const pad = { paddingLeft: depth * 10 + 4 };

  const isRenamingThis = inlineAction?.type === "rename-folder" && inlineAction.path === node.path;
  const isCreatingInside =
    inlineAction &&
    (inlineAction.type === "new-file" || inlineAction.type === "new-folder") &&
    inlineAction.folderPath === node.path;

  const handleNewFile = () => {
    if (!open) toggleFolder(key);
    setInlineAction({ type: "new-file", folderPath: node.path });
  };
  const handleNewFolder = () => {
    if (!open) toggleFolder(key);
    setInlineAction({ type: "new-folder", folderPath: node.path });
  };

  return (
    <div>
      {isRenamingThis ? (
        <InlineInput
          initialValue={node.name}
          icon={<FolderOpen className="h-3 w-3 shrink-0 text-[#f7931e]" />}
          paddingLeft={depth * 10 + 4}
          onCommit={(nextName) => {
            const trimmed = nextName.trim().replace(/\/+$/, "");
            if (trimmed && trimmed !== node.name) {
              const parts = node.path.split("/");
              parts[parts.length - 1] = trimmed;
              const newPath = parts.join("/");
              const prefix = node.path + "/";
              const newPrefix = newPath + "/";
              const affected = getPathsUnder(node);
              affected.forEach((p) => onRenameFile(p, p.replace(prefix, newPrefix)));
            }
            setInlineAction(null);
          }}
          onCancel={() => setInlineAction(null)}
        />
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              onClick={() => toggleFolder(key)}
              style={pad}
              className="group flex w-full items-center gap-1 rounded py-0.5 pr-1 text-left hover:bg-accent/60 cursor-pointer"
            >
              {open ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
              {open ? (
                <FolderOpen className="h-3 w-3 shrink-0 text-[#f7931e]" />
              ) : (
                <Folder className="h-3 w-3 shrink-0 text-[#f7931e]" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-44">
            <ContextMenuItem onSelect={handleNewFile}>
              <FilePlus className="mr-2 h-3.5 w-3.5 text-[#f7931e]" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onSelect={handleNewFolder}>
              <FolderPlus className="mr-2 h-3.5 w-3.5 text-[#f7931e]" />
              New Folder
            </ContextMenuItem>
            {!isRoot && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onSelect={() => {
                    setInlineAction({
                      type: "rename-folder",
                      path: node.path,
                      currentName: node.name,
                    });
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Rename Folder
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDeleteFolder(node.path)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Folder
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      )}

      {open && (
        <div>
          {isCreatingInside &&
            (inlineAction?.type === "new-file" ? (
              <InlineInput
                placeholder="filename.ext"
                icon={<FileCode2 className="h-3 w-3 shrink-0 text-muted-foreground" />}
                paddingLeft={(depth + 1) * 10 + 4}
                onCommit={(name) => {
                  const trimmed = name.trim();
                  if (trimmed) {
                    const fullPath = node.path ? `${node.path}/${trimmed}` : trimmed;
                    onCreateFile(fullPath);
                  }
                  setInlineAction(null);
                }}
                onCancel={() => setInlineAction(null)}
              />
            ) : (
              <InlineInput
                placeholder="folder-name"
                icon={<Folder className="h-3 w-3 shrink-0 text-[#f7931e]" />}
                paddingLeft={(depth + 1) * 10 + 4}
                onCommit={(name) => {
                  const trimmed = name.trim().replace(/\/+$/, "");
                  if (trimmed) {
                    const fullPath = node.path ? `${node.path}/${trimmed}` : trimmed;
                    onCreateFile(`${fullPath}/.gitkeep`, "");
                  }
                  setInlineAction(null);
                }}
                onCancel={() => setInlineAction(null)}
              />
            ))}

          {node.children.map((child) =>
            child.isFile ? (
              <TreeFileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                active={activeFile === child.path}
                modified={dirty[child.path]}
                inlineAction={inlineAction}
                setInlineAction={setInlineAction}
                onOpenFile={onOpenFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                onFormatFile={onFormatFile}
                onCopyFilePath={onCopyFilePath}
              />
            ) : (
              <TreeFolderNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFile={activeFile}
                dirty={dirty}
                inlineAction={inlineAction}
                setInlineAction={setInlineAction}
                onOpenFile={onOpenFile}
                onCreateFile={onCreateFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                onDeleteFolder={onDeleteFolder}
                onFormatFile={onFormatFile}
                onCopyFilePath={onCopyFilePath}
                isFolderOpen={isFolderOpen}
                toggleFolder={toggleFolder}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function getPathsUnder(node: TreeNode): string[] {
  const out: string[] = [];
  const walk = (n: TreeNode) => {
    if (n.isFile) out.push(n.path);
    else n.children.forEach(walk);
  };
  walk(node);
  return out;
}

function TreeFileNode({
  node,
  depth,
  active,
  modified,
  inlineAction,
  setInlineAction,
  onOpenFile,
  onRenameFile,
  onDeleteFile,
  onFormatFile,
  onCopyFilePath,
}: {
  node: TreeNode;
  depth: number;
  active: boolean;
  modified?: boolean;
  inlineAction: InlineTreeAction | null;
  setInlineAction: (action: InlineTreeAction | null) => void;
  onOpenFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (path: string) => void;
  onFormatFile?: (path: string) => void;
  onCopyFilePath?: (path: string) => void;
}) {
  const pad = { paddingLeft: depth * 10 + 4 };
  const isRenaming = inlineAction?.type === "rename-file" && inlineAction.path === node.path;

  if (isRenaming) {
    return (
      <InlineInput
        initialValue={node.name}
        icon={<FileCode2 className="h-3 w-3 shrink-0 text-[#f7931e]" />}
        paddingLeft={depth * 10 + 4}
        onCommit={(nextName) => {
          const trimmed = nextName.trim();
          if (trimmed && trimmed !== node.name) {
            const parts = node.path.split("/");
            parts[parts.length - 1] = trimmed;
            onRenameFile(node.path, parts.join("/"));
          }
          setInlineAction(null);
        }}
        onCancel={() => setInlineAction(null)}
      />
    );
  }

  const isJson = node.name.endsWith(".json");
  const isMmd = node.name.endsWith(".mmd");
  const isDbml = node.name.endsWith(".dbml");
  const isMd = node.name.endsWith(".md");

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={() => onOpenFile(node.path)}
          style={pad}
          className={`flex w-full items-center gap-1.5 rounded py-0.5 pr-1 text-left cursor-pointer transition-colors ${
            active
              ? "bg-[#f7931e]/15 text-[#f7931e] font-medium"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          }`}
        >
          <span className="w-3" />
          <FileCode2
            className={`h-3 w-3 shrink-0 ${
              isJson
                ? "text-amber-500"
                : isMmd
                ? "text-blue-500"
                : isDbml
                ? "text-emerald-500"
                : isMd
                ? "text-purple-500"
                : "text-muted-foreground"
            }`}
          />
          <span className="flex-1 truncate">{node.name}</span>
          {modified && <span className="h-1.5 w-1.5 rounded-full bg-[#f7931e]" />}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={() => onOpenFile(node.path)}>Open</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onFormatFile?.(node.path)}>
          <Wand2 className="mr-2 h-3.5 w-3.5 text-primary" />
          Format
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onCopyFilePath?.(node.path)}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copy File Path
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            setInlineAction({
              type: "rename-file",
              path: node.path,
              currentName: node.name,
            });
          }}
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onDeleteFile(node.path)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
