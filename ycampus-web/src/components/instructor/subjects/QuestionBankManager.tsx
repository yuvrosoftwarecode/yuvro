// src/components/instructor/subjects/QuestionBankManager.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Code,
  FileText,
  Video,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Question,
  fetchQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
  QUESTION_CATEGORIES,
} from '@/services/questionService';

// Consistent with other components
interface QuestionBankManagerProps {
  subject?: any;
  selectedUnit?: any;
  selectedSubUnit?: any;
  units?: any[];
}

const QuestionBankManager: React.FC<QuestionBankManagerProps> = ({
  subject,
  selectedUnit,
  selectedSubUnit,
  units = [],
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({
    title: '',
    content: '',
    type: 'mcq_single',
    difficulty: 'easy',
    categories: ['practice'],
    level: 'subunit',
    subject: subject?.id || '',
    unit: selectedUnit?.id || '',
    sub_unit: selectedSubUnit?.id || '',
    marks: 1,
    mcq_options: [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
    ],
    test_cases_basic: [],
    test_cases_advanced: [],
  });

  useEffect(() => {
    loadQuestions();
  }, [subject, selectedUnit, selectedSubUnit]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedSubUnit) {
        params.sub_unit = selectedSubUnit.id;
        params.level = 'subunit';
      } else if (selectedUnit) {
        params.unit = selectedUnit.id;
        params.level = 'unit';
      } else if (subject) {
        params.subject = subject.id;
        params.level = 'subject';
      }

      const data = await fetchQuestions(params);
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelChange = (level: 'subject' | 'unit' | 'subunit') => {
    setFormData((prev: any) => ({
      ...prev,
      level,
      subject: subject?.id || '',
      unit: level === 'subject' ? null : (selectedUnit?.id || ''),
      sub_unit: level !== 'subunit' ? null : (selectedSubUnit?.id || ''),
    }));
  };

  const openCreateForm = () => {
    setIsEditMode(false);
    setCurrentQuestion(null);
    setFormData({
      title: '',
      content: '',
      type: 'mcq_single',
      difficulty: 'easy',
      categories: ['practice'],
      level: selectedSubUnit ? 'subunit' : (selectedUnit ? 'unit' : 'subject'),
      subject: subject?.id || '',
      unit: selectedUnit?.id || '',
      sub_unit: selectedSubUnit?.id || '',
      marks: 1,
      mcq_options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
      ],
      test_cases_basic: [],
      test_cases_advanced: [],
    });
    setIsModalOpen(true);
  };

  const openEditForm = (q: Question) => {
    setIsEditMode(true);
    setCurrentQuestion(q);
    setFormData({
      ...q,
      subject: q.subject || subject?.id || '',
      unit: q.unit || selectedUnit?.id || '',
      sub_unit: q.sub_unit || selectedSubUnit?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      setSaving(true);
      if (isEditMode && currentQuestion) {
        await updateQuestion(currentQuestion.id, formData);
        toast.success('Question updated successfully');
      } else {
        await createQuestion(formData);
        toast.success('Question created successfully');
      }
      setIsModalOpen(false);
      loadQuestions();
    } catch (error) {
      toast.error('Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!questionToDelete) return;
    try {
      setDeleting(true);
      await deleteQuestion(questionToDelete);
      toast.success('Question deleted');
      setIsDeleteModalOpen(false);
      loadQuestions();
    } catch (error) {
      toast.error('Failed to delete question');
    } finally {
      setDeleting(false);
      setQuestionToDelete(null);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const filteredQuestions = questions.filter((q) => {
    const matchesType = filterType === 'all' || q.type === filterType;
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileQuestion className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Question Bank</h3>
              <p className="text-sm text-slate-600">
                {selectedSubUnit ? `Questions for: ${selectedSubUnit.name}` : (selectedUnit ? `Questions for: ${selectedUnit.name}` : 'All Subject Questions')}
              </p>
            </div>
          </div>
          <Button onClick={openCreateForm} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search questions..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading questions...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-xl">
              No questions found
            </div>
          ) : (
            filteredQuestions.map((q) => (
              <Card key={q.id} className="group hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-50">{QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}</Badge>
                        <Badge className={q.difficulty === 'easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}>
                          {q.difficulty}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-slate-900">{q.title}</h4>
                      <p className="text-sm text-slate-600 line-clamp-2">{q.content}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(q)} className="h-8 w-8">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setQuestionToDelete(q.id); setIsDeleteModalOpen(true); }} className="h-8 w-8 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Question Form Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Question' : 'Add New Question'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(val) => setFormData({ ...formData, difficulty: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Level of Association</Label>
              <div className="flex gap-2">
                <Button variant={formData.level === 'subject' ? 'default' : 'outline'} onClick={() => handleLevelChange('subject')} size="sm">Subject</Button>
                <Button variant={formData.level === 'unit' ? 'default' : 'outline'} onClick={() => handleLevelChange('unit')} size="sm" disabled={!selectedUnit && !units.length}>Unit</Button>
                <Button variant={formData.level === 'subunit' ? 'default' : 'outline'} onClick={() => handleLevelChange('subunit')} size="sm" disabled={!selectedSubUnit}>Sub-unit</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Give this question a recognizable name" />
            </div>

            <div className="space-y-2">
              <Label>Question Content / Prompt</Label>
              <textarea
                className="w-full h-32 border rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="The actual question text visible to students..."
              />
            </div>

            {/* MCQ Options */}
            {(formData.type === 'mcq_single' || formData.type === 'mcq_multiple') && (
              <div className="space-y-3">
                <Label>Options</Label>
                {formData.mcq_options.map((opt: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type={formData.type === 'mcq_single' ? 'radio' : 'checkbox'}
                      checked={opt.is_correct}
                      onChange={() => {
                        const newOpts = [...formData.mcq_options];
                        if (formData.type === 'mcq_single') {
                          newOpts.forEach((o, i) => o.is_correct = i === idx);
                        } else {
                          newOpts[idx].is_correct = !newOpts[idx].is_correct;
                        }
                        setFormData({ ...formData, mcq_options: newOpts });
                      }}
                    />
                    <Input value={opt.text} onChange={(e) => {
                      const newOpts = [...formData.mcq_options];
                      newOpts[idx].text = e.target.value;
                      setFormData({ ...formData, mcq_options: newOpts });
                    }} placeholder={`Option ${idx + 1}`} />
                    <Button variant="ghost" size="icon" onClick={() => {
                      setFormData({ ...formData, mcq_options: formData.mcq_options.filter((_: any, i: number) => i !== idx) });
                    }}><XCircle className="w-4 h-4 text-slate-400" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, mcq_options: [...formData.mcq_options, { text: '', is_correct: false }] })}>Add Option</Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Question'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Question?</DialogTitle></DialogHeader>
          <div className="py-4 text-slate-600">This action cannot be undone.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Missing imports in previous view but I'll add common ones
const FileQuestion = ({ className }: { className?: string }) => <HelpCircle className={className} />;

export default QuestionBankManager;