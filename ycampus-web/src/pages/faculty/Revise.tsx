import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Plus, Search, Save, Upload, Sparkles, Bold, List, Paperclip, Youtube, Code2,
  RefreshCw, Copy, ArrowDownToLine, Lightbulb, Globe, HelpCircle, BookOpen,
  Zap, FileText, ChevronRight, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

const subjectOptions = [
  { id: 'math', label: 'Mathematics 101' },
  { id: 'phy', label: 'Physics 201' },
  { id: 'chem', label: 'Chemistry 301' },
];

const unitOptions: Record<string, { id: string; label: string }[]> = {
  math: [
    { id: 'u1', label: 'Unit 1 – Algebra Fundamentals' },
    { id: 'u2', label: 'Unit 2 – Calculus Basics' },
  ],
  phy: [
    { id: 'u1', label: 'Unit 1 – Classical Mechanics' },
    { id: 'u2', label: 'Unit 2 – Thermodynamics' },
  ],
  chem: [
    { id: 'u1', label: 'Unit 1 – Organic Chemistry' },
    { id: 'u2', label: 'Unit 2 – Electrochemistry' },
  ],
};

const quickActions = [
  { label: 'Explain in simple terms', icon: Lightbulb, prompt: 'Explain the selected content in simple terms for students.' },
  { label: 'Real-world example', icon: Globe, prompt: 'Give a real-world example for the selected content.' },
  { label: '3 classroom questions', icon: HelpCircle, prompt: 'Create 3 classroom questions based on the content.' },
  { label: 'Assignment problems', icon: BookOpen, prompt: 'Generate assignment problems based on this content.' },
  { label: 'Activity idea', icon: Zap, prompt: 'Create an engaging classroom activity idea.' },
  { label: 'Summarize content', icon: FileText, prompt: 'Summarize the content concisely.' },
];

const seedNotes: Note[] = [
  { id: '1', title: 'Linear Equations – Intro', content: 'Linear equations are equations of degree 1...', updatedAt: new Date() },
  { id: '2', title: 'Quadratic Formula Derivation', content: 'Starting from ax² + bx + c = 0...', updatedAt: new Date(Date.now() - 86400000) },
];

