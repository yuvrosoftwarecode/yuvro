import React, { useState, useMemo } from 'react';
import { Plus, Trash2, FlaskConical, Copy, Check } from 'lucide-react';

export interface CustomTestCase {
  id: string;
  input: string;
  expected_output: string;
}

interface CustomTestCaseManagerProps {
  customTestCases: CustomTestCase[];
  onTestCasesChange: (testCases: CustomTestCase[]) => void;
  ticketTasks?: any[];
}

export const CustomTestCaseManager: React.FC<CustomTestCaseManagerProps> = ({
  customTestCases,
  onTestCasesChange,
  ticketTasks = []
}) => {
  // Extract visible default test cases from ticket tasks
  const defaultCases = useMemo(() => {
    if (!Array.isArray(ticketTasks)) return [];
    return ticketTasks
      .filter((t: any) => {
        const title = typeof t === 'string' ? t : (t?.title ?? '');
        return !t?.is_hidden && !title.toLowerCase().includes('hidden') && !title.toLowerCase().includes('advanced');
      })
      .map((t: any, idx: number) => ({
        id: `default-${idx}`,
        isDefault: true,
        label: `Case ${idx + 1}`,
        input: typeof t === 'object' ? (t.input ?? '') : '',
        expected_output: typeof t === 'object' 
          ? (typeof t.expected_output === 'object' ? JSON.stringify(t.expected_output, null, 2) : (t.expected_output ?? ''))
          : '',
        description: typeof t === 'object' ? t.description : undefined
      }));
  }, [ticketTasks]);

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (defaultCases.length > 0) return defaultCases[0].id;
    if (customTestCases.length > 0) return customTestCases[0].id;
    return 'new';
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const addCustomCase = () => {
    const newId = `custom-${Date.now()}`;
    const newCase: CustomTestCase = {
      id: newId,
      input: '',
      expected_output: ''
    };
    onTestCasesChange([...customTestCases, newCase]);
    setActiveTabId(newId);
  };

  const removeCustomCase = (id: string) => {
    const updated = customTestCases.filter(tc => tc.id !== id);
    onTestCasesChange(updated);
    if (activeTabId === id) {
      if (defaultCases.length > 0) {
        setActiveTabId(defaultCases[0].id);
      } else if (updated.length > 0) {
        setActiveTabId(updated[0].id);
      } else {
        setActiveTabId('new');
      }
    }
  };

  const updateCustomCase = (id: string, updates: Partial<CustomTestCase>) => {
    onTestCasesChange(customTestCases.map(tc => tc.id === id ? { ...tc, ...updates } : tc));
  };

  // Resolve currently active test case
  const activeDefaultCase = defaultCases.find(c => c.id === activeTabId);
  const activeCustomCase = customTestCases.find(c => c.id === activeTabId);

  // If activeTabId is invalid, fallback
  const currentCase = activeDefaultCase || activeCustomCase || defaultCases[0] || customTestCases[0];

  return (
    <div className="flex flex-col h-full space-y-3 font-sans">
      {/* Test Cases Pill Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-2.5 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <FlaskConical className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Cases:
          </span>
        </div>

        {/* Default Cases Pills */}
        {defaultCases.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveTabId(c.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium whitespace-nowrap transition-all ${
              activeTabId === c.id
                ? 'bg-primary/15 text-primary border border-primary/30 shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-transparent'
            }`}
          >
            {c.label}
          </button>
        ))}

        {/* Custom Cases Pills */}
        {customTestCases.map((tc, idx) => (
          <div
            key={tc.id}
            className={`flex items-center rounded-md border text-xs font-mono transition-all ${
              activeTabId === tc.id
                ? 'bg-primary/15 text-primary border-primary/30 shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 border-border/50'
            }`}
          >
            <button
              onClick={() => setActiveTabId(tc.id)}
              className="px-2 py-1 font-medium whitespace-nowrap"
            >
              Custom {idx + 1}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCustomCase(tc.id);
              }}
              title="Delete case"
              className="px-1.5 py-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add Custom Case Button */}
        <button
          onClick={addCustomCase}
          title="Add Custom Test Case"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors ml-1"
        >
          <Plus className="w-3 h-3" />
          <span>Add Case</span>
        </button>
      </div>

      {/* Case Details */}
      {currentCase ? (
        <div className="space-y-3 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground">
                {'isDefault' in currentCase ? currentCase.label : `Custom Case`}
              </span>
              {'isDefault' in currentCase ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40 font-mono">
                  Default
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
                  Editable
                </span>
              )}
            </div>
            {!('isDefault' in currentCase) && (
              <button
                onClick={() => removeCustomCase(currentCase.id)}
                className="flex items-center gap-1 text-[11px] text-destructive hover:bg-destructive/10 px-2 py-0.5 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Input Block */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Input</span>
                {'isDefault' in currentCase && currentCase.input && (
                  <button
                    onClick={() => copyText(currentCase.input, `input-${currentCase.id}`)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-normal normal-case"
                  >
                    {copiedField === `input-${currentCase.id}` ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedField === `input-${currentCase.id}` ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              {'isDefault' in currentCase ? (
                <pre className="p-2.5 rounded-md border border-border bg-card/60 font-mono text-xs text-foreground whitespace-pre-wrap break-all min-h-[64px] max-h-40 overflow-auto">
                  {currentCase.input || '(No input required)'}
                </pre>
              ) : (
                <textarea
                  value={currentCase.input}
                  onChange={(e) => updateCustomCase(currentCase.id, { input: e.target.value })}
                  placeholder="Enter input (e.g. [2, 7, 11, 15] or target = 9)..."
                  rows={3}
                  className="w-full p-2.5 rounded-md border border-border bg-background font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-y"
                />
              )}
            </div>

            {/* Expected Output Block */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Expected Output</span>
                {'isDefault' in currentCase && currentCase.expected_output && (
                  <button
                    onClick={() => copyText(currentCase.expected_output, `output-${currentCase.id}`)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-normal normal-case"
                  >
                    {copiedField === `output-${currentCase.id}` ? (
                      <Check className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedField === `output-${currentCase.id}` ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              {'isDefault' in currentCase ? (
                <pre className="p-2.5 rounded-md border border-border bg-card/60 font-mono text-xs text-success whitespace-pre-wrap break-all min-h-[64px] max-h-40 overflow-auto">
                  {currentCase.expected_output || '(No expected output specified)'}
                </pre>
              ) : (
                <textarea
                  value={currentCase.expected_output}
                  onChange={(e) => updateCustomCase(currentCase.id, { expected_output: e.target.value })}
                  placeholder="Expected result (e.g. [0, 1])..."
                  rows={3}
                  className="w-full p-2.5 rounded-md border border-border bg-background font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-y"
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <FlaskConical className="w-8 h-8 opacity-40 mb-2" />
          <p className="text-xs font-medium">No test cases configured</p>
          <button
            onClick={addCustomCase}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Test Case
          </button>
        </div>
      )}
    </div>
  );
};
