import React, { useState } from 'react';
import { Plus, Trash2, FlaskConical, X } from 'lucide-react';

interface CustomTestCase {
  id: string;
  input: string;
  expected_output: string;
}

interface CustomTestCaseManagerProps {
  customTestCases: CustomTestCase[];
  onTestCasesChange: (testCases: CustomTestCase[]) => void;
}

export const CustomTestCaseManager: React.FC<CustomTestCaseManagerProps> = ({
  customTestCases,
  onTestCasesChange
}) => {
  const [isAddingTestCase, setIsAddingTestCase] = useState(false);
  const [newTestCase, setNewTestCase] = useState<Omit<CustomTestCase, 'id'>>({
    input: '',
    expected_output: ''
  });

  const addTestCase = () => {
    if (!newTestCase.input.trim()) return;
    const testCase: CustomTestCase = { id: `custom-${Date.now()}`, ...newTestCase };
    onTestCasesChange([...customTestCases, testCase]);
    setNewTestCase({ input: '', expected_output: '' });
    setIsAddingTestCase(false);
  };

  const removeTestCase = (id: string) => {
    onTestCasesChange(customTestCases.filter(tc => tc.id !== id));
  };

  const updateTestCase = (id: string, updates: Partial<CustomTestCase>) => {
    onTestCasesChange(customTestCases.map(tc => tc.id === id ? { ...tc, ...updates } : tc));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Custom Test Cases</span>
          {customTestCases.length > 0 && (
            <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              {customTestCases.length}
            </span>
          )}
        </div>
        {!isAddingTestCase && (
          <button
            onClick={() => setIsAddingTestCase(true)}
            className="flex items-center gap-1 h-7 text-xs border border-border rounded-md hover:bg-accent text-foreground font-medium px-3"
          >
            <Plus className="w-3 h-3" /> Add case
          </button>
        )}
      </div>

      {/* Existing Cases */}
      <div className="space-y-2">
        {customTestCases.map((testCase, index) => (
          <div key={testCase.id} className="border border-border rounded-xl overflow-hidden bg-background">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Case #{index + 1}</span>
              <button
                onClick={() => removeTestCase(testCase.id)}
                className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="p-3 grid grid-cols-2 gap-3">
              <div className="space-y-1 flex flex-col">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Input</label>
                <input
                  value={testCase.input}
                  onChange={(e) => updateTestCase(testCase.id, { input: e.target.value })}
                  placeholder="Enter input..."
                  className="h-8 rounded text-xs font-mono bg-muted/50 border border-border focus:bg-background focus:border-primary focus:ring-1 outline-none px-2 transition-all"
                />
              </div>
              <div className="space-y-1 flex flex-col">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Expected Output</label>
                <input
                  value={testCase.expected_output}
                  onChange={(e) => updateTestCase(testCase.id, { expected_output: e.target.value })}
                  placeholder="Expected result..."
                  className="h-8 rounded text-xs font-mono bg-muted/50 border border-border focus:bg-background focus:border-primary focus:ring-1 outline-none px-2 transition-all"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add New Form */}
        {isAddingTestCase && (
          <div className="border border-primary/30 bg-primary/5 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  value={newTestCase.input}
                  onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                  placeholder="Input (e.g. [1, 2, 3])"
                  className="h-8 w-full rounded text-xs font-mono border border-primary/30 focus:border-primary focus:ring-1 outline-none bg-background px-2"
                />
              </div>
              <div className="flex-1">
                <input
                  value={newTestCase.expected_output}
                  onChange={(e) => setNewTestCase({ ...newTestCase, expected_output: e.target.value })}
                  placeholder="Expected output"
                  className="h-8 w-full rounded text-xs font-mono border border-primary/30 focus:border-primary focus:ring-1 outline-none bg-background px-2"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={addTestCase}
                  disabled={!newTestCase.input.trim()}
                  className="h-8 rounded bg-primary hover:opacity-90 text-primary-foreground text-xs px-4 font-bold disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => { setIsAddingTestCase(false); setNewTestCase({ input: '', expected_output: '' }); }}
                  className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {customTestCases.length === 0 && !isAddingTestCase && (
          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-xl">
            <FlaskConical className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground font-medium">No custom test cases</p>
            <p className="text-[10px] text-muted-foreground mt-1 text-center px-10">Add specific inputs to verify your code against edge cases before submitting.</p>
          </div>
        )}
      </div>
    </div>
  );
};
