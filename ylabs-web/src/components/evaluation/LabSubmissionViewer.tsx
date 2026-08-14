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
    lab: any;
    labSub: any;
    candidate: any;
    onClose: () => void;
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
    userId, evaluationId, lab, labSub, candidate, onClose
}) => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<'explorer' | 'source_control' | 'summary'>('explorer');
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    
    const submittedFiles = useMemo(() => {
        if (!labSub?.solution) return {};
        try {
            return JSON.parse(labSub.solution) as Record<string, string>;
        } catch {
            return {};
        }
    }, [labSub]);

    const changedFilesList = Object.keys(submittedFiles).filter(k => submittedFiles[k]);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    
    const [fileTree, setFileTree] = useState<FileTreeNode | null>(null);
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [treeError, setTreeError] = useState<string | null>(null);

    // Build a virtual file tree from submitted files
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
            if (virtualTree) {
                setFileTree(virtualTree);
                return;
            }
            
            setIsLoadingTree(true);
            fetchFileTree(userId, lab.id, "eval", undefined, "EVALUATION", evaluationId)
                .then(res => setFileTree(res.tree))
                .catch(err => setTreeError(err.message))
                .finally(() => setIsLoadingTree(false));
        }
    }, [activeTab, fileTree, isLoadingTree, treeError, userId, lab.id, evaluationId, virtualTree]);

    const handleSelectFile = async (path: string) => {
        setSelectedFilePath(path);
        
        if (submittedFiles[path] !== undefined) {
            setFileContent(submittedFiles[path]);
            return;
        }

        setIsLoadingFile(true);
        try {
            const content = await fetchFile(userId, lab.id, "eval", path, evaluationId);
            setFileContent(content);
        } catch (e: any) {
            setFileContent(`Error loading file: ${e.message}`);
        } finally {
            setIsLoadingFile(false);
        }
    };

    const timeTaken = labSub?.minutes_solved ?? 0;
    const score = labSub?.score ?? 0;

    const eciColor = (v: number) => v >= 70 ? "text-emerald-500" : v >= 55 ? "text-amber-500" : "text-red-500";

    return (
        <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
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
                                    <FileTreeItem 
                                        node={fileTree} 
                                        onSelect={handleSelectFile}
                                        selectedPath={selectedFilePath}
                                    />
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
                                    <div className="text-sm font-medium text-foreground">{lab.title}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{lab.domain} · Engineering lab</div>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problem Statement</div>
                                    <p className="text-sm text-foreground leading-relaxed">{lab.problemStatement}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-card p-3">
                                        <div className="text-[10px] uppercase text-muted-foreground">Time taken</div>
                                        <div className="text-lg font-medium text-foreground">{timeTaken}m</div>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
