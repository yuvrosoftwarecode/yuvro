// src/components/instructor/subjects/NotesManager.tsx
import React, { useEffect, useState } from "react";
import { fetchNotesBySubUnit, createNote, updateNote, deleteNote } from "@/services/subjectService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash, Edit, Plus, FileText, StickyNote } from "lucide-react";
import { toast } from "sonner";

interface NotesManagerProps {
  subUnitId: string;
}

const NotesManager: React.FC<NotesManagerProps> = ({ subUnitId }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentNote, setCurrentNote] = useState<any>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!subUnitId) return;
    loadNotes();
  }, [subUnitId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await fetchNotesBySubUnit(subUnitId);
      setNotes(data);
    } catch {
      toast.error("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setCurrentNote(null);
    setContent("");
    setIsModalOpen(true);
  };

  const openEditModal = (note: any) => {
    setEditMode(true);
    setCurrentNote(note);
    setContent(note.content);
    setIsModalOpen(true);
  };

  const saveNote = async () => {
    if (!content.trim()) return toast.error("Content required");

    try {
      if (editMode && currentNote) {
        const updated = await updateNote(currentNote.id, { content });
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        toast.success("Note updated");
      } else {
        const created = await createNote({
          sub_unit: subUnitId,
          content,
        });
        setNotes((prev) => [...prev, created]);
        toast.success("Note created");
      }
      setIsModalOpen(false);
    } catch {
      toast.error("Failed to save note");
    }
  };

  const removeNote = async (id: string) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        Loading notes...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <StickyNote className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Notes</h3>
            <p className="text-sm text-slate-600">Manage notes for this sub-unit</p>
          </div>
        </div>
        <Button onClick={openCreateModal} className="bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
            No notes yet. Add your first note to get started.
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1 whitespace-pre-wrap text-slate-800">{note.content}</div>
                <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(note)} className="h-8 w-8 text-slate-400 hover:text-amber-600">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeNote(note.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Note" : "Add Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Note Content</Label>
            <textarea
              className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={saveNote} className="bg-amber-600 hover:bg-amber-700 text-white">
              {editMode ? "Save Changes" : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotesManager;
