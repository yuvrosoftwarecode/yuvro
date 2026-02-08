// src/components/instructor/subjects/CodingProblemsManager.tsx
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash, Code } from "lucide-react";
import { toast } from "sonner";

import {
  fetchCodingProblemsBySubUnit,
  createCodingProblem,
  updateCodingProblem,
  deleteCodingProblem,
} from "@/services/subjectService";

interface CodingProblem {
  id: string;
  title: string;
  description: string;
  input: string;
  test_cases: any;
  test_cases_basic?: any[];
  test_cases_advanced?: any[];
  created_at?: string;
}

interface Props {
  subUnitId: string | null;
}

const CodingProblemsManager: React.FC<Props> = ({ subUnitId }) => {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProblem, setEditProblem] = useState<CodingProblem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testCases, setTestCases] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subUnitId) loadProblems();
  }, [subUnitId]);

  const loadProblems = async () => {
    if (!subUnitId) return;
    try {
      setLoading(true);
      const data = await fetchCodingProblemsBySubUnit(subUnitId);
      setProblems(data as CodingProblem[]);
    } catch {
      toast.error("Failed to load coding problems");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditProblem(null);
    setTitle("");
    setDescription("");
    setTestCases([{ input: "", expected_output: "" }]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: CodingProblem) => {
    setEditProblem(p);
    setTitle(p.title);
    setDescription(p.description);
    setTestCases(p.test_cases_basic || p.test_cases || []);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!subUnitId) return;
    if (!title.trim()) { toast.error("Title required"); return; }

    try {
      setSaving(true);
      const payload = {
        title,
        description,
        test_cases: testCases,
        sub_unit: subUnitId,
      };

      if (editProblem) {
        await updateCodingProblem(editProblem.id, payload);
        toast.success("Problem updated");
      } else {
        await createCodingProblem(payload);
        toast.success("Problem created");
      }
      setIsModalOpen(false);
      loadProblems();
    } catch {
      toast.error("Failed to save problem");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this coding problem?")) return;
    try {
      await deleteCodingProblem(id);
      toast.success("Problem deleted");
      loadProblems();
    } catch {
      toast.error("Failed to delete problem");
    }
  };

  if (!subUnitId) return <div className="p-8 text-center text-slate-500">Select a sub-unit to manage coding problems</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Code className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Coding Problems</h3>
            <p className="text-sm text-slate-600">Practice problems for this sub-unit</p>
          </div>
        </div>
        <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Problem
        </Button>
      </div>

      <div className="space-y-4">
        {problems.map((p) => (
          <Card key={p.id}>
            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold">{p.title}</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditModal(p)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-500"><Trash className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-slate-600 line-clamp-2">{p.description}</p>
            </CardContent>
          </Card>
        ))}
        {problems.length === 0 && (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-xl">
            No coding problems added yet
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editProblem ? "Edit Problem" : "Add Problem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea className="w-full h-32 border rounded-md p-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Test Cases (JSON format for now)</Label>
              <textarea
                className="w-full h-24 border rounded-md p-2 font-mono text-xs"
                value={JSON.stringify(testCases, null, 2)}
                onChange={(e) => {
                  try {
                    setTestCases(JSON.parse(e.target.value));
                  } catch (e) {
                    // silently fail while typing invalid json
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CodingProblemsManager;
