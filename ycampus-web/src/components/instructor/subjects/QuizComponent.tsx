// src/components/instructor/subjects/QuizComponent.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash, Edit, Plus, CheckCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

import {
  fetchQuizzesBySubUnit as fetchQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} from "@/services/subjectService";

const QuizComponent = ({ subUnit }: any) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);

  useEffect(() => {
    if (subUnit) loadQuizzes();
  }, [subUnit]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await fetchQuizzes(subUnit.id);
      setQuizzes(data);
    } catch {
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentQuizId(null);
    setQuestion("");
    setOptions(["", ""]);
    setCorrectAnswerIndex(0);
    setIsModalOpen(true);
  };

  const openEditModal = (quiz: any) => {
    setEditMode(true);
    setCurrentQuizId(quiz.id);
    setQuestion(quiz.question || quiz.title);
    setOptions(quiz.options || []);
    setCorrectAnswerIndex(quiz.correct_answer_index ?? 0);
    setIsModalOpen(true);
  };

  const addOption = () => setOptions([...options, ""]);

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    const newOpts = [...options];
    newOpts.splice(i, 1);
    setOptions(newOpts);
    if (correctAnswerIndex === i) {
      setCorrectAnswerIndex(0);
    } else if (correctAnswerIndex > i) {
      setCorrectAnswerIndex(correctAnswerIndex - 1);
    }
  };

  const saveQuiz = async () => {
    if (!question.trim() || options.some(o => !o.trim())) {
      toast.error("Incomplete question or options");
      return;
    }

    try {
      const payload = {
        question,
        options,
        correct_answer_index: correctAnswerIndex,
        sub_unit: subUnit.id,
      };

      if (editMode && currentQuizId) {
        await updateQuiz(currentQuizId, payload);
        toast.success("Quiz updated");
      } else {
        await createQuiz(payload);
        toast.success("Quiz created");
      }
      setIsModalOpen(false);
      loadQuizzes();
    } catch (err: any) {
      toast.error(err.message || "Failed to save quiz");
    }
  };

  const removeQuiz = async (id: string) => {
    if (!window.confirm("Delete this quiz?")) return;
    try {
      await deleteQuiz(id);
      toast.success("Quiz deleted");
      loadQuizzes();
    } catch {
      toast.error("Failed to delete quiz");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading quizzes...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <HelpCircle className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quizzes</h2>
            <p className="text-sm text-slate-500">Manage multiple choice questions for this sub-unit</p>
          </div>
        </div>
        <Button onClick={openAddModal} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Quiz
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {quizzes.map((q, idx) => (
          <Card key={q.id || idx}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-900 flex-1">{q.question || q.title}</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(q)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeQuiz(q.id)} className="text-red-500"><Trash className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options?.map((opt: string, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border flex items-center gap-3 ${i === q.correct_answer_index ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                    {i === q.correct_answer_index ? <CheckCircle className="h-4 w-4 text-green-600" /> : <div className="h-4 w-4 rounded-full border border-slate-300" />}
                    <span className={`text-sm ${i === q.correct_answer_index ? 'text-green-800 font-medium' : 'text-slate-600'}`}>{opt}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {quizzes.length === 0 && (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-xl">
            No quizzes added yet
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Quiz" : "Add Quiz"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Question</Label>
              <textarea className="w-full h-24 border rounded-md p-2 text-sm" value={question} onChange={(e) => setQuestion(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label className="block mb-2">Options (Mark the correct one)</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="radio" checked={correctAnswerIndex === i} onChange={() => setCorrectAnswerIndex(i)} />
                  <Input value={opt} onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }} placeholder={`Option ${i + 1}`} />
                  <Button variant="ghost" size="icon" onClick={() => removeOption(i)} disabled={options.length <= 2}><Trash className="h-4 w-4 text-slate-400" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption} className="mt-2"><Plus className="h-3 w-3 mr-1" /> Add Option</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={saveQuiz}>Save Quiz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizComponent;
