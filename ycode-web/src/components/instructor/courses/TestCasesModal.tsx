import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TestCase, updateQuestion } from '@/services/questionService';

interface TestCasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionTitle: string;
  initialBasic: TestCase[];
  initialAdvanced: TestCase[];
  onSaved: (basic: TestCase[], advanced: TestCase[]) => void;
}

const emptyCase = (): TestCase => ({ input: '', expected_output: '', description: '' });

const TestCaseRow: React.FC<{
  tc: TestCase;
  index: number;
  canRemove: boolean;
  onChange: (index: number, field: keyof TestCase, value: string) => void;
  onRemove: (index: number) => void;
}> = ({ tc, index, canRemove, onChange, onRemove }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Case {index + 1}</span>
      {canRemove && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onRemove(index)}
          className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Input</Label>
        <Textarea
          value={tc.input}
          onChange={(e) => onChange(index, 'input', e.target.value)}
          placeholder="Enter input..."
          rows={2}
          className="text-xs font-mono bg-slate-50 resize-none"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expected Output</Label>
        <Textarea
          value={tc.expected_output}
          onChange={(e) => onChange(index, 'expected_output', e.target.value)}
          placeholder="Expected output..."
          rows={2}
          className="text-xs font-mono bg-slate-50 resize-none"
        />
      </div>
    </div>
  </div>
);

const TestCasesModal: React.FC<TestCasesModalProps> = ({
  open,
  onOpenChange,
  questionId,
  questionTitle,
  initialBasic,
  initialAdvanced,
  onSaved,
}) => {
  const [basic, setBasic] = useState<TestCase[]>(initialBasic.length ? initialBasic : [emptyCase()]);
  const [advanced, setAdvanced] = useState<TestCase[]>(initialAdvanced);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(initialAdvanced.length > 0);

  // Reset state when modal opens with fresh data
  React.useEffect(() => {
    if (open) {
      setBasic(initialBasic.length ? initialBasic : [emptyCase()]);
      setAdvanced(initialAdvanced);
      setShowAdvanced(initialAdvanced.length > 0);
    }
  }, [open]);

  const updateCase = (
    list: TestCase[],
    setList: React.Dispatch<React.SetStateAction<TestCase[]>>,
    index: number,
    field: keyof TestCase,
    value: string
  ) => {
    const updated = [...list];
    updated[index] = { ...updated[index], [field]: value };
    setList(updated);
  };

  const removeCase = (
    list: TestCase[],
    setList: React.Dispatch<React.SetStateAction<TestCase[]>>,
    index: number
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Basic validation — just check no empty expected_output
    const invalidBasic = basic.some(tc => !tc.expected_output.trim());
    const invalidAdvanced = advanced.some(tc => !tc.expected_output.trim());
    if (invalidBasic || invalidAdvanced) {
      toast.error('All test cases must have an expected output');
      return;
    }

    setSaving(true);
    try {
      await updateQuestion(questionId, {
        test_cases_basic: basic,
        test_cases_advanced: advanced,
      });
      onSaved(basic, advanced);
      toast.success('Test cases saved');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save test cases');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 bg-white">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            Test Cases
            <span className="text-slate-400 font-normal text-sm truncate max-w-xs">— {questionTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {/* Basic Test Cases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-slate-800">Basic Test Cases</span>
                <Badge className="bg-blue-100 text-blue-700 text-[10px] px-2">{basic.length}</Badge>
                <span className="text-xs text-slate-400">visible to students</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setBasic(prev => [...prev, emptyCase()])}
                className="h-7 text-xs border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {basic.map((tc, i) => (
                <TestCaseRow
                  key={i}
                  tc={tc}
                  index={i}
                  canRemove={basic.length > 1}
                  onChange={(idx, field, val) => updateCase(basic, setBasic, idx, field, val)}
                  onRemove={(idx) => removeCase(basic, setBasic, idx)}
                />
              ))}
            </div>
          </div>

          {/* Advanced Test Cases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-slate-800">Advanced Test Cases</span>
                <Badge className="bg-orange-100 text-orange-700 text-[10px] px-2">{advanced.length}</Badge>
                <span className="text-xs text-slate-400">hidden from students</span>
              </div>
              <div className="flex items-center gap-2">
                {!showAdvanced && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAdvanced(true)}
                    className="h-7 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Show
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAdvanced(prev => [...prev, emptyCase()]);
                    setShowAdvanced(true);
                  }}
                  className="h-7 text-xs border-dashed border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
            </div>

            {showAdvanced && advanced.length > 0 && (
              <div className="space-y-3">
                {advanced.map((tc, i) => (
                  <TestCaseRow
                    key={i}
                    tc={tc}
                    index={i}
                    canRemove={true}
                    onChange={(idx, field, val) => updateCase(advanced, setAdvanced, idx, field, val)}
                    onRemove={(idx) => removeCase(advanced, setAdvanced, idx)}
                  />
                ))}
              </div>
            )}

            {showAdvanced && advanced.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                <EyeOff className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No advanced test cases yet. Click Add to create one.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white min-w-24">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Test Cases'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestCasesModal;
