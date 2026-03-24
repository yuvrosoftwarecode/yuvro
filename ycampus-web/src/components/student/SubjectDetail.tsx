import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Navigation from "../../components/common/Navigation";
import StudentVideos, { LayoutMode } from "./StudentVideos";
import StudentQuizEmbed from "./StudentQuizEmbed";
import StudentCodingEmbed from "./StudentCodingEmbed";
import StudentNotes from "./StudentNotes";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft } from "lucide-react";
import {
    fetchSubjectById,
    fetchUnitsBySubject,
    fetchSubUnitsByUnit,
    markSubUnitVideoWatched,
    fetchUserSubjectProgress,
    Subject,
    UnitBasic as Unit,
    SubUnit
} from "@/services/subjectService";
import { fetchQuestions } from "@/services/questionService";
import { Check } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import { PlayCircle, HelpCircle, StickyNote, BookOpen, Info, CheckCircle2, MonitorPlay, Layout, Video as VideoIcon, Code, Sparkles } from "lucide-react";
import { getSubjectStyle } from "@/utils/subjectIcon";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


const SubjectDetail: React.FC<{
    hideNavigation?: boolean;
    onSwitchSubject?: () => void;
    onCollapseChange?: (collapsed: boolean) => void;
}> = ({ hideNavigation = false, onSwitchSubject, onCollapseChange }) => {
    const { subjectId } = useParams<{ subjectId: string }>();

    const [subject, setSubject] = useState<Subject | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);

    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (onCollapseChange) {
            onCollapseChange(collapsed);
        }
    }, [collapsed, onCollapseChange]);

    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
    const [subunitsMap, setSubunitsMap] = useState<Record<string, SubUnit[]>>({});

    const [progressMap, setProgressMap] = useState<Record<string, number>>({});
    const [readMap, setReadMap] = useState<Record<string, boolean>>({});

    const [loading, setLoading] = useState(true);
    const [chatSessionId, setChatSessionId] = useState(`subject-chat-${subjectId}-${crypto.randomUUID()}`);
    const [rightTab, setRightTab] = useState<'videos' | 'quizzes' | 'coding' | 'materials' | 'my-notes'>('videos');

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

    const [selectedSubUnit, setSelectedSubUnit] = useState<SubUnit | null>(
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

        if (selectedSubUnit) {
            // Context Isolation: Use a STABLE session ID for each subtopic
            setChatSessionId(`subunit-chat-${selectedSubUnit.id}`);
            checkRequirements(selectedSubUnit.id);
        }
    }, [selectedSubUnit?.id]);

    const checkRequirements = async (subunitId: string) => {
        try {
            const [quizzes, coding] = await Promise.all([
                fetchQuestions({ sub_unit: subunitId, level: 'subunit', type: 'mcq_single' }),
                fetchQuestions({ sub_unit: subunitId, level: 'subunit', type: 'coding' }),
            ]);
            setRequirements({ hasQuiz: quizzes.length > 0, hasCoding: coding.length > 0, loaded: true });
        } catch (err) {
            console.error("Failed to check requirements", err);
            setRequirements({ hasQuiz: false, hasCoding: false, loaded: true });
        }
    };

    const handleProgressUpdate = useCallback(async () => {
        if (!selectedSubUnit || loadingProgressRef.current) return;

        console.log('handleProgressUpdate called for subunit:', selectedSubUnit.id);
        await loadProgress();
    }, [selectedSubUnit?.id]);

    const debouncedProgressUpdate = useCallback(
        React.useMemo(() => {
            let timeoutId: NodeJS.Timeout;
            return () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    handleProgressUpdate();
                }, 300);
            };
        }, [handleProgressUpdate]),
        [handleProgressUpdate]
    );

    const getUnitProgress = (unitId: string): number => {
        const subs = subunitsMap[unitId] || [];
        if (subs.length === 0) return 0;

        const totalProgress = subs.reduce((acc, s) => acc + (progressMap[s.id] || 0), 0);

        return Math.round(totalProgress / subs.length);
    };

    useEffect(() => {
        loadPage();
    }, [subjectId]);

    const overallProgress = React.useMemo(() => {
        const allSubs = Object.values(subunitsMap).flat();
        if (allSubs.length === 0) return 0;
        const total = allSubs.reduce((acc, s) => acc + (progressMap[s.id] || 0), 0);
        return Math.round(total / allSubs.length);
    }, [subunitsMap, progressMap]);

    const loadPage = async () => {
        if (!subjectId) return;

        setLoading(true);

        try {
            // Fetch subject + units in parallel instead of sequentially
            const [s, u] = await Promise.all([
                fetchSubjectById(subjectId),
                fetchUnitsBySubject(subjectId),
            ]);
            setSubject(s);
            setUnits(u);

            const allSubUnits: Record<string, SubUnit[]> = {};
            let firstSubUnit: SubUnit | null = null;
            let firstUnitId: string | null = null;

            try {
                const subunitPromises = u.map(async (unit) => {
                    const subs = await fetchSubUnitsByUnit(unit.id);
                    return { unitId: unit.id, subs: subs as SubUnit[] };
                });

                const results = await Promise.all(subunitPromises);

                results.forEach(({ unitId, subs }) => {
                    allSubUnits[unitId] = subs;
                });

                const firstWithSubs = results.find(r => r.subs.length > 0);

                if (firstWithSubs) {
                    firstSubUnit = firstWithSubs.subs[0];
                    firstUnitId = firstWithSubs.unitId;
                }

                setSubunitsMap(allSubUnits);

                if (firstUnitId && firstSubUnit) {
                    const newExpanded: Record<string, boolean> = {};
                    u.forEach((unit) => (newExpanded[unit.id] = unit.id === firstUnitId));
                    setExpandedUnits(newExpanded);
                    setSelectedSubUnit(firstSubUnit);
                }
            } catch (err) {
                console.warn("Could not fetch subunits", err);
                setSubunitsMap({});
            }

            setSubunitsMap(allSubUnits);

            await loadProgress();
        } catch (err) {
            toast.error("Failed to load subject");
        } finally {
            setLoading(false);
        }
    };

    const loadProgress = async () => {
        if (!subjectId || loadingProgressRef.current) return;

        const now = Date.now();
        if (now - lastProgressFetchRef.current < 1000) {
            console.log('Skipping loadProgress - too soon after last call');
            return;
        }

        loadingProgressRef.current = true;
        lastProgressFetchRef.current = now;
        console.log('loadProgress called for subject:', subjectId);

        try {
            const progressData = await fetchUserSubjectProgress(subjectId) as any;

            const newProgressMap: Record<string, number> = {};
            const newReadMap: Record<string, boolean> = {};

            Object.entries(progressData).forEach(([subId, data]: [string, any]) => {
                newProgressMap[subId] = data.progress_percent || 0;
                newReadMap[subId] = data.is_completed || false;

                if (selectedSubUnit && selectedSubUnit.id === subId) {
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

    const toggleExpandUnit = async (unitId: string) => {
        const isOpen = expandedUnits[unitId];
        const newState: Record<string, boolean> = {};
        units.forEach((u) => (newState[u.id] = false));
        newState[unitId] = !isOpen;

        setExpandedUnits(newState);

        if (!isOpen && !subunitsMap[unitId]) {
            try {
                const subs = await fetchSubUnitsByUnit(unitId);
                setSubunitsMap((prev) => {
                    const updated: Record<string, SubUnit[]> = { ...prev, [unitId]: subs as SubUnit[] };
                    return updated;
                });
            } catch (err) {
                toast.error("Failed to load subunits");
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                Loading subject...
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-600">
                Subject not found.
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {!hideNavigation && <Navigation />}
            <div className="flex flex-1 overflow-hidden relative">
                <div
                    className={`bg-white shadow-sm transition-all duration-300 ease-in-out flex flex-col relative z-20 border-r border-gray-200`}
                    style={{
                        width: collapsed ? "50px" : "300px",
                        minWidth: collapsed ? "50px" : "300px",
                        overflow: "hidden",
                    }}
                >
                    <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar flex-1">
                        {collapsed ? (
                            <div className="flex flex-col items-center h-full py-3 gap-6 animate-fade-in">
                                <button
                                    onClick={() => setCollapsed(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
                                    aria-label="Expand sidebar"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 text-white shadow-sm ${getSubjectStyle(subject.subject_name || subject.name || '', 0).bg}`} title={subject.name}>
                                    {(() => {
                                        const Icon = getSubjectStyle(subject.subject_name || subject.name || '', 0).icon;
                                        return <Icon className="w-5 h-5 text-white" />;
                                    })()}
                                </div>
                                <div className="flex flex-col items-center gap-3 w-full px-2">
                                    {units.map((unit) => {
                                        const progress = getUnitProgress(unit.id);
                                        const isCompleted = progress === 100;
                                        return (
                                            <div
                                                key={unit.id}
                                                className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold cursor-pointer border-2 shadow-sm transition-all
                                                    ${isCompleted
                                                        ? "bg-green-500 text-white border-gray-600 hover:bg-green-600"
                                                        : "bg-white text-gray-700 border-transparent hover:border-gray-200 hover:bg-gray-50"
                                                    }`}
                                                title={unit.name}
                                                onClick={() => {
                                                    setCollapsed(false);
                                                    if (!expandedUnits[unit.id]) {
                                                        toggleExpandUnit(unit.id);
                                                    }
                                                }}
                                            >
                                                {unit.name.charAt(0)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 animate-fade-in opacity-100 transition-opacity duration-300">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 text-white shadow-sm ${getSubjectStyle(subject.subject_name || subject.name || '', 0).bg}`}>
                                            {(() => {
                                                const Icon = getSubjectStyle(subject.subject_name || subject.name || '', 0).icon;
                                                return <Icon className="w-5 h-5 text-white" />;
                                            })()}
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2">{subject.subject_name || subject.name}</h2>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCollapsed(true);
                                            onCollapseChange?.(true);
                                        }}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all shrink-0"
                                        aria-label="Collapse sidebar"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                </div>

                                <p className="text-sm text-gray-500 mb-5 ml-1">Track your learning progress</p>
                                <div className="mb-5 px-1">
                                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                                        <span>{overallProgress}% Completed</span>
                                    </div>
                                    <ProgressBar
                                        value={overallProgress}
                                        height={8}
                                        trackClassName="bg-gray-100 rounded-full"
                                        barClassName="bg-blue-600 rounded-full"
                                    />
                                </div>

                                <div className="h-px bg-gray-100 w-full mb-5" />

                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 ml-1">Subject Units</h3>

                                <div className="space-y-3 pb-4">
                                    {units.map((unit) => {
                                        const expanded = expandedUnits[unit.id];
                                        const subs = subunitsMap[unit.id] || [];
                                        const allRead = subs.length > 0 && subs.every((s) => readMap[s.id]);
                                        const progress = getUnitProgress(unit.id);
                                        return (
                                            <div key={unit.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                                                <div
                                                    className={`flex items-center justify-between cursor-pointer w-full p-3 transition-colors ${expanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                                                    onClick={() => toggleExpandUnit(unit.id)}
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`p-1 rounded-full transition-transform duration-300 ${expanded ? 'bg-gray-200 rotate-90' : 'bg-transparent rotate-0'}`}>
                                                            <ChevronRight className="w-4 h-4 text-gray-600" />
                                                        </div>
                                                        <span className="font-semibold text-gray-800 truncate text-sm">{unit.name}</span>
                                                    </div>
                                                    {allRead && (
                                                        <span className="flex items-center justify-center rounded-full bg-green-500 text-white w-5 h-5 shadow-sm">
                                                            <Check className="w-3 h-3" strokeWidth={4} />
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="px-3 pb-3 pt-0">
                                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 mt-1">
                                                        <span>Progress</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <ProgressBar
                                                        value={progress}
                                                        height={6}
                                                        trackClassName="bg-gray-100 rounded-full"
                                                        barClassName="bg-green-500 rounded-full"
                                                    />
                                                </div>

                                                <div
                                                    className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                                                >
                                                    <div className="bg-gray-50 border-t border-gray-100 pb-2 pt-2">
                                                        <div className="px-2 space-y-1">
                                                            {subs.map((s) => (
                                                                <div
                                                                    key={s.id}
                                                                    className={`group p-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-all duration-200 ${selectedSubUnit?.id === s.id
                                                                        ? "bg-white text-blue-700 shadow-sm border border-blue-100 ring-1 ring-blue-50"
                                                                        : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm border border-transparent"
                                                                        }`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedSubUnit(s);
                                                                        setRightTab("videos");
                                                                    }}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-medium text-sm truncate">{s.name}</span>
                                                                            {readMap[s.id] && (
                                                                                <Check className="text-green-500 w-4 h-4 flex-shrink-0 ml-2" />
                                                                            )}
                                                                        </div>
                                                                        {!readMap[s.id] && (progressMap[s.id] || 0) > 0 && (progressMap[s.id] || 0) < 100 && (
                                                                            <div className="mt-1.5 w-full pr-1">
                                                                                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                                                                                    <span>{Math.round(progressMap[s.id] || 0)}%</span>
                                                                                </div>
                                                                                <ProgressBar
                                                                                    value={progressMap[s.id] || 0}
                                                                                    height={3}
                                                                                    trackClassName="bg-gray-100 rounded-full"
                                                                                    barClassName="bg-blue-500 rounded-full"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {onSwitchSubject && (
                        <div className={`border-t border-gray-100 flex-shrink-0 transition-all duration-300 ${collapsed ? "px-2 py-4" : "p-4"}`}>
                            <button
                                onClick={onSwitchSubject}
                                className={`flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all
                                    ${collapsed ? "w-8 h-8 p-0 mx-auto" : "w-full px-4 py-2"}`}
                                title="Switch Subject"
                            >
                                <ChevronLeft className={`${collapsed ? "w-5 h-5" : "w-4 h-4"}`} />
                                {!collapsed && <span>Switch Subject</span>}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="border-b border-gray-200 py-3 flex items-center justify-between relative h-16">
                        <div className="ml-4 flex items-center gap-2 text-sm bg-white border border-gray-300 shadow-sm rounded-full px-3 py-1 font-medium text-gray-700 max-w-[30%] min-w-0">
                            {selectedSubUnit && (
                                <>
                                    <span className="text-gray-500 truncate hidden md:block max-w-[120px]" title={units.find(u => u.id === selectedSubUnit.unit)?.name}>
                                        {collapsed
                                            ? units.find(u => u.id === selectedSubUnit.unit)?.name
                                            : units.find(u => u.id === selectedSubUnit.unit)?.name.charAt(0)
                                        }
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 hidden md:block" />
                                </>
                            )}
                            <span className="truncate" title={selectedSubUnit ? selectedSubUnit.name : ""}>
                                {selectedSubUnit ? selectedSubUnit.name : "No subunit selected"}
                            </span>
                        </div>

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1.5">
                            {[
                                { key: "videos", label: "Videos", icon: <PlayCircle className="w-4 h-4" /> },
                                { key: "materials", label: "Materials", icon: <BookOpen className="w-4 h-4" /> },
                                { key: "my-notes", label: "My Notes", icon: <StickyNote className="w-4 h-4" /> },
                                { key: "quizzes", label: "Quiz", icon: <HelpCircle className="w-4 h-4" /> },
                                // { key: "coding", label: "Coding", icon: <Code className="w-4 h-4" /> }
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    title={!collapsed ? tab.label : ""}
                                    className={`relative px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${rightTab === tab.key
                                        ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-100 ring-offset-2"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200"
                                        }`}
                                    onClick={() => setRightTab(tab.key as any)}
                                >
                                    {tab.icon}
                                    <span className={`${!collapsed ? 'hidden' : 'block'} transition-all duration-300`}>
                                        {tab.label}
                                    </span>

                                    {rightTab === tab.key && (
                                        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 ml-4 mr-6">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="p-2 text-gray-500 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors" title="Subject Guide">
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
                                                {/* <TabsTrigger value="coding">Coding</TabsTrigger> */}
                                                <TabsTrigger value="notes">Notes</TabsTrigger>
                                            </TabsList>

                                            <ScrollArea className="h-[400px] pr-4">
                                                <TabsContent value="progress" className="space-y-4">
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
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

                                                        {/* <div className="flex gap-4 items-start">
                                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg mt-1">
                                                                <Code className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium text-gray-900">3. Solve Coding Challenges</h4>
                                                                <p className="text-sm text-gray-600">All test cases must pass for the solution to be accepted.</p>
                                                            </div>
                                                        </div> */}
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

                                                {/* <TabsContent value="coding" className="space-y-4">
                                                    <h3 className="text-lg font-semibold text-gray-800">Hands-on Coding</h3>
                                                    <p className="text-gray-600 text-sm leading-relaxed">
                                                        Practice makes perfect. Our built-in code editor lets you write and run code in the browser.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                                        <div className="border p-3 rounded-lg bg-gray-50">
                                                            <h4 className="font-semibold text-xs uppercase text-gray-500 mb-2">Run Code</h4>
                                                            <p className="text-sm">Executes your code against sample inputs to verify logic.</p>
                                                        </div>
                                                        <div className="border p-3 rounded-lg bg-gray-50">
                                                            <h4 className="font-semibold text-xs uppercase text-gray-500 mb-2">Submit</h4>
                                                            <p className="text-sm">Runs against hidden test cases. Required for completion.</p>
                                                        </div>
                                                    </div>
                                                </TabsContent> */}

                                                <TabsContent value="notes" className="space-y-4">
                                                    <h3 className="text-lg font-semibold text-gray-800">Effective Note Taking</h3>
                                                    <p className="text-gray-600 text-sm leading-relaxed">
                                                        We provide two dedicated spaces for your knowledge management:
                                                    </p>

                                                    <div className="space-y-3 mt-4">
                                                        <div className="flex gap-3 p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
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

                                                    <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 flex items-center gap-2">
                                                        <MonitorPlay className="w-4 h-4" />
                                                        <span><strong>Tip:</strong> Use "Split View" to read materials and write notes simultaneously!</span>
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
                                            if (selectedSubUnit) {
                                                try {
                                                    await markSubUnitVideoWatched(selectedSubUnit.id);
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
                                                : "bg-slate-900 text-white hover:bg-black"}`}
                                    >
                                        {activeProgress.video ? <Check className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                        {activeProgress.video ? "Watched" : "Mark as Watched"}
                                    </button>
                                    <div className="h-4 w-px bg-gray-300 mx-1" />

                                    {/* Layout Switcher Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-9 px-4 text-gray-600 bg-white border border-gray-300 rounded-full shadow-sm flex items-center gap-2 text-sm font-semibold transition-all duration-200 hover:text-blue-700 hover:bg-blue-50 active:scale-95">
                                                <Layout className="w-4 h-4" />
                                                <span>Layouts</span>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-64 p-2 rounded-2xl border border-gray-100 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200 ease-out"
                                        >
                                            {[
                                                { id: "video", label: "Standard View", sub: "Primary video focus", icon: <VideoIcon className="w-5 h-5" /> },
                                                { id: "video-chat", label: "Video + AI Chat", sub: "Interactive learning", icon: <div className="flex gap-1"><VideoIcon className="w-4 h-4" /><Sparkles className="w-4 h-4" /></div> },
                                                { id: "video-code", label: "Video + Code", sub: "Follow & Practice", icon: <div className="flex gap-1"><VideoIcon className="w-4 h-4" /><Code className="w-4 h-4" /></div> },
                                                { id: "code-chat", label: "Code + AI Chat", sub: "AI-assisted coding", icon: <div className="flex gap-1"><Code className="w-4 h-4" /><Sparkles className="w-4 h-4" /></div> },
                                                { id: "video-chat-code", label: "Pro Workspace", sub: "Full-stack experience", icon: <div className="flex flex-col gap-1 items-center"><div className="flex gap-1"><VideoIcon className="w-3 h-3" /><Sparkles className="w-3 h-3" /></div><Code className="w-3 h-3" /></div> },
                                            ].map((opt) => (
                                                <DropdownMenuItem
                                                    key={opt.id}
                                                    onClick={() => setVideoLayout(opt.id as LayoutMode)}
                                                    className={`group flex items-center gap-4 px-3.5 py-3 rounded-xl cursor-pointer transition-[background,transform,box-shadow] duration-200 ease-out hover:scale-[1.015] hover:shadow-md active:scale-[0.98] ${videoLayout === opt.id ? "bg-indigo-600 text-white ring-4 ring-indigo-50 shadow-lg" : "text-gray-700 hover:bg-gray-50"}`}
                                                >
                                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-3 ${videoLayout === opt.id ? "bg-white/20" : "bg-gray-100 group-hover:bg-white"}`}>
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
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {!selectedSubUnit ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                                <div className="text-lg font-medium mb-2">Select a subunit on the left</div>
                                <div className="text-sm">Then browse Videos / Quizzes / Notes</div>
                            </div>
                        ) : (
                            <>
                                {rightTab === "videos" &&
                                    <StudentVideos
                                        subunitId={selectedSubUnit.id}
                                        subjectName={subject?.name || "Unknown"}
                                        unitName={units.find(u => expandedUnits[u.id])?.name || "Unit"}
                                        subunitName={selectedSubUnit.name}
                                        subunitContent={selectedSubUnit.content}
                                        sessionId={chatSessionId}
                                        onNewSession={() => setChatSessionId(`subject-chat-${subjectId}-${crypto.randomUUID()}`)}
                                        layout={videoLayout}
                                        onLayoutChange={setVideoLayout}
                                    />
                                }
                                {rightTab === "quizzes" && (
                                    <StudentQuizEmbed
                                        subunitId={selectedSubUnit.id}
                                        onComplete={() => debouncedProgressUpdate()}
                                    />
                                )}
                                {/* {rightTab === "coding" && (
                                    <StudentCodingEmbed
                                        subunitId={selectedSubUnit.id}
                                        subunitName={selectedSubUnit.name}
                                        unitName={units.find(u => u.id === selectedSubUnit.unit)?.name}
                                        onComplete={() => debouncedProgressUpdate()}
                                        codeSubmissionType="learn"
                                        subjectId={subjectId}
                                        unitId={selectedSubUnit.unit}
                                    />
                                )} */}
                                {rightTab === "materials" && (
                                    <StudentNotes
                                        subunitId={selectedSubUnit.id}
                                        mode="materials"
                                        sessionId={chatSessionId}
                                        onNewSession={() => setChatSessionId(`subject-chat-${subjectId}-${crypto.randomUUID()}`)}
                                    />
                                )}
                                {rightTab === "my-notes" && (
                                    <StudentNotes
                                        subunitId={selectedSubUnit.id}
                                        mode="my-notes"
                                        sessionId={chatSessionId}
                                        onNewSession={() => setChatSessionId(`subject-chat-${subjectId}-${crypto.randomUUID()}`)}
                                    />
                                )}

                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubjectDetail;