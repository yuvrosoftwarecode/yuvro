import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Columns, Minimize2, Pencil, Plus, Sparkles, StickyNote, Trash2, X, Brain, Zap, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createNote, deleteNote, fetchNotesBySubUnit, fetchSubUnitById, Note, updateNote, markSubUnitComplete } from '@/services/subjectService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AIChatContainer from './ai-buddy/AIChatContainer';
import StudyMaterialRenderer from '@/components/shared/StudyMaterialRenderer';
import StudyToolkitPanel from './StudyToolkitPanel';

const MaterialsView = ({
  materials,
  isSplitView,
  setIsSplitView,
  isChatOpen,
  setIsChatOpen,
  showHeader = true,
  subunit,
  isMarkedComplete,
  onMarkComplete,
  isToolkitOpen,
  setIsToolkitOpen,
}: {
  materials: Note[];
  isSplitView: boolean;
  setIsSplitView: (value: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (value: boolean) => void;
  showHeader?: boolean;
  subunit?: any;
  isMarkedComplete?: boolean;
  onMarkComplete?: () => void;
  isToolkitOpen?: boolean;
  setIsToolkitOpen?: (v: boolean) => void;
}) => {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'extra-large'>('normal');
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');

  const themeClasses = {
    light: 'bg-white border-gray-150 text-slate-800 shadow-sm',
    sepia: 'bg-[#faf6ee] border-[#e8dfc7] text-[#433422] shadow-md',
    dark: 'bg-slate-950 border-slate-900 text-slate-100 shadow-xl',
  };

  return (
  <div className="h-full flex flex-col">
    {showHeader && (
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2 text-gray-800 font-semibold font-sans">
          <BookOpen className="w-5 h-5 text-slate-900" />
          <h2 className="text-lg">Study Materials</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isSplitView && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSplitView(true)}
              className="gap-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all font-sans"
            >
              <Columns className="w-4 h-4" /> Compare
            </Button>
          )}
          {!isToolkitOpen && setIsToolkitOpen && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsToolkitOpen(true)}
              className="gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans bg-white text-slate-800 border-gray-200"
            >
              <Brain className="w-4 h-4 text-blue-500" />
              Study Toolkit
            </Button>
          )}
          {!isChatOpen && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsChatOpen(true)}
              className="gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans bg-white text-slate-800 border-gray-200"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              AI Mentor
            </Button>
          )}
        </div>
      </div>
    )}

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="mb-8 mt-2 space-y-6">
        {subunit && subunit.content ? (
          <div className={`rounded-3xl p-8 border transition-all duration-300 ${themeClasses[theme]}`}>
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b ${
              theme === 'dark' ? 'border-slate-850' : theme === 'sepia' ? 'border-[#ebdcb6]' : 'border-gray-150'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/45 rounded-2xl shrink-0">
                  <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className={`text-2xl font-extrabold font-sans leading-tight ${
                    theme === 'dark' ? 'text-white' : theme === 'sepia' ? 'text-[#302010]' : 'text-slate-900'
                  }`}>{subunit.name}</h2>
                  <p className={`text-xs mt-1 font-medium ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>â±ï¸ 5 min read &bull; Interactive Study Guide</p>
                </div>
              </div>

              {/* Reading Preferences Control Panel */}
              <div className={`flex items-center gap-4 p-2 rounded-2xl border shrink-0 ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : theme === 'sepia' ? 'bg-[#ebdcb6]/20 border-[#e8dfc7]' : 'bg-gray-50/80 border-gray-150'
              }`}>
                {/* Font Size Adjusters */}
                <div className={`flex items-center border-r pr-3 gap-1 ${
                  theme === 'dark' ? 'border-slate-800' : 'border-gray-200'
                }`}>
                  <button 
                    onClick={() => setFontSize('normal')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      fontSize === 'normal' 
                        ? (theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white shadow-sm text-indigo-600') 
                        : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100')
                    }`}
                  >
                    A
                  </button>
                  <button 
                    onClick={() => setFontSize('large')}
                    className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-all ${
                      fontSize === 'large' 
                        ? (theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white shadow-sm text-indigo-600') 
                        : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100')
                    }`}
                  >
                    A+
                  </button>
                  <button 
                    onClick={() => setFontSize('extra-large')}
                    className={`px-3 py-1 rounded-lg text-md font-extrabold transition-all ${
                      fontSize === 'extra-large' 
                        ? (theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white shadow-sm text-indigo-600') 
                        : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100')
                    }`}
                  >
                    A++
                  </button>
                </div>

                {/* Theme Selectors */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    title="Light Mode"
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      theme === 'light' ? 'ring-2 ring-indigo-500 border-white scale-110' : 'border-gray-300 hover:scale-105'
                    } bg-white`}
                  />
                  <button
                    onClick={() => setTheme('sepia')}
                    title="Sepia Mode"
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      theme === 'sepia' ? 'ring-2 ring-indigo-500 border-white scale-110' : 'border-[#ebdcb6] hover:scale-105'
                    } bg-[#fcf8f2]`}
                  />
                  <button
                    onClick={() => setTheme('dark')}
                    title="Dark Mode"
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      theme === 'dark' ? 'ring-2 ring-indigo-500 border-white scale-110' : 'border-slate-700 hover:scale-105'
                    } bg-slate-900`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* â”€â”€ New Block Renderer â”€â”€ */}
              <StudyMaterialRenderer content={subunit.content} />
            </div>

            {/* Mark as Completed Button */}
            <div className={`mt-12 pt-8 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              theme === 'dark' ? 'border-slate-850' : theme === 'sepia' ? 'border-[#ebdcb6]' : 'border-gray-150'
            }`}>
              <div>
                <h4 className={`font-bold text-sm ${
                  theme === 'dark' ? 'text-white' : theme === 'sepia' ? 'text-[#302010]' : 'text-gray-900'
                }`}>Finished reading?</h4>
                <p className={`text-xs mt-0.5 ${
                  theme === 'dark' ? 'text-slate-450' : 'text-gray-500'
                }`}>Mark this lesson as completed to update your progress dashboard.</p>
              </div>
              <Button
                onClick={onMarkComplete}
                disabled={isMarkedComplete}
                className={`rounded-xl px-5 py-2.5 font-sans font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                  isMarkedComplete 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isMarkedComplete ? 'âœ“ Completed' : 'Mark as Completed'}
              </Button>
            </div>
          </div>
        ) : (() => {
            const articles = [
              HardnessOfWaterArticle,
              FluorideManagementArticle,
              WaterSofteningArticle,
              DesalinationArticle,
              BoilerTroublesArticle,
              BatteryTechnologyArticle,
              FuelSolarCellsArticle,
              CorrosionPrinciplesArticle,
              CorrosionControlArticle,
            ];
            // Deterministic pick based on subunitId so same topic always shows same article
            const key = subunitId || subunitName || subunit?.name || 'default';
            let hash = 0;
            for (let i = 0; i < key.length; i++) { hash += key.charCodeAt(i); }
            const Article = articles[hash % articles.length];
            return <Article />;
          })()
        }
      </div>
      {materials.length === 0 ? (
        <></>
        // <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 font-sans">
        //   <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
        //   <p className="text-sm">No study materials available for this unit yet.</p>
        // </div>
      ) : (
        <div className="space-y-4">
          {materials.map((note) => (
            <Card
              key={note.id}
              className="border-l-4 border-l-slate-900 shadow-sm rounded-xl overflow-hidden border-y border-r border-gray-100 bg-white hover:shadow-md transition-all"
            >
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
};

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
  showHeader = true,
}: {
  myNotes: Note[];
  isSplitView: boolean;
  setIsSplitView: (value: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (value: boolean) => void;
  newNoteContent: string;
  setNewNoteContent: (value: string) => void;
  handleCreateNote: () => void;
  isCreating: boolean;
  editingNoteId: string | null;
  editContent: string;
  setEditContent: (value: string) => void;
  cancelEditing: () => void;
  handleUpdateNote: (id: string) => void;
  handleDeleteNote: (id: string) => void;
  startEditing: (note: Note) => void;
  showHeader?: boolean;
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSplitView(true)}
              className="gap-2 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all font-sans"
            >
              <Columns className="w-4 h-4" /> Compare
            </Button>
          )}
          {!isChatOpen && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsChatOpen(true)}
              className="gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans bg-white text-indigo-800 border-gray-200"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              AI Mentor
            </Button>
          )}
        </div>
      </div>
    )}

    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex flex-col gap-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-inner space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm ml-1 flex items-center gap-2 font-sans">
            <Plus className="w-4 h-4 text-slate-900" />
            Add New Note
          </h3>
          <Textarea
            placeholder="Write your key takeaways here..."
            value={newNoteContent}
            onChange={(event) => setNewNoteContent(event.target.value)}
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
              {isCreating ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {myNotes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl font-sans">
              <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">You haven't added any notes yet.</p>
            </div>
          ) : (
            myNotes.map((note) => (
              <Card
                key={note.id}
                className="group hover:border-slate-300 transition-all shadow-sm hover:shadow-md rounded-2xl border-gray-100 overflow-hidden bg-white"
              >
                <CardContent className="p-5">
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
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
                            className="text-gray-400 hover:text-slate-900 hover:bg-white h-8 w-8 rounded-xl"
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
                        {new Date(note.created_at || '').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
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

const StudentNotes = ({
  subunitId,
  mode = 'materials',
  sessionId,
  onNewSession,
  isMarkedComplete,
  onProgressUpdate,
}: {
  subunitId: string;
  mode?: 'materials' | 'my-notes';
  sessionId?: string;
  onNewSession?: () => void;
  isMarkedComplete?: boolean;
  onProgressUpdate?: () => void;
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const [isSplitView, setIsSplitView] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(30);
  const [isToolkitOpen, setIsToolkitOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const containerWidth = rect.width;
      const rightEdgeX = containerWidth - relativeX;
      const newWidth = (rightEdgeX / containerWidth) * 100;

      if (newWidth >= 20 && newWidth <= 60) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [subunit, setSubunit] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [notesRes, subunitRes] = await Promise.all([
          fetchNotesBySubUnit(subunitId),
          fetchSubUnitById(subunitId),
        ]);
        setNotes(notesRes || []);
        setSubunit(subunitRes || null);
      } catch (error) {
        console.error('Failed to load notes or subunit details', error);
        toast.error('Failed to load study materials');
        setNotes([]);
        setSubunit(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [subunitId]);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsCreating(true);
    try {
      await createNote({
        sub_unit: subunitId,
        content: newNoteContent,
      });
      setNewNoteContent('');
      toast.success('Note added successfully');
      const response = await fetchNotesBySubUnit(subunitId);
      setNotes(response || []);
    } catch (error) {
      console.error('Failed to create note', error);
      toast.error('Failed to save note');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success('Note deleted');
      setNotes(notes.filter((note) => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note', error);
      toast.error('Failed to delete note');
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateNote(noteId, { content: editContent });
      toast.success('Note updated');
      setNotes(notes.map((note) => (note.id === noteId ? { ...note, content: editContent } : note)));
      setEditingNoteId(null);
    } catch (error) {
      console.error('Failed to update note', error);
      toast.error('Failed to update note');
    }
  };

  const handleMarkComplete = async () => {
    try {
      await markSubUnitComplete(subunitId);
      toast.success("Awesome job! Lesson marked as completed ðŸŽ‰");
      if (onProgressUpdate) {
        onProgressUpdate();
      }
    } catch (error) {
      toast.error("Failed to mark lesson as completed");
    }
  };

  if (loading) {
    return <div className="text-muted-foreground p-4 font-sans">Loading notes...</div>;
  }

  const myNotes = notes.filter((note) => note.user === user?.id);
  const materials = notes.filter((note) => note.user !== user?.id);

  const getNotesContext = () => {
    let context = 'Context: Study notes for the current lesson.\n\n';

    if (materials.length > 0) {
      context += '--- Study Materials provided by Instructor ---\n';
      materials.forEach((material, index) => {
        context += `Note ${index + 1}:\n${material.content}\n\n`;
      });
    }

    if (myNotes.length > 0) {
      context += "--- Student's Personal Notes ---\n";
      myNotes.forEach((note, index) => {
        context += `Personal Note ${index + 1}:\n${note.content}\n\n`;
      });
    }

    return context;
  };

  if (isSplitView) {
    return (
      <div
        ref={containerRef}
        className={`h-full flex flex-row bg-white overflow-hidden font-sans ${isDragging ? 'select-none cursor-col-resize' : ''}`}
      >
        <div className="flex flex-col overflow-hidden text-sans" style={{ width: isChatOpen ? `calc(${100 - chatWidth}% - 6px)` : '100%' }}>
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <Columns className="w-4 h-4 text-slate-900" />
              Side-by-Side Comparison
            </div>
            <div className="flex items-center gap-2">
              {!isChatOpen && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsChatOpen(true)}
                  className="gap-2 rounded-xl border shadow-sm hover:shadow-md transition-all font-sans bg-white text-slate-800 border-gray-200"
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  AI Mentor
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSplitView(false)}
                className="text-gray-600 border border-gray-200 rounded-xl hover:bg-white transition-all shadow-sm"
              >
                <Minimize2 className="w-4 h-4 mr-2" /> Exit Split View
              </Button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden text-sans">
            <div className="border-r border-gray-100 p-6 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-6 text-gray-600 font-semibold text-sm shrink-0">
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
                  subunit={subunit}
                  isMarkedComplete={isMarkedComplete}
                  onMarkComplete={handleMarkComplete}
                  isToolkitOpen={isToolkitOpen}
                  setIsToolkitOpen={setIsToolkitOpen}
                />
              </div>
            </div>
            <div className="p-6 flex flex-col overflow-hidden bg-white/30">
              <div className="flex items-center gap-2 mb-6 text-gray-600 font-semibold text-sm shrink-0">
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
              onMouseDown={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
            >
              <div className="w-1 h-12 bg-gray-300 rounded-full shadow-sm" />
            </div>
            <div className="h-full border-l border-gray-100 p-2 animate-in slide-in-from-right duration-300" style={{ width: `${chatWidth}%` }}>
              <AIChatContainer
                className="w-full h-full shadow-none border-none rounded-none"
                welcomeMessage="Hi! I can help you with your notes and materials for this unit."
                persistenceKey={sessionId}
                chatTitle="AI Mentor - Notes"
                onClose={() => setIsChatOpen(false)}
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
    <div ref={containerRef} className={`h-full flex flex-row bg-white overflow-hidden font-sans ${isDragging ? 'select-none cursor-col-resize' : ''}`}>
      <div className="p-6 overflow-hidden" style={{ width: isChatOpen ? `calc(${100 - chatWidth}% - 6px)` : isToolkitOpen ? 'calc(100% - 280px)' : '100%' }}>
        {mode === 'materials' ? (
          <MaterialsView
            materials={materials}
            isSplitView={isSplitView}
            setIsSplitView={setIsSplitView}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            subunit={subunit}
            isMarkedComplete={isMarkedComplete}
            onMarkComplete={handleMarkComplete}
            isToolkitOpen={isToolkitOpen}
            setIsToolkitOpen={setIsToolkitOpen}
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

      {/* Study Toolkit Side Panel */}
      {isToolkitOpen && !isChatOpen && mode === 'materials' && (
        <div className="h-full border-l border-slate-200 flex flex-col bg-white shrink-0" style={{ width: '280px' }}>
          <StudyToolkitPanel
            subunit={subunit}
            onClose={() => setIsToolkitOpen(false)}
          />
        </div>
      )}

      {isChatOpen && (
        <>
          <div
            onMouseDown={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            className="w-3 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shrink-0 -mx-1.5"
          >
            <div className="w-1 h-12 bg-gray-300 rounded-full shadow-sm" />
          </div>
          <div className="h-full border-l border-gray-100 p-2 animate-in slide-in-from-right duration-300" style={{ width: `${chatWidth}%` }}>
            <AIChatContainer
              className="w-full h-full shadow-none border-none rounded-none"
              welcomeMessage={`Hi! I can help you with your ${mode === 'materials' ? 'study materials' : 'personal notes'} for this lesson.`}
              persistenceKey={sessionId}
              chatTitle="AI Mentor - Notes"
              onClose={() => setIsChatOpen(false)}
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