import React, { useState, useEffect, useMemo } from 'react';
import { 
    GitBranch, Folder, FileCode2, ChevronRight, ChevronDown, Activity, Clock, BookOpen, Sparkles
} from 'lucide-react';
import { fetchFileTree, fetchFile, FileTreeNode } from '@/services/workspaceService';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { useTheme } from '@/hooks/use-theme';

import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sql } from '@codemirror/lang-sql';

interface LabSubmissionViewerProps {
    userId: string;
    evaluationId: string;
    lab?: any;
    labId?: string;
    labSub?: any;
    diffPatch?: string;
    minutesSolved?: number;
    candidate?: any;
    onClose?: () => void;
}

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

const FileTreeItem = ({ node, onSelect, selectedPath }: { 
    node: FileTreeNode; 
    onSelect: (path: string) => void;
    selectedPath: string | null;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const fullPath = node.path;

    if (node.type === 'directory') {
        return (
            <div>
                <div 
                    className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent text-foreground text-sm select-none"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <Folder className="w-3.5 h-3.5 text-blue-500" />
                    <span>{node.name}</span>
                </div>
                {isOpen && node.children && (
                    <div className="pl-4">
                        {node.children.map((child, i) => (
                            <FileTreeItem 
                                key={i} 
                                node={child} 
                                onSelect={onSelect} 
                                selectedPath={selectedPath}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            className={`flex items-center gap-2 px-2 py-1 ml-4 cursor-pointer text-sm select-none
                ${selectedPath === fullPath ? 'bg-primary/20 text-primary' : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSelect(fullPath)}
        >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{node.name}</span>
        </div>
    );
};

export const LabSubmissionViewer: React.FC<LabSubmissionViewerProps> = ({
    userId, evaluationId, lab, labId, labSub, diffPatch, minutesSolved, candidate, onClose
}) => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<'explorer' | 'source_control' | 'summary'>('explorer');
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    
    const { submittedFiles, fileDiffs, splitDiffs } = useMemo(() => {
        let patchStr = diffPatch || labSub?.solution;
        if (!patchStr) return { submittedFiles: {}, fileDiffs: {}, splitDiffs: {} };
        
        if (typeof patchStr === 'object') {
            patchStr = JSON.stringify(patchStr);
        }
        
        try {
            if (typeof patchStr === 'string' && patchStr.trim().startsWith('{')) {
                const parsed = JSON.parse(patchStr) as Record<string, string>;
                const d: Record<string, any[]> = {};
                const sd: Record<string, any[]> = {};
                for (const k of Object.keys(parsed)) {
                    d[k] = [{ type: 'add', text: parsed[k] }];
                    sd[k] = [{ left: null, right: d[k][0] }];
                }
                return { submittedFiles: parsed, fileDiffs: d, splitDiffs: sd };
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
    }, [labSub, diffPatch]);

    const changedFilesList = Object.keys(submittedFiles);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [diffViewMode, setDiffViewMode] = useState<'unified' | 'split'>('unified');
    
    const [fileTree, setFileTree] = useState<FileTreeNode | null>(null);
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [treeError, setTreeError] = useState<string | null>(null);

    // Build a virtual file tree from submitted files as fallback
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



    useEffect(() => {
        if (activeTab === 'explorer' && !fileTree && !isLoadingTree && !treeError) {
            const targetLabId = lab?.id || labId;
            if (!targetLabId) {
                setTreeError("No lab ID provided.");
                return;
            }
            setIsLoadingTree(true);
            const labType = lab?.domain?.toLowerCase() === 'database' ? 'sqlite' : 'other';
            fetchFileTree(userId, targetLabId, "eval", undefined, labType, evaluationId)
                .then(res => {
                    if (!res.tree || (res.tree.children && res.tree.children.length === 0)) {
                        if (virtualTree) {
                            setFileTree(virtualTree);
                        } else {
                            setTreeError("Workspace inactive or empty.");
                        }
                    } else {
                        setFileTree(res.tree);
                    }
                })
                .catch(err => {
                    if (virtualTree) {
                        setFileTree(virtualTree);
                    } else {
                        setTreeError(err.message);
                    }
                })
                .finally(() => setIsLoadingTree(false));
        }
    }, [activeTab, fileTree, isLoadingTree, treeError, userId, lab, labId, evaluationId, virtualTree]);

    const handleSelectFile = async (path: string) => {
        setSelectedFilePath(path);
        
        if (submittedFiles[path] !== undefined) {
            setFileContent(submittedFiles[path]);
            return;
        }

        setIsLoadingFile(true);
        const targetLabId = lab?.id || labId;
        if (!targetLabId) {
            setFileContent("Error: No lab ID.");
            setIsLoadingFile(false);
            return;
        }
        try {
            const content = await fetchFile(userId, targetLabId, "eval", path, evaluationId);
            setFileContent(content);
        } catch (e: any) {
            setFileContent(`Error loading file: ${e.message}`);
        } finally {
            setIsLoadingFile(false);
        }
    };

    let timeTakenFormatted = "0m 0s";
    if (typeof labSub?.time_taken === "string" && labSub.time_taken.trim()) {
        timeTakenFormatted = labSub.time_taken.trim();
    } else {
        let totalSecs = 0;
        const start = labSub?.started_at ? new Date(labSub.started_at).getTime() : (labSub?.created_at ? new Date(labSub.created_at).getTime() : 0);
        const end = labSub?.submitted_at ? new Date(labSub.submitted_at).getTime() : (labSub?.updated_at ? new Date(labSub.updated_at).getTime() : 0);
        if (start > 0 && end > 0 && end > start) {
            totalSecs = Math.round((end - start) / 1000);
        } else if (minutesSolved != null && minutesSolved > 0) {
            totalSecs = Number(minutesSolved) * 60;
        } else if (labSub?.minutes_solved != null && Number(labSub.minutes_solved) > 0) {
            totalSecs = Number(labSub.minutes_solved) * 60;
        }
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        timeTakenFormatted = `${mins}m ${secs}s`;
    }
    const score = labSub?.score ?? 0;

    const eciColor = (v: number) => v >= 70 ? "text-emerald-500" : v >= 55 ? "text-amber-500" : "text-red-500";

    return (
        <div className="flex h-full w-full bg-background font-sans overflow-hidden">
            <div className="flex w-12 flex-col items-center gap-2 border-r bg-editor-panel py-4 text-muted-foreground">
                <button 
                    onClick={() => {
                        if (activeTab === 'explorer' && !leftCollapsed) setLeftCollapsed(true);
                        else { setActiveTab('explorer'); setLeftCollapsed(false); }
                    }}
                    className={`grid h-10 w-10 place-items-center rounded-md ${activeTab === 'explorer' && !leftCollapsed ? 'bg-accent text-foreground border-l-2 border-primary' : 'hover:text-foreground hover:bg-accent'}`}
                    title="Explorer"
                >
                    <Folder className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => {
                        if (activeTab === 'source_control' && !leftCollapsed) setLeftCollapsed(true);
                        else { setActiveTab('source_control'); setLeftCollapsed(false); }
                    }}
                    className={`grid h-10 w-10 place-items-center rounded-md ${activeTab === 'source_control' && !leftCollapsed ? 'bg-accent text-foreground border-l-2 border-primary' : 'hover:text-foreground hover:bg-accent'}`}
                    title="Source Control"
                >
                    <GitBranch className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => {
                        if (activeTab === 'summary' && !leftCollapsed) setLeftCollapsed(true);
                        else { setActiveTab('summary'); setLeftCollapsed(false); }
                    }}
                    className={`grid h-10 w-10 place-items-center rounded-md ${activeTab === 'summary' && !leftCollapsed ? 'bg-accent text-foreground border-l-2 border-primary' : 'hover:text-foreground hover:bg-accent'}`}
                    title="Summary"
                >
                    <BookOpen className="w-5 h-5" />
                </button>
            </div>

            {!leftCollapsed && (
                <div className="flex w-72 flex-col border-r bg-editor-panel shrink-0">
                    <div className="px-4 py-3 text-xs font-semibold text-muted-foreground tracking-wider uppercase border-b">
                        {activeTab === 'explorer' ? 'Explorer' : activeTab === 'source_control' ? 'Source Control' : 'Lab Summary'}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        {activeTab === 'explorer' && (
                            <div className="py-2">
                                {isLoadingTree ? (
                                    <div className="px-4 py-2 text-sm text-muted-foreground">Loading workspace...</div>
                                ) : treeError ? (
                                    <div className="px-4 py-2 text-sm text-destructive">Workspace inactive or unavailable.</div>
                                ) : fileTree ? (
                                    fileTree.type === 'directory' && fileTree.children ? (
                                        fileTree.children.map((child, idx) => (
                                            <FileTreeItem 
                                                key={idx}
                                                node={child} 
                                                onSelect={handleSelectFile}
                                                selectedPath={selectedFilePath}
                                            />
                                        ))
                                    ) : (
                                        <FileTreeItem 
                                            node={fileTree} 
                                            onSelect={handleSelectFile}
                                            selectedPath={selectedFilePath}
                                        />
                                    )
                                ) : null}
                            </div>
                        )}

                        {activeTab === 'source_control' && (
                            <div className="py-2">
                                {changedFilesList.length === 0 ? (
                                    <div className="px-4 py-2 text-sm text-muted-foreground italic">No files changed.</div>
                                ) : (
                                    changedFilesList.map((filename, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => handleSelectFile(filename)}
                                            className={`px-4 py-2 cursor-pointer flex items-center justify-between text-sm
                                                ${selectedFilePath === filename ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                        >
                                            <span className="truncate pr-2" title={filename}>{filename.split('/').pop()}</span>
                                            <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
                                                <span className="text-emerald-500">M</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'summary' && (
                            <div className="p-4 space-y-6">
                                <div>
                                    <div className="text-sm font-medium text-foreground">{lab?.title || 'Engineering Lab'}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{lab?.domain || 'Backend'} · Engineering lab</div>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problem Statement</div>
                                    <p className="text-sm text-foreground leading-relaxed">{lab?.problemStatement || 'No problem statement available.'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-card p-3">
                                        <div className="text-[10px] uppercase text-muted-foreground">Time taken</div>
                                        <div className="text-lg font-medium text-foreground">{timeTakenFormatted}</div>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <div className="text-[10px] uppercase text-muted-foreground">Files changed</div>
                                        <div className="text-lg font-medium text-foreground">{changedFilesList.length}</div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                                    <div className="text-[10px] uppercase tracking-widest text-primary">
                                        Final lab score
                                    </div>
                                    <div className={`mt-1 text-3xl font-medium ${eciColor(score)}`}>
                                        {score}
                                        <span className="text-sm text-muted-foreground">/100</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> AI Review
                                    </div>
                                    <div className="rounded-lg border bg-card p-3 space-y-3">
                                        <div>
                                            <div className="text-xs font-medium text-emerald-500">Strengths</div>
                                            <ul className="mt-1 text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                                <li>Good problem solving</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-amber-500">Suggestions</div>
                                            <ul className="mt-1 text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                                <li>Consider adding more unit tests</li>
                                                <li>Could improve edge cases</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 bg-editor-bg">
                <div className="flex items-center justify-between border-b px-4 py-2 bg-editor-panel">
                    <div className="text-sm text-foreground font-mono truncate">
                        {selectedFilePath || 'No file selected'}
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === 'source_control' && selectedFilePath && (
                            <div className="flex gap-1 text-xs">
                                <button
                                    onClick={() => setDiffViewMode("unified")}
                                    className={`px-2 py-0.5 rounded transition-colors ${diffViewMode === "unified" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"}`}
                                >
                                    Unified
                                </button>
                                <button
                                    onClick={() => setDiffViewMode("split")}
                                    className={`px-2 py-0.5 rounded transition-colors ${diffViewMode === "split" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"}`}
                                >
                                    Split
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90">
                            Close Lab View
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto bg-editor-bg relative">
                    {!selectedFilePath ? (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Select a file to view its contents</p>
                            </div>
                        </div>
                    ) : isLoadingFile ? (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <div className="absolute inset-0">
                            {activeTab === 'source_control' && fileDiffs[selectedFilePath] ? (
                                <div className="h-full overflow-auto bg-editor-bg pb-10">
                                    {diffViewMode === "unified" ? (
                                        <table className="w-full text-[13px] font-mono leading-relaxed">
                                            <tbody>
                                                {fileDiffs[selectedFilePath].map((d, i) => (
                                                    <tr key={i} className={`${d.type === "add" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : d.type === "del" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                                        <td className="px-3 py-0.5 w-4 select-none opacity-50 border-r border-border/50 text-right">
                                                            {d.type === "add" ? "+" : d.type === "del" ? "-" : " "}
                                                        </td>
                                                        <td className="px-4 py-0.5 whitespace-pre break-all">{d.text}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="table w-full text-[13px] font-mono leading-relaxed pb-10">
                                            {splitDiffs[selectedFilePath].map((row, i) => (
                                                <div key={i} className="table-row">
                                                    <div className={`table-cell w-1/2 border-r border-border/50 align-top ${row.left?.type === "del" ? "bg-red-500/10 text-red-600 dark:text-red-400" : row.left ? "text-foreground bg-editor-bg" : "bg-transparent"}`}>
                                                        <div className="px-4 py-0.5 whitespace-pre-wrap break-all min-h-[22px]">{row.left?.text ?? " "}</div>
                                                    </div>
                                                    <div className={`table-cell w-1/2 align-top ${row.right?.type === "add" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : row.right ? "text-foreground bg-editor-bg" : "bg-transparent"}`}>
                                                        <div className="px-4 py-0.5 whitespace-pre-wrap break-all min-h-[22px]">{row.right?.text ?? " "}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <CodeMirror
                                    value={fileContent}
                                    height="100%"
                                    extensions={[getLanguageExtension(selectedFilePath)]}
                                    theme={theme === "dark" ? vscodeDark : vscodeLight}
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
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
