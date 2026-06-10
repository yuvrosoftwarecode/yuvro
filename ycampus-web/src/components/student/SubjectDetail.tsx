import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Info,
  Layout,
  MessageCircle,
  MonitorPlay,
  PlayCircle,
  Sparkles,
  StickyNote,
  Video as VideoIcon,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DocPreviewDialog } from './DocPreviewDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomContentSidebar from './CustomContentSidebar.tsx';
import type { ContentItem } from './CustomContentSidebar.tsx';
import QuizInterface from './QuizInterface.tsx';
import StudentNotes from './StudentNotes.tsx';
import StudentVideos, { type LayoutMode } from './StudentVideos.tsx';
import {
  Subject,
  SubUnit,
  SubUnitDocument,
  fetchNotesBySubUnit,
  fetchSubjectById,
  fetchSubUnitsByUnit,
  fetchUnitsBySubject,
  fetchUserSubjectProgress,
  markSubUnitVideoWatched,
  fetchSubUnitDocuments,
} from '@/services/subjectService';
import { fetchRandomQuestions } from '@/services/questionService';

const SubjectDetail: React.FC = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [contentData, setContentData] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'videos' | 'materials' | 'my-notes' | 'quizzes' | 'docs'>('materials');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState('');

  const [videoLayout, setVideoLayout] = useState<LayoutMode>('video');
  const [sidebarCollapseSignal, setSidebarCollapseSignal] = useState<number | null>(null);
  const [chatSessionId, setChatSessionId] = useState(`subject-chat-${subjectId}-${uuidv4()}`);

  const [topicQuestions, setTopicQuestions] = useState<any>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [markedCompleteMap, setMarkedCompleteMap] = useState<Record<string, boolean>>({});
  const [quizHighestScoreMap, setQuizHighestScoreMap] = useState<Record<string, number>>({});

  const [activeProgress, setActiveProgress] = useState({ quiz: false, coding: false, video: false });

  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [code, setCode] = useState('');

  // Docs dialog state
  const [subUnitDocs, setSubUnitDocs] = useState<SubUnitDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // File preview states
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const FILE_ICON_MAP: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    ppt: '📊',
    pptx: '📊',
    zip: '🗜️',
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return FILE_ICON_MAP[ext] || '📁';
  };

  useEffect(() => {
    const loadSubjectData = async () => {
      if (!subjectId) return;
      try {
        setLoading(true);
        const [sub, rawUnits] = await Promise.all([fetchSubjectById(subjectId), fetchUnitsBySubject(subjectId)]);
        const isAssessments = window.location.pathname.includes('/student/assessments');
        if (isAssessments && sub.short_code !== 'DSA100') {
          toast.error('Unauthorized access');
          navigate('/student/assessments/notes');
          return;
        }
        setSubject(sub);

        const mappedContent = await Promise.all(
          rawUnits.map(async (u) => {
            const subs = await fetchSubUnitsByUnit(u.id);
            return {
              id: u.id,
              title: u.name,
              children: (subs as SubUnit[]).map((su) => ({
                id: su.id,
                title: su.name,
              })),
            };
          }),
        );
        setContentData(mappedContent);

        if (mappedContent.length > 0 && mappedContent[0].children && mappedContent[0].children.length > 0) {
          setSelectedTopic(mappedContent[0].children[0].id);
          setSelectedTopicTitle(mappedContent[0].children[0].title);
        }
      } catch (error) {
        toast.error('Failed to load subject data');
      } finally {
        setLoading(false);
      }
    };

    loadSubjectData();
  }, [subjectId]);

  const loadProgress = async () => {
    if (!subjectId) return;

    try {
      const progressData = (await fetchUserSubjectProgress(subjectId)) as Record<string, any>;
      const newProgressMap: Record<string, number> = {};
      const newReadMap: Record<string, boolean> = {};
      const newMarkedCompleteMap: Record<string, boolean> = {};
      const newQuizHighestScoreMap: Record<string, number> = {};

      Object.entries(progressData || {}).forEach(([subId, data]: [string, any]) => {
        newProgressMap[subId] = data?.progress_percent || 0;
        newReadMap[subId] = !!data?.is_completed;
        newMarkedCompleteMap[subId] = !!data?.is_marked_complete;
        newQuizHighestScoreMap[subId] = data?.quiz_highest_score || 0;
      });

      setProgressMap(newProgressMap);
      setReadMap(newReadMap);
      setMarkedCompleteMap(newMarkedCompleteMap);
      setQuizHighestScoreMap(newQuizHighestScoreMap);

      if (selectedTopic) {
        const selectedProgress = progressData?.[selectedTopic];
        if (selectedProgress) {
          setActiveProgress({
            quiz: !!selectedProgress.is_quiz_completed,
            coding: !!selectedProgress.is_coding_completed,
            video: !!selectedProgress.is_videos_watched,
          });
        } else {
          setActiveProgress({ quiz: false, coding: false, video: false });
        }
      }
    } catch {
      setActiveProgress({ quiz: false, coding: false, video: false });
    }
  };

  useEffect(() => {
    loadProgress();
  }, [selectedTopic, subjectId]);

  useEffect(() => {
    const loadTabContent = async () => {
      if (!selectedTopic) return;
      try {
        setContentLoading(true);
        if (activeTab === 'materials' || activeTab === 'my-notes') {
          await fetchNotesBySubUnit(selectedTopic);
        } else if (activeTab === 'quizzes') {
          const questions = await fetchRandomQuestions({ sub_unit: selectedTopic, level: 'subunit', type: 'mcq_single' });
          setTopicQuestions(questions);
        } else if (activeTab === 'docs') {
          setDocsLoading(true);
          try {
            const data = await fetchSubUnitDocuments(selectedTopic);
            setSubUnitDocs(data);
          } finally {
            setDocsLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to load content for tab', activeTab, error);
      } finally {
        setContentLoading(false);
      }
    };

    setChatSessionId(`subunit-chat-${selectedTopic}`);
    loadTabContent();
  }, [selectedTopic, activeTab]);

  const subjectName = subject?.subject_name || subject?.name || 'Loading...';

  const handleTopicSelect = (topicId: string, title: string) => {
    setSelectedTopic(topicId);
    setSelectedTopicTitle(title);
  };

  const handleBackToNotes = () => {
    const isAssessments = window.location.pathname.includes('/student/assessments');
    navigate(isAssessments ? '/student/assessments/notes' : '/student/notes');
  };

  const handleLayoutSelect = (layout: LayoutMode) => {
    setVideoLayout(layout);
    setSidebarCollapseSignal((prev) => (prev ?? 0) + 1);
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

    const mappedQuestions = topicQuestions.map((q: any, i: number) => ({
      id: q.id || i,
      title: `Question ${i + 1}`,
      question: q.content || q.text || q.question,
      options: Array.isArray(q.mcq_options)
        ? q.mcq_options.map((opt: any) => opt.text)
        : typeof q.options === 'string'
          ? JSON.parse(q.options)
          : q.options || [],
      correctAnswer: Array.isArray(q.mcq_options)
        ? q.mcq_options.findIndex((opt: any) => opt.is_correct)
        : typeof q.correct_answer === 'string' && q.options && q.options.indexOf
          ? q.options.indexOf(q.correct_answer)
          : q.correct_answer !== undefined
            ? Number(q.correct_answer)
            : 0,
      explanation: q.explanation || 'Review the topic material for more context.',
      code: q.code || undefined,
    }));

    return (
      <QuizInterface
        topicTitle={selectedTopicTitle || subjectName}
        showCodeEditor={showCodeEditor}
        onToggleCodeEditor={() => setShowCodeEditor(!showCodeEditor)}
        code={code}
        onCodeChange={setCode}
        backendQuestions={mappedQuestions}
        subunitId={selectedTopic || ''}
        onQuizComplete={loadProgress}
        highestScore={selectedTopic ? quizHighestScoreMap[selectedTopic] : 0}
      />
    );
  };

  const renderContent = () => {
    if (!selectedTopic) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">Select a topic from the sidebar</div>
          <div className="text-sm">Then browse Videos / Materials / Notes / Quiz</div>
        </div>
      );
    }

    if (activeTab === 'videos') {
      const selectedUnitTitle = contentData.find((unit) => unit.children?.some((child) => child.id === selectedTopic))?.title || 'Unit';

      return (
        <StudentVideos
          subunitId={selectedTopic}
          subjectName={subjectName}
          unitName={selectedUnitTitle}
          subunitName={selectedTopicTitle || 'Sub Unit'}
          sessionId={chatSessionId}
          onNewSession={() => setChatSessionId(`subunit-chat-${selectedTopic}-${uuidv4()}`)}
          layout={videoLayout}
          onLayoutChange={setVideoLayout}
        />
      );
    }

    if (activeTab === 'materials') {
      return (
        <StudentNotes
          subunitId={selectedTopic}
          mode="materials"
          sessionId={chatSessionId}
          onNewSession={() => setChatSessionId(`subunit-chat-${selectedTopic}-${uuidv4()}`)}
          isMarkedComplete={!!markedCompleteMap[selectedTopic]}
          onProgressUpdate={loadProgress}
        />
      );
    }

    if (activeTab === 'my-notes') {
      return (
        <StudentNotes
          subunitId={selectedTopic}
          mode="my-notes"
          sessionId={chatSessionId}
          onNewSession={() => setChatSessionId(`subunit-chat-${selectedTopic}-${uuidv4()}`)}
          isMarkedComplete={!!markedCompleteMap[selectedTopic]}
          onProgressUpdate={loadProgress}
        />
      );
    }

    if (activeTab === 'docs') {
      return (
        <div className="p-6 max-w-2xl mx-auto w-full">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Course Documents</h2>
          </div>
          {renderDocsContent()}
        </div>
      );
    }

    return <div className="p-6">{renderQuizContent()}</div>;
  };

  const handleViewDocument = (url: string | null, name: string) => {
    if (!url) {
      toast.error('Document link not available');
      return;
    }
    setPreviewFileUrl(url);
    setPreviewFileName(name);
    setIsPreviewOpen(true);
  };

  const renderDocsContent = () => {
    if (docsLoading) {
      return (
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    if (subUnitDocs.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border min-h-[300px] flex flex-col items-center justify-center">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No documents uploaded for this topic yet.</p>
        </div>
      );
    }
    return (
      <ul className="space-y-3">
        {subUnitDocs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-2xl flex-shrink-0">{getFileIcon(doc.file_name)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{doc.file_name}</p>
              {doc.uploaded_by_name && (
                <p className="text-xs text-muted-foreground">Uploaded by {doc.uploaded_by_name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {doc.download_url ? (
                <>
                  <Button
                    onClick={() => handleViewDocument(doc.download_url, doc.file_name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-black transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Button>
                  <a
                    href={doc.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.file_name}
                    className="flex items-center justify-center p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No link</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const tabItems = [
    // { key: 'videos', label: 'Videos', icon: <PlayCircle className="w-4 h-4" /> },
    { key: 'materials', label: 'Materials', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'my-notes', label: 'My Notes', icon: <StickyNote className="w-4 h-4" /> },
    { key: 'quizzes', label: 'Quiz', icon: <HelpCircle className="w-4 h-4" /> },
    { key: 'docs', label: 'Docs', icon: <FileText className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* <div className="border-b border-border bg-background sticky top-0 z-50">
        <div className="flex items-center h-16 px-6">
          <h1 className="text-xl font-semibold">Study Notes Dashboard - {subjectName}</h1>
        </div>
      </div> */}

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <CustomContentSidebar
              subjectName={subjectName}
              onTopicSelect={handleTopicSelect}
              selectedTopic={selectedTopic}
              forceCollapseSignal={sidebarCollapseSignal}
              contentData={contentData}
              progressMap={progressMap}
              readMap={readMap}
            />

            <main className="flex-1 overflow-hidden flex flex-col">
              <div className="border-b border-border bg-background px-4 h-16 flex items-center justify-between relative">
                <button
                  onClick={handleBackToNotes}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Learning</span>
                </button>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1.5">
                  {tabItems.map((tab) => (
                    <button
                      key={tab.key}
                      className={`relative px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === tab.key
                          ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-100 ring-offset-2'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
                        }`}
                      title={tab.label}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.icon}
                      {/* <span>{tab.label}</span> */}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 ml-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="p-2 text-gray-500 hover:text-slate-900 hover:bg-white rounded-full transition-colors" title="Subject Guide">
                        <Info className="w-5 h-5" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-2xl">
                      <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                          <Info className="w-6 h-6 text-slate-900" /> Subject Guide
                        </DialogTitle>
                        <DialogDescription>
                          Everything you need to know to master this subject.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="p-6 pt-2">
                        <Tabs defaultValue="progress" className="w-full">
                          <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="progress">Progress</TabsTrigger>
                            <TabsTrigger value="quiz">Quizzes</TabsTrigger>
                            <TabsTrigger value="notes">Notes</TabsTrigger>
                          </TabsList>

                          <ScrollArea className="h-[400px] pr-4">
                            <TabsContent value="progress" className="space-y-4">
                              <div className="bg-white p-4 rounded-xl border border-slate-100 mb-4">
                                <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" /> How to Complete a Unit?
                                </h3>
                                <p className="text-sm text-slate-700">
                                  A subunit is marked as <strong>100% Complete</strong> only when you have finished all required activities.
                                </p>
                              </div>

                              <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                  <div className="p-2 bg-green-100 text-green-600 rounded-lg mt-1">
                                    <MonitorPlay className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">1. Watch Videos</h4>
                                    <p className="text-sm text-gray-600">Mark videos as watched using the button in the top right.</p>
                                  </div>
                                </div>

                                <div className="flex gap-4 items-start">
                                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mt-1">
                                    <HelpCircle className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">2. Pass the Quiz</h4>
                                    <p className="text-sm text-gray-600">Score at least <strong>80%</strong> to pass. You can retry as many times as needed.</p>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="quiz" className="space-y-4">
                              <h3 className="text-lg font-semibold text-gray-800">Mastering Quizzes</h3>
                              <p className="text-gray-600 text-sm leading-relaxed">
                                Quizzes test your conceptual understanding. They are integrated directly into the learning flow.
                              </p>
                              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                                <li><strong>Instant Feedback:</strong> See which answers were correct immediately.</li>
                                <li><strong>Retries:</strong> Made a mistake? Retry to improve your score.</li>
                                <li><strong>Review:</strong> Check "Show Solutions" to understand the logic behind the answers.</li>
                              </ul>
                            </TabsContent>

                            <TabsContent value="notes" className="space-y-4">
                              <h3 className="text-lg font-semibold text-gray-800">Effective Note Taking</h3>
                              <p className="text-gray-600 text-sm leading-relaxed">
                                We provide two dedicated spaces for your knowledge management:
                              </p>

                              <div className="space-y-3 mt-4">
                                <div className="flex gap-3 p-3 border border-slate-100 bg-white rounded-xl">
                                  <BookOpen className="w-5 h-5 text-slate-800 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-semibold text-black text-sm">Materials</h4>
                                    <p className="text-xs text-gray-600 mt-1">Official notes and cheat sheets provided by the instructor. These are read-only references.</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 p-3 border border-yellow-100 bg-yellow-50/50 rounded-xl">
                                  <StickyNote className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-semibold text-yellow-900 text-sm">My Notes</h4>
                                    <p className="text-xs text-yellow-800 mt-1">Your personal digital notebook. Write, edit, and save your own key takeaways here.</p>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 p-3 bg-white rounded-lg text-xs text-gray-600 flex items-center gap-2">
                                <MonitorPlay className="w-4 h-4" />
                                <span><strong>Tip:</strong> Use "Split View" to read materials and write notes simultaneously!</span>
                              </div>
                            </TabsContent>
                          </ScrollArea>
                        </Tabs>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {activeTab === 'videos' && selectedTopic && (
                    <>
                      <Button
                        onClick={async () => {
                          try {
                            await markSubUnitVideoWatched(selectedTopic);
                            toast.success('Videos marked as watched');
                            await loadProgress();
                          } catch {
                            toast.error('Failed to mark video watched');
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors ${activeProgress.video ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-900 text-white hover:bg-black'
                          }`}
                      >
                        {activeProgress.video ? <Check className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                        {activeProgress.video ? 'Watched' : 'Mark as Watched'}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-9 px-4 text-gray-600 bg-white border border-gray-300 rounded-full shadow-sm flex items-center gap-2 text-sm font-semibold transition-all duration-200 hover:text-blue-700 hover:bg-blue-50 active:scale-95">
                            <Layout className="w-4 h-4" />
                            <span>Layouts</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl bg-white">
                          {[
                            { id: 'video', label: 'Standard View', sub: 'Primary video focus', icon: <VideoIcon className="w-5 h-5" /> },
                            { id: 'video-chat', label: 'Video + AI Chat', sub: 'Interactive learning', icon: <div className="flex gap-1"><VideoIcon className="w-4 h-4" /><Sparkles className="w-4 h-4" /></div> },
                            { id: 'video-code', label: 'Video + Code', sub: 'Follow & Practice', icon: <div className="flex gap-1"><VideoIcon className="w-4 h-4" /><HelpCircle className="w-4 h-4" /></div> },
                            { id: 'code-chat', label: 'Code + AI Chat', sub: 'AI-assisted coding', icon: <div className="flex gap-1"><HelpCircle className="w-4 h-4" /><Sparkles className="w-4 h-4" /></div> },
                            { id: 'video-chat-code', label: 'Pro Workspace', sub: 'Video + AI + Code', icon: <div className="flex flex-col gap-1 items-center"><div className="flex gap-1"><VideoIcon className="w-3 h-3" /><Sparkles className="w-3 h-3" /></div><HelpCircle className="w-3 h-3" /></div> },
                          ].map((option) => (
                            <DropdownMenuItem
                              key={option.id}
                              onClick={() => handleLayoutSelect(option.id as LayoutMode)}
                              className={`group flex items-center gap-4 px-3.5 py-3 rounded-xl cursor-pointer transition-colors duration-200 ${videoLayout === option.id ? 'bg-slate-100 text-black' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${videoLayout === option.id ? 'bg-slate-100' : 'bg-transparent'}`}>
                                {option.icon}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{option.label}</span>
                                <span className="text-[10px] opacity-70">{option.sub}</span>
                              </div>
                              {videoLayout === option.id && (
                                <div className="ml-auto w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto">{renderContent()}</div>
            </main>
          </>
        )}
      </div>
      <DocPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={previewFileUrl}
        fileName={previewFileName}
      />
    </div>
  );
};

export default SubjectDetail;
