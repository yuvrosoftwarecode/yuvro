import React, { useEffect, useState, useRef } from "react";
import { fetchNotesBySubtopic, createNote, deleteNote, updateNote, Note } from "@/services/courseService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trash2, Plus, StickyNote, BookOpen, Pencil, X, Check, Sparkles } from "lucide-react";
import AIChatContainer from "./Learn/AIChatWidget/AIChatContainer";

const MaterialsView = ({
  materials,
  showHeader = true,
  actions
}: {
  materials: Note[],
  showHeader?: boolean,
  actions?: React.ReactNode
}) => (
  <div className="h-full flex flex-col">
    {showHeader && (
      <div className="flex items-center justify-between mb-4 shrink-0 px-1">
        <div className="flex items-center gap-3 text-gray-900 font-bold tracking-tight font-sans">
          <BookOpen className="w-5 h-5 text-saffron-600" />
          <h2 className="text-base">Study materials</h2>
        </div>
        {actions}
      </div>
    )}

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      {materials.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-slate-50 border-gray-100/60 rounded-xl border border-dashed font-sans">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No study materials available for this topic yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {materials.map((note) => (
            <Card key={note.id} className="border-l-4 border-l-saffron-600 shadow-sm rounded-xl overflow-hidden border-y border-r border-gray-100 bg-white hover:shadow-md transition-all">
              <CardContent className="p-5 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700 font-sans">
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
  showHeader = true,
  actions
}: {
  myNotes: Note[],
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
  showHeader?: boolean,
  actions?: React.ReactNode
}) => (
  <div className="h-full flex flex-col">
    {showHeader && (
      <div className="flex items-center justify-between mb-4 shrink-0 px-1">
        <div className="flex items-center gap-3 text-gray-900 font-bold tracking-tight font-sans">
          <StickyNote className="w-5 h-5 text-saffron-600" />
          <h2 className="text-base">Personal notes</h2>
        </div>
        {actions}
      </div>
    )}

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex flex-col gap-6">
        {/* Create Note Section */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-inner space-y-4">
          <h3 className="font-bold text-gray-900 text-[11px] uppercase tracking-widest ml-1 flex items-center gap-2 font-sans opacity-70">
            <Plus className="w-3.5 h-3.5 text-saffron-600" />
            Add new note
          </h3>
          <Textarea
            placeholder="Write your key takeaways here..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-[120px] bg-white focus:bg-white transition-all resize-none rounded-xl border-gray-100 focus:border-saffron-200 focus:ring-4 focus:ring-saffron-50 shadow-sm font-sans placeholder:text-gray-300"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCreateNote}
              disabled={!newNoteContent.trim() || isCreating}
              size="sm"
              className="bg-saffron-600 hover:bg-saffron-700 text-white rounded-xl px-8 h-10 gap-2 shadow-lg shadow-saffron-200/50 active:scale-95 transition-all font-bold text-sm font-sans"
            >
              <Plus className="w-4 h-4" />
              {isCreating ? "Saving..." : "Save note"}
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
            {myNotes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-100/60 rounded-xl font-sans bg-slate-50/30">
              <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">You haven't added any notes yet.</p>
            </div>
          ) : (
            myNotes.map((note) => (
              <Card key={note.id} className="group hover:border-saffron-100 transition-all shadow-sm hover:shadow-md rounded-xl border-gray-100 overflow-hidden bg-white">
                <CardContent className="p-5">
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px] resize-none rounded-xl border border-gray-100 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 font-sans text-sm"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={cancelEditing} className="rounded-xl border border-gray-200 font-bold text-xs h-9">
                          <X className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateNote(note.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 h-9 font-bold text-xs">
                          <Check className="w-3.5 h-3.5 mr-1" /> Save update
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed flex-1 pt-1 font-sans">
                          {note.content}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(note)}
                            className="text-gray-400 hover:text-saffron-600 hover:bg-saffron-50 h-8 w-8 rounded-lg"
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
                      <div className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest border-t border-gray-50 pt-3 flex items-center gap-1.5 font-sans opacity-70">
                        <div className="w-1.5 h-1.5 rounded-full bg-saffron-100" />
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

const StudentNotes: React.FC<{ subtopicId: string, mode?: 'materials' | 'notes' }> = ({ subtopicId, mode = 'materials' }) => {
  const { user } = useAuth();
  // --- Component State ---
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation State
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Editing State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // AI Buddy State
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiChatPanelWidth, setAiChatPanelWidth] = useState(30); // % initial width for AI chat
  const [chatSessionId, setChatSessionId] = useState(() => `notes-chat-${subtopicId}-${crypto.randomUUID()}`);
  const containerRef = useRef<HTMLDivElement>(null);

  // View Mode Logic
  const viewMode = mode === 'materials' ? 'materials' : 'my-notes';

  // --- Resizing Engine (High Performance) ---
  const [isResizing, setIsResizing] = useState(false);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const onDrag = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    
    if (e.buttons !== 1) {
      stopDrag();
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const containerWidth = rect.width;
      
      const rightEdgeX = containerWidth - relativeX;
      const newWidth = (rightEdgeX / containerWidth) * 100;
      
      if (newWidth >= 15 && newWidth <= 45) {
        containerRef.current.style.setProperty('--ai-chat-width', `${newWidth}%`);
      }
    });
  };

  const startAiChatDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);
  };

  const stopDrag = () => {
    if (isDraggingRef.current && containerRef.current) {
      const finalWidth = containerRef.current.style.getPropertyValue('--ai-chat-width');
      if (finalWidth) {
        setAiChatPanelWidth(parseFloat(finalWidth));
      }
    }
    isDraggingRef.current = false;
    setIsResizing(false);
    document.body.style.cursor = 'default';
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", stopDrag);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, []);

  // --- Helpers & Logic ---
  const getNotesContext = () => {
    const myNotesText = notes.filter(n => n.user === user?.id).map(n => n.content).join("\n- ");
    const materialsText = notes.filter(n => n.user !== user?.id).map(n => n.content).join("\n- ");
    return `
Materials for this subtopic:
${materialsText || "No materials provided."}

Student's Personal Notes:
${myNotesText || "No personal notes yet."}
    `.trim();
  };

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
    return (
      <div className="h-full flex items-center justify-center p-12 bg-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-saffron-600/20 border-t-saffron-600 rounded-full animate-spin" />
          <p className="text-gray-400 font-medium">Loading your materials...</p>
        </div>
      </div>
    );

  const myNotes = notes.filter(n => n.user === user?.id);
  const materials = notes.filter(n => n.user !== user?.id);

  const aiBuddyButton = (
    <Button
      onClick={() => setShowAiChat(!showAiChat)}
      variant="outline"
      size="sm"
      className={`gap-2 rounded-xl border transition-all font-sans font-bold text-sm h-10 px-5 ${showAiChat ? "bg-saffron-600 text-white border-saffron-600 shadow-lg shadow-saffron-200/50" : "bg-white text-saffron-700 border-saffron-100 hover:bg-saffron-50 shadow-sm"}`}
    >
      <Sparkles className={`w-4 h-4 ${showAiChat ? "text-white" : "text-saffron-500"}`} />
      AI Buddy
    </Button>
  );

  const mainView = (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {viewMode === "materials" ? (
          <MaterialsView
            materials={materials}
            actions={aiBuddyButton}
          />
        ) : (
          <MyNotesView
            myNotes={myNotes}
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
            actions={aiBuddyButton}
          />
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="h-full flex overflow-hidden font-sans bg-gray-50 relative"
      style={{
        "--ai-chat-width": `${aiChatPanelWidth}%`
      } as React.CSSProperties}
    >
      {/* Ghost overlay for mouse capture during drag - Now correctly renders on State change */}
      {isResizing && (
        <div className="fixed inset-0 z-[9999] cursor-col-resize bg-transparent" />
      )}

      <div
        className={`h-full flex flex-col overflow-hidden p-6 pt-4 ${!isResizing ? 'transition-all duration-500 ease-in-out' : ''}`}
        style={{ width: showAiChat ? `calc(100% - var(--ai-chat-width))` : "100%" }}
      >
        {mainView}
      </div>

      <div
        className={`h-full flex flex-col shrink-0 relative border-l border-slate-100 ${!isResizing ? 'transition-all duration-500 ease-in-out' : ''} ${showAiChat ? 'opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
        style={{ width: showAiChat ? "var(--ai-chat-width)" : "0%" }}
      >
        {/* INTEGRATED RESIZER HANDLE (hit area sits on top of border) */}
        <div
          onMouseDown={startAiChatDrag}
          className={`absolute top-0 bottom-0 -left-2 w-4 cursor-col-resize z-50 flex items-center justify-center group transition-opacity duration-300 ${showAiChat ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* PILL SHAPE GRIP HANDLE (only visible on hover/drag) */}
          <div className={`w-1.5 h-10 bg-saffron-500 rounded-full transition-all duration-200 shadow-sm ${isResizing ? 'opacity-100 scale-y-110' : 'opacity-0 group-hover:opacity-100'}`} />
        </div>

        <div className="h-full bg-white flex flex-col overflow-hidden">
          <AIChatContainer
            className="w-full flex-1 rounded-none border-none shadow-none"
            style={{ border: 'none', boxShadow: 'none' }}
            contextGetter={getNotesContext}
            welcomeMessage={`Hi! I'm your AI Buddy. Ready to help you with your ${mode === 'materials' ? 'materials' : 'notes'}. Ask me anything!`}
            persistenceKey={chatSessionId}
            chatTitle={`${mode === 'materials' ? 'Materials' : 'My Notes'} - AI Buddy`}
            onNewChat={() => setChatSessionId(`notes-chat-${subtopicId}-${crypto.randomUUID()}`)}
            showHistory={false}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentNotes;
