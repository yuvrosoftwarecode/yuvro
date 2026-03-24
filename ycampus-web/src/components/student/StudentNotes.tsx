import React, { useEffect, useState, useRef } from "react";
import { fetchNotesBySubUnit, createNote, deleteNote, updateNote, Note } from "@/services/subjectService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trash2, Plus, StickyNote, BookOpen, Pencil, X, Check, Columns, Minimize2, Sparkles } from "lucide-react";
import AIChatContainer from "./Learn/AIChatWidget/AIChatContainer";

const MaterialsView = ({
  materials,
  isSplitView,
  setIsSplitView,
  isChatOpen,
  setIsChatOpen,
  showHeader = true
}: {
  materials: Note[],
  isSplitView: boolean,
  setIsSplitView: (val: boolean) => void,
  isChatOpen: boolean,
  setIsChatOpen: (val: boolean) => void,
  showHeader?: boolean
}) => (
  <div className="h-full flex flex-col">
    {showHeader && (
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2 text-gray-800 font-semibold font-sans">
          <BookOpen className="w-5 h-5 text-slate-900" />
          <h2 className="text-lg">Study Materials</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isSplitView && (
            <Button variant="secondary" size="sm" onClick={() => setIsSplitView(true)} className="gap-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all font-sans">
              <Columns className="w-4 h-4" /> Compare
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans ${isChatOpen ? "bg-slate-900 text-white border-slate-900 hover:bg-black" : "bg-white text-slate-800 border-gray-200"}`}
          >
            <Sparkles className={`w-4 h-4 ${isChatOpen ? "text-white" : "text-emerald-500"}`} />
            {isChatOpen ? "Close Buddy" : "AI Buddy"}
          </Button>
        </div>
      </div>
    )}

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      {materials.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 font-sans">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No study materials available for this unit yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {materials.map((note) => (
            <Card key={note.id} className="border-l-4 border-l-slate-900 shadow-sm rounded-xl overflow-hidden border-y border-r border-gray-100 bg-white hover:shadow-md transition-all">
              <CardContent className="p-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-sans">
                {note.content}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  </div>
);

const MyNotesView = ({
  myNotes,
  isSplitView,
  setIsSplitView,
  isChatOpen,
  setIsChatOpen,
  newNoteContent,
  setNewNoteContent,
  handleCreateNote,
  isCreating,
  editingNoteId,
  editContent,
  setEditContent,
  cancelEditing,
  handleUpdateNote,
  handleDeleteNote,
  startEditing,
  showHeader = true
}: {
  myNotes: Note[],
  isSplitView: boolean,
  setIsSplitView: (val: boolean) => void,
  isChatOpen: boolean,
  setIsChatOpen: (val: boolean) => void,
  newNoteContent: string,
  setNewNoteContent: (val: string) => void,
  handleCreateNote: () => void,
  isCreating: boolean,
  editingNoteId: string | null,
  editContent: string,
  setEditContent: (val: string) => void,
  cancelEditing: () => void,
  handleUpdateNote: (id: string) => void,
  handleDeleteNote: (id: string) => void,
  startEditing: (note: Note) => void,
  showHeader?: boolean
}) => (
  <div className="h-full flex flex-col">
    {showHeader && (
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2 text-gray-800 font-semibold font-sans">
          <StickyNote className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg">Personal Notes</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isSplitView && (
            <Button variant="secondary" size="sm" onClick={() => setIsSplitView(true)} className="gap-2 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all font-sans">
              <Columns className="w-4 h-4" /> Compare
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans ${isChatOpen ? "bg-slate-900 text-white border-slate-900 hover:bg-black" : "bg-white text-indigo-800 border-gray-200"}`}
          >
            <Sparkles className={`w-4 h-4 ${isChatOpen ? "text-white" : "text-emerald-500"}`} />
            {isChatOpen ? "Close Buddy" : "AI Buddy"}
          </Button>
        </div>
      </div>
    )}

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex flex-col gap-6">
        {/* Create Note Section */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm ml-1 flex items-center gap-2 font-sans">
            <Plus className="w-4 h-4 text-slate-900" />
            Add New Note
          </h3>
          <Textarea
            placeholder="Write your key takeaways here..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-[120px] bg-white focus:bg-white transition-all resize-none rounded-xl border-gray-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 shadow-sm font-sans"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCreateNote}
              disabled={!newNoteContent.trim() || isCreating}
              size="sm"
              className="bg-slate-900 hover:bg-black text-white rounded-xl px-6 gap-2 shadow-lg shadow-slate-200 active:scale-95 transition-all font-sans"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {myNotes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl font-sans">
              <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">You haven't added any notes yet.</p>
            </div>
          ) : (
            myNotes.map((note) => (
              <Card key={note.id} className="group hover:border-slate-300 transition-all shadow-sm hover:shadow-md rounded-2xl border-gray-100 overflow-hidden bg-white">
                <CardContent className="p-5">
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] resize-none rounded-xl border border-gray-200 focus:ring-4 focus:ring-green-50 focus:border-green-200 font-sans"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={cancelEditing} className="rounded-xl border border-gray-200 font-sans">
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateNote(note.id)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 font-sans">
                          <Check className="w-4 h-4 mr-1" /> Save Update
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed flex-1 pt-1 font-sans">
                          {note.content}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(note)}
                            className="text-gray-400 hover:text-slate-900 hover:bg-slate-50 h-8 w-8 rounded-xl"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-xl"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest border-t border-gray-50 pt-3 flex items-center gap-1.5 font-sans">
                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                        {new Date(note.created_at || "").toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);

// --- Main Component ---

const StudentNotes = ({ subunitId, mode = "materials", sessionId, onNewSession }: { subunitId: string, mode?: "materials" | "my-notes", sessionId?: string, onNewSession?: () => void }) => {
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

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(30); // % width
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const containerWidth = rect.width;
      const rightEdgeX = containerWidth - relativeX;
      const newWidth = (rightEdgeX / containerWidth) * 100;

      // Constraints: 20% to 60%
      if (newWidth >= 20 && newWidth <= 60) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    loadNotes();
  }, [subunitId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await fetchNotesBySubUnit(subunitId);
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
        sub_unit: subunitId,
        content: newNoteContent,
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
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: editContent } : n));
      setEditingNoteId(null);
    } catch (err) {
      console.error("Failed to update note", err);
      toast.error("Failed to update note");
    }
  };

  if (loading)
    return <div className="text-muted-foreground p-4 font-sans">Loading notes...</div>;

  const myNotes = notes.filter(n => n.user === user?.id);
  const materials = notes.filter(n => n.user !== user?.id);

  const getNotesContext = () => {
    let ctx = "Context: Study notes for the current lesson.\n\n";

    if (materials.length > 0) {
      ctx += "--- Study Materials provided by Instructor ---\n";
      materials.forEach((m, idx) => {
        ctx += `Note ${idx + 1}:\n${m.content}\n\n`;
      });
    }

    if (myNotes.length > 0) {
      ctx += "--- Student's Personal Notes ---\n";
      myNotes.forEach((m, idx) => {
        ctx += `Personal Note ${idx + 1}:\n${m.content}\n\n`;
      });
    }

    return ctx;
  };

  if (isSplitView) {
    return (
      <div 
        ref={containerRef}
        className={`h-full flex flex-row bg-white overflow-hidden font-sans ${isDragging ? 'select-none cursor-col-resize' : ''}`}
      >
        <div 
          className="flex flex-col overflow-hidden text-sans"
          style={{ width: isChatOpen ? `calc(${100 - chatWidth}% - 6px)` : '100%' }}
        >
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <Columns className="w-4 h-4 text-slate-900" />
              Side-by-Side Comparison
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans ${isChatOpen ? "bg-slate-900 text-white border-slate-900 hover:bg-black" : "bg-white text-slate-800 border-gray-200"}`}
              >
                <Sparkles className={`w-4 h-4 ${isChatOpen ? "text-white" : "text-emerald-500"}`} />
                {isChatOpen ? "Close Buddy" : "AI Buddy"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsSplitView(false)} className="text-gray-600 border border-gray-200 rounded-xl hover:bg-white transition-all shadow-sm">
                <Minimize2 className="w-4 h-4 mr-2" /> Exit Split View
              </Button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden text-sans">
            {/* Left: Materials */}
            <div className="border-r border-gray-100 p-6 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-6 text-gray-400 font-bold text-[10px] uppercase tracking-[0.15em] shrink-0">
                <BookOpen className="w-3 h-3 text-slate-700" /> Study Materials
              </div>
              <div className="flex-1 overflow-hidden">
                <MaterialsView
                  materials={materials}
                  isSplitView={isSplitView}
                  setIsSplitView={setIsSplitView}
                  isChatOpen={isChatOpen}
                  setIsChatOpen={setIsChatOpen}
                  showHeader={false}
                />
              </div>
            </div>
            {/* Right: Personal Notes */}
            <div className="p-6 flex flex-col overflow-hidden bg-slate-50/30">
              <div className="flex items-center gap-2 mb-6 text-gray-400 font-bold text-[10px] uppercase tracking-[0.15em] shrink-0">
                <StickyNote className="w-3 h-3 text-indigo-500" /> Personal Notes
              </div>
              <div className="flex-1 overflow-hidden">
                <MyNotesView
                  myNotes={myNotes}
                  isSplitView={isSplitView}
                  setIsSplitView={setIsSplitView}
                  isChatOpen={isChatOpen}
                  setIsChatOpen={setIsChatOpen}
                  newNoteContent={newNoteContent}
                  setNewNoteContent={setNewNoteContent}
                  handleCreateNote={handleCreateNote}
                  isCreating={isCreating}
                  editingNoteId={editingNoteId}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  cancelEditing={cancelEditing}
                  handleUpdateNote={handleUpdateNote}
                  handleDeleteNote={handleDeleteNote}
                  startEditing={startEditing}
                  showHeader={false}
                />
              </div>
            </div>
          </div>
        </div>

        {isChatOpen && (
          <>
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
            >
              <div className="w-1 h-12 bg-gray-300 rounded-full shadow-sm" />
            </div>
            <div 
              className="h-full border-l border-gray-100 p-2 animate-in slide-in-from-right duration-300"
              style={{ width: `${chatWidth}%` }}
            >
              <AIChatContainer
                className="w-full h-full shadow-none border-none rounded-none"
                welcomeMessage={`Hi! I can help you with your notes and materials for this unit.`}
                persistenceKey={sessionId}
                chatTitle="AI Buddy - Notes"
                contextGetter={getNotesContext}
                onNewChat={onNewSession}
                showHistory={false}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`h-full flex flex-row bg-white overflow-hidden font-sans ${isDragging ? 'select-none cursor-col-resize' : ''}`}
    >
      <div 
        className="p-6 overflow-hidden"
        style={{ width: isChatOpen ? `calc(${100 - chatWidth}% - 6px)` : '100%' }}
      >
        {mode === "materials" ? (
          <MaterialsView
            materials={materials}
            isSplitView={isSplitView}
            setIsSplitView={setIsSplitView}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
          />
        ) : (
          <MyNotesView
            myNotes={myNotes}
            isSplitView={isSplitView}
            setIsSplitView={setIsSplitView}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            newNoteContent={newNoteContent}
            setNewNoteContent={setNewNoteContent}
            handleCreateNote={handleCreateNote}
            isCreating={isCreating}
            editingNoteId={editingNoteId}
            editContent={editContent}
            setEditContent={setEditContent}
            cancelEditing={cancelEditing}
            handleUpdateNote={handleUpdateNote}
            handleDeleteNote={handleDeleteNote}
            startEditing={startEditing}
          />
        )}
      </div>

      {isChatOpen && (
        <>
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
          >
            <div className="w-1 h-12 bg-gray-300 rounded-full shadow-sm" />
          </div>
          <div 
            className="h-full border-l border-gray-100 p-2 animate-in slide-in-from-right duration-300"
            style={{ width: `${chatWidth}%` }}
          >
            <AIChatContainer
              className="w-full h-full shadow-none border-none rounded-none"
              welcomeMessage={`Hi! I can help you with your ${mode === "materials" ? "study materials" : "personal notes"} for this lesson.`}
              persistenceKey={sessionId}
              chatTitle="AI Buddy - Notes"
              contextGetter={getNotesContext}
              onNewChat={onNewSession}
              showHistory={false}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default StudentNotes;
