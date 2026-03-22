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
import { Trash, Edit, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  fetchQuizzesBySubtopic as fetchQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} from "@/services/courseService";

const QuizComponent = ({ subtopic }: any) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);

  // Form fields
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);

  useEffect(() => {
    if (subtopic?.id) loadQuizzes();
  }, [subtopic]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await fetchQuizzes(subtopic.id);
      setQuizzes(data);
    } catch {
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  // ============ ADD QUIZ =============
  const openAddModal = () => {
    setMode("add");
    setEditingQuiz(null);

    setQuestion("");
    setOptions(["", "", "", ""]); // always 2 default options
    setCorrectIndex(null);

    setOpen(true);
  };

  // ============ EDIT QUIZ =============
  const openEditModal = (quiz: any) => {
    setMode("edit");
    setEditingQuiz(quiz);

    setQuestion(quiz.question);
    setOptions(quiz.options);
    setCorrectIndex(quiz.correct_answer_index);

    setOpen(true);
  };

  // ============ OPTION HANDLING =============
  const addOption = () => setOptions([...options, ""]);

  const removeOption = (i: number) => {
    if (options.length <= 2) {
      toast.error("Quiz must have at least 2 options");
      return;
    }

    const updated = [...options];
    updated.splice(i, 1);
    setOptions(updated);

    if (correctIndex === i) setCorrectIndex(null);
  };

  // ============ SAVE QUIZ =============
  const saveQuiz = async () => {
    if (!question.trim()) return toast.error("Enter a question");
    if (options.some((o) => !o.trim()))
      return toast.error("Options cannot be empty");
    if (options.length < 2)
      return toast.error("At least 2 options required");
    if (correctIndex === null)
      return toast.error("Select correct answer");

    const payload = {
      categories: ["learn"],
      sub_topic: subtopic.id,
      topic: null,
      question,
      options,
      correct_answer_index: correctIndex,
    };

    try {
      if (mode === "add") {
        const q = await createQuiz(payload);
        setQuizzes((prev) => [...prev, q]);
        toast.success("Quiz added");
      } else if (editingQuiz) {
        const updated = await updateQuiz(editingQuiz.id, payload);
        setQuizzes((prev) =>
          prev.map((q) => (q.id === updated.id ? updated : q))
        );
        toast.success("Quiz updated");
      }

      setOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save quiz");
    }
  };

  // ============ DELETE QUIZ =============
  const removeQuiz = async (id: string) => {
    try {
      await deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success("Quiz deleted");
    } catch {
      toast.error("Failed");
    }
  };

  // ============ UI =============
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Quizzes</h3>

        <Button onClick={openAddModal} className="flex gap-2">
          <Plus size={16} /> Add Quiz
        </Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : quizzes.length === 0 ? (
        <p className="text-muted-foreground">No quizzes yet</p>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{quiz.question}</div>
                    <ul className="list-disc ml-5 text-sm mt-1">
                      {quiz.options.map((o: string, idx: number) => (
                        <li
                          key={idx}
                          className={
                            idx === quiz.correct_answer_index
                              ? "text-green-600 font-semibold"
                              : ""
                          }
                        >
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => openEditModal(quiz)}>
                      <Edit size={16} />
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => removeQuiz(quiz.id)}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "add" ? "Add Quiz" : "Edit Quiz"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Question</Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div>
              <Label>Options</Label>

              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 mt-2 border border-gray-200">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[i] = e.target.value;
                      setOptions(updated);
                    }}
                  />

                  <Button variant="destructive" onClick={() => removeOption(i)}>
                    <Trash size={16} />
                  </Button>
                </div>
              ))}

              <Button onClick={addOption} className="mt-2">
                + Add Option
              </Button>
            </div>

            <div>
              <Label>Correct Answer</Label>
              <select
                className="border rounded p-2 w-full"
                value={correctIndex ?? ""}
                onChange={(e) => setCorrectIndex(Number(e.target.value))}
              >
                <option value="">Select correct answer</option>
                {options.map((_, idx) => (
                  <option key={idx} value={idx}>
                    Option {idx + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button onClick={saveQuiz}>
              {mode === "add" ? "Create Quiz" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizComponent;
