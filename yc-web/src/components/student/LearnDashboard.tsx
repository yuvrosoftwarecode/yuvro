// src/features/Learn/LearnDashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import restApiAuthUtil from "../../utils/RestApiAuthUtil";
import { fetchTopicsByCourse } from '@/services/courseService';


import LearningSummaryCard from "./Learn/LearningSummaryCard";
import GamificationWidget from "./Learn/GamificationWidget";
import SearchBar from "@/components/common/SearchBar";
import CategorySection from "@/components/student/Learn/CatergorySection";
import AIChatContainer from '@/components/student/Learn/AIChatWidget/AIChatContainer';

import { Binary, Code, Database, Sparkles, FileText, X } from "lucide-react";

import type { Course, Stats, ContinueProgress, CourseProgressMap } from "@/components/student/Learn/types";

const LearnDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<CourseProgressMap>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ lessons_completed: 0, time_spent: "0h", avg_progress: 0 });
  const [continueProgress, setContinueProgress] = useState<ContinueProgress>({
    course_id: "",
    course_name: "Python",
    lesson: 0,
    total_lessons: 0,
    percent: 0,
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const courseList = await restApiAuthUtil.get<Course[]>("/course/courses/");
        const withTopics = await Promise.all(
          courseList.map(async (c) => {
            try {
              const topics = await fetchTopicsByCourse(String(c.id));
              return { ...c, topics };
            } catch {
              return { ...c, topics: [] };
            }
          })
        );
        setCourses(withTopics);
        return withTopics;
      } catch (err) {
        console.error("Failed to fetch courses", err);
        setCourses([]);
        return [];
      }
    };

    const fetchStats = async () => {
      try {
        const s = await restApiAuthUtil.get("/course/student-course-progress/stats/");
        setStats(s as Stats);
        return s;
      } catch (err) {
        console.error("Failed to fetch stats", err);
        return null;
      }
    };

    const fetchContinue = async () => {
      try {
        const c = await restApiAuthUtil.get("/course/student-course-progress/continue_learning/");
        const cp = c as ContinueProgress;
        setContinueProgress((prev) => ({
          ...prev,
          course_id: String(cp.course_id || ""),
          course_name: cp.course_name || prev.course_name || "Python",
          lesson: cp.lesson || 0,
          total_lessons: cp.total_lessons || 0,
          percent: cp.percent || 0,
          subtopic_name: cp.subtopic_name,
        }));
        return cp;
      } catch (err) {
        console.error("Failed to fetch continue progress", err);
        return null;
      }
    };

    const fetchProgressMap = async () => {
      try {
        const list = await restApiAuthUtil.get<{ course_id: string; percent: number }[]>("/course/student-course-progress/progress/");
        const map: CourseProgressMap = {};
        if (Array.isArray(list)) {
          list.forEach((p) => { map[String(p.course_id)] = p.percent ?? 0; });
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
        const [fetchedCourses, , fetchedContinue] = await Promise.all([
          fetchCourses(),
          fetchStats(),
          fetchContinue(),
          fetchProgressMap()
        ]);

        if (fetchedContinue && fetchedCourses.length > 0) {
          const cp = fetchedContinue as ContinueProgress;
          const courseStrId = String(cp.course_id || "");
          const course = fetchedCourses.find((c) => String(c.id) === courseStrId);

          if (course) {
            setContinueProgress((prev) => ({
              ...prev,
              course_name: course.name
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

  const handleStartLearning = (courseId: string) => {
    if (!courseId) return;
    navigate(`/student/learn/${courseId}`);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCourses = normalizedQuery
    ? courses.filter((c) => {
      if (c.name && c.name.toLowerCase().includes(normalizedQuery)) return true;
      if ((c as any).description && (c as any).description.toLowerCase().includes(normalizedQuery)) return true;
      if (Array.isArray((c as any).topics)) {
        const topics: any[] = (c as any).topics;
        if (topics.some((t) => (t.name || '').toLowerCase().includes(normalizedQuery))) return true;
      }
      return false;
    })
    : courses;

  const groupedFiltered = {
    fundamentals: filteredCourses.filter((c) => c.category === "fundamentals"),
    programming_languages: filteredCourses.filter((c) => c.category === "programming_languages"),
    databases: filteredCourses.filter((c) => c.category === "databases"),
    ai_tools: filteredCourses.filter((c) => c.category === "ai_tools"),
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
        Loading courses...
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white font-sans">
        {/* Soft Hero Background Wrapper */}
        <div className="bg-gradient-to-b from-[#F8FAFF] to-[#FFFFFF] pb-12 pt-8 px-8">
          <div className="max-w-[1600px] mx-auto space-y-10">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">Learning Overview</h1>
                  {continueProgress.course_name && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50/80 border border-blue-100 rounded-full text-xs font-medium text-blue-700 animate-in fade-in slide-in-from-left-4 duration-700">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      Today: Continue {continueProgress.course_name}
                    </div>
                  )}
                </div>
                <p className="text-gray-500 font-medium ml-0.5">Your progress and courses at a glance</p>
              </div>

              <div className="w-full md:w-auto min-w-[320px] max-w-md">
                <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              </div>
            </div>

            {/* Dashboard Grid: Summary & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Learning Summary (Visual Anchor) */}
              <div className="lg:col-span-8 xl:col-span-9">
                <LearningSummaryCard stats={stats} lastActivity={continueProgress} />
              </div>

              {/* Right Column: Gamification (Secondary) */}
              <div className="lg:col-span-4 xl:col-span-3">
                <GamificationWidget stats={stats} />
              </div>
            </div>

          </div>
        </div>

        {/* Main Content Area (White Background) */}
        <div className="px-8 pb-20">
          <div className="max-w-[1600px] mx-auto">
            <div className="space-y-16">
              {normalizedQuery && filteredCourses.length === 0 ? (
                <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No courses match "{searchQuery}"
                </div>
              ) : (
                Object.entries(groupedFiltered).map(([key, list]) =>
                  list.length > 0 ? (
                    <div key={key}>
                      {/* Divider / Section Header handled in CategorySection (Clean separation) */}
                      <CategorySection
                        title={key.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                        icon={getIconFor(key)}
                        courses={list}
                        progressMap={progressMap}
                        onStartLearning={handleStartLearning}
                      />
                    </div>
                  ) : null
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat toggle & Window */}
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 ${showChat ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`transition-all duration-300 ease-in-out transform origin-bottom-right ${showChat ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}>
          <AIChatContainer
            className="w-[380px] h-[550px] max-h-[70vh] shadow-2xl"
            welcomeMessage="I can help you find courses or track your progress."
          />
        </div>
        <button
          aria-label={showChat ? 'Close AI chat' : 'Open AI chat'}
          onClick={() => setShowChat((s) => !s)}
          className={`pointer-events-auto group flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${showChat ? 'bg-red-500 text-white' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white ring-4 ring-blue-50/50'}`}
        >
          {showChat ? <X size={24} /> : <Sparkles size={24} className="animate-pulse" />}
        </button>
      </div>
    </>
  );
};

export default LearnDashboard;