import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Calendar } from 'lucide-react';
import { fetchUnitsBySubject, fetchSubUnitsByUnit, UnitBasic, SubUnit } from '@/services/subjectService';
import { fetchQuestions } from '@/services/questionService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateTaskFormProps {
  subjectId: string;
  sections: string[];
  onSubmit: (taskData: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ subjectId, sections, onSubmit, onCancel, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    // Adjust to local time
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  
  const [dueDate, setDueDate] = useState(formatDateForInput(initialData?.due_date));
  
  const minDateTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [taskType, setTaskType] = useState<'descriptive' | 'coding'>(initialData?.task_type || 'descriptive');
  const [source, setSource] = useState<'manual' | 'bank'>(initialData?.question_source || 'manual');
  const [attachment, setAttachment] = useState<File | null>(null);
  
  const [units, setUnits] = useState<UnitBasic[]>([]);
  const [subUnits, setSubUnits] = useState<SubUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState(String(initialData?.unit || ''));
  const [selectedSubUnit, setSelectedSubUnit] = useState(String(initialData?.sub_unit || ''));
  
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(
    initialData?.question_details?.map((q: any) => String(q.id)) || []
  );
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    if (subjectId) {
      fetchUnitsBySubject(subjectId).then(setUnits).catch(console.error);
    }
  }, [subjectId]);

  useEffect(() => {
    if (selectedUnit) {
      fetchSubUnitsByUnit(selectedUnit).then(setSubUnits).catch(console.error);
    } else {
      setSubUnits([]);
    }
  }, [selectedUnit]);

  useEffect(() => {
    if (source === 'bank' && selectedUnit && subjectId) {
      setIsLoadingQuestions(true);
      const qType = taskType === 'coding' ? 'coding' : undefined;
      fetchQuestions({
        subject: subjectId,
        type: qType,
        categories: 'task',
        unit: selectedUnit,
        sub_unit: selectedSubUnit || undefined
      }).then(res => {
        setBankQuestions(res || []);
      }).catch(err => {
        console.error("Failed to load question bank:", err);
      }).finally(() => {
        setIsLoadingQuestions(false);
      });
    } else {
      setBankQuestions([]);
    }
  }, [source, selectedUnit, selectedSubUnit, subjectId, taskType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Core validation
    if (!title.trim() || !selectedUnit) return;
    
    // Validations based on source mode
    if (source === 'manual') {
      if (!description.trim() && !attachment) return;
      if (!selectedSubUnit) return;
    }
    
    if (source === 'bank' && selectedQuestions.length === 0) {
      return; // Cannot proceed without selecting at least one question
    }

    onSubmit({
      title: title.trim(),
      description: source === 'manual' ? description.trim() : undefined,
      due_date: dueDate,
      task_type: taskType,
      unit: selectedUnit,
      sub_unit: selectedSubUnit || undefined,
      sections: sections,
      question_source: source,
      questions: source === 'bank' ? selectedQuestions : undefined,
      attachment: attachment || undefined
    });
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="pb-3 border-b">
        <div className="flex justify-between items-center">
          <CardTitle>{initialData ? 'Edit Task' : 'Create New Task'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Task Title <span className="text-red-500">*</span></label>
              <Input
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val ? val.charAt(0).toUpperCase() + val.slice(1) : '');
                }}
                placeholder="e.g., Intro to React Hooks"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Due Date</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={minDateTime}
                  className="pl-10"
                  required
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Unit <span className="text-red-500">*</span></label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Sub Unit {source === 'manual' && <span className="text-red-500">*</span>}
                {source === 'bank' && <span className="text-xs font-normal text-slate-400 ml-1">(Optional)</span>}
              </label>
              <Select value={selectedSubUnit} onValueChange={setSelectedSubUnit} disabled={!selectedUnit} required={source === 'manual'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sub Unit" />
                </SelectTrigger>
                <SelectContent>
                  {subUnits.map(su => (
                    <SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Task Type</label>
              <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Source</label>
              <Select value={source} onValueChange={(v: 'manual' | 'bank') => {
                 setSource(v);
                 setSelectedQuestions([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="bank">Question Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {source === 'manual' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Task Description {!attachment && <span className="text-red-500">*</span>}</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed task description and requirements"
                  rows={5}
                  required={source === 'manual' && !attachment}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Attachment (Optional)</label>
                <Input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachment(e.target.files[0]);
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-slate-500">Upload an optional file for clear understanding if the task description is too long.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 border rounded-lg p-4 bg-slate-50 border-slate-200 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700">
                  Select Questions <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                  {selectedQuestions.length} selected
                </span>
              </div>
              
              {isLoadingQuestions ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-primary animate-pulse">
                   <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-sm font-medium text-slate-500">Loading Question Bank...</p>
                </div>
              ) : bankQuestions.length > 0 ? (
                <ScrollArea className="h-[280px] rounded-md border border-slate-200 bg-white shadow-sm">
                  <div className="p-2 space-y-1">
                    {bankQuestions.map((q) => (
                      <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                        selectedQuestions.includes(String(q.id)) 
                          ? 'bg-primary/5 border-primary/30 shadow-sm' 
                          : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                      }`}>
                        <Checkbox 
                           checked={selectedQuestions.includes(String(q.id))} 
                           onCheckedChange={(checked) => {
                             if (checked) setSelectedQuestions(prev => [...prev, String(q.id)]);
                             else setSelectedQuestions(prev => prev.filter(id => id !== String(q.id)));
                           }} 
                           className="mt-1 flex-shrink-0"
                        />
                        <div className="space-y-1.5 w-full">
                          <p className="text-sm font-semibold leading-snug text-slate-800 line-clamp-3">
                            {q.question_text || q.title || 'Untitled Question'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {q.marks && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm">
                                {q.marks} marks
                              </span>
                            )}
                            {q.difficulty_level && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                                q.difficulty_level.toLowerCase() === 'hard' ? 'bg-red-50 text-red-600' :
                                q.difficulty_level.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600' :
                                'bg-green-50 text-green-600'
                              }`}>
                                {q.difficulty_level}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-12 text-center bg-white border border-dashed border-slate-300 rounded-lg shadow-sm">
                  <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
                    {selectedUnit ? 'No matching questions found for this Unit and Task Type combination.' : 'Please select a Unit above to browse available questions.'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <Button 
              type="submit" 
              className="flex-1 shadow-md hover:shadow-lg transition-all font-bold"
              disabled={source === 'bank' && selectedQuestions.length === 0}
            >
              {initialData ? 'Save Changes' : 'Confirm & Create Task'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
              Discard
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateTaskForm;