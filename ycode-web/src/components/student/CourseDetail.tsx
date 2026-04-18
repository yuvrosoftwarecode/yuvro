import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import RoleSidebar from "../../components/common/RoleSidebar";
import EdgeHoverSidebar from "../../components/common/EdgeHoverSidebar";
import StudentVideos, { LayoutMode } from "./StudentVideos";
import StudentQuizEmbed from "./StudentQuizEmbed";
import StudentCodingEmbed from "./StudentCodingEmbed";
import StudentNotes from "./StudentNotes";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Layout, Video as VideoIcon } from "lucide-react";
import CustomContentSidebar, { ContentItem } from "./CustomContentSidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    fetchCourseById,
    fetchTopicsByCourse,
    fetchSubtopicsByTopic,
    markSubtopicVideoWatched,
    fetchUserCourseProgress,
    Course as CourseType
} from "@/services/courseService";
import { fetchQuestions } from "@/services/questionService";
import { Check } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import { PlayCircle, HelpCircle, StickyNote, Code, BookOpen, Info, CheckCircle2, MonitorPlay, Sparkles } from "lucide-react";
import { getCourseIconConfig } from "@/utils/CourseIcons";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Topic = {
    id: string;
    name: string;
    order_index: number;
};

type Subtopic = {
    id: string;
    name: string;
    order_index: number;
    topic: string;
    content?: string | null;
};

