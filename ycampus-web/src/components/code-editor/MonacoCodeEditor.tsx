import MonacoEditor, { loader } from '@monaco-editor/react';
import { Sparkles, Maximize2, Minimize2, X } from 'lucide-react';

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
}

loader.init().then(monaco => {
  monaco.editor.defineTheme('custom-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editorLineNumber.background': '#f3f4f6', // Tailwind gray-100
      'editorGutter.background': '#f3f4f6',
    },
  });
});

const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
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
  isFullscreen = false
}) => {

  return (
    <div className="relative rounded-lg overflow-hidden bg-white" style={{ height }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 relative z-10">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-800 font-medium">Select Language</span>
          {onLanguageChange && (
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="text-xs bg-gray-200 text-gray-800 border border-gray-300 rounded px-2 py-1"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          )}
          {onShowExamples && (
            <button
              onClick={onShowExamples}
              className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition-colors font-medium ml-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Examples
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            Lines: {value.split('\n').length}
          </span>
          <span className="text-xs text-gray-500">
            Chars: {value.length}
          </span>
          {(onToggleAiChat || onToggleFullscreen) && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
              {onToggleAiChat && (
                <button
                  onClick={onToggleAiChat}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors font-medium ${isAiChatOpen
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200'
                      : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  title={isAiChatOpen ? "Close AI Buddy" : "Open AI Buddy"}
                >
                  {isAiChatOpen ? <X className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                  {isAiChatOpen ? 'Close AI' : 'AI Buddy'}
                </button>
              )}
              {onToggleFullscreen && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFullscreen();
                  }}
                  className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors relative z-20 cursor-pointer"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <MonacoEditor
        height={`calc(${height} - 48px)`}
        language={language}
        value={value}
        onChange={(val: string | undefined) => onChange(val ?? '')}
        theme="custom-light"
        options={{
          readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
        }}
      />
    </div>
  );
};

export default MonacoCodeEditor;