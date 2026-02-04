import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Database, X } from 'lucide-react';

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
    if (!newTestCase.input.trim()) {
      return;
    }

    const testCase: CustomTestCase = {
      id: `custom-${Date.now()}`,
      ...newTestCase
    };

    onTestCasesChange([...customTestCases, testCase]);
    setNewTestCase({ input: '', expected_output: '' });
    setIsAddingTestCase(false);
  };

  const removeTestCase = (id: string) => {
    onTestCasesChange(customTestCases.filter(tc => tc.id !== id));
  };

  const updateTestCase = (id: string, updates: Partial<CustomTestCase>) => {
    onTestCasesChange(
      customTestCases.map(tc =>
        tc.id === id ? { ...tc, ...updates } : tc
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-tight">Custom Test Cases</h4>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {customTestCases.length}
          </span>
        </div>
        {!isAddingTestCase && (
          <Button
            onClick={() => setIsAddingTestCase(true)}
            size="sm"
            variant="outline"
            className="h-8 text-xs bg-white border-gray-200 hover:bg-gray-50 text-gray-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Case
          </Button>
        )}
      </div>

      {/* Existing Test Cases */}
      <div className="grid grid-cols-1 gap-4">
        {customTestCases.map((testCase, index) => (
          <div key={testCase.id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all shadow-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Case #{index + 1}</span>
              <Button
                onClick={() => removeTestCase(testCase.id)}
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Input</label>
                <Input
                  value={testCase.input}
                  onChange={(e) => updateTestCase(testCase.id, { input: e.target.value })}
                  placeholder="Enter input..."
                  className="h-8 text-xs font-mono bg-gray-50 border-gray-100 focus:bg-white transition-all shadow-inner"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expected Output</label>
                <Input
                  value={testCase.expected_output}
                  onChange={(e) => updateTestCase(testCase.id, { expected_output: e.target.value })}
                  placeholder="Enter expected result..."
                  className="h-8 text-xs font-mono bg-gray-50 border-gray-100 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add New Test Case Form */}
        {isAddingTestCase && (
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  value={newTestCase.input}
                  onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                  placeholder="Input (e.g. [1, 2, 3])"
                  className="h-9 text-xs font-mono border-blue-100 focus:border-blue-300 focus:ring-blue-100 transition-all shadow-sm bg-white"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={newTestCase.expected_output}
                  onChange={(e) => setNewTestCase({ ...newTestCase, expected_output: e.target.value })}
                  placeholder="Expected Output"
                  className="h-9 text-xs font-mono border-blue-100 focus:border-blue-300 focus:ring-blue-100 transition-all shadow-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={addTestCase}
                  disabled={!newTestCase.input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] px-3 h-9 font-bold uppercase tracking-tight"
                >
                  Add
                </Button>
                <Button
                  onClick={() => {
                    setIsAddingTestCase(false);
                    setNewTestCase({ input: '', expected_output: '' });
                  }}
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-gray-600 h-9 w-9"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {customTestCases.length === 0 && !isAddingTestCase && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
              <Database className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No Custom Cases Yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px] text-center">Add your own test scenarios to verify edge cases.</p>
            <Button
              onClick={() => setIsAddingTestCase(true)}
              variant="link"
              className="text-blue-600 font-bold text-xs mt-2"
            >
              Click here to add one
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomTestCaseManager;