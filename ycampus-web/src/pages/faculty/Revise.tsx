import React, { useState, useEffect, useRef } from 'react';
import RoleSidebar from '../../components/common/RoleSidebar';
import PageHeader from '../../components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Plus,
  Search,
  Save,
  Sparkles,
  Bold,
  List,
  Paperclip,
  Youtube,
  Code2,
  RefreshCw,
  Copy,
  ArrowDownToLine,
  Lightbulb,
  Globe,
  HelpCircle,
  BookOpen,
  Zap,
  FileText,
  ChevronRight,
  Trash2,
  Pencil,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import subjectService, {
  UnitBasic,
  SubUnit,
  Subject,
  Note as BackendNote,
  getFacultyAssignments,
} from '../../services/subjectService';

interface Note {
  id: string;
  title: string;
  content: string;
  subUnitId: string;
  updatedAt: Date;
  isUnsaved?: boolean;
}

const quickActions = [
  {
    label: 'Explain in simple terms',
    icon: Lightbulb,
    prompt: 'Explain the selected content in simple terms for students.',
  },
  {
    label: 'Real-world example',
    icon: Globe,
    prompt: 'Give a real-world example for the selected content.',
  },
  {
    label: '3 classroom questions',
    icon: HelpCircle,
    prompt: 'Create 3 classroom questions based on the content.',
  },
  {
    label: 'Assignment problems',
    icon: BookOpen,
    prompt: 'Generate assignment problems based on this content.',
  },
  {
    label: 'Activity idea',
    icon: Zap,
    prompt: 'Create an engaging classroom activity idea.',
  },
  {
    label: 'Summarize content',
    icon: FileText,
    prompt: 'Summarize the content concisely.',
  },
];

