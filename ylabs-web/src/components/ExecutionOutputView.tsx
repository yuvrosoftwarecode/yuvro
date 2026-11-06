import React from 'react';
import { Terminal as TerminalIcon, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';

export const ExecutionOutputView = ({ 
  output, 
  executionMetrics, 
  testResults, 
  executionOutput 
}: { 
  output: string;
  executionMetrics: any;
  testResults: any;
  executionOutput: string;
}) => {
  if (!output && !testResults && !executionOutput) {
    return <div className="text-muted-foreground">Click <span className="text-foreground font-medium">Run</span> to execute your code.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Metrics Header */}
      {executionMetrics && (
        <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground bg-muted/30 p-2 rounded-md border border-border">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{executionMetrics.execution_time?.toFixed(3) || '0.000'}s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>{executionMetrics.memory_usage?.toFixed(2) || '0.00'}MB</span>
          </div>
          {executionMetrics.status === 'timeout' && (
            <div className="text-destructive font-semibold flex items-center gap-1 ml-auto">
              <Clock className="w-3.5 h-3.5" /> Time Limit Exceeded
            </div>
          )}
        </div>
      )}

      {/* Structured Test Results */}
      {testResults && testResults.results && testResults.results.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider mb-2">Test Cases</h4>
          {testResults.results.map((tr: any, idx: number) => {
            const isHidden = Boolean(tr.is_hidden);
            return (
              <div key={idx} className={`rounded-md border p-2.5 font-mono text-xs ${tr.passed ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {tr.passed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  <span className={`font-semibold ${tr.passed ? 'text-success' : 'text-destructive'}`}>
                    Test Case #{tr.test_case_id !== undefined ? tr.test_case_id + 1 : idx + 1} {isHidden ? "(Hidden) " : ""}{tr.passed ? 'Passed' : 'Failed'}
                  </span>
                  <span className="text-muted-foreground ml-auto text-[10px]">{tr.execution_time?.toFixed(3)}s</span>
                </div>
                
                {!tr.passed && !isHidden && (
                  <div className="space-y-1.5 mt-2 text-[11px]">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-muted-foreground font-semibold">Input:</span>
                      <span className="text-foreground truncate">{tr.input}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-muted-foreground font-semibold">Expected:</span>
                      <span className="text-success truncate">{tr.expected_output}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-muted-foreground font-semibold">Output:</span>
                      <span className="text-destructive truncate">{tr.actual_output || '(no output)'}</span>
                    </div>
                    {tr.error && (
                      <div className="mt-2 text-destructive font-semibold text-[11px]">
                        Error: {tr.error}
                      </div>
                    )}
                  </div>
                )}
                {!tr.passed && isHidden && (
                  <div className="mt-1 text-muted-foreground italic text-[11px]">
                    Hidden test case — inputs and outputs are hidden.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Console Output */}
      {(executionOutput || output) && (
        <div className="space-y-2">
          <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TerminalIcon className="w-3.5 h-3.5" /> Console Output
          </h4>
          <pre className="font-mono text-[11px] p-3 rounded-md bg-zinc-950 text-zinc-300 whitespace-pre-wrap overflow-x-auto border border-zinc-800">
            {executionOutput || output}
          </pre>
        </div>
      )}
    </div>
  );
};
