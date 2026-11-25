export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  children: FileTreeNode[];
}

export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: Record<string, any> = {};

  for (const rawPath of paths) {
    const clean = rawPath.replace(/^\/+/, "").trim();
    if (!clean) continue;
    const parts = clean.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (!current[part]) {
        current[part] = {
          id: isFile ? `file:${currentPath}` : `folder:${currentPath}`,
          name: part,
          path: currentPath,
          isFolder: !isFile,
          children: {},
        };
      }
      current = current[part].children;
    }
  }

  function toArray(obj: Record<string, any>): FileTreeNode[] {
    const list: FileTreeNode[] = Object.values(obj).map((item: any) => ({
      id: item.id,
      name: item.name,
      path: item.path,
      isFolder: item.isFolder,
      children: toArray(item.children),
    }));

    // Folders first, then files alphabetically
    list.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    return list;
  }

  return toArray(root);
}
