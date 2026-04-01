// src/components/admin/subjects/SubjectEdit.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import VideosPanel from "./VideosPanel";
import NotesManager from "./NotesManager";
import QuestionBankManager from "./QuestionBankManager";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "../../admin/AdminSidebar";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  Edit3,
  Plus,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Video,
  FileQuestion,
  FileText,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchSubjectById,
  updateSubject,
  deleteSubject,
  fetchUnitsBySubject,
  createUnit,
  updateUnit,
  deleteUnit,
  fetchSubUnitsByUnit,
  createSubUnit,
  updateSubUnit,
  deleteSubUnit,
} from "@/services/subjectService";


interface Subject {
  id: string;
  short_code: string | null;
  subject_name: string;
  yuvro_id?: string;
}

interface Unit {
  id: string;
  name: string;
  order_index: number;
  subject: string;
}

interface SubUnit {
  id: string;
  name: string;
  order_index: number;
  unit: string;
  content?: string | null;
}

const SubjectEdit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: subjectId } = useParams<{ id: string }>();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [subUnitsMap, setSubUnitsMap] = useState<Record<string, SubUnit[]>>({});
  const [savingSubject, setSavingSubject] = useState(false);

  // Unit modal
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitModalMode, setUnitModalMode] = useState<"create" | "edit">("create");
  const [unitEditing, setUnitEditing] = useState<Unit | null>(null);
  const [unitNameValue, setUnitNameValue] = useState("");
  const [unitOrderValue, setUnitOrderValue] = useState<number | null>(null);
  const [savingUnit, setSavingUnit] = useState(false);

  // SubUnit modal
  const [isSubUnitModalOpen, setIsSubUnitModalOpen] = useState(false);
  const [subUnitModalMode, setSubUnitModalMode] = useState<"create" | "edit">("create");
  const [subUnitEditing, setSubUnitEditing] = useState<SubUnit | null>(null);
  const [subUnitNameValue, setSubUnitNameValue] = useState("");
  const [subUnitOrderValue, setSubUnitOrderValue] = useState<number | null>(null);
  const [subUnitContentValue, setSubUnitContentValue] = useState("");
  const [savingSubUnit, setSavingSubUnit] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "subject" | "unit" | "sub-unit";
    id?: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Selected unit and sub-unit (for right panel)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedSubUnit, setSelectedSubUnit] = useState<SubUnit | null>(null);

  // Right-panel tab state
  const [rightTab, setRightTab] = useState<"videos" | "notes" | "questions">("questions");

  // Subject editing state
  const [editSubjectValues, setEditSubjectValues] = useState({
    subject_name: "",
    short_code: "",
  });

  // Load data
  useEffect(() => {
    loadSubject();
  }, [subjectId]);

  const loadSubject = async () => {
    if (!subjectId) return;
    setLoading(true);

    try {
      const s = await fetchSubjectById(subjectId);
      setSubject(s as Subject);

      setEditSubjectValues({
        subject_name: s.subject_name || s.name || "",
        short_code: s.short_code || "",
      });

      const u = await fetchUnitsBySubject(subjectId);
      setUnits(u as Unit[]);

      const expanded: Record<string, boolean> = {};
      (u as Unit[]).forEach((unit) => (expanded[unit.id] = false));
      setExpandedUnits(expanded);

      setSubUnitsMap({});
      setSelectedSubUnit(null);
    } catch (err) {
      toast.error("Failed to load subject");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandUnit = async (unitId: string) => {
    const currentlyExpanded = !!expandedUnits[unitId];

    if (!currentlyExpanded && !subUnitsMap[unitId]) {
      try {
        const subs = await fetchSubUnitsByUnit(unitId);
        setSubUnitsMap((prev) => ({ ...prev, [unitId]: subs as SubUnit[] }));
      } catch (err) {
        toast.error("Failed to load sub-units");
        console.error(err);
      }
    }

    setExpandedUnits((prev) => ({ ...prev, [unitId]: !currentlyExpanded }));
  };

  const handleSaveSubject = async () => {
    if (!subject) return;
    setSavingSubject(true);

    try {
      const payload = {
        subject_name: editSubjectValues.subject_name,
        short_code: editSubjectValues.short_code || null,
      };

      await updateSubject(subject.id, payload);
      toast.success("Subject updated successfully");
      await loadSubject();
    } catch (err) {
      toast.error("Failed to update subject");
      console.error(err);
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!subject) return;
    setDeleting(true);
    try {
      await deleteSubject(subject.id);
      toast.success("Subject deleted");
      navigate("/admin/subjects");
    } catch (err) {
      toast.error("Failed to delete subject");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  // Unit CRUD
  const openCreateUnitModal = () => {
    setUnitModalMode("create");
    setUnitEditing(null);
    setUnitNameValue("");
    setUnitOrderValue(null);
    setIsUnitModalOpen(true);
  };

  const openEditUnitModal = (unit: Unit) => {
    setUnitModalMode("edit");
    setUnitEditing(unit);
    setUnitNameValue(unit.name);
    setUnitOrderValue(unit.order_index ?? null);
    setIsUnitModalOpen(true);
  };

  const saveUnit = async () => {
    if (!subject) return;
    if (!unitNameValue.trim()) {
      toast.error("Unit name is required");
      return;
    }

    setSavingUnit(true);
    try {
      if (unitModalMode === "create") {
        const payload = {
          name: unitNameValue,
          subject: subject.id,
          order_index: unitOrderValue ?? 0,
        };
        const created = await createUnit(payload);
        setUnits((prev) => [...prev, created as Unit]);
        toast.success("Unit added");
      } else if (unitEditing) {
        const payload = {
          name: unitNameValue,
          order_index: unitOrderValue ?? unitEditing.order_index,
          subject: unitEditing.subject,
        };
        const updated = (await updateUnit(unitEditing.id, payload)) as any;
        setUnits((prev) => prev.map((u) => (u.id === updated.id ? (updated as Unit) : u)));
        toast.success("Unit updated");
      }
      setIsUnitModalOpen(false);
    } catch (err) {
      toast.error("Failed to save unit");
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (unitId?: string) => {
    if (!unitId) return;
    setDeleting(true);
    try {
      await deleteUnit(unitId);
      setUnits((prev) => prev.filter((u) => u.id !== unitId));
      setSubUnitsMap((prev) => {
        const copy = { ...prev };
        delete copy[unitId];
        return copy;
      });
      if (selectedSubUnit && selectedSubUnit.unit === unitId) {
        setSelectedSubUnit(null);
      }
      toast.success("Unit deleted");
    } catch (err) {
      toast.error("Failed to delete unit");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  // SubUnit CRUD
  const openCreateSubUnitModal = (unitId: string) => {
    setSubUnitModalMode("create");
    setSubUnitEditing({ id: "", name: "", order_index: 0, unit: unitId });
    setSubUnitNameValue("");
    setSubUnitOrderValue(null);
    setSubUnitContentValue("");
    setIsSubUnitModalOpen(true);
  };

  const openEditSubUnitModal = (sub: SubUnit) => {
    setSubUnitModalMode("edit");
    setSubUnitEditing(sub);
    setSubUnitNameValue(sub.name);
    setSubUnitOrderValue(sub.order_index ?? null);
    setSubUnitContentValue(sub.content ?? "");
    setIsSubUnitModalOpen(true);
  };

  const saveSubUnit = async () => {
    if (!subUnitEditing) return;
    if (!subUnitNameValue.trim()) {
      toast.error("Sub-unit name required");
      return;
    }

    setSavingSubUnit(true);
    try {
      if (subUnitModalMode === "create") {
        const payload = {
          name: subUnitNameValue,
          unit: subUnitEditing.unit,
          order_index: subUnitOrderValue ?? 0,
          content: subUnitContentValue || "",
        };
        const created = await createSubUnit(payload);
        setSubUnitsMap((prev) => {
          const arr = prev[subUnitEditing.unit] || [];
          return { ...prev, [subUnitEditing.unit]: [...arr, created as SubUnit] };
        });
        toast.success("Sub-unit created");
      } else {
        const payload = {
          name: subUnitNameValue,
          order_index: subUnitOrderValue ?? subUnitEditing.order_index,
          content: subUnitContentValue,
          unit: subUnitEditing.unit,
        };
        const updated = (await updateSubUnit(subUnitEditing.id, payload)) as any;
        setSubUnitsMap((prev) => {
          const arr = prev[updated.unit] || [];
          return { ...prev, [updated.unit]: arr.map((s) => (s.id === updated.id ? (updated as SubUnit) : s)) };
        });
        if (selectedSubUnit && selectedSubUnit.id === updated.id) {
          setSelectedSubUnit(updated as SubUnit);
        }
        toast.success("Sub-unit updated");
      }
      setIsSubUnitModalOpen(false);
    } catch (err) {
      toast.error("Failed to save sub-unit");
    } finally {
      setSavingSubUnit(false);
    }
  };

  const handleDeleteSubUnit = async (subUnitId?: string) => {
    if (!subUnitId) return;
    setDeleting(true);
    try {
      await deleteSubUnit(subUnitId);
      setSubUnitsMap((prev) => {
        const copy = { ...prev };
        for (const key of Object.keys(copy)) {
          copy[key] = copy[key].filter((s) => s.id !== subUnitId);
        }
        return copy;
      });
      if (selectedSubUnit && selectedSubUnit.id === subUnitId) {
        setSelectedSubUnit(null);
      }
      toast.success("Sub-unit deleted");
    } catch (err) {
      toast.error("Failed to delete sub-unit");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  if (!subjectId) return <div className="min-h-screen flex items-center justify-center">No subject selected</div>;
  if (loading) return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50/50 w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="flex justify-center flex-col items-center h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground font-medium">Loading Subject Structure...</p>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50/50 w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 overflow-y-auto w-full">
          <div className="w-full">
            {/* Header Replacement */}
            <div className="bg-background border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{subject?.subject_name || 'Loading Subject...'}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {subject ? `${subject.yuvro_id ? `ID: ${subject.yuvro_id}` : ''}${subject.short_code ? ` • Code: ${subject.short_code}` : ''}` : 'Loading...'}
                </p>
              </div>
              <Button
                variant="outline"
                className="shadow-sm font-semibold"
                onClick={() => navigate("/admin/subjects/global")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Root Catalog
              </Button>
            </div>

            <main className="p-6">
              <div className="h-[calc(100vh-120px)] w-full flex gap-6">
            {/* Left Sidebar */}
            <div className="w-[360px] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-200/60 bg-gradient-to-r from-amber-50 to-orange-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Layers3 className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Structure</h3>
                      <p className="text-xs text-slate-600">Units & Sub-units</p>
                    </div>
                  </div>
                  <Button onClick={openCreateUnitModal} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm text-xs px-2 py-1 cursor-pointer">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {units.map((unit) => {
                    const expanded = !!expandedUnits[unit.id];
                    const subs = subUnitsMap[unit.id] || [];
                    const isSelected = selectedUnit?.id === unit.id;

                    return (
                      <div key={unit.id} className={`group backdrop-blur-sm border rounded-lg p-3 hover:shadow-md transition-all duration-200 cursor-pointer ${isSelected ? "bg-amber-50/80 border-amber-200 shadow-sm" : "bg-white/70 border-slate-200/60"}`} onClick={async () => {
                        if (isSelected && !selectedSubUnit) {
                          await toggleExpandUnit(unit.id);
                        } else if (isSelected && selectedSubUnit) {
                          setSelectedSubUnit(null);
                        } else {
                          setSelectedUnit(unit);
                          setSelectedSubUnit(null);
                          if (!expanded) await toggleExpandUnit(unit.id);
                        }
                      }}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className={`font-medium text-sm transition-colors ${isSelected ? "text-amber-700" : "text-slate-900 group-hover:text-amber-700"}`}>
                              {unit.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditUnitModal(unit); }} className="h-6 w-6 p-0 hover:bg-amber-50 hover:text-amber-600 cursor-pointer">
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "unit", id: unit.id }); }} className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 cursor-pointer">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {expanded && (
                          <div className="mt-3 pt-3 border-t border-slate-200/60">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-medium text-slate-700 flex items-center gap-1">Sub-units</div>
                              <Button size="sm" onClick={() => openCreateSubUnitModal(unit.id)} variant="outline" className="h-6 text-xs border-amber-200 text-amber-600 hover:bg-amber-50 px-2 cursor-pointer">
                                <Plus className="w-2 h-2 mr-1" /> Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {subs.map((s) => (
                                <div key={s.id} className={`group p-2 rounded-md border cursor-pointer transition-all duration-200 ${selectedSubUnit?.id === s.id ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white border-slate-200/60 hover:bg-white"}`} onClick={(e) => { e.stopPropagation(); setSelectedSubUnit(s); setSelectedUnit(unit); setRightTab("videos"); }}>
                                  <div className="flex items-center justify-between">
                                    <div className={`font-medium text-xs ${selectedSubUnit?.id === s.id ? "text-amber-900" : "text-slate-800"}`}>{s.name}</div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditSubUnitModal(s); }} className="h-5 w-5 p-0 hover:bg-amber-50 cursor-pointer"><Edit3 className="w-2.5 h-2.5" /></Button>
                                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "sub-unit", id: s.id }); }} className="h-5 w-5 p-0 hover:bg-red-50 cursor-pointer"><Trash2 className="w-2.5 h-2.5" /></Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel */}
            <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-indigo-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Management</h3>
                    <p className="text-sm text-slate-600 mt-1">{selectedSubUnit ? `Sub-unit: ${selectedSubUnit.name}` : "Select a sub-unit"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedSubUnit && (
                      <>
                        <Button variant={rightTab === "videos" ? "default" : "outline"} onClick={() => setRightTab("videos")} className="gap-2 cursor-pointer transition-all"><Video className="w-4 h-4" /> Videos</Button>
                        <Button variant={rightTab === "notes" ? "default" : "outline"} onClick={() => setRightTab("notes")} className="gap-2 cursor-pointer transition-all"><FileText className="w-4 h-4" /> Notes</Button>
                      </>
                    )}
                    <Button variant={rightTab === "questions" ? "default" : "outline"} onClick={() => setRightTab("questions")} className="gap-2 cursor-pointer transition-all"><FileQuestion className="w-4 h-4" /> Question Bank</Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {rightTab === "questions" ? (
                  <QuestionBankManager
                    subject={subject}
                    selectedUnit={selectedUnit}
                    selectedSubUnit={selectedSubUnit}
                    units={units}
                  />
                ) : rightTab === "videos" && selectedSubUnit ? (
                  <VideosPanel subUnitId={selectedSubUnit.id} />
                ) : rightTab === "notes" && selectedSubUnit ? (
                  <NotesManager subUnitId={selectedSubUnit.id} />
                ) : (
                  <div className="p-12 text-center text-slate-500">Select a sub-unit to manage content</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
    </div>

      {/* Unit Modal */}
  <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
    <DialogContent>
      <DialogHeader><DialogTitle>{unitModalMode === "create" ? "Add Unit" : "Edit Unit"}</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <Label>Unit Name</Label>
        <Input value={unitNameValue} onChange={(e) => setUnitNameValue(e.target.value)} />
        <Label>Order Index</Label>
        <Input type="number" value={unitOrderValue ?? ""} onChange={(e) => setUnitOrderValue(Number(e.target.value))} />
      </div>
      <DialogFooter>
        <Button variant="outline" className="cursor-pointer" onClick={() => setIsUnitModalOpen(false)}>Cancel</Button>
        <Button className="cursor-pointer" onClick={saveUnit}>{savingUnit ? "Saving..." : "Save"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* SubUnit Modal */ }
  <Dialog open={isSubUnitModalOpen} onOpenChange={setIsSubUnitModalOpen}>
    <DialogContent>
      <DialogHeader><DialogTitle>{subUnitModalMode === "create" ? "Add Sub-unit" : "Edit Sub-unit"}</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <Label>Sub-unit Name</Label>
        <Input value={subUnitNameValue} onChange={(e) => setSubUnitNameValue(e.target.value)} />
        <Label>Content (Markdown)</Label>
        <textarea className="w-full h-32 border rounded p-2" value={subUnitContentValue} onChange={(e) => setSubUnitContentValue(e.target.value)} />
      </div>
      <DialogFooter>
        <Button variant="outline" className="cursor-pointer" onClick={() => setIsSubUnitModalOpen(false)}>Cancel</Button>
        <Button className="cursor-pointer" onClick={saveSubUnit}>{savingSubUnit ? "Saving..." : "Save"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* Delete Confirmation Modal */}
  <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="text-destructive flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Confirm Deletion
        </DialogTitle>
      </DialogHeader>
      <div className="py-2">
        <p className="text-sm text-foreground">
          Are you sure you want to permanently delete this {confirmDelete?.type}?
          This action cannot be undone.
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirmDelete?.type === 'subject') handleDeleteSubject();
            else if (confirmDelete?.type === 'unit') handleDeleteUnit(confirmDelete.id);
            else if (confirmDelete?.type === 'sub-unit') handleDeleteSubUnit(confirmDelete.id);
          }}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Confirm Delete"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</SidebarProvider>
  );
};

export default SubjectEdit;