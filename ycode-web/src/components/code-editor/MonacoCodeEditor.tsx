import React from 'react';
import MonacoEditor, { DiffEditor, loader } from '@monaco-editor/react';
import { Sparkles, Maximize2, Minimize2, X, BookOpen, Terminal as TerminalIcon, ChevronDown } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface MonacoCodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    language: string;
    onLanguageChange?: (language: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    height?: string;
    onShowExamples?: () => void;
    onToggleAiChat?: () => void;
    onToggleFullscreen?: () => void;
    isAiChatOpen?: boolean;
    isFullscreen?: boolean;
    theme?: string;
    /** Set to 'diff' to show a side-by-side diff view */
    mode?: 'editor' | 'diff';
    /** Original code for diff mode (left side) */
    original?: string;
    disableCopyPaste?: boolean;
}

loader.init().then(monaco => {
    monaco.editor.defineTheme('custom-light', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
            'editorLineNumber.background': '#f8fafc', // slate-50
            'editorGutter.background': '#f8fafc',
            'editor.background': '#ffffff',
        },
    });
});

const MonacoCodeEditor = React.forwardRef<any, MonacoCodeEditorProps>(({
    value,
    onChange,
    language,
    onLanguageChange,
    placeholder = "Write your code here...",
    readOnly = false,
    height = "400px",
    onShowExamples,
    onToggleAiChat,
    onToggleFullscreen,
    isAiChatOpen = false,
    isFullscreen = false,
    theme = "custom-light",
    mode = 'editor',
    original = '',
    disableCopyPaste = false,
}, ref) => {

    const handleEditorDidMount = (editor: any, monaco: any) => {
        if (disableCopyPaste) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
                // Copy disabled
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
                // Paste disabled
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
                // Cut disabled
            });
        }
    };

    return (
        <div className="relative overflow-hidden bg-white flex flex-col font-sans" style={{ height }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-10 bg-slate-50 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-saffron-600 flex items-center justify-center shadow-sm shadow-saffron-100">
                            <TerminalIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 tracking-wide">Environment</span>
                    </div>

                    {onLanguageChange && (
                        <Select value={language} onValueChange={onLanguageChange}>
                            <SelectTrigger className="h-7 w-[130px] bg-white border-gray-200 rounded-lg text-xs font-bold hover:border-gray-300 focus:ring-2 focus:ring-saffron-100 transition-all px-3">
                                <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-gray-100 shadow-2xl bg-white z-[11000]">
                                <SelectItem value="python" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Python 3</SelectItem>
                                <SelectItem value="javascript" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">JavaScript</SelectItem>
                                <SelectItem value="java" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Java</SelectItem>
                                <SelectItem value="cpp" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">C++</SelectItem>
                                <SelectItem value="c" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">C</SelectItem>
                                <SelectItem value="csharp" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">C#</SelectItem>
                                <SelectItem value="go" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Go</SelectItem>
                                <SelectItem value="ruby" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Ruby</SelectItem>
                                <SelectItem value="swift" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Swift</SelectItem>
                                <SelectItem value="typescript" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">TypeScript</SelectItem>
                                <SelectItem value="kotlin" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Kotlin</SelectItem>
                                <SelectItem value="php" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">PHP</SelectItem>
                                <SelectItem value="rust" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Rust</SelectItem>
                                <SelectItem value="sql" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">SQL</SelectItem>
                                <SelectItem value="shell" className="text-xs font-bold py-2.5 rounded-lg focus:bg-saffron-50 focus:text-saffron-700">Shell</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    {onShowExamples && (
                        <button
                            onClick={onShowExamples}
                            className="h-7 flex items-center gap-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 px-3 rounded-lg transition-all active:scale-95 tracking-wide shrink-0"
                        >
                            <BookOpen className="w-3 h-3 shrink-0" />
                            Examples
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {(onToggleAiChat || onToggleFullscreen) && (
                        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                            {onToggleAiChat && (
                                <button
                                    onClick={onToggleAiChat}
                                    className={`flex items-center gap-1.5 text-[10px] h-7 px-3 rounded-lg transition-all font-bold tracking-wide active:scale-95 whitespace-nowrap ${isAiChatOpen
                                        ? 'bg-saffron-600 text-white border border-saffron-600'
                                        : 'bg-white text-saffron-600 hover:bg-saffron-50 border border-saffron-100'
                                        }`}
                                    title={isAiChatOpen ? "Close AI Buddy" : "Open AI Buddy"}
                                >
                                    {isAiChatOpen ? <X className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                    <span className="hidden md:inline">{isAiChatOpen ? 'Hide Assistant' : 'AI Assistant'}</span>
                                </button>
                            )}
                            {onToggleFullscreen && (
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFullscreen(); }}
                                    className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all"
                                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                >
                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 min-h-0 bg-white">
                {mode === 'diff' ? (
                    <DiffEditor
                        height="100%"
                        language={language}
                        original={original}
                        modified={value}
                        theme={theme}
                        options={{
                            readOnly: true,
                            fontSize: 14,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            lineNumbers: 'on',
                            lineNumbersMinChars: 3,
                            lineDecorationsWidth: 0,
                            padding: { top: 8, bottom: 16 },
                            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                            fontLigatures: true,
                            renderSideBySide: true,
                        }}
                    />
                ) : (
                    <MonacoEditor
                        height="100%"
                        language={language}
                        value={value}
                        onChange={(val: string | undefined) => onChange(val ?? '')}
                        theme={theme}
                        onMount={handleEditorDidMount}
                        options={{
                            readOnly,
                            fontSize: 14,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            lineNumbers: 'on',
                            lineNumbersMinChars: 3,
                            lineDecorationsWidth: 0,
                            padding: { top: 8, bottom: 16 },
                            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                            fontLigatures: true,
                            contextmenu: !disableCopyPaste,
                        }}
                    />
                )}
            </div>
        </div>
    );
});

export default MonacoCodeEditor;
