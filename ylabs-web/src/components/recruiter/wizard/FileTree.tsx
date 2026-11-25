import React, { useState, useMemo, useCallback } from "react";
import { ChevronRight, Folder, FolderOpen, FileCode2 } from "lucide-react";
import { buildFileTree, FileTreeNode } from "./fileTreeUtils";

export { buildFileTree, type FileTreeNode };

export function FileTreeView({
  files,
  category,
  activeFile,
  activeCategory,
  onSelectFile,
  searchQuery = "",
  showStatusBadges = false,
  modifiedFiles = {},
}: {
  files: string[];
  category: "rules" | "starter" | "solution";
  activeFile: string;
  activeCategory: "rules" | "starter" | "solution";
  onSelectFile: (path: string, category: "rules" | "starter" | "solution") => void;
  searchQuery?: string;
  showStatusBadges?: boolean;
  modifiedFiles?: Record<string, string>;
}) {
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});

  const filteredPaths = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter((f) => f.toLowerCase().includes(q));
  }, [files, searchQuery]);

  const tree = useMemo(() => buildFileTree(filteredPaths), [filteredPaths]);

  const toggleFolder = useCallback((folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDirs((prev) => {
      const current = Boolean(prev[folderPath]);
      return {
        ...prev,
        [folderPath]: !current,
      };
    });
  }, []);

  const isFolderOpen = useCallback(
    (folderPath: string): boolean => {
      // If user is searching, auto-expand all folders to reveal matching files
      if (searchQuery.trim()) return true;
      // All folders start closed by default; user will open manually
      return Boolean(openDirs[folderPath]);
    },
    [openDirs, searchQuery]
  );

  if (files.length === 0) {
    return (
      <div className="mut sm" style={{ padding: "6px 14px", fontStyle: "italic", fontSize: "11.5px" }}>
        No files in this section
      </div>
    );
  }

  if (filteredPaths.length === 0) {
    return (
      <div className="mut sm" style={{ padding: "6px 14px", fontStyle: "italic", fontSize: "11.5px" }}>
        No matching files
      </div>
    );
  }

  return (
    <div className="ide-tree-content">
      {tree.map((node) => (
        <TreeNodeRow
          key={node.id}
          node={node}
          depth={0}
          category={category}
          activeFile={activeFile}
          activeCategory={activeCategory}
          isFolderOpen={isFolderOpen}
          onToggleFolder={toggleFolder}
          onSelectFile={onSelectFile}
          showStatusBadges={showStatusBadges}
          modifiedFiles={modifiedFiles}
        />
      ))}
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  category,
  activeFile,
  activeCategory,
  isFolderOpen,
  onToggleFolder,
  onSelectFile,
  showStatusBadges = false,
  modifiedFiles = {},
}: {
  node: FileTreeNode;
  depth: number;
  category: "rules" | "starter" | "solution";
  activeFile: string;
  activeCategory: "rules" | "starter" | "solution";
  isFolderOpen: (path: string) => boolean;
  onToggleFolder: (path: string, e: React.MouseEvent) => void;
  onSelectFile: (path: string, category: "rules" | "starter" | "solution") => void;
  showStatusBadges?: boolean;
  modifiedFiles?: Record<string, string>;
}) {
  if (node.isFolder) {
    const open = isFolderOpen(node.path);
    const pad = { paddingLeft: 8 + depth * 14 };

    return (
      <div key={node.id}>
        <button
          type="button"
          className="ide-tree-row"
          style={pad}
          onClick={(e) => onToggleFolder(node.path, e)}
          title={node.path}
        >
          <span className={`ide-tree-chevron ${open ? "open" : ""}`}>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
          <span className="ide-tree-icon" style={{ color: "#d97706" }}>
            {open ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
          </span>
          <span className="ide-tree-label" style={{ fontWeight: 500, color: "var(--fg)" }}>
            {node.name}
          </span>
        </button>

        {open &&
          node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              category={category}
              activeFile={activeFile}
              activeCategory={activeCategory}
              isFolderOpen={isFolderOpen}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              showStatusBadges={showStatusBadges}
              modifiedFiles={modifiedFiles}
            />
          ))}
      </div>
    );
  }

  // File row
  const isActive = activeFile === node.path && activeCategory === category;
  const pad = { paddingLeft: 8 + depth * 14 + 16 };
  const isModified = Boolean(modifiedFiles && modifiedFiles[node.path]);

  return (
    <button
      key={node.id}
      type="button"
      className={`ide-tree-row ${isActive ? "active" : ""}`}
      style={pad}
      onClick={() => onSelectFile(node.path, category)}
      title={node.path}
    >
      <span className="ide-tree-icon" style={{ opacity: isActive ? 1 : 0.65 }}>
        <FileCode2 className="w-3.5 h-3.5" />
      </span>
      <span className="ide-tree-label" style={{ flex: 1, textAlign: "left" }}>
        {node.name}
      </span>
      {showStatusBadges && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: "3px",
            lineHeight: "14px",
            color: isModified ? "#b45309" : "#15803d",
            background: isModified ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
          }}
          title={isModified ? "Modified from starter code" : "Added in solution"}
        >
          {isModified ? "M" : "A"}
        </span>
      )}
    </button>
  );
}