const CourseDetail: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();

    const [course, setCourse] = useState<CourseType | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);

    const [collapsed, setCollapsed] = useState(false);

    const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
    const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({});

    const [progressMap, setProgressMap] = useState<Record<string, number>>({});
    const [readMap, setReadMap] = useState<Record<string, boolean>>({});

    const [loading, setLoading] = useState(true);

    const sidebarData: ContentItem[] = React.useMemo(() => {
        return topics.map((t) => ({
            id: t.id,
            title: t.name,
            children: (subtopicsMap[t.id] || []).map((s) => ({
                id: s.id,
                title: s.name,
            })),
        }));
    }, [topics, subtopicsMap]);

    const handleTopicSelect = (topicId: string) => {
        // Find the subtopic in our map
        for (const topic of topics) {
            const subs = subtopicsMap[topic.id] || [];
            const sub = subs.find((s) => s.id === topicId);
            if (sub) {
                setSelectedSubtopic(sub);
                setExpandedTopics((prev) => ({ ...prev, [topic.id]: true }));
                break;
            }
        }
    };
    const [chatSessionId, setChatSessionId] = useState(`course-chat-${courseId}-${crypto.randomUUID()}`);
    const [rightTab, setRightTab] = useState<'videos' | 'quizzes' | 'coding' | 'materials' | 'notes'>('videos');
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const [requirements, setRequirements] = useState<{ hasQuiz: boolean; hasCoding: boolean; loaded: boolean }>({
        hasQuiz: false, hasCoding: false, loaded: false
    });

    const [activeProgress, setActiveProgress] = useState<{
        quiz: boolean;
        coding: boolean;
        video: boolean
    }>({ quiz: false, coding: false, video: false });

    const [videoLayout, setVideoLayout] = useState<LayoutMode>('video');

    useEffect(() => {
        if (videoLayout !== 'video') {
            setCollapsed(true);
        }
    }, [videoLayout]);

    const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(
        null
    );

    const markingRef = React.useRef<boolean>(false);
    const loadingProgressRef = React.useRef<boolean>(false);
    const lastProgressFetchRef = React.useRef<number>(0);

    useEffect(() => {
        setActiveProgress({ quiz: false, coding: false, video: false });
        setRequirements({ hasQuiz: false, hasCoding: false, loaded: false });
        markingRef.current = false;
        loadingProgressRef.current = false;
        lastProgressFetchRef.current = 0;

        if (selectedSubtopic) {
            // Context Isolation: Use a STABLE session ID for each subtopic
            // This ensures persistence across refreshes without needing a history menu
            setChatSessionId(`subtopic-chat-${selectedSubtopic.id}`);
            checkRequirements(selectedSubtopic.id);
        }
    }, [selectedSubtopic?.id]);

    const checkRequirements = async (subtopicId: string) => {
        try {
            const quizzes = await fetchQuestions({ subtopic: subtopicId, level: 'subtopic', type: 'mcq_single' });
            const hasQuiz = quizzes.length > 0;

            const coding = await fetchQuestions({ subtopic: subtopicId, level: 'subtopic', type: 'coding' });
            const hasCoding = coding.length > 0;

            setRequirements({ hasQuiz, hasCoding, loaded: true });

        } catch (err) {
            console.error("Failed to check requirements", err);
            setRequirements({ hasQuiz: false, hasCoding: false, loaded: true });
        }
    };

    const handleProgressUpdate = useCallback(async () => {
        if (!selectedSubtopic || loadingProgressRef.current) return;
        await loadProgress();
    }, [selectedSubtopic?.id]);

    const debouncedProgressUpdate = useCallback(() => {
        const id = setTimeout(() => handleProgressUpdate(), 300);
        return () => clearTimeout(id);
    }, [handleProgressUpdate]);

    const getTopicProgress = (topicId: string): number => {
        const subs = subtopicsMap[topicId] || [];
        if (subs.length === 0) return 0;

        const totalProgress = subs.reduce((acc, s) => acc + (progressMap[s.id] || 0), 0);

        return Math.round(totalProgress / subs.length);
    };

    useEffect(() => {
        loadPage();
    }, [courseId]);

    const overallProgress = React.useMemo(() => {
        const allSubs = Object.values(subtopicsMap).flat();
        if (allSubs.length === 0) return 0;
        const total = allSubs.reduce((acc, s) => acc + (progressMap[s.id] || 0), 0);
        return Math.round(total / allSubs.length);
    }, [subtopicsMap, progressMap]);

    const loadPage = async () => {
        if (!courseId) return;

        setLoading(true);

        try {
            const c = await fetchCourseById(courseId);
            setCourse(c);

            const t = await fetchTopicsByCourse(courseId);
            setTopics(t);

            const allSubtopics: Record<string, Subtopic[]> = {};
            let firstSubtopic: Subtopic | null = null;
            let firstTopicId: string | null = null;

            try {
                const subtopicPromises = t.map(async (topic) => {
                    const subs = await fetchSubtopicsByTopic(topic.id);
                    return { topicId: topic.id, subs: subs as Subtopic[] };
                });

                const results = await Promise.allSettled(subtopicPromises);

                results.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        const { topicId, subs } = result.value;
                        allSubtopics[topicId] = subs;
                    }
                });

                const firstWithSubs = results
                    .filter((r): r is PromiseFulfilledResult<{ topicId: string; subs: Subtopic[] }> => r.status === 'fulfilled')
                    .find(r => r.value.subs.length > 0);

                if (firstWithSubs) {
                    firstSubtopic = firstWithSubs.value.subs[0];
                    firstTopicId = firstWithSubs.value.topicId;
                }

                setSubtopicsMap(allSubtopics);

                if (firstTopicId && firstSubtopic) {
                    const newExpanded: Record<string, boolean> = {};
                    t.forEach((topic) => (newExpanded[topic.id] = topic.id === firstTopicId));
                    setExpandedTopics(newExpanded);
                    setSelectedSubtopic(firstSubtopic);
                }
            } catch (err) {
                console.warn("Could not fetch subtopics", err);
                setSubtopicsMap({});
            }

            setSubtopicsMap(allSubtopics);

            await loadProgress();
        } catch (err) {
            toast.error("Failed to load course");
        } finally {
            setLoading(false);
        }
    };

    const loadProgress = async () => {
        if (!courseId || loadingProgressRef.current) return;

        const now = Date.now();
        if (now - lastProgressFetchRef.current < 1000) {
            console.log('Skipping loadProgress - too soon after last call');
            return;
        }

        loadingProgressRef.current = true;
        lastProgressFetchRef.current = now;
        console.log('loadProgress called for course:', courseId);

        try {
            const progressData = await fetchUserCourseProgress(courseId) as any;

            const newProgressMap: Record<string, number> = {};
            const newReadMap: Record<string, boolean> = {};

            Object.entries(progressData).forEach(([subId, data]: [string, any]) => {
                newProgressMap[subId] = data.progress_percent || 0;
                newReadMap[subId] = data.is_completed || false;

                if (selectedSubtopic && selectedSubtopic.id === subId) {
                    setActiveProgress({
                        quiz: data.is_quiz_completed,
                        coding: data.is_coding_completed,
                        video: data.is_videos_watched
                    });
                }
            });

            setProgressMap(newProgressMap);
            setReadMap(newReadMap);
        } catch (err) {
            console.warn("Could not fetch progress map", err);
        } finally {
            loadingProgressRef.current = false;
        }
    };

    const toggleExpandTopic = async (topicId: string) => {
        const isOpen = expandedTopics[topicId];
        const newState: Record<string, boolean> = {};
        topics.forEach((t) => (newState[t.id] = false));
        newState[topicId] = !isOpen;

        setExpandedTopics(newState);

        if (!isOpen && !subtopicsMap[topicId]) {
            try {
                const subs = await fetchSubtopicsByTopic(topicId);
                setSubtopicsMap((prev) => {
                    const updated: Record<string, Subtopic[]> = { ...prev, [topicId]: subs as Subtopic[] };
                    return updated;
                });
            } catch (err) {
                toast.error("Failed to load subtopics");
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                Loading course...
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                Course not found.
            </div>
        );
    }

    const currentIconConfig = getCourseIconConfig(course?.name || "Course", course?.category || "");

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden relative">
            <div className="flex flex-1 overflow-hidden relative w-full h-full">

                <EdgeHoverSidebar>
                    <RoleSidebar className="h-full border-r-0 shadow-2xl" />
                </EdgeHoverSidebar>

                <CustomContentSidebar
                    courseName={course?.name || "Course"}
                    courseIcon={currentIconConfig.Icon}
                    courseBg={currentIconConfig.bg}
                    contentData={sidebarData}
                    selectedTopic={selectedSubtopic?.id || null}
                    onTopicSelect={(id) => handleTopicSelect(id)}
                    progressMap={progressMap}
                    readMap={readMap}
                />

                <div className="flex-1 bg-white overflow-hidden flex flex-col">
                    <div className="border-b border-gray-200 py-1.5 flex items-center justify-between relative min-h-[3rem]">
                        <div className="ml-4 flex items-center gap-2 text-sm bg-white border border-gray-300 shadow-sm rounded-full px-4 py-1 font-medium text-gray-700 max-w-[30%] min-w-0">
                            {selectedSubtopic && (
                                <>
                                    <span className="text-gray-500 truncate hidden md:block max-w-[120px]" title={topics.find(t => t.id === selectedSubtopic.topic)?.name}>
                                        {collapsed
                                            ? topics.find(t => t.id === selectedSubtopic.topic)?.name
                                            : topics.find(t => t.id === selectedSubtopic.topic)?.name.charAt(0)
                                        }
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 hidden md:block" />
                                </>
                            )}
                            <span className="truncate" title={selectedSubtopic ? selectedSubtopic.name : ""}>
                                {selectedSubtopic ? selectedSubtopic.name : "No subtopic selected"}
                            </span>
                        </div>

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                            {[
                                { key: "videos", label: "Videos", icon: <PlayCircle className="w-4 h-4" /> },
                                { key: "materials", label: "Materials", icon: <BookOpen className="w-4 h-4" /> },
                                { key: "notes", label: "My Notes", icon: <StickyNote className="w-4 h-4" /> },
                                { key: "quizzes", label: "Quiz", icon: <HelpCircle className="w-4 h-4" /> },
                                { key: "coding", label: "Coding", icon: <Code className="w-4 h-4" /> }
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    title={!collapsed ? tab.label : ""}
                                    className={`relative px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 ${rightTab === tab.key
                                        ? "bg-slate-800 text-white shadow-md ring-1 ring-slate-300 ring-offset-2"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 bg-white border border-slate-200"
                                        }`}
                                    onClick={() => setRightTab(tab.key as any)}
                                >
                                    {tab.icon}
                                    <span className="transition-all duration-300 whitespace-nowrap">
                                        {tab.label}
                                    </span>

                                    {rightTab === tab.key && (
                                        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 ml-4 mr-6">
                            <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                                <DialogTrigger asChild>
                                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Course Guide">
                                        <Info className="w-5 h-5" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-2xl">
                                    <DialogHeader className="p-6 pb-2">
                                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                            <Info className="w-6 h-6 text-blue-600" /> Course Guide
                                        </DialogTitle>
                                        <DialogDescription>
                                            Everything you need to know to master this course.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="p-6 pt-2">
                                        <Tabs defaultValue="progress" className="w-full">
                                            <TabsList className="grid w-full grid-cols-4">
                                                <TabsTrigger value="progress">Progress</TabsTrigger>
                                                <TabsTrigger value="quiz">Quizzes</TabsTrigger>
                                                <TabsTrigger value="coding">Coding</TabsTrigger>
                                                <TabsTrigger value="notes">Notes</TabsTrigger>
                                            </TabsList>

                                            <ScrollArea className="h-[400px] pr-4">
                                                <TabsContent value="progress" className="space-y-4">
                                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                                                        <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4" /> How to Complete a Topic?
                                                        </h3>
                                                        <p className="text-sm text-blue-700">
                                                            A subtopic is marked as <strong>100% Complete</strong> only when you have finished all required activities.
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

                                                        <div className="flex gap-4 items-start">
                                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg mt-1">
                                                                <Code className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium text-gray-900">3. Solve Coding Challenges</h4>
                                                                <p className="text-sm text-gray-600">All test cases must pass for the solution to be accepted.</p>
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

                                                <TabsContent value="coding" className="space-y-4">
                                                    <h3 className="text-lg font-semibold text-gray-800">Hands-on Coding</h3>
                                                    <p className="text-gray-600 text-sm leading-relaxed">
                                                        Practice makes perfect. Our built-in code editor lets you write and run code in the browser.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                                        <div className="border border-gray-200 p-3 rounded-lg bg-gray-50">
                                                            <h4 className="font-semibold text-xs uppercase text-gray-500 mb-2">Run Code</h4>
                                                            <p className="text-sm">Executes your code against sample inputs to verify logic.</p>
                                                        </div>
                                                        <div className="border border-gray-200 p-3 rounded-lg bg-gray-50">
                                                            <h4 className="font-semibold text-xs uppercase text-gray-500 mb-2">Submit</h4>
                                                            <p className="text-sm">Runs against hidden test cases. Required for completion.</p>
                                                        </div>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="notes" className="space-y-4">
                                                    <h3 className="text-lg font-semibold text-gray-800">Effective Note Taking</h3>
                                                    <p className="text-gray-600 text-sm leading-relaxed">
                                                        We provide two dedicated spaces for your knowledge management:
                                                    </p>

                                                    <div className="space-y-3 mt-4">
                                                        <div className="flex gap-3 p-3 border border-blue-100 bg-blue-50/50 rounded-xl cursor-pointer hover:bg-blue-100/50 transition-colors" onClick={() => { setRightTab("materials"); setIsHelpOpen(false); }}>
                                                            <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <h4 className="font-semibold text-blue-900 text-sm">Course Materials</h4>
                                                                <p className="text-xs text-blue-800 mt-1">Official notes and cheat sheets provided by the instructor. These are read-only references.</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-3 p-3 border border-yellow-100 bg-yellow-50/50 rounded-xl cursor-pointer hover:bg-yellow-100/50 transition-colors" onClick={() => { setRightTab("notes"); setIsHelpOpen(false); }}>
                                                            <StickyNote className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <h4 className="font-semibold text-yellow-900 text-sm">Personal Notes</h4>
                                                                <p className="text-xs text-yellow-800 mt-1">Your personal digital notebook. Write, edit, and save your own key takeaways here.</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-saffron-500" />
                                                        <span><strong>Tip:</strong> Open the AI Buddy in either tab to get instant summaries or help with your notes!</span>
                                                    </div>
                                                </TabsContent>
                                            </ScrollArea>
                                        </Tabs>
                                    </div>
                                </DialogContent>
                            </Dialog>


                            {rightTab === "videos" && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={async () => {
                                            if (selectedSubtopic) {
                                                try {
                                                    await markSubtopicVideoWatched(selectedSubtopic.id);
                                                    toast.success("Videos marked as watched");
                                                    loadProgress();
                                                } catch (e) {
                                                    toast.error("Failed to mark video watched");
                                                }
                                            }
                                        }}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors 
                        ${activeProgress.video
                                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                : "bg-blue-600 text-white hover:bg-blue-700"}`}
                                    >
                                        {activeProgress.video ? <Check className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                        {activeProgress.video ? "Watched" : "Mark as Watched"}
                                    </button>

                                    <div className="h-4 w-px bg-gray-300 mx-1" />

                                    {/* Layout Switcher Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className="
                                                h-9 px-4 text-gray-600 bg-white
                                                border border-gray-300 rounded-full shadow-sm
                                                flex items-center gap-2 text-sm font-semibold
                                                transition-all duration-200
                                                hover:text-blue-700 hover:bg-blue-50
                                                active:scale-95
                                            "
                                            >
                                                <Layout className="w-4 h-4" />
                                                <span>Layouts</span>
                                            </button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent
                                            align="end"
                                            className="
                                            w-64 p-2 rounded-2xl border border-gray-100
                                            bg-white backdrop-blur-md
                                            shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)]
                                            z-[100]

                                            data-[state=open]:animate-in
                                            data-[state=closed]:animate-out
                                            data-[state=open]:fade-in-0
                                            data-[state=closed]:fade-out-0
                                            data-[state=open]:zoom-in-95
                                            data-[state=closed]:zoom-out-95
                                            
                                            /* Override default slide-ins */
                                            data-[side=bottom]:slide-in-from-top-0
                                            data-[side=top]:slide-in-from-bottom-0
                                            data-[side=left]:slide-in-from-right-0
                                            data-[side=right]:slide-in-from-left-0

                                            duration-200
                                            ease-out
                                            "
                                        >
                                            {[
                                                {
                                                    id: "video",
                                                    label: "Standard View",
                                                    sub: "Primary video focus",
                                                    icon: <VideoIcon className="w-5 h-5" />,
                                                },
                                                {
                                                    id: "video-chat",
                                                    label: "Video + AI Chat",
                                                    sub: "Interactive learning",
                                                    icon: (
                                                        <div className="flex gap-1">
                                                            <VideoIcon className="w-4 h-4" />
                                                            <Sparkles className="w-4 h-4" />
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    id: "video-code",
                                                    label: "Video + Code",
                                                    sub: "Follow & Practice",
                                                    icon: (
                                                        <div className="flex gap-1">
                                                            <VideoIcon className="w-4 h-4" />
                                                            <Code className="w-4 h-4" />
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    id: "code-chat",
                                                    label: "Code + AI Chat",
                                                    sub: "AI-assisted coding",
                                                    icon: (
                                                        <div className="flex gap-1">
                                                            <Code className="w-4 h-4" />
                                                            <Sparkles className="w-4 h-4" />
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    id: "video-chat-code",
                                                    label: "Pro Workspace",
                                                    sub: "Full-stack experience",
                                                    icon: (
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <div className="flex gap-1">
                                                                <VideoIcon className="w-3 h-3" />
                                                                <Sparkles className="w-3 h-3" />
                                                            </div>
                                                            <Code className="w-3 h-3" />
                                                        </div>
                                                    ),
                                                },
                                            ].map((opt) => (
                                                <DropdownMenuItem
                                                    key={opt.id}
                                                    onClick={() => setVideoLayout(opt.id as LayoutMode)}
                                                    className={`
                                                group flex items-center gap-4 px-3.5 py-3 rounded-xl cursor-pointer
                                                transition-[background,transform,box-shadow] duration-200 ease-out
                                                hover:scale-[1.015] hover:shadow-md
                                                active:scale-[0.98]
                                                ${videoLayout === opt.id
                                                            ? "bg-saffron-600 text-white ring-4 ring-saffron-50 shadow-lg"
                                                            : "text-gray-700 hover:bg-gray-50"}
                                                `}
                                                >
                                                    <div
                                                        className={`
                                                    w-10 h-10 flex items-center justify-center rounded-xl
                                                    transition-all duration-300 ease-out
                                                    group-hover:scale-110 group-hover:rotate-3
                                                    ${videoLayout === opt.id
                                                                ? "bg-white/20"
                                                                : "bg-gray-100 group-hover:bg-white"}
                                                `}
                                                    >
                                                        {opt.icon}
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold">{opt.label}</span>
                                                        <span className="text-[10px] opacity-70">{opt.sub}</span>
                                                    </div>

                                                    {videoLayout === opt.id && (
                                                        <div className="ml-auto w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                        </div>
                                                    )}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <div className="h-4 w-px bg-gray-300 mx-1" />
                                </div>
                            )}


                        </div>
                    </div>

                    <div className={(rightTab === "coding" || rightTab === "videos" || rightTab === "materials" || rightTab === "notes" || rightTab === "quizzes") ? "flex-1 overflow-hidden flex flex-col" : "p-6 flex-1 overflow-y-auto"}>
                        {!selectedSubtopic ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                                <div className="text-lg font-medium mb-2">Select a subtopic on the left</div>
                                <div className="text-sm">Then browse Videos / Quizzes / Notes</div>
                            </div>
                        ) : (
                            <>
                                {rightTab === "videos" &&
                                    <StudentVideos
                                        subtopicId={selectedSubtopic.id}
                                        courseName={course?.name || "Unknown"}
                                        topicName={topics.find(t => expandedTopics[t.id])?.name || "Topic"}
                                        subtopicName={selectedSubtopic.name}
                                        subtopicContent={selectedSubtopic.content}
                                        sessionId={chatSessionId}
                                        onNewSession={() => setChatSessionId(`course-chat-${courseId}-${crypto.randomUUID()}`)}
                                        layout={videoLayout}
                                        onLayoutChange={setVideoLayout}
                                    />
                                }
                                {rightTab === "quizzes" && (
                                    <StudentQuizEmbed
                                        subtopicId={selectedSubtopic.id}
                                        onComplete={() => debouncedProgressUpdate()}
                                    />
                                )}
                                {rightTab === "coding" && (
                                    <StudentCodingEmbed
                                        subtopicId={selectedSubtopic.id}
                                        onComplete={() => debouncedProgressUpdate()}
                                        codeSubmissionType="learn"
                                        courseId={courseId}
                                        topicId={selectedSubtopic.topic}
                                    />
                                )}
                                {rightTab === "materials" && <StudentNotes subtopicId={selectedSubtopic.id} mode="materials" />}
                                {rightTab === "notes" && <StudentNotes subtopicId={selectedSubtopic.id} mode="notes" />}

                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;