const Revise = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<UnitBasic[]>([]);
  const [subUnits, setSubUnits] = useState<SubUnit[]>([]);

  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [subUnit, setSubUnit] = useState('');

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [noteSearch, setNoteSearch] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeNote = notes.find((n) => n.id === activeNoteId);

  // 1. Fetch Assigned Subjects
  useEffect(() => {
    const fetchAssignedSubjects = async () => {
      try {
        const assignments = await getFacultyAssignments();
        const uniqueSubjects = new Map<string, Subject>();
        assignments.forEach((a) => {
          const subj = a.semester_subject_details?.subject_details;
          if (subj && !uniqueSubjects.has(String(subj.id))) {
            uniqueSubjects.set(String(subj.id), subj);
          }
        });
        const subjectList = Array.from(uniqueSubjects.values());
        setSubjects(subjectList);
        if (subjectList.length > 0 && !subject) {
          setSubject(String(subjectList[0].id));
        }
      } catch (err) {
        console.error('Failed to load subjects', err);
        toast({
          title: 'Error',
          description: 'Failed to load assigned subjects',
          variant: 'destructive',
        });
      }
    };
    fetchAssignedSubjects();
  }, []);

  // 2. Fetch Units when Subject changes
  useEffect(() => {
    if (subject) {
      subjectService
        .getUnits(subject)
        .then((res) => {
          setUnits(res);
          if (res.length > 0) setUnit(String(res[0].id));
          else setUnit('');
        })
        .catch(console.error);
    } else {
      setUnits([]);
      setUnit('');
    }
  }, [subject]);

  // 3. Fetch SubUnits when Unit changes
  useEffect(() => {
    if (unit) {
      subjectService
        .getSubUnits(unit)
        .then((res) => {
          setSubUnits(res);
          if (res.length > 0) setSubUnit(String(res[0].id));
          else setSubUnit('');
        })
        .catch(console.error);
    } else {
      setSubUnits([]);
      setSubUnit('');
    }
  }, [unit]);

  // 4. Fetch Notes when SubUnit changes
  useEffect(() => {
    if (subUnit) {
      subjectService
        .getNotes(subUnit)
        .then((backendNotes: BackendNote[]) => {
          const mappedNotes: Note[] = backendNotes.map((bn) => {
            const lines = bn.content ? bn.content.split('\n') : [];
            let title = 'Untitled Note';
            let contentBody = bn.content || '';
            if (lines.length > 0 && lines[0].startsWith('# ')) {
              title = lines[0].replace('# ', '').trim();
              contentBody = lines.slice(1).join('\n').trim();
            }
            return {
              id: String(bn.id),
              title,
              content: contentBody,
              subUnitId: String(bn.sub_unit),
              updatedAt: bn.updated_at ? new Date(bn.updated_at) : new Date(),
            };
          });
          setNotes(mappedNotes);
          if (mappedNotes.length > 0) setActiveNoteId(mappedNotes[0].id);
          else setActiveNoteId('');
        })
        .catch(console.error);
    } else {
      setNotes([]);
      setActiveNoteId('');
    }
  }, [subUnit]);

  const updateActiveNote = (field: 'title' | 'content', value: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeNoteId
          ? { ...note, [field]: value, updatedAt: new Date(), isUnsaved: true }
          : note
      )
    );
  };

  const createNote = () => {
    if (!subUnit) {
      toast({
        title: 'Select Subunit',
        description: 'Please select a subunit first to create a note.',
        variant: 'destructive',
      });
      return;
    }
    const newNoteId = `temp-${Date.now()}`;
    const newNote: Note = {
      id: newNoteId,
      title: 'Untitled Note',
      content: '',
      subUnitId: subUnit,
      updatedAt: new Date(),
      isUnsaved: true,
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  };

  const saveActiveNote = async () => {
    if (!activeNote) return;
    const saveSubUnitId = activeNote.subUnitId || subUnit;
    if (!saveSubUnitId) {
      toast({ title: 'Error', description: 'Subject/Unit info missing for this note.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const formattedContent = `# ${activeNote.title}\n\n${activeNote.content}`;
      const payload = { content: formattedContent, sub_unit: saveSubUnitId };
      if (activeNote.id.startsWith('temp-')) {
        const created: any = await subjectService.createNote(payload);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === activeNote.id ? { ...n, id: String(created.id), subUnitId: String(created.sub_unit), isUnsaved: false } : n
          )
        );
        setActiveNoteId(String(created.id));
        toast({ title: 'Saved', description: 'New note created in database.' });
      } else {
        await subjectService.updateNote(activeNote.id, payload);
        setNotes((prev) =>
          prev.map((n) => (n.id === activeNote.id ? { ...n, isUnsaved: false } : n))
        );
        toast({ title: 'Saved', description: 'Note changes saved to database.' });
      }
    } catch (err) {
      console.error('Save failed', err);
      toast({ title: 'Error', description: 'Failed to store note in database.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteNoteLocally = async (id: string) => {
    try {
      if (!id.startsWith('temp-')) await subjectService.deleteNote(id);
      const remaining = notes.filter((note) => note.id !== id);
      setNotes(remaining);
      if (activeNoteId === id) setActiveNoteId(remaining[0]?.id || '');
      toast({ title: 'Deleted', description: 'Note removed successfully.' });
    } catch (err) {
      console.error('Delete failed', err);
      toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' });
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current || !activeNote) return;
    const ref = textareaRef.current;
    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    const selectedText = activeNote.content.substring(start, end);
    const replacement = prefix + selectedText + suffix;
    const newContent =
      activeNote.content.substring(0, start) + replacement + activeNote.content.substring(end);
    updateActiveNote('content', newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(noteSearch.toLowerCase())
  );

  const handleAiAction = async (prompt: string) => {
    setAiLoading(true);
    setAiResponse('');
    setTimeout(() => {
      setAiResponse(
        `Here's a response for: "${prompt}"\n\nThis is a simulated AI Teaching Assistant response. In production, this will use the AI gateway to generate contextual, high-quality educational content based on your notes and the selected topic.\n\nKey points:\n• Point 1: Clear explanation with examples\n• Point 2: Practical application\n• Point 3: Common misconceptions addressed`
      );
      setAiLoading(false);
    }, 1500);
  };

  const insertIntoNotes = () => {
    if (activeNote && aiResponse) {
      updateActiveNote('content', `${activeNote.content}\n\n---\n\n${aiResponse}`);
      toast({ title: 'Inserted', description: 'AI content added to your note.' });
    }
  };

  const commitTitleEdit = (noteId: string) => {
    if (editingTitle.trim()) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, title: editingTitle.trim(), isUnsaved: true } : n
        )
      );
    }
    setEditingNoteId(null);
    setEditingTitle('');
  };

  /* ─── Left Notes Panel ───────────────────────────────────────────── */
  const NotesNav = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      {/* Panel header */}
      <div className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">My Notes</h3>

        <Button
          onClick={createNote}
          className="h-10 w-full gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-white border-none shadow-none"
        >
          <Plus className="h-4 w-4" />
          New Note
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search notes..."
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
            className="h-10 rounded-xl bg-slate-100 border-0 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-teal-600"
          />
        </div>
      </div>

      <div className="border-b border-slate-200" />

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-1 p-2">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => {
                if (editingNoteId !== note.id) setActiveNoteId(note.id);
              }}
              className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm ${
                note.id === activeNoteId
                  ? 'bg-orange-50 font-medium text-orange-600'
                  : 'text-slate-500'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2 flex-1 mr-1">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                {editingNoteId === note.id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => commitTitleEdit(note.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitTitleEdit(note.id);
                      if (e.key === 'Escape') { setEditingNoteId(null); setEditingTitle(''); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-white border border-orange-300 rounded-md px-2 py-0.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-orange-400"
                  />
                ) : (
                  <span className="truncate flex-1">{note.title}</span>
                )}
                {note.isUnsaved && editingNoteId !== note.id && (
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 ml-1 shrink-0" />
                )}
              </div>

              {/* Edit + Delete icons */}
              <div className="flex items-center gap-1 shrink-0">
                {editingNoteId === note.id ? (
                  <Check
                    className="h-3.5 w-3.5 text-orange-500"
                    onClick={(e) => { e.stopPropagation(); commitTitleEdit(note.id); }}
                  />
                ) : (
                  <Pencil
                    className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 text-slate-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNoteId(note.id);
                      setEditingTitle(note.title);
                      setActiveNoteId(note.id);
                    }}
                  />
                )}
                <Trash2
                  className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNoteLocally(note.id);
                  }}
                />
              </div>
            </button>
          ))}

          {filteredNotes.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No notes found</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  /* ─── Right AI Panel ─────────────────────────────────────────────── */
  const AiPanel = (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold text-white">AI Teaching Assistant</span>
        </div>
        <p className="text-[13px] text-white/70">Select a quick action or ask anything</p>
      </div>

      {/* Quick actions */}
      <div className="py-1">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleAiAction(action.prompt)}
            disabled={aiLoading}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-500 disabled:opacity-40"
          >
            <action.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{action.label}</span>
            <ChevronRight className="h-4 w-4 opacity-40 shrink-0" />
          </button>
        ))}
      </div>

      <div className="border-t border-slate-200" />

      {/* AI Response area */}
      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="p-4">
          {aiLoading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
              <span className="text-sm">Generating response...</span>
            </div>
          ) : aiResponse ? (
            <div className="space-y-3">
              <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-900">
                {aiResponse}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-xl text-xs border-slate-200 hover:bg-transparent hover:text-current"
                  onClick={insertIntoNotes}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Insert
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-xl text-xs hover:bg-transparent hover:text-current"
                  onClick={() => handleAiAction(quickActions[0].prompt)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-xl text-xs hover:bg-transparent hover:text-current"
                  onClick={() => {
                    navigator.clipboard.writeText(aiResponse);
                    toast({ title: 'Copied!' });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400 px-4">
              Click a quick action to get started
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  /* ─── Page ───────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <RoleSidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <div className="px-6 py-4">
          <PageHeader 
            title="Revise" 
            subtitle="AI Teaching Notebook" 
          />
        </div>

        <div className="flex flex-1 flex-col min-h-0">

          {/* Top toolbar */}
          <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Subject select */}
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-10 w-[170px] rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.subject_name}
                    </SelectItem>
                  ))}
                  {subjects.length === 0 && (
                    <SelectItem value="none" disabled>
                      No subjects
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Unit select */}
              <Select
                value={unit}
                onValueChange={setUnit}
                disabled={!subject || units.length === 0}
              >
                <SelectTrigger className="h-10 w-[170px] rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sub-unit select */}
              <Select
                value={subUnit}
                onValueChange={setSubUnit}
                disabled={!unit || subUnits.length === 0}
              >
                <SelectTrigger className="h-10 w-[170px] rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                  <SelectValue placeholder="Sub-unit" />
                </SelectTrigger>
                <SelectContent>
                  {subUnits.map((su) => (
                    <SelectItem key={su.id} value={String(su.id)}>
                      {su.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-5 mx-1 bg-slate-200 hidden md:block" />

              {/* Save button */}
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-white"
                onClick={saveActiveNote}
                disabled={saving || !activeNote}
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>

              {/* Mobile AI sheet trigger */}
              {isMobile && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button className="h-10 gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-4 text-sm text-white ml-1">
                      <Sparkles className="h-4 w-4" />
                      AI Assist
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 border-slate-200">
                    <SheetHeader className="sr-only">
                      <SheetTitle>AI Teaching Assistant</SheetTitle>
                    </SheetHeader>
                    {AiPanel}
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </header>

          {/* 3-column body */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* Left: notes panel */}
            {!isMobile && (
              <aside className="w-[260px] shrink-0 min-h-0">
                {NotesNav}
              </aside>
            )}

            {/* Center: editor */}
            <main className="flex min-w-0 flex-1 flex-col overflow-y-auto custom-scrollbar bg-white border-r border-slate-200 min-h-0">
              {activeNote ? (
                <div className="mx-auto w-full max-w-4xl flex flex-col min-h-full p-6 md:p-8">
                  {/* Note title */}
                  <input
                    value={activeNote.title}
                    onChange={(e) => updateActiveNote('title', e.target.value)}
                    placeholder="Note title..."
                    className="w-full border-0 bg-transparent text-[24px] font-bold text-slate-900 outline-none placeholder:text-slate-300 focus:ring-0 px-0 mb-6"
                  />

                  {/* Toolbar */}
                  <div className="flex items-center gap-5 rounded-xl border border-slate-200 px-4 py-2 mb-5">
                    {[
                      { icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**') },
                      { icon: List, label: 'Bulleted List', action: () => insertMarkdown('\n- ') },
                      { icon: Paperclip, label: 'Attach file', action: () => insertMarkdown('[Attachment](', ')') },
                      { icon: Youtube, label: 'YouTube link', action: () => insertMarkdown('[Video Title](', ')') },
                      { icon: Code2, label: 'Code block', action: () => insertMarkdown('\n```\n', '\n```\n') },
                    ].map((tool) => (
                      <button
                        key={tool.label}
                        title={tool.label}
                        onClick={tool.action}
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <tool.icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>

                  {/* Editor textarea */}
                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) => updateActiveNote('content', e.target.value)}
                    placeholder="Start writing your lecture notes here..."
                    className="flex-1 w-full resize-none border-0 bg-transparent text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-300 focus:ring-0 px-0"
                  />
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-sm text-slate-400">
                  <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                    <FileText className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-center px-8">
                    {subUnit
                      ? "Select a note from the sidebar or click 'New Note'."
                      : 'Please select a Subject, Unit, and Subunit to view notes.'}
                  </p>
                </div>
              )}
            </main>

            {/* Right: AI panel */}
            {!isMobile && (
              <aside className="w-[320px] shrink-0 min-h-0">
                {AiPanel}
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revise;
