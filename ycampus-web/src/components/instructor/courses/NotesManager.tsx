import React, { useEffect, useState } from "react";
import { fetchNotesBySubtopic, createNote, updateNote, deleteNote } from "@/services/courseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash, Edit, Plus, FileText, StickyNote } from "lucide-react";
import { toast } from "sonner";

const NotesManager = ({ subtopicId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!subtopicId) return;
    loadNotes();
  }, [subtopicId]);

  const loadNotes = async () => {
    try {
      const data = await fetchNotesBySubtopic(subtopicId);
      setNotes(data);
    } catch {
      toast.error("Failed to fetch notes");
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditMode(false);
    setCurrentNote(null);
    setContent("");
    setIsModalOpen(true);
  };

  const openEditModal = (note) => {
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
          sub_topic: subtopicId,
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

  const removeNote = async (id) => {
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
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <StickyNote className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Notes</h3>
            <p className="text-sm text-slate-600">Manage notes and documentation for this subtopic</p>
          </div>
        </div>
        <Button 
          onClick={openCreateModal} 
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* NOTES LIST */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-slate-100 rounded-full mb-4 w-fit mx-auto">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-medium text-slate-700 mb-2">No notes yet</h4>
            <p className="text-slate-500 mb-4">Add your first note to get started</p>
            <Button 
              onClick={openCreateModal}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-slate-600">Note</span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                      {note.content}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditModal(note)}
                    className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeNote(note.id)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="bg-gradient-to-r from-amber-50 to-orange-50 -m-6 mb-0 p-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <StickyNote className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  {editMode ? "Edit Note" : "Add Note"}
                </DialogTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {editMode ? "Update your note content" : "Add a new note to this subtopic"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Note Content</Label>
              <textarea
                className="w-full h-40 p-3 border border-slate-200 rounded-lg resize-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200 focus:outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
              />
              <p className="text-xs text-slate-500">You can use line breaks and formatting in your note</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveNote}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {editMode ? "Save Changes" : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotesManager;
