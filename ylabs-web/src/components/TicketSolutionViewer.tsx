import React, { useMemo, useState } from 'react';
import { parseSolutionPatch, buildVirtualTree } from '@/lib/solutionParser';
import { FileTreeItem } from '@/components/evaluation/FileTreeItem';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { useTheme } from '@/hooks/use-theme';
import { FileCode2, GitCompare, Code2 } from 'lucide-react';

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

export const TicketSolutionViewer = ({ solution }: { solution: any }) => {
    const { theme } = useTheme();
    const [isDiffMode, setIsDiffMode] = useState(false);
    const [diffViewMode, setDiffViewMode] = useState<'unified' | 'split'>('unified');
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

    const { submittedFiles, fileDiffs, splitDiffs, virtualTree } = useMemo(() => {
        const { submittedFiles, fileDiffs, splitDiffs } = parseSolutionPatch(solution);
        const virtualTree = buildVirtualTree(submittedFiles);
        return { submittedFiles, fileDiffs, splitDiffs, virtualTree };
    }, [solution]);

    // Select the first file by default if available
    React.useEffect(() => {
        if (!selectedFilePath && virtualTree && Object.keys(submittedFiles).length > 0) {
            setSelectedFilePath(Object.keys(submittedFiles)[0]);
        }
    }, [virtualTree, submittedFiles, selectedFilePath]);

    const hasDiff = selectedFilePath ? !!fileDiffs[selectedFilePath] : false;

    return (
        <div className="flex flex-col h-[500px] border rounded-md overflow-hidden bg-card">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2 bg-editor-panel">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Code2 className="w-4 h-4 text-primary" />
                    <span>Your Solution</span>
                </div>
                <div className="flex items-center gap-3">
                    {isDiffMode && hasDiff && (
                        <div className="flex gap-1 text-xs bg-muted p-0.5 rounded-md">
                            <button
                                onClick={() => setDiffViewMode("unified")}
                                className={`px-2 py-1 rounded-sm transition-colors ${diffViewMode === "unified" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Unified
                            </button>
                            <button
                                onClick={() => setDiffViewMode("split")}
                                className={`px-2 py-1 rounded-sm transition-colors ${diffViewMode === "split" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Split
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setIsDiffMode(!isDiffMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                            ${isDiffMode ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-accent hover:bg-accent/80 text-foreground border border-border'}`}
                    >
                        <GitCompare className="w-3.5 h-3.5" />
                        {isDiffMode ? 'Diff Active' : 'Diff'}
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Explorer */}
                <div className="w-64 border-r bg-editor-panel flex flex-col shrink-0">
                    <div className="px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase border-b bg-muted/30">
                        Explorer
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                        {virtualTree ? (
                            virtualTree.type === 'directory' && virtualTree.children ? (
                                virtualTree.children.map((child, idx) => (
                                    <FileTreeItem 
                                        key={idx}
                                        node={child} 
                                        onSelect={setSelectedFilePath}
                                        selectedPath={selectedFilePath}
                                    />
                                ))
                            ) : (
                                <FileTreeItem 
                                    node={virtualTree} 
                                    onSelect={setSelectedFilePath}
                                    selectedPath={selectedFilePath}
                                />
                            )
                        ) : (
                            <div className="px-4 py-3 text-xs text-muted-foreground italic">
                                No files found in submission.
                            </div>
                        )}
                    </div>
                </div>

                {/* Editor/Viewer */}
                <div className="flex-1 flex flex-col min-w-0 bg-editor-bg relative">
                    <div className="flex items-center border-b px-4 py-2 bg-editor-panel h-[37px]">
                        <span className="text-xs text-muted-foreground font-mono">
                            {selectedFilePath || 'No file selected'} {isDiffMode && selectedFilePath && '— Changes'}
                        </span>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {!selectedFilePath ? (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Select a file from the explorer</p>
                                </div>
                            </div>
                        ) : isDiffMode && hasDiff ? (
                            <div className="h-full overflow-auto bg-editor-bg">
                                {diffViewMode === "unified" ? (
                                    <table className="w-full text-[13px] font-mono leading-relaxed">
                                        <tbody>
                                            {fileDiffs[selectedFilePath].map((d: any, i: number) => (
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
                                        {splitDiffs[selectedFilePath].map((row: any, i: number) => (
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
                                value={submittedFiles[selectedFilePath] || ""}
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
                </div>
            </div>
        </div>
    );
};
