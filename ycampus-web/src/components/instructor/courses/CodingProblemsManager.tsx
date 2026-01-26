import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash } from "lucide-react";
import { toast } from "sonner";

import {
  fetchCodingProblemsBySubtopic,
  createCodingProblem,
  updateCodingProblem,
  deleteCodingProblem,
} from "@/services/courseService";

type CodingProblem = {
  id: string;
  title: string;
  description: string;
  input: string;
  test_cases: any;
  test_cases_basic?: any[];
  test_cases_advanced?: any[];
  created_at?: string;
};

type Props = {
  subtopicId: string | null; // when null, show hint
};

const CodingProblemsManager: React.FC<Props> = ({ subtopicId }) => {
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basicTestCasesText, setBasicTestCasesText] = useState("[]");
  const [advancedTestCasesText, setAdvancedTestCasesText] = useState("[]");
  const [saving, setSaving] = useState(false);

  // delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // load problems when subtopic changes
  useEffect(() => {
    if (!subtopicId) {
      setProblems([]);
      return;
    }
    loadProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtopicId]);

  const loadProblems = async () => {
    if (!subtopicId) return;
    setLoading(true);
    try {
      const data = await fetchCodingProblemsBySubtopic(subtopicId);
      // ensure test_cases parsed if server returned string
      const normalized = Array.isArray(data)
        ? data.map((p: any) => ({
          ...p,
          test_cases: typeof p.test_cases === "string" ? JSON.parse(p.test_cases || "[]") : p.test_cases || [],
        }))
        : [];
      setProblems(normalized);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load coding problems");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedProblem(null);
    setTitle("");
    setDescription("");
    setBasicTestCasesText("[]");
    setAdvancedTestCasesText("[]");
    setIsModalOpen(true);
  };

  const openEditModal = (p: CodingProblem) => {
    setModalMode("edit");
    setSelectedProblem(p);
    setTitle(p.title || "");
    setDescription(p.description || "");
    setBasicTestCasesText(JSON.stringify(p.test_cases_basic ?? [], null, 2));
    setAdvancedTestCasesText(JSON.stringify(p.test_cases_advanced ?? [], null, 2));

    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!subtopicId) {
      toast.error("Select a subtopic first");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    let parsedBasic: any = [];
    try {
      parsedBasic = JSON.parse(basicTestCasesText);
      if (!Array.isArray(parsedBasic)) {
        toast.error("Basic test cases must be a JSON array");
        return;
      }
    } catch {
      toast.error("Invalid JSON in basic test cases");
      return;
    }

    // Parse advanced test cases
    let parsedAdvanced: any = [];
    try {
      parsedAdvanced = JSON.parse(advancedTestCasesText);
      if (!Array.isArray(parsedAdvanced)) {
        toast.error("Advanced test cases must be a JSON array");
        return;
      }
    } catch {
      toast.error("Invalid JSON in advanced test cases");
      return;
    }


    setSaving(true);
    try {
      const payload = {
        categories: ["learn"],
        topic: null,
        sub_topic: subtopicId,
        title: title.trim(),
        description: description.trim(),
        test_cases_basic: parsedBasic,
        test_cases_advanced: parsedAdvanced,
      };



      if (modalMode === "create") {
        const created = await createCodingProblem(payload);
        setProblems((prev) => [...prev, created]);
        toast.success("Coding problem created");
      } else if (selectedProblem) {
        const updated = await updateCodingProblem(selectedProblem.id, payload);
        setProblems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("Coding problem updated");
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save coding problem");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteCodingProblem(id);
      setProblems((prev) => prev.filter((p) => p.id !== id));
      toast.success("Coding problem deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete coding problem");
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Coding Problems</h3>
        <div>
          <Button onClick={openCreateModal} disabled={!subtopicId}>
            <Plus className="mr-2 h-4 w-4" /> Add Problem
          </Button>
        </div>
      </div>

      {!subtopicId ? (
        <div className="text-sm text-muted-foreground">Select a subtopic to manage coding problems.</div>
      ) : (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Problems</CardTitle>
          </CardHeader>

          <CardContent className="p-0 h-full flex flex-col">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

                {!loading && problems.length === 0 && (
                  <div className="text-sm text-muted-foreground">No coding problems yet</div>
                )}

                {!loading &&
                  problems.map((p) => (
                    <div key={p.id} className="border rounded p-3 flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(p)}>
                          <Edit />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setConfirmDeleteId(p.id)}
                        >
                          <Trash />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === "create" ? "Add Coding Problem" : "Edit Coding Problem"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Basic Test Cases (JSON array)</Label>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[120px]"
                value={basicTestCasesText}
                onChange={(e) => setBasicTestCasesText(e.target.value)}
                placeholder='[{"input":"1 2", "expected_output":"3"}]'
              />
              <p className="text-xs text-muted-foreground mt-1">
                Visible to students. Must be a JSON array.
              </p>
            </div>

            <div>
              <Label>Advanced Test Cases (JSON array)</Label>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[120px]"
                value={advancedTestCasesText}
                onChange={(e) => setAdvancedTestCasesText(e.target.value)}
                placeholder='[{"input":"1000 2000","expected_output":"3000"}]'
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for evaluation during submissions.
              </p>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : (modalMode === "create" ? "Create" : "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog (simple) */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Problem</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p>Are you sure you want to delete this coding problem?</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CodingProblemsManager;
