import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const CustomTestCaseManager: React.FC<CustomTestCaseManagerProps> = ({
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
          <FlaskConical className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Custom Test Cases</span>
          {customTestCases.length > 0 && (
            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {customTestCases.length}
            </span>
          )}
        </div>
        {!isAddingTestCase && (
          <Button
            onClick={() => setIsAddingTestCase(true)}
            size="sm"
            variant="outline"
            className="h-7 text-xs border-gray-200 hover:bg-gray-50 text-gray-600 font-medium px-3"
          >
            <Plus className="w-3 h-3 mr-1" /> Add case
          </Button>
        )}
      </div>

      {/* Existing Cases */}
      <div className="space-y-2">
        {customTestCases.map((testCase, index) => (
          <div key={testCase.id} className="border border-gray-100 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 border-b border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Case #{index + 1}</span>
              <Button
                onClick={() => removeTestCase(testCase.id)}
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="p-3 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Input</label>
                <Input
                  value={testCase.input}
                  onChange={(e) => updateTestCase(testCase.id, { input: e.target.value })}
                  placeholder="Enter input..."
                  className="h-8 text-xs font-mono bg-gray-50 border-gray-100 focus:bg-white focus:border-saffron-300 focus:ring-saffron-100 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expected Output</label>
                <Input
                  value={testCase.expected_output}
                  onChange={(e) => updateTestCase(testCase.id, { expected_output: e.target.value })}
                  placeholder="Expected result..."
                  className="h-8 text-xs font-mono bg-gray-50 border-gray-100 focus:bg-white focus:border-saffron-300 focus:ring-saffron-100 transition-all"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add New Form */}
        {isAddingTestCase && (
          <div className="border border-saffron-100 bg-saffron-50/30 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={newTestCase.input}
                  onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                  placeholder="Input (e.g. [1, 2, 3])"
                  className="h-8 text-xs font-mono border-saffron-100 focus:border-saffron-300 focus:ring-saffron-100 bg-white"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={newTestCase.expected_output}
                  onChange={(e) => setNewTestCase({ ...newTestCase, expected_output: e.target.value })}
                  placeholder="Expected output"
                  className="h-8 text-xs font-mono border-saffron-100 focus:border-saffron-300 focus:ring-saffron-100 bg-white"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={addTestCase}
                  disabled={!newTestCase.input.trim()}
                  size="sm"
                  className="h-8 bg-saffron-600 hover:bg-saffron-700 text-white text-xs px-4 font-bold"
                >
                  Add
                </Button>
                <Button
                  onClick={() => { setIsAddingTestCase(false); setNewTestCase({ input: '', expected_output: '' }); }}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {customTestCases.length === 0 && !isAddingTestCase && (
          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-gray-100 rounded-xl">
            <FlaskConical className="w-6 h-6 text-gray-200 mb-3" />
            <p className="text-xs font-semibold text-gray-400">No custom test cases</p>
            <p className="text-[11px] text-gray-300 mt-0.5">Add your own inputs to verify edge cases</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomTestCaseManager;