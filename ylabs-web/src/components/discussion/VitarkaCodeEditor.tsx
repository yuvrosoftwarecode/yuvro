import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { sql } from "@codemirror/lang-sql";
import {
  Play,
  Loader2,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import codeExecutorService, { ExecutionResult } from "../../services/codeExecutorService";

import type { Extension } from "@codemirror/state";

export type EditorDisplayMode = "normal" | "minimized" | "maximized";

interface VitarkaCodeEditorProps {
  code: string;
  onChange: (val: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  displayMode: EditorDisplayMode;
  onDisplayModeChange: (mode: EditorDisplayMode) => void;
}

const LANGUAGE_CONFIGS: Record<
  string,
  { label: string; extLang: string; getExt: () => Extension; defaultCode: string }
> = {
  javascript: {
    label: "JavaScript",
    extLang: "javascript",
    getExt: () => javascript({ jsx: true, typescript: false }),
    defaultCode: `// Write your JavaScript solution here\nfunction solution() {\n  \n}\n`,
  },
  typescript: {
    label: "TypeScript",
    extLang: "typescript",
    getExt: () => javascript({ jsx: true, typescript: true }),
    defaultCode: `// Write your TypeScript solution here\nfunction solution(): void {\n  \n}\n`,
  },
  python: {
    label: "Python",
    extLang: "python",
    getExt: () => python(),
    defaultCode: `# Write your Python solution here\ndef solution():\n    pass\n`,
  },
  java: {
    label: "Java",
    extLang: "java",
    getExt: () => java(),
    defaultCode: `// Write your Java solution here\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`,
  },
  cpp: {
    label: "C++",
    extLang: "cpp",
    getExt: () => cpp(),
    defaultCode: `// Write your C++ solution here\n#include <iostream>\n\nint main() {\n    return 0;\n}\n`,
  },
  sql: {
    label: "SQL",
    extLang: "sql",
    getExt: () => sql(),
    defaultCode: `-- Write your SQL query here\nSELECT * FROM table_name;\n`,
  },
};

export const VitarkaCodeEditor: React.FC<VitarkaCodeEditorProps> = ({
  code,
  onChange,
  language,
  onLanguageChange,
  displayMode,
  onDisplayModeChange,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "output">("editor");

  const currentLangConfig = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.python;

  const handleRunCode = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setExecutionOutput(null);
    setExecutionError(null);
    setActiveTab("output");

    try {
      const res: ExecutionResult = await codeExecutorService.executeCode({
        code: code,
        language: currentLangConfig.extLang,
        test_cases: [],
        test_cases_custom: [],
      });

      if (res.status === "completed") {
        setExecutionOutput(res.output || "(Code executed successfully with no output)");
      } else if (res.status === "timeout") {
        setExecutionError("Time Limit Exceeded");
      } else {
        setExecutionError(res.reason || res.error_message || res.output || "Execution failed");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Execution error: failed to communicate with code executor";
      setExecutionError(msg);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Minimized state pill dock
  if (displayMode === "minimized") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-700 bg-[#121316] px-4 py-2.5 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
          <span className="text-[13px] font-medium text-neutral-200">
            Coding Editor Active ({currentLangConfig.label})
          </span>
          {code.trim() && (
            <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[11px] text-neutral-400">
              Code entered
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDisplayModeChange("normal")}
            className="flex items-center gap-1.5 rounded-md bg-neutral-800 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-neutral-700"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            Expand Editor
          </button>
          <button
            onClick={() => onDisplayModeChange("maximized")}
            title="Maximize Editor"
            className="rounded-md bg-neutral-800 p-1.5 text-neutral-400 hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#0e1015] shadow-xl transition-all duration-200 ${
        displayMode === "maximized" ? "fixed inset-4 z-50 rounded-2xl" : "h-[520px] w-full"
      }`}
    >
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-[#14161d] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-[13px] font-semibold tracking-wide">Live Code Editor</span>
          </div>

          <div className="h-4 w-px bg-neutral-800" />

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              onLanguageChange(newLang);
              if (!code.trim() || code === currentLangConfig.defaultCode) {
                onChange(LANGUAGE_CONFIGS[newLang]?.defaultCode || "");
              }
            }}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[12px] font-medium text-neutral-200 outline-none transition focus:border-neutral-500"
          >
            {Object.entries(LANGUAGE_CONFIGS).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          {/* Editor / Output View Selector */}
          <div className="flex items-center rounded-lg bg-neutral-900/80 p-0.5 border border-neutral-800">
            <button
              onClick={() => setActiveTab("editor")}
              className={`rounded-md px-2.5 py-0.5 text-[12px] font-medium transition ${
                activeTab === "editor"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[12px] font-medium transition ${
                activeTab === "output"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Terminal className="h-3 w-3" />
              Output
              {(executionOutput || executionError) && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${executionError ? "bg-red-400" : "bg-emerald-400"}`}
                />
              )}
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy Code"
            className="rounded-md bg-neutral-900 px-2.5 py-1 text-[12px] font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunning || !code.trim()}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-[12px] font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Run
              </>
            )}
          </button>

          <div className="h-4 w-px bg-neutral-800" />

          {/* Minimize Button */}
          <button
            onClick={() => onDisplayModeChange("minimized")}
            title="Minimize Editor"
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Maximize / Restore Button */}
          <button
            onClick={() =>
              onDisplayModeChange(displayMode === "maximized" ? "normal" : "maximized")
            }
            title={displayMode === "maximized" ? "Restore View" : "Maximize Editor"}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            {displayMode === "maximized" ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 overflow-hidden bg-[#0c0d12]">
        {activeTab === "editor" ? (
          <div className="h-full w-full overflow-auto">
            <CodeMirror
              value={code}
              height="100%"
              theme={vscodeDark}
              extensions={[currentLangConfig.getExt()]}
              onChange={(value) => onChange(value)}
              className="h-full text-[13px] font-mono leading-relaxed"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                defaultKeymap: true,
                searchKeymap: true,
                historyKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true,
              }}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-y-auto p-4 font-mono text-[13px]">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>Terminal Execution Output</span>
              {executionError ? (
                <span className="text-red-400">Execution Error</span>
              ) : executionOutput ? (
                <span className="text-emerald-400">Execution Success</span>
              ) : null}
            </div>

            {isRunning ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-neutral-400">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                <span>Running code via Code Executor...</span>
              </div>
            ) : executionError ? (
              <pre className="whitespace-pre-wrap rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-red-300">
                {executionError}
              </pre>
            ) : executionOutput ? (
              <pre className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-neutral-200">
                {executionOutput}
              </pre>
            ) : (
              <div className="flex flex-1 items-center justify-center text-neutral-500">
                Click "Run" to test your solution using the Code Executor.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
