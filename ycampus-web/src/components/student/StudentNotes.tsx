import React, { useEffect, useState } from "react";
import { fetchNotesBySubtopic, createNote, deleteNote, updateNote, Note } from "@/services/courseService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trash2, Plus, StickyNote, BookOpen, Pencil, X, Check, Columns, Maximize2, Minimize2 } from "lucide-react";

const StudentNotes = ({ subtopicId, mode = "materials" }: { subtopicId: string, mode?: "materials" | "my-notes" }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation State
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Editing State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Split View State
  const [isSplitView, setIsSplitView] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [subtopicId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await fetchNotesBySubtopic(subtopicId);
      setNotes(res || []);
    } catch (err) {
      console.error("Failed to load notes", err);
      toast.error("Failed to load notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsCreating(true);
    try {
      await createNote({
        sub_topic: subtopicId,
        content: newNoteContent,
        // Backend handles user association
      });
      setNewNoteContent("");
      toast.success("Note added successfully");
      loadNotes(); // Refresh list
    } catch (err) {
      console.error("Failed to create note", err);
      toast.error("Failed to save note");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success("Note deleted");
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      console.error("Failed to delete note", err);
      toast.error("Failed to delete note");
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateNote(noteId, { content: editContent });
      toast.success("Note updated");

      // Update local state
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: editContent } : n));
      setEditingNoteId(null);
    } catch (err) {
      console.error("Failed to update note", err);
      toast.error("Failed to update note");
    }
  };

  if (loading)
    return <div className="text-muted-foreground p-4">Loading notes...</div>;

  // Filter notes
  const myNotes = notes.filter(n => n.user === user?.id);
  const materials = notes.filter(n => n.user !== user?.id);

  // --- Sub-Components ---

  const MaterialsView = ({ showHeader = true }: { showHeader?: boolean }) => (
    <div className="space-y-4 h-full overflow-y-auto">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <BookOpen className="w-5 h-5" />
            <h2>Study Materials</h2>
          </div>
          {!isSplitView && (
            <Button variant="outline" size="sm" onClick={() => setIsSplitView(true)} className="gap-2 rounded-lg">
              <Columns className="w-4 h-4" /> Compare
            </Button>
          )}
        </div>
      )}

      {materials.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No study materials available for this topic yet.</p>
        </div>
      ) : (
        materials.map((note) => (
          <Card key={note.id} className="border-l-4 border-l-blue-500 shadow-sm rounded-lg overflow-hidden border-0 bg-white/80 hover:bg-white transition-colors">
            <CardContent className="p-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {note.content}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const MyNotesView = ({ showHeader = true }: { showHeader?: boolean }) => (
    <div className="space-y-6 h-full overflow-y-auto">
      {showHeader && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <StickyNote className="w-5 h-5" />
            <h2>My Personal Notes</h2>
          </div>
          {!isSplitView && (
            <Button variant="outline" size="sm" onClick={() => setIsSplitView(true)} className="gap-2 rounded-lg">
              <Columns className="w-4 h-4" /> Compare
            </Button>
          )}
        </div>
      )}

      {/* Create Note Section */}
      <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm ml-1">Add New Note</h3>
        <Textarea
          placeholder="Write your key takeaways here..."
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          className="min-h-[100px] bg-gray-50 focus:bg-white transition-colors resize-none rounded-lg border-gray-200 focus:border-blue-300 focus:ring-blue-100"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleCreateNote}
            disabled={!newNoteContent.trim() || isCreating}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {isCreating ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {myNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">You haven't added any notes yet.</p>
          </div>
        ) : (
          myNotes.map((note) => (
            <Card key={note.id} className="group hover:border-blue-200 transition-colors shadow-sm rounded-2xl border-gray-100 overflow-hidden">
              <CardContent className="p-5">
                {editingNoteId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[100px] resize-none rounded-lg"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={cancelEditing} className="rounded-lg">
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleUpdateNote(note.id)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl">
                        <Check className="w-4 h-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed flex-1">
                        {note.content}
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(note)}
                          className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 rounded-lg"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] text-gray-400 font-medium border-t border-gray-50 pt-2">
                      {new Date(note.created_at || "").toLocaleDateString()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  // --- Main Layout ---

  if (isSplitView) {
    return (
      <div className="h-full flex flex-col bg-gray-50/50">
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <Columns className="w-4 h-4 text-blue-600" />
            Side-by-Side Comparison Mode
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsSplitView(false)} className="text-gray-600 hover:bg-gray-100 rounded-lg">
            <Minimize2 className="w-4 h-4 mr-2" /> Exit Split View
          </Button>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
          {/* Left: Materials */}
          <div className="border-r border-gray-200 p-6 overflow-y-auto bg-white">
            <div className="flex items-center gap-2 mb-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
              <BookOpen className="w-3 h-3" /> Materials
            </div>
            <MaterialsView showHeader={false} />
          </div>
          {/* Right: Personal Notes */}
          <div className="p-6 overflow-y-auto bg-gray-50">
            <div className="flex items-center gap-2 mb-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
              <StickyNote className="w-3 h-3" /> My Notes
            </div>
            <MyNotesView showHeader={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50/50 overflow-y-auto">
      {mode === "materials" ? <MaterialsView /> : <MyNotesView />}
    </div>
  );
};

export default StudentNotes;
