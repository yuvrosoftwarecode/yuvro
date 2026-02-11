// src/features/Learn/LearnDashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import restApiAuthUtil from "../../utils/RestApiAuthUtil";
import { fetchUnitsBySubject } from '@/services/subjectService';
import subjectService from '@/services/subjectService';

import ContinueLearningBanner from "@/components/student/Learn/ContinueLearningBanner";
import StatsGrid from "@/components/student/Learn/StatsGrid";
import GamificationSidebar from "@/components/student/Learn/GamificationSidebar";
import SearchBar from "@/components/common/SearchBar";
import CategorySection from "@/components/student/Learn/CategorySection";
import AIChatContainer from '@/components/student/Learn/AIChatWidget/AIChatContainer';

import { Binary, Code, Database, Sparkles, FileText, Flame, Award, X, ChevronRight } from "lucide-react";

import type { Subject, Stats, ContinueProgress, SubjectProgressMap } from "@/components/student/Learn/types";

const LearnDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progressMap, setProgressMap] = useState<SubjectProgressMap>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ lessons_completed: 0, time_spent: "0h", avg_progress: 0 });
  const [continueProgress, setContinueProgress] = useState<ContinueProgress>({
    subject_id: "",
    subject_name: "Python",
    lesson: 0,
    total_lessons: 0,
    percent: 0,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchSubjectsData = async () => {
      try {
        const subjectList = await subjectService.getSubjects();
        const withUnits = await Promise.all(
          subjectList.map(async (s) => {
            try {
              const units = await fetchUnitsBySubject(String(s.id));
              return { ...s, units };
            } catch {
              return { ...s, units: [] };
            }
          })
        );
        setSubjects(withUnits as Subject[]);
        return withUnits;
      } catch (err) {
        console.error("Failed to fetch subjects", err);
        setSubjects([]);
        return [];
      }
    };

    const fetchStats = async () => {
      try {
        const s = await restApiAuthUtil.get("/course/student-subject-progress/stats/");
        setStats(s as Stats);
        return s;
      } catch (err) {
        console.error("Failed to fetch stats", err);
        return null;
      }
    };

    const fetchContinue = async () => {
      try {
        const c = await restApiAuthUtil.get("/course/student-subject-progress/continue_learning/");
        const cp = c as any;
        setContinueProgress((prev) => ({
          ...prev,
          subject_id: String(cp.subject_id || ""),
          subject_name: cp.subject_name || prev.subject_name || "Python",
          lesson: cp.lesson || 0,
          total_lessons: cp.total_lessons || 0,
          percent: cp.percent || 0,
        }));
        return cp;
      } catch (err) {
        console.error("Failed to fetch continue progress", err);
        return null;
      }
    };

    const fetchProgressMap = async () => {
      try {
        const list = await restApiAuthUtil.get<{ subject_id: string; percent: number }[]>("/course/student-subject-progress/progress/");
        const map: SubjectProgressMap = {};
        if (Array.isArray(list)) {
          list.forEach((p) => { map[String(p.subject_id)] = p.percent ?? 0; });
        }
        setProgressMap(map);
        return map;
      } catch (err) {
        console.warn("Progress endpoint missing or failed - using defaults", err);
        setProgressMap({});
        return {};
      }
    };

    const refetchData = async () => {
      await Promise.all([fetchStats(), fetchContinue(), fetchProgressMap()]);
    };

    const loadAll = async () => {
      try {
        const [fetchedSubjects, , fetchedContinue] = await Promise.all([
          fetchSubjectsData(),
          fetchStats(),
          fetchContinue(),
          fetchProgressMap()
        ]);

        // Merge subject name if missing using the FRESH fetchedSubjects
        if (fetchedContinue && fetchedSubjects.length > 0) {
          const cp = fetchedContinue as any;
          const subjectStrId = String(cp.subject_id || "");
          const subject = fetchedSubjects.find((s: any) => String(s.id) === subjectStrId);

          if (subject) {
            setContinueProgress((prev) => ({
              ...prev,
              subject_name: subject.name
            }));
          }
        }

      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();

    const handleFocus = () => {
      refetchData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleStartLearning = (subjectId: string) => {
    console.log("Starting learning for subject:", subjectId);
    if (!subjectId) {
      console.warn("Attempted to start learning with empty subjectId");
      return;
    }
    navigate(`/student/learn/${subjectId}`);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSubjects = normalizedQuery
    ? subjects.filter((s) => {
      if (s.name && s.name.toLowerCase().includes(normalizedQuery)) return true;
      if ((s as any).description && (s as any).description.toLowerCase().includes(normalizedQuery)) return true;
      if (Array.isArray((s as any).units)) {
        const units: any[] = (s as any).units;
        if (units.some((u) => (u.name || '').toLowerCase().includes(normalizedQuery))) return true;
      }
      return false;
    })
    : subjects;

  const groupedFiltered = {
    fundamentals: filteredSubjects.filter((s) => s.category === "fundamentals"),
    programming_languages: filteredSubjects.filter((s) => s.category === "programming_languages"),
    databases: filteredSubjects.filter((s) => s.category === "databases"),
    ai_tools: filteredSubjects.filter((s) => s.category === "ai_tools"),
  };

  const getIconFor = (category: string) => {
    switch (category) {
      case "fundamentals": return <Binary className="w-5 h-5 text-blue-600" />;
      case "programming_languages": return <Code className="w-5 h-5 text-green-600" />;
      case "databases": return <Database className="w-5 h-5 text-orange-600" />;
      case "ai_tools": return <Sparkles className="w-5 h-5 text-purple-600" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading subjects...
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white px-8 py-1 pb-12">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {/* Header + badges */}
          <div className="space-y-6 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Learn</h1>
                <p className="text-gray-600 py-2 text-sm">Continue your learning journey — unlock badges and grow your streak.</p>
              </div>

              <div className="flex gap-3">
                {/* Search bar */}
                <div className="group relative">
                  <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                </div>

                <div className="group relative cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
                  <div className="flex items-center gap-2 h-14 px-6 bg-gradient-to-r from-yellow-100/60 to-orange-100/40 rounded-full border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-200 text-yellow-700 text-lg shadow">
                      <Flame className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-gray-800">{stats.streak || 0}-day streak</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    🔥 View detailed progress
                  </div>
                </div>
              </div>
            </div>

            <StatsGrid stats={stats} />

            <div className="grid grid-cols-1 gap-8">
              <div className="lg:col-span-3">
                <ContinueLearningBanner continueProgress={continueProgress} />
              </div>
            </div>
          </div>


          {/* Category sections */}
          {normalizedQuery && filteredSubjects.length === 0 ? (
            <div className="py-8 text-center text-gray-600">No subjects match "{searchQuery}"</div>
          ) : (
            Object.entries(groupedFiltered).map(([key, list]) =>
              list.length > 0 ? (
                <div key={key} className="flex mb-8 gap-6">
                  <CategorySection
                    title={key.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                    icon={getIconFor(key)}
                    subjects={list}
                    progressMap={progressMap}
                    onStartLearning={handleStartLearning}
                  />
                </div>
              ) : null
            )
          )}


        </div>
      </div>

      <GamificationSidebar
        stats={stats}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Chat toggle & Window */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">

        {/* Chat Window with Transition */}
        <div
          className={`transition-all duration-300 ease-in-out transform origin-bottom-right
            ${showChat
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
            }
          `}
        >
          <AIChatContainer className="w-[380px] h-[550px] max-h-[70vh] shadow-2xl" welcomeMessage="I can help you find subjects or track your progress." />
        </div>

        {/* Toggle Button */}
        <button
          aria-label={showChat ? 'Close AI chat' : 'Open AI chat'}
          onClick={() => setShowChat((s) => !s)}
          className={`
            group flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95
            ${showChat
              ? 'bg-red-500 text-white rotate-0'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white ring-4 ring-blue-50/50' // Open state with premium gradient
            }
          `}
        >
          {showChat ? (
            <X size={24} />
          ) : (
            <Sparkles size={24} className="animate-pulse" />
          )}
        </button>
      </div>
    </>
  );
};

export default LearnDashboard;