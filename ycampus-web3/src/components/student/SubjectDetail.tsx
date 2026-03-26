import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/common/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Play, FileText, Code, MessageCircle, Monitor, Send, Bot, User, Plus, Trash2, Pencil, Check, X, StickyNote } from 'lucide-react';
import CustomContentSidebar, { ContentItem } from './CustomContentSidebar';
import CodeEditor from '@/components/ui/code-editor';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import QuizInterface from './QuizInterface';
import { fetchSubjectById, fetchUnitsBySubject, fetchSubUnitsByUnit, Subject, SubUnit, fetchVideosBySubUnit, fetchNotesBySubUnit, createNote, updateNote, deleteNote, Note } from '@/services/subjectService';
import { fetchRandomQuestions } from '@/services/questionService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SubjectDetail = () => {

  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('video');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string>('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState('');
  const [showQuiz, setShowQuiz] = useState(false);
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [contentData, setContentData] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab content states
  const [topicVideo, setTopicVideo] = useState<any>(null);
  const [topicNotes, setTopicNotes] = useState<any>(null);
  const [personalNotes, setPersonalNotes] = useState<Note[]>([]);
  const [topicQuestions, setTopicQuestions] = useState<any>(null);
  const [contentLoading, setContentLoading] = useState(false);

  // Personal Note Forms
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");

  useEffect(() => {
    const loadSubjectData = async () => {
      if (!subjectId) return;
      try {
        setLoading(true);
        const [sub, rawUnits] = await Promise.all([
          fetchSubjectById(subjectId),
          fetchUnitsBySubject(subjectId)
        ]);
        setSubject(sub);
        
        const mappedContent = await Promise.all(
          rawUnits.map(async (u) => {
            const subs = await fetchSubUnitsByUnit(u.id);
            return {
              id: u.id,
              title: u.name,
              children: (subs as SubUnit[]).map(su => ({
                id: su.id,
                title: su.name
              }))
            };
          })
        );
        setContentData(mappedContent);

        // Auto select first subunit if none selected
        if (mappedContent.length > 0 && mappedContent[0].children && mappedContent[0].children.length > 0) {
          setSelectedTopic(mappedContent[0].children[0].id);
          setSelectedTopicTitle(mappedContent[0].children[0].title);
        }
      } catch (err) {
        toast.error("Failed to load subject data");
      } finally {
        setLoading(false);
      }
    };
    loadSubjectData();
  }, [subjectId]);

  useEffect(() => {
    const loadTabContent = async () => {
      if (!selectedTopic) return;
      try {
        setContentLoading(true);
        if (activeTab === 'video') {
          const videos = await fetchVideosBySubUnit(selectedTopic) as any[];
          setTopicVideo(videos && videos.length > 0 ? videos[0] : null);
        } else if (activeTab === 'text' || activeTab === 'personal-notes') {
          const fetchedNotes = await fetchNotesBySubUnit(selectedTopic) as Note[];
          const materials = fetchedNotes ? fetchedNotes.filter(n => n.user !== user?.id) : [];
          const userNotes = fetchedNotes ? fetchedNotes.filter(n => n.user === user?.id) : [];
          setTopicNotes(materials);
          setPersonalNotes(userNotes);
        } else if (activeTab === 'quiz') {
          // Using fetchRandomQuestions like ycampus-web
          const qs = await fetchRandomQuestions({ sub_unit: selectedTopic, level: 'subunit', type: 'mcq_single' });
          setTopicQuestions(qs);
        }
      } catch (err) {
        console.error("Failed to load content for tab", activeTab, err);
      } finally {
        setContentLoading(false);
      }
    };
    loadTabContent();
  }, [selectedTopic, activeTab]);

  const subjectName = subject?.subject_name || subject?.name || 'Loading...';
  
  const [chatMessages, setChatMessages] = useState<Array<{id: number, text: string, isUser: boolean}>>([
    { id: 1, text: `Hello! I'm your AI learning assistant. How can I help you today?`, isUser: false }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setShowCodeEditor(false);
  };

  const handleTopicSelect = (topicId: string, title: string) => {
    setSelectedTopic(topicId);
    setSelectedTopicTitle(title);
  };

  const handleBackToNotes = () => {
    navigate('/student/notes');
  };

  // --- Personal Notes Handlers ---
  const handleCreateNote = async () => {
    if (!newNoteContent.trim() || !selectedTopic) return;
    setIsCreatingNote(true);
    try {
      await createNote({
        sub_unit: selectedTopic,
        content: newNoteContent,
      });
      setNewNoteContent("");
      toast.success("Note added successfully");
      // Reload notes
      if (activeTab === 'personal-notes') {
        const notes = await fetchNotesBySubUnit(selectedTopic) as Note[];
        if (notes) setPersonalNotes(notes.filter(n => n.user === user?.id));
      }
    } catch (err) {
      console.error("Failed to create note", err);
      toast.error("Failed to save note");
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast.success("Note deleted");
      setPersonalNotes(personalNotes.filter(n => n.id !== noteId));
    } catch (err) {
      console.error("Failed to delete note", err);
      toast.error("Failed to delete note");
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditNoteContent("");
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return;
    try {
      await updateNote(noteId, { content: editNoteContent });
      toast.success("Note updated");
      setPersonalNotes(personalNotes.map(n => n.id === noteId ? { ...n, content: editNoteContent } : n));
      setEditingNoteId(null);
    } catch (err) {
      console.error("Failed to update note", err);
      toast.error("Failed to update note");
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const userMessage = { id: Date.now(), text: newMessage, isUser: true };
      const aiResponse = { 
        id: Date.now() + 1, 
        text: `I understand you're asking about "${newMessage}". Let me help you with that concept in ${subjectName}.`, 
        isUser: false 
      };
      
      setChatMessages(prev => [...prev, userMessage, aiResponse]);
      setNewMessage('');
    }
  };

  const renderVideoPlayer = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = "";
      if (url.includes("youtu.be")) {
        videoId = url.split("youtu.be/")[1];
      } else if (url.includes("v=")) {
        videoId = url.split("v=")[1].split("&")[0];
      }
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      );
    }
    if (url.endsWith(".mp4")) {
      return <video src={url} controls className="absolute inset-0 w-full h-full rounded-lg bg-black" />;
    }
    return (
      <iframe
        src={url}
        className="absolute inset-0 w-full h-full rounded-lg"
        allowFullScreen
      />
    );
  };

  const renderVideoContent = () => {
    const topicContent = selectedTopic && selectedTopicTitle ? (
      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm text-muted-foreground mb-2">Selected Topic:</h4>
        <h3 className="font-semibold text-lg">{selectedTopicTitle}</h3>
      </div>
    ) : null;

    return (
      <div className="space-y-6">
        {topicContent}
        
        {/* Video Container - 30% smaller */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Monitor className="h-5 w-5" />
              <span>Video Content</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-[70%] mx-auto relative cursor-pointer group">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden relative shadow-sm">
                {contentLoading ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Loading video...</p>
                  </div>
                ) : topicVideo && topicVideo.video_link ? (
                  renderVideoPlayer(topicVideo.video_link)
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No video available</p>
                    <p className="text-xs mt-1">Select a topic with video content</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant Container with Chat */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              <span>AI Learning Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col h-[400px]">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-2 ${
                        message.isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!message.isUser && (
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] p-3 rounded-lg text-sm ${
                          message.isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {message.text}
                      </div>
                      {message.isUser && (
                        <div className="flex-shrink-0 w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Chat Input */}
              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Ask me about ${subjectName}...`}
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    size="sm" 
                    className="px-3"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {selectedTopicTitle && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Currently focused on: {selectedTopicTitle}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTextContent = () => {
    const topicContent = selectedTopic && selectedTopicTitle ? (
      <div className="mb-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm text-muted-foreground mb-2">Selected Topic:</h4>
        <h3 className="font-semibold text-lg">{selectedTopicTitle}</h3>
      </div>
    ) : null;

    return (
      <div className="space-y-6">
        {topicContent}
        
        {/* Code Editor Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Study Materials</h2>
          <Button
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Code className="h-4 w-4" />
            <span>{showCodeEditor ? 'Hide Code Editor' : 'Show Code Editor'}</span>
          </Button>
        </div>

        {/* Side by Side Resizable Layout */}
        <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border border-border">
          {/* Notes Container */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <Card className="border-0 h-full rounded-l-lg rounded-r-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <FileText className="h-5 w-5" />
                  <span>Study Notes</span>
                </CardTitle>
              </CardHeader>
                <ScrollArea className="h-[500px] w-full rounded-md border p-6 bg-card shadow-inner">
                  <div className="space-y-6">
                    {contentLoading ? (
                      <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : Array.isArray(topicNotes) && topicNotes.length > 0 ? (
                      topicNotes.map((note: Note, idx: number) => (
                        <div key={note.id || idx} className="border-b border-border pb-6 last:border-0 last:pb-0">
                          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed font-normal" dangerouslySetInnerHTML={{ __html: note.content }} />
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-20 px-4 bg-muted/20 rounded-xl border border-dashed border-border flex flex-col items-center justify-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-10" />
                        <p className="text-sm font-medium">No study materials available for this unit yet.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
            </Card>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* AI Assistant Container with Chat */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <Card className="border-0 h-full rounded-r-lg rounded-l-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <MessageCircle className="h-5 w-5" />
                  <span>AI Learning Assistant</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col h-[400px]">
                  {/* Chat Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex items-start space-x-2 ${
                            message.isUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {!message.isUser && (
                            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] p-3 rounded-lg text-sm ${
                              message.isUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {message.text}
                          </div>
                          {message.isUser && (
                            <div className="flex-shrink-0 w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-secondary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {/* Chat Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex space-x-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Ask me about ${subjectName}...`}
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        size="sm" 
                        className="px-3"
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedTopicTitle && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Currently focused on: {selectedTopicTitle}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  };

  const renderQuizContent = () => {
    if (contentLoading) {
      return (
        <div className="flex justify-center items-center h-[500px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    
    if (!topicQuestions || topicQuestions.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border min-h-[500px] flex flex-col items-center justify-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No quiz questions available for this topic.</p>
        </div>
      );
    }

    // Map backend questions to the format QuizInterface expects
    const mappedQuestions = topicQuestions.map((q: any, i: number) => ({
      id: q.id || i,
      title: `Question ${i + 1}`,
      question: q.content || q.text || q.question, // content used in ycampus-web
      options: Array.isArray(q.mcq_options) 
        ? q.mcq_options.map((opt: any) => opt.text) 
        : typeof q.options === 'string' ? JSON.parse(q.options) : q.options || [],
      correctAnswer: Array.isArray(q.mcq_options)
        ? q.mcq_options.findIndex((opt: any) => opt.is_correct)
        : typeof q.correct_answer === 'string' && q.options && q.options.indexOf ? q.options.indexOf(q.correct_answer) : q.correct_answer !== undefined ? Number(q.correct_answer) : 0,
      explanation: q.explanation || 'Review the topic material for more context.',
      code: q.code || undefined
    }));

    return (
      <QuizInterface 
        topicTitle={selectedTopicTitle || subjectName}
        showCodeEditor={showCodeEditor}
        onToggleCodeEditor={() => setShowCodeEditor(!showCodeEditor)}
        code={code}
        onCodeChange={setCode}
        backendQuestions={mappedQuestions}
      />
    );
  };

  const renderTabContent = (tab: string) => {

    switch (tab) {
      case 'video':
        return renderVideoContent();
      case 'text':
        return renderTextContent();
      case 'quiz':
        return renderQuizContent();
      case 'personal-notes':
        return renderPersonalNotesContent();
      default:
        return null;
    }
  };

  const renderPersonalNotesContent = () => {
    if (!selectedTopic) {
      return (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border flex flex-col items-center justify-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Please select a topic from the sidebar to view personal notes.</p>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-6">
        <div className="flex items-center gap-2 text-foreground font-semibold mb-6">
          <StickyNote className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl">Personal Notes</h2>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-8 space-y-4">
          <h3 className="font-medium text-foreground text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Note
          </h3>
          <Textarea
            placeholder="Write your key takeaways here..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-[120px] bg-background resize-y rounded-lg border-input focus:ring-1 focus:ring-primary shadow-sm"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCreateNote}
              disabled={!newNoteContent.trim() || isCreatingNote}
              size="sm"
              className="gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              {isCreatingNote ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {personalNotes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
              <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">You haven't added any notes yet.</p>
            </div>
          ) : (
            personalNotes.map((note) => (
              <Card key={note.id} className="group hover:border-border transition-all shadow-sm hover:shadow-md rounded-xl border-border/50 overflow-hidden bg-card">
                <CardContent className="p-6">
                  {editingNoteId === note.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        className="min-h-[100px] resize-y rounded-lg border border-input focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={cancelEditing} className="rounded-lg">
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateNote(note.id)} className="rounded-lg">
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed flex-1 pt-1">
                          {note.content}
                        </div>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(note)}
                            className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-t border-border pt-4 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-border" />
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
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background sticky top-0 z-50">
        <div className="flex items-center h-16 px-6">
          <h1 className="text-xl font-semibold">Study Notes Dashboard - {subjectName}</h1>
        </div>
      </div>
          
          {/* Main Content Layout */}
          <div className="flex flex-1 min-h-0" style={{ height: 'calc(100vh - 64px)' }}>
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
            ) : !showCodeEditor ? (
              // Normal Layout - Sidebar + Content
              <>
                <CustomContentSidebar
                  subjectName={subjectName}
                  subjectId={subjectId || ''}
                  onTopicSelect={handleTopicSelect}
                  selectedTopic={selectedTopic}
                  onBackToNotes={handleBackToNotes}
                  contentData={contentData}
                />
                
                <main className="flex-1 overflow-hidden flex flex-col">
                  {/* Tabs Navigation */}
                  <div className="border-b border-border bg-background">
                    <div className="flex items-center justify-between px-6">
                      <div className="flex items-center space-x-8">
                        <button
                          onClick={() => handleTabChange('video')}
                          className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                            activeTab === 'video'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          VIDEOS
                          {activeTab === 'video' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </button>
                        <button
                          onClick={() => handleTabChange('text')}
                          className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                            activeTab === 'text'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          STUDY MATERIALS
                          {activeTab === 'text' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </button>
                        <button
                          onClick={() => handleTabChange('personal-notes')}
                          className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                            activeTab === 'personal-notes'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          PERSONAL NOTES
                          {activeTab === 'personal-notes' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </button>
                        <button
                          onClick={() => handleTabChange('quiz')}
                          className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                            activeTab === 'quiz'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          QUIZ
                          {activeTab === 'quiz' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                          )}
                        </button>
                      </div>
                      
                      <Button
                        onClick={() => setShowCodeEditor(!showCodeEditor)}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Code className="h-4 w-4" />
                        <span>Show Code Editor</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="flex-1 overflow-auto p-6">
                    {renderTabContent(activeTab)}
                  </div>
                </main>
              </>
            ) : (
              // Code Editor Split View - No Sidebar
              <ResizablePanelGroup direction="horizontal" className="w-full">
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="h-full overflow-auto">
                    <main className="flex-1 flex flex-col">
                      {/* Tabs Navigation */}
                      <div className="border-b border-border bg-background">
                        <div className="flex items-center justify-between px-6">
                          <div className="flex items-center space-x-8">
                            <button
                              onClick={() => handleTabChange('video')}
                              className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                                activeTab === 'video'
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              VIDEOS
                              {activeTab === 'video' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                              )}
                            </button>
                            <button
                              onClick={() => handleTabChange('text')}
                              className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                                activeTab === 'text'
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              STUDY MATERIALS
                              {activeTab === 'text' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                              )}
                            </button>
                            <button
                              onClick={() => handleTabChange('personal-notes')}
                              className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                                activeTab === 'personal-notes'
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              PERSONAL NOTES
                              {activeTab === 'personal-notes' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                              )}
                            </button>
                            <button
                              onClick={() => handleTabChange('quiz')}
                              className={`relative py-4 text-sm font-medium transition-colors hover:text-foreground ${
                                activeTab === 'quiz'
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              QUIZ
                              {activeTab === 'quiz' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                              )}
                            </button>
                          </div>
                          
                          <Button
                            onClick={() => setShowCodeEditor(false)}
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Code className="h-4 w-4" />
                            <span>Hide Code Editor</span>
                          </Button>
                        </div>
                      </div>
                      
                      {/* Tab Content */}
                      <div className="flex-1 overflow-auto p-6">
                        {renderTabContent(activeTab)}
                      </div>
                    </main>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="h-full bg-background border-l border-border flex flex-col">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">Code Editor</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowCodeEditor(false)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Hide Editor
                      </Button>
                    </div>
                    <div className="flex-1 p-4 overflow-auto">
                      <CodeEditor
                        initialCode={code}
                        language="javascript"
                        onCodeChange={setCode}
                        onRun={(code) => console.log('Running code:', code)}
                        showLanguageSelector={true}
                        showRunButton={true}
                        showResetButton={true}
                        showCopyButton={true}
                      />
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
    </div>
  );
};

export default SubjectDetail;