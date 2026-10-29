import { FileTreeNode } from '@/services/workspaceService';

export function parseSolutionPatch(patchStr: string | any) {
    if (!patchStr) return { submittedFiles: {}, fileDiffs: {}, splitDiffs: {} };
    
    if (typeof patchStr === 'object') {
        patchStr = JSON.stringify(patchStr);
    }
    
    try {
        if (typeof patchStr === 'string' && patchStr.trim().startsWith('{')) {
            const parsed = JSON.parse(patchStr) as Record<string, any>;

            // Check if this is a System Design structure
            if (parsed && (parsed.nodes || parsed.seq || parsed.schema || parsed.apis)) {
                const sysFiles: Record<string, string> = {};
                if (parsed.nodes || parsed.edges) {
                    sysFiles["architecture.json"] = JSON.stringify({ nodes: parsed.nodes || [], edges: parsed.edges || [] }, null, 2);
                }
                if (parsed.seq) {
                    sysFiles["sequence.mmd"] = String(parsed.seq);
                }
                if (parsed.schema) {
                    sysFiles["schema.dbml"] = String(parsed.schema);
                }
                if (parsed.apis) {
                    sysFiles["endpoints.json"] = JSON.stringify(parsed.apis, null, 2);
                }
                if (parsed.notes) {
                    const notesStr = typeof parsed.notes === "object"
                        ? Object.entries(parsed.notes)
                            .filter(([_, v]) => Boolean(v && String(v).trim()))
                            .map(([k, v]) => `## ${k.toUpperCase()} Notes\n\n${v}`)
                            .join("\n\n---\n\n")
                        : String(parsed.notes);
                    if (notesStr) {
                        sysFiles["notes.md"] = notesStr;
                    }
                }
                sysFiles["system-design.json"] = JSON.stringify(parsed, null, 2);

                const d: Record<string, any[]> = {};
                const sd: Record<string, any[]> = {};
                for (const k of Object.keys(sysFiles)) {
                    d[k] = [{ type: 'add', text: sysFiles[k] }];
                    sd[k] = [{ left: null, right: d[k][0] }];
                }
                return { submittedFiles: sysFiles, fileDiffs: d, splitDiffs: sd };
            }

            const cleanFiles: Record<string, string> = {};
            const d: Record<string, any[]> = {};
            const sd: Record<string, any[]> = {};
            for (const k of Object.keys(parsed)) {
                const val = typeof parsed[k] === "string" ? parsed[k] : JSON.stringify(parsed[k], null, 2);
                cleanFiles[k] = val;
                d[k] = [{ type: 'add', text: val }];
                sd[k] = [{ left: null, right: d[k][0] }];
            }
            return { submittedFiles: cleanFiles, fileDiffs: d, splitDiffs: sd };
        }
    } catch {
        // ignore
    }

    const files: Record<string, string> = {};
    const diffs: Record<string, { type: 'add' | 'del' | 'same', text: string }[]> = {};
    
    const lines = patchStr.split('\n');
    let currentFile = '';
    let currentContent: string[] = [];
    let currentDiff: { type: 'add' | 'del' | 'same', text: string }[] = [];
    let inHunk = false;

    const isIgnored = (f: string) => {
        const noise = ['.cache', '__pycache__', 'node_modules', '.npm', '.config', '.local', '.bash_history', '.python_history'];
        return noise.some(p => f.startsWith(p + '/') || f.includes('/' + p + '/') || f === p);
    };

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
            } else if (inHunk) {
                if (line.startsWith('+')) {
                    const txt = line.substring(1);
                    currentContent.push(txt);
                    currentDiff.push({ type: 'add', text: txt });
                } else if (line.startsWith('-')) {
                    const txt = line.substring(1);
                    currentDiff.push({ type: 'del', text: txt });
                } else if (line.startsWith(' ') && line.length > 0) {
                    const txt = line.substring(1);
                    currentContent.push(txt);
                    currentDiff.push({ type: 'same', text: txt });
                } else if (line === '') {
                    currentContent.push('');
                    currentDiff.push({ type: 'same', text: '' });
                }
            }
        }
    }
    flush();
    
    // Compute split rows for each file
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

    return { submittedFiles: files, fileDiffs: diffs, splitDiffs };
}

export function buildVirtualTree(submittedFiles: Record<string, string>): FileTreeNode | null {
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
            
            let existing = currentLevel.find((n: any) => n.name === part);
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
}
