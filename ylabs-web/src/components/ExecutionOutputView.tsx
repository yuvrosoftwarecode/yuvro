import React, { useState } from 'react';
import { Terminal as TerminalIcon, Clock, Zap, Trash2, Copy, Check } from 'lucide-react';

interface ExecutionOutputViewProps {
  output: string;
  executionMetrics?: any;
  testResults?: any;
  executionOutput?: string;
  durationMs?: number;
  onClear?: () => void;
}

export const ExecutionOutputView: React.FC<ExecutionOutputViewProps> = ({ 
  output, 
  executionMetrics, 
  executionOutput,
  durationMs,
  onClear 
}) => {
  const [copied, setCopied] = useState(false);
  const [localCleared, setLocalCleared] = useState(false);

  const rawText = (executionOutput || output || '').trim();
  const displayText = localCleared ? '' : rawText;

  const handleCopy = () => {
    if (!displayText) return;
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setLocalCleared(true);
    if (onClear) onClear();
  };

  // When new output comes in, reset cleared state
  React.useEffect(() => {
    if (rawText) {
      setLocalCleared(false);
    }
  }, [rawText]);

  // Colorize lines in console output
  const renderLogLines = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const lower = line.toLowerCase();
      let colorClass = 'text-foreground/90';
      if (lower.includes('error') || lower.includes('traceback') || lower.includes('exception') || lower.includes('failed') || lower.includes('fatal')) {
        colorClass = 'text-destructive font-medium';
      } else if (lower.includes('warning') || lower.includes('warn')) {
        colorClass = 'text-amber-400';
      } else if (lower.includes('success') || lower.includes('passed') || lower.includes('ok')) {
        colorClass = 'text-success font-medium';
      } else if (line.startsWith('$') || line.startsWith('>') || line.startsWith('>>>')) {
        colorClass = 'text-primary font-semibold';
      }

      return (
        <div key={idx} className={`leading-relaxed whitespace-pre-wrap ${colorClass}`}>
          {line || ' '}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full space-y-2.5 font-sans">
      {/* Console Toolbar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-sans">
            Console Output
          </span>
          {(executionMetrics || durationMs !== undefined) && (
            <div className="flex items-center gap-2.5 ml-2 font-mono text-[11px] text-muted-foreground">
              {executionMetrics?.execution_time !== undefined ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {executionMetrics.execution_time.toFixed(3)}s
                </span>
              ) : durationMs !== undefined && durationMs > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {(durationMs / 1000).toFixed(2)}s
                </span>
              ) : null}
              {executionMetrics?.memory_usage !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {executionMetrics.memory_usage.toFixed(2)}MB
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {displayText && (
            <>
              <button
                onClick={handleCopy}
                title="Copy Console Output"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleClear}
                title="Clear Console"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span className="text-[11px]">Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Terminal Output Display */}
      <div className="flex-1 min-h-[140px] rounded-lg border border-border/80 bg-editor-bg/90 p-3 font-mono text-xs overflow-auto select-text shadow-inner">
        {displayText ? (
          renderLogLines(displayText)
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/70 py-6">
            <TerminalIcon className="w-6 h-6 mb-2 opacity-30" />
            <p className="text-xs">Console is empty</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              Standard output and print statements will appear here when you run code.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
