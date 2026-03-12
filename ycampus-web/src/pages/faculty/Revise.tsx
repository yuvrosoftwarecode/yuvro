import React, { useState, useEffect, useRef } from 'react';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
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
  Upload,
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import subjectService, { UnitBasic, SubUnit, Subject, Note as BackendNote, getFacultyAssignments } from '../../services/subjectService';

interface Note {
  id: string; // Will be real ID from backend or empty string if unsaved
  title: string;
  content: string;
  updatedAt: Date;
  isUnsaved?: boolean; // Help track unsaved new notes
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
        assignments.forEach(a => {
          const subj = a.semester_subject_details?.subject_details;
          if (subj && !uniqueSubjects.has(String(subj.id))) {
            uniqueSubjects.set(String(subj.id), subj);
          }
        });
        const subjectList = Array.from(uniqueSubjects.values());
        setSubjects(subjectList);
        
        // Auto-select first subject if none selected
        if (subjectList.length > 0 && !subject) {
            setSubject(String(subjectList[0].id));
        }
      } catch (err) {
        console.error("Failed to load subjects", err);
        toast({ title: 'Error', description: 'Failed to load assigned subjects', variant: 'destructive' });
      }
    };
    fetchAssignedSubjects();
  }, []); // Run once on mount

  // 2. Fetch Units when Subject changes
  useEffect(() => {
    if (subject) {
      subjectService.getUnits(subject).then(res => {
          setUnits(res);
          // Auto-select first unit
          if (res.length > 0) {
              setUnit(String(res[0].id));
          } else {
              setUnit('');
          }
      }).catch(console.error);
    } else {
      setUnits([]);
      setUnit('');
    }
  }, [subject]);

  // 3. Fetch SubUnits when Unit changes
  useEffect(() => {
    if (unit) {
      subjectService.getSubUnits(unit).then(res => {
          setSubUnits(res);
          // Auto-select first subunit
          if (res.length > 0) {
              setSubUnit(String(res[0].id));
          } else {
              setSubUnit('');
          }
      }).catch(console.error);
    } else {
      setSubUnits([]);
      setSubUnit('');
    }
  }, [unit]);

  // 4. Fetch Notes when SubUnit changes
  useEffect(() => {
    if (subUnit) {
      subjectService.getNotes(subUnit).then((backendNotes: BackendNote[]) => {
        const mappedNotes: Note[] = backendNotes.map(bn => {
            // Because the backend note model only has a 'content' field in this schema,
            // we will simulate 'title' by extracting the first line, or use a default.
            const lines = bn.content ? bn.content.split('\n') : [];
            let title = "Untitled Note";
            let contentBody = bn.content || "";
            
            if (lines.length > 0 && lines[0].startsWith('# ')) {
                title = lines[0].replace('# ', '').trim();
                contentBody = lines.slice(1).join('\n').trim();
            }

            return {
                id: String(bn.id),
                title: title,
                content: contentBody,
                updatedAt: bn.updated_at ? new Date(bn.updated_at) : new Date(),
            };
        });
        setNotes(mappedNotes);
        if (mappedNotes.length > 0) setActiveNoteId(mappedNotes[0].id);
        else setActiveNoteId('');
      }).catch(console.error);
    } else {
      setNotes([]);
      setActiveNoteId('');
    }
  }, [subUnit]);

  const updateActiveNote = (field: 'title' | 'content', value: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeNoteId
          ? { ...note, [field]: value, updatedAt: new Date(), isUnsaved: note.isUnsaved !== false }
          : note
      )
    );
  };

  const createNote = () => {
    if (!subUnit) {
        toast({ title: 'Select Subunit', description: 'Please select a subunit first to create a note.', variant: 'destructive' });
        return;
    }
    const newNoteId = `temp-${Date.now()}`;
    const newNote: Note = {
      id: newNoteId,
      title: 'Untitled Note',
      content: '',
      updatedAt: new Date(),
      isUnsaved: true,
    };

    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  };

  const saveActiveNote = async () => {
      if (!activeNote || !subUnit) return;
      
      try {
          setSaving(true);
          const formattedContent = `# ${activeNote.title}\n\n${activeNote.content}`;
          const payload = {
              content: formattedContent,
              sub_unit: subUnit
          };

          if (activeNote.id.startsWith('temp-')) {
              // Create new note
              const created: any = await subjectService.createNote(payload);
              
              setNotes(prev => prev.map(n => n.id === activeNote.id ? {
                  ...n,
                  id: String(created.id),
                  isUnsaved: false
              } : n));
              setActiveNoteId(String(created.id));
              toast({ title: 'Saved', description: 'New note created successfully.' });
          } else {
              // Update existing note
              await subjectService.updateNote(activeNote.id, payload);
              setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, isUnsaved: false } : n));
              toast({ title: 'Saved', description: 'Note updated successfully.' });
          }
      } catch (err) {
          console.error("Save failed", err);
          toast({ title: 'Error', description: 'Failed to save note.', variant: 'destructive' });
      } finally {
          setSaving(false);
      }
  };

  const deleteNoteLocally = async (id: string) => {
    try {
        if (!id.startsWith('temp-')) {
            await subjectService.deleteNote(id);
        }
        
        const remaining = notes.filter((note) => note.id !== id);
        setNotes(remaining);

        if (activeNoteId === id) {
            setActiveNoteId(remaining[0]?.id || '');
        }
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
      
      const newContent = activeNote.content.substring(0, start) + replacement + activeNote.content.substring(end);
      updateActiveNote('content', newContent);
      
      // Delay to allow React to update the value before resetting cursor
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
      toast({
        title: 'Inserted',
        description: 'AI content added to your note.',
      });
    }
  };

  const handlePublish = () => {
    toast({
      title: 'Published',
      description: 'Notes published to students. Currently simulated as visibility toggles are pending backend.',
    });
  };

  const NotesNav = (
    <div className="flex h-full flex-col border-r border-gray-300 bg-white">
      <div className="space-y-3 p-4">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">My Notes</h3>

        <Button
          onClick={createNote}
          size="sm"
          className="w-full gap-1.5 rounded-xl bg-orange-500 text-xs text-white hover:bg-orange-600 border-none transition-none shadow-none"
        >
          <Plus className="h-3.5 w-3.5" />
          New Note
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
            className="h-8 rounded-lg border-gray-300 bg-white pl-8 text-xs focus-visible:ring-1 focus-visible:ring-orange-500"
          />
        </div>
      </div>

      <Separator className="bg-gray-300" />

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-1 p-2">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-none ${
                note.id === activeNoteId
                  ? 'bg-orange-50 font-medium text-orange-600'
                  : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{note.title}</span>
                {note.isUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-1"></span>}
              </div>

              <Trash2
                className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-500 transition-none"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNoteLocally(note.id);
                }}
              />
            </button>
          ))}

          {filteredNotes.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No notes found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const AiPanel = (
    <div className="flex h-full flex-col border-l border-gray-300 bg-white">
      <div className="space-y-1 rounded-b-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">AI Teaching Assistant</span>
        </div>
        <p className="text-[11px] text-white/90">
          Select a quick action or ask anything
        </p>
      </div>

      <div className="space-y-1.5 p-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleAiAction(action.prompt)}
            disabled={aiLoading}
            className="flex w-full flex-wrap items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-muted-foreground transition-none hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40"
          >
            <action.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{action.label}</span>
            <ChevronRight className="ml-auto h-3 w-3 opacity-40 shrink-0" />
          </button>
        ))}
      </div>

      <Separator className="bg-gray-300" />

      <ScrollArea className="flex-1 p-4 custom-scrollbar">
        {aiLoading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin text-orange-500" />
            <span className="text-xs">Generating response...</span>
          </div>
        ) : aiResponse ? (
          <div className="space-y-3">
            <div className="whitespace-pre-wrap rounded-xl border border-gray-300 bg-gray-50 p-3 text-xs leading-relaxed text-foreground">
              {aiResponse}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-lg text-[10px] border-gray-300 transition-none"
                onClick={insertIntoNotes}
              >
                <ArrowDownToLine className="h-3 w-3" />
                Insert
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 rounded-lg text-[10px] transition-none"
                onClick={() => handleAiAction(quickActions[0].prompt)}
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 rounded-lg text-[10px] transition-none"
                onClick={() => {
                  navigator.clipboard.writeText(aiResponse);
                  toast({ title: 'Copied!' });
                }}
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-xs text-muted-foreground px-4">
            Click a quick action to get started and generate content
          </p>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <RoleSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <RoleHeader title="Revise" />
        <div className="flex flex-1 flex-col bg-slate-50 relative min-h-0">
          
          <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-gray-300 bg-white px-4 py-3 md:px-6">
            <h1 className="whitespace-nowrap text-base font-semibold text-foreground">
              Revise – AI Teaching Notebook
            </h1>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-8 w-[140px] md:w-[160px] rounded-lg text-xs border-gray-300 bg-white">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.subject_name}
                    </SelectItem>
                  ))}
                  {subjects.length === 0 && <SelectItem value="none" disabled>No subjects</SelectItem>}
                </SelectContent>
              </Select>

              <Select value={unit} onValueChange={setUnit} disabled={!subject || units.length === 0}>
                <SelectTrigger className="h-8 w-[140px] md:w-[180px] rounded-lg text-xs border-gray-300 bg-white">
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subUnit} onValueChange={setSubUnit} disabled={!unit || subUnits.length === 0}>
                  <SelectTrigger className="h-8 w-[140px] md:w-[180px] rounded-lg text-xs border-gray-300 bg-white">
                      <SelectValue placeholder="Select Subunit" />
                  </SelectTrigger>
                  <SelectContent>
                      {subUnits.map((su) => (
                          <SelectItem key={su.id} value={String(su.id)}>
                              {su.name}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-5 mx-1 bg-gray-300 hidden md:block" />

              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 rounded-lg text-xs border-gray-300 bg-white transition-none"
                onClick={saveActiveNote}
                disabled={saving || !subUnit || !activeNote}
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>

              <Button
                size="sm"
                className="h-8 gap-1 rounded-lg bg-orange-500 text-xs text-white hover:bg-orange-600 transition-none shadow-none"
                onClick={handlePublish}
              >
                <Upload className="h-3.5 w-3.5" />
                Publish
              </Button>

              {isMobile && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 border-none transition-none shadow-none text-xs text-white ml-2"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Assist
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 border-gray-300">
                    <SheetHeader className="sr-only">
                      <SheetTitle>AI Teaching Assistant</SheetTitle>
                    </SheetHeader>
                    {AiPanel}
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden min-h-0">
            {!isMobile && (
              <aside className="flex w-[240px] shrink-0 flex-col bg-white min-h-0">
                {NotesNav}
              </aside>
            )}

            <main className="flex min-w-0 flex-1 flex-col overflow-y-auto custom-scrollbar bg-white min-h-0">
              {activeNote ? (
                <div className="mx-auto w-full max-w-4xl space-y-4 p-6 md:p-8 flex flex-col min-h-full">
                  <input
                    value={activeNote.title}
                    onChange={(e) => updateActiveNote('title', e.target.value)}
                    placeholder="Note title..."
                    className="w-full border-0 bg-transparent text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/40 focus:ring-0 px-0"
                  />

                  <div className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2">
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
                        className="rounded-lg p-1.5 text-muted-foreground transition-none hover:bg-gray-200 hover:text-foreground"
                      >
                        <tool.icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) => updateActiveNote('content', e.target.value)}
                    placeholder="Start writing your lecture notes here..."
                    className="flex-1 w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/40 focus:ring-0 px-0"
                  />
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 border border-gray-200">
                      <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  {subUnit ? "Select a note from the sidebar or click 'New Note'." : "Please select a Subject, Unit, and Subunit to view notes."}
                </div>
              )}
            </main>

            {!isMobile && (
              <aside className="flex w-[280px] shrink-0 flex-col bg-white xl:w-[320px] min-h-0">
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
