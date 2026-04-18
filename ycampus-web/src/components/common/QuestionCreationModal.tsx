import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, CheckCircle, Edit3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Question,
  CreateQuestionData,
  createQuestion,
  updateQuestion,
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
  QUESTION_CATEGORIES,
  validateQuestion,
} from '@/services/questionService';
import { getDefaultMarks, getDefaultDuration } from '@/constants/questionMarksConfig';

interface QuestionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newQuestion: Question) => void;
  subjectFilter?: string;
  unitFilter?: string;
  categoryFilter?: string;
  editData?: Question | null;
}

export default function QuestionCreationModal({
  isOpen,
  onClose,
  onSuccess,
  subjectFilter,
  unitFilter,
  categoryFilter,
  editData = null
}: QuestionCreateModalProps) {
  const [saving, setSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState<CreateQuestionData>({
    type: 'mcq_single',
    title: '',
    content: '',
    level: 'subject',
    difficulty: 'easy',
    marks: 1,
    duration: 1,
    categories: [],
    mcq_options: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ],
    test_cases_basic: [{ input: '', expected_output: '', description: '' }],
    test_cases_advanced: [],
  });

  // Reset form when opened or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          type: editData.type,
          title: editData.title,
          content: editData.content,
          level: editData.level,
          subject: editData.subject,
          unit: editData.unit,
          sub_unit: editData.sub_unit,
          difficulty: editData.difficulty,
          marks: editData.marks,
          duration: editData.duration,
          categories: editData.categories,
          mcq_options: editData.mcq_options || [
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false }
          ],
          test_cases_basic: editData.test_cases_basic || [{ input: '', expected_output: '', description: '' }],
          test_cases_advanced: editData.test_cases_advanced || [],
        });
      } else {
        let level: 'subject' | 'unit' | 'subunit' = 'subject';
        if (unitFilter) {
          level = 'unit';
        }

        const initialCategories = categoryFilter ? [categoryFilter] : [];
        
        setFormData({
          type: 'mcq_single',
          title: '',
          content: '',
          level,
          subject: subjectFilter,
          unit: unitFilter,
          difficulty: 'easy',
          marks: 1,
          duration: 1,
          categories: initialCategories,
          mcq_options: [
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false },
            { text: '', is_correct: false }
          ],
          test_cases_basic: [{ input: '', expected_output: '', description: '' }],
          test_cases_advanced: [],
        });
      }
    }
  }, [isOpen, subjectFilter, unitFilter, categoryFilter, editData]);

  // Update marks and duration when type or difficulty changes
  useEffect(() => {
    const marks = getDefaultMarks(formData.type, formData.difficulty);
    const duration = getDefaultDuration(formData.type, formData.difficulty);
    setFormData((prev: CreateQuestionData) => ({
      ...prev,
      marks,
      duration
    }));
  }, [formData.type, formData.difficulty]);

  const handleSave = async () => {
    const errors = validateQuestion(formData);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setSaving(true);
    try {
      let result;
      if (editData) {
        result = await updateQuestion(editData.id, formData);
        toast.success('Question updated successfully');
      } else {
        result = await createQuestion(formData);
        toast.success('Question created successfully');
      }
      onSuccess(result);
      onClose();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error(editData ? 'Failed to update question' : 'Failed to create question');
    } finally {
      setSaving(false);
    }
  };

  const updateMCQOption = (index: number, value: string) => {
    const newOptions = [...(formData.mcq_options || [])];
    newOptions[index] = { ...newOptions[index], text: value };
    setFormData(prev => ({ ...prev, mcq_options: newOptions }));
  };

  const toggleMCQCorrect = (index: number) => {
    const newOptions = [...(formData.mcq_options || [])];

    // For single answer MCQ, uncheck all others first
    if (formData.type === 'mcq_single') {
      newOptions.forEach((option, i) => {
        if (i !== index) {
          option.is_correct = false;
        }
      });
    }

    newOptions[index] = { ...newOptions[index], is_correct: !newOptions[index].is_correct };
    setFormData(prev => ({ ...prev, mcq_options: newOptions }));
  };

  const addMCQOption = () => {
    setFormData(prev => ({
      ...prev,
      mcq_options: [...(prev.mcq_options || []), { text: '', is_correct: false }]
    }));
  };

  const removeMCQOption = (index: number) => {
    if ((formData.mcq_options?.length || 0) <= 2) return;
    const newOptions = formData.mcq_options?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, mcq_options: newOptions }));
  };

  const updateTestCase = (index: number, field: 'input' | 'expected_output' | 'description', value: string) => {
    const newTestCases = [...(formData.test_cases_basic || [])];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData(prev => ({ ...prev, test_cases_basic: newTestCases }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases_basic: [...(prev.test_cases_basic || []), { input: '', expected_output: '', description: '' }]
    }));
  };

  const removeTestCase = (index: number) => {
    if ((formData.test_cases_basic?.length || 0) <= 1) return;
    const newTestCases = formData.test_cases_basic?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, test_cases_basic: newTestCases }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {editData ? <Edit3 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            {editData ? 'Edit Question' : 'Create New Question'}
          </DialogTitle>
          <DialogDescription>
            {editData ? 'Update the details of the existing question.' : 'Add a new question directly into the selected context.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Row 1: Configurations */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger className="mt-1.5 h-10 w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value as any }))}
              >
                <SelectTrigger className="mt-1.5 h-10 w-full">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Marks</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.marks}
                onChange={(e) => setFormData(prev => ({ ...prev, marks: parseInt(e.target.value) || 1 }))}
                className="mt-1.5 h-10 w-full"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Duration (m)</Label>
              <Input
                type="number"
                min="1"
                max="180"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                className="mt-1.5 h-10 w-full"
              />
            </div>
          </div>

          {/* Row 2: Categories (Hidden if pre-filled via categoryFilter) */}
          {!categoryFilter && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Categories</Label>
              <div className="flex flex-wrap gap-4 p-4 rounded-lg border">
                {QUESTION_CATEGORIES.map(category => {
                  const isSelected = formData.categories.includes(category.value);
                  return (
                    <div 
                      key={category.value} 
                      className={`flex items-center space-x-2 p-2 px-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isSelected ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-white hover:border-slate-300'
                      }`}
                      onClick={() => {
                        if (!isSelected) {
                          setFormData(prev => ({ ...prev, categories: [...prev.categories, category.value] }));
                        } else {
                          setFormData(prev => ({ ...prev, categories: prev.categories.filter(c => c !== category.value) }));
                        }
                      }}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => {}} />
                      <Label className="text-sm font-medium cursor-pointer leading-none">
                        {category.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Question Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a clear title"
              className="mt-1.5 h-10 w-full"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Question Content</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter the detailed question text..."
              rows={4}
              className="mt-1.5 w-full"
            />
          </div>

          {/* MCQ Options */}
          {(formData.type === 'mcq_single' || formData.type === 'mcq_multiple') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Answer Options</Label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 px-3 py-1 rounded-full border">
                  <CheckCircle className="w-3 h-3 text-primary" />
                  {formData.type === 'mcq_single' ? 'Select single correct answer' : 'Select multiple correct answers'}
                </div>
              </div>
              <div className="space-y-3 p-4 rounded-xl border">
                {formData.mcq_options?.map((option, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 ${
                      option.is_correct ? 'bg-green-50/50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <Checkbox
                      checked={option.is_correct}
                      onCheckedChange={() => toggleMCQCorrect(index)}
                      className={option.is_correct ? 'border-green-500 bg-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500' : ''}
                    />
                    <Input
                      value={option.text}
                      onChange={(e) => updateMCQOption(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="flex-1 w-full"
                    />
                    {(formData.mcq_options?.length || 0) > 2 && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeMCQOption(index)} className="text-destructive h-8 w-8 hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={addMCQOption} className="w-full border-dashed py-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Option
                </Button>
              </div>
            </div>
          )}

          {/* Coding Test Cases */}
          {formData.type === 'coding' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Test Cases</Label>
              <div className="space-y-3">
                {formData.test_cases_basic?.map((testCase, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-sm">Test Case {index + 1}</h5>
                      {(formData.test_cases_basic?.length || 0) > 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeTestCase(index)} className="text-destructive h-8 w-8 hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Input</Label>
                        <Textarea value={testCase.input} onChange={(e) => updateTestCase(index, 'input', e.target.value)} rows={2} className="w-full text-sm font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Expected Output</Label>
                        <Textarea value={testCase.expected_output} onChange={(e) => updateTestCase(index, 'expected_output', e.target.value)} rows={2} className="w-full text-sm font-mono" />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={addTestCase} className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-2" /> Add Test Case
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 mt-2 border-t">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[140px] px-6">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? 'Update Question' : 'Create Question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