const Revise = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [activeNoteId, setActiveNoteId] = useState<string>(seedNotes[0].id);
  const [noteSearch, setNoteSearch] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const updateNote = (field: 'title' | 'content', value: string) => {
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, [field]: value, updatedAt: new Date() } : n));
  };

  const createNote = () => {
    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled Note',
      content: '',
      updatedAt: new Date(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      const remaining = notes.filter(n => n.id !== id);
      setActiveNoteId(remaining[0]?.id || '');
    }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(noteSearch.toLowerCase()));

  const handleAiAction = async (prompt: string) => {
    setAiLoading(true);
    setAiResponse('');
    // Simulate AI response
    setTimeout(() => {
      setAiResponse(`Here's a response for: "${prompt}"\n\nThis is a simulated AI Teaching Assistant response. In production, this will use the Lovable AI gateway to generate contextual, high-quality educational content based on your notes and the selected topic.\n\nKey points:\n• Point 1: Clear explanation with examples\n• Point 2: Practical application\n• Point 3: Common misconceptions addressed`);
      setAiLoading(false);
    }, 1500);
  };

  const insertIntoNotes = () => {
    if (activeNote && aiResponse) {
      updateNote('content', activeNote.content + '\n\n---\n\n' + aiResponse);
      toast({ title: 'Inserted', description: 'AI content added to your note.' });
    }
  };

  const handleSave = () => {
    toast({ title: 'Saved', description: 'Your notes have been saved.' });
  };

  const handlePublish = () => {
    toast({ title: 'Published', description: 'Notes published to students.' });
  };

  /* ── Left Panel ── */
  const NotesNav = (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground tracking-wide">My Notes</h3>
        <Button onClick={createNote} size="sm" className="w-full bg-[hsl(174,64%,33%)] hover:bg-[hsl(174,64%,28%)] text-white gap-1.5 rounded-xl text-xs">
          <Plus className="h-3.5 w-3.5" /> New Note
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={noteSearch}
            onChange={e => setNoteSearch(e.target.value)}
            className="pl-8 h-8 text-xs rounded-lg bg-muted/40 border-0 focus-visible:ring-1"
          />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredNotes.map(note => (
            <button
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all group flex items-center justify-between ${
                note.id === activeNoteId
                  ? 'bg-[hsl(174,64%,33%)]/10 text-[hsl(174,64%,33%)] font-medium'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{note.title}</span>
              </div>
              <Trash2
                className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition-opacity"
                onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
              />
            </button>
          ))}
          {filteredNotes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No notes found</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  /* ── Right Panel (AI) ── */
  const AiPanel = (
    <div className="flex flex-col h-full">
      {/* gradient header */}
      <div className="p-4 bg-gradient-to-br from-[hsl(174,64%,33%)] to-[hsl(196,80%,36%)] rounded-b-2xl text-white space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">AI Teaching Assistant</span>
        </div>
        <p className="text-[11px] text-white/70">Select a quick action or ask anything</p>
      </div>

      {/* quick actions */}
      <div className="p-3 space-y-1.5">
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={() => handleAiAction(action.prompt)}
            disabled={aiLoading}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all hover:bg-[hsl(174,64%,33%)]/8 hover:text-[hsl(174,64%,33%)] text-muted-foreground disabled:opacity-40"
          >
            <action.icon className="h-3.5 w-3.5 shrink-0" />
            {action.label}
            <ChevronRight className="h-3 w-3 ml-auto opacity-40" />
          </button>
        ))}
      </div>

      <Separator />

      {/* ai response area */}
      <ScrollArea className="flex-1 p-4">
        {aiLoading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin text-[hsl(174,64%,33%)]" />
            <span className="text-xs">Generating response...</span>
          </div>
        ) : aiResponse ? (
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap text-foreground">
              {aiResponse}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1" onClick={insertIntoNotes}>
                <ArrowDownToLine className="h-3 w-3" /> Insert
              </Button>
              <Button size="sm" variant="ghost" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => handleAiAction(quickActions[0].prompt)}>
                <RefreshCw className="h-3 w-3" /> Regenerate
              </Button>
              <Button size="sm" variant="ghost" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => { navigator.clipboard.writeText(aiResponse); toast({ title: 'Copied!' }); }}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-10">Click a quick action to get started</p>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <FacultyLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[hsl(210,40%,98%)]">
        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
          <h1 className="text-base font-semibold text-foreground whitespace-nowrap">Revise – AI Teaching Notebook</h1>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <Select value={subject} onValueChange={v => { setSubject(v); setUnit(''); }}>
              <SelectTrigger className="h-8 w-[160px] text-xs rounded-lg">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={unit} onValueChange={setUnit} disabled={!subject}>
              <SelectTrigger className="h-8 w-[200px] text-xs rounded-lg">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {(unitOptions[subject] || []).map(u => <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg gap-1" onClick={handleSave}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
            <Button size="sm" className="h-8 text-xs rounded-lg gap-1 bg-[hsl(174,64%,33%)] hover:bg-[hsl(174,64%,28%)] text-white" onClick={handlePublish}>
              <Upload className="h-3.5 w-3.5" /> Publish
            </Button>
            {/* AI button visible on mobile/tablet */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" className="h-8 text-xs rounded-lg gap-1 bg-gradient-to-r from-[hsl(174,64%,33%)] to-[hsl(196,80%,36%)] text-white">
                    <Sparkles className="h-3.5 w-3.5" /> AI Assist
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0">
                  <SheetHeader className="sr-only"><SheetTitle>AI Teaching Assistant</SheetTitle></SheetHeader>
                  {AiPanel}
                </SheetContent>
              </Sheet>
            )}
          </div>
        </header>

        {/* ── Main 3-column grid ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left – Notes nav (hidden on mobile) */}
          {!isMobile && (
            <aside className="w-[220px] xl:w-[240px] border-r bg-background shrink-0 flex flex-col">
              {NotesNav}
            </aside>
          )}

          {/* Center – Editor */}
          <main className="flex-1 flex flex-col min-w-0 overflow-auto">
            {activeNote ? (
              <div className="max-w-3xl w-full mx-auto p-6 md:p-8 space-y-4">
                {/* title */}
                <input
                  value={activeNote.title}
                  onChange={e => updateNote('title', e.target.value)}
                  placeholder="Note title..."
                  className="w-full text-2xl font-semibold bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 text-foreground"
                />

                {/* toolbar */}
                <div className="flex items-center gap-1 border rounded-xl px-2 py-1.5 bg-muted/30">
                  {[
                    { icon: Bold, label: 'Bold' },
                    { icon: List, label: 'List' },
                    { icon: Paperclip, label: 'Attach file' },
                    { icon: Youtube, label: 'YouTube link' },
                    { icon: Code2, label: 'Code block' },
                  ].map(tool => (
                    <button
                      key={tool.label}
                      title={tool.label}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <tool.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>

                {/* editor area */}
                <textarea
                  value={activeNote.content}
                  onChange={e => updateNote('content', e.target.value)}
                  placeholder="Start writing your lecture notes here..."
                  className="w-full min-h-[calc(100vh-20rem)] bg-transparent border-0 outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a note or create a new one
              </div>
            )}
          </main>

          {/* Right – AI panel (hidden on mobile) */}
          {!isMobile && (
            <aside className="w-[280px] xl:w-[300px] border-l bg-background shrink-0 flex flex-col">
              {AiPanel}
            </aside>
          )}
        </div>
      </div>
    </FacultyLayout>
  );
};

export default Revise;
