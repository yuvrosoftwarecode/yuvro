// src/features/Learn/LearnDashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import restApiAuthUtil from "../../utils/RestApiAuthUtil";
import { fetchTopicsByCourse } from '@/services/courseService';
import { getCourseIconConfig } from "@/utils/CourseIcons";

import SearchBar from "@/components/common/SearchBar";
import CategorySection from "@/components/student/Learn/CatergorySection";
import StatsSidebar from "./Learn/Widgets/StatsSidebar";
import DashboardLayout from "@/components/common/DashboardLayout";

import { Binary, Code, Database, Sparkles, FileText, Search, Bell, BarChart3, Play, Network, ArrowRight } from "lucide-react";

import type { Course, Stats, ContinueProgress, CourseProgressMap } from "@/components/student/Learn/types";

// Helper to match the pastel style from LearnCourseCard
const getHeroPastelStyle = (bgClass: string): { bg: string; text: string } => {
  const map: Record<string, { bg: string; text: string }> = {
    "bg-blue-500": { bg: "bg-blue-50", text: "text-blue-600" },
    "bg-blue-600": { bg: "bg-blue-50", text: "text-blue-700" },
    "bg-orange-500": { bg: "bg-orange-50", text: "text-orange-600" },
    "bg-green-500": { bg: "bg-emerald-50", text: "text-emerald-600" },
    "bg-emerald-600": { bg: "bg-emerald-50", text: "text-emerald-600" },
    "bg-purple-500": { bg: "bg-purple-50", text: "text-purple-600" },
    "bg-indigo-500": { bg: "bg-indigo-50", text: "text-indigo-600" },
    "bg-indigo-600": { bg: "bg-indigo-50", text: "text-indigo-700" },
    "bg-yellow-400": { bg: "bg-yellow-50", text: "text-yellow-600" },
  };
  return map[bgClass] || { bg: "bg-gray-50", text: "text-gray-400" };
};

const LearnDashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [dailyStats, setDailyStats] = useState({ solvedToday: 0, timeSpentToday: "0m" });

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

    const fetchLeaderboard = async () => {
      try {
        const res = await restApiAuthUtil.get<any[]>("/course/student-course-progress/leaderboard/");
        setLeaderboardData(res);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
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

    const fetchActivity = async () => {
      try {
        const now = new Date();
        const res = await restApiAuthUtil.get<{ active_dates: string[] }>(
          `/course/student-course-progress/calendar_activity/?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
        );
        setActiveDates(res.active_dates || []);
      } catch (err) {
        console.error("Failed to fetch calendar activity", err);
      }
    };

    const fetchActivityList = async () => {
      try {
        const res = await restApiAuthUtil.get<any[]>("/student/dashboard/activity/");
        if (Array.isArray(res)) {
          // Calculate stats from activity strings like "2 hours ago", "5 mins ago", "Just now"
          // If it contains "day" or a date, it's not today.
          const todayActions = res.filter(a => {
            const time = (a.time || "").toLowerCase();
            return time.includes("hour") || time.includes("min") || time.includes("now") || time.includes("second");
          });

          const solvedCount = todayActions.filter(a => 
            a.action.toLowerCase().includes("solve") || a.action.toLowerCase().includes("complete")
          ).length;

          // Estimate time spent (10m per action for now as a real-ish proxy if duration isn't available)
          const estimatedTime = solvedCount > 0 ? `${solvedCount * 10}m` : "0m";

          setDailyStats({
            solvedToday: solvedCount,
            timeSpentToday: estimatedTime
          });
        }
      } catch (err) {
        console.error("Failed to fetch activity list", err);
      }
    };

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchCourses(), 
        fetchStats(), 
        fetchContinue(), 
        fetchProgressMap(), 
        fetchLeaderboard(), 
        fetchActivity(),
        fetchActivityList()
      ]);
      setLoading(false);
    };

    loadAll();
  }, []);

  const handleStartLearning = (courseId: string) => {
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
    advanced: filteredCourses.filter((c) => c.category === "advanced"),
    programming_languages: filteredCourses.filter((c) => c.category === "programming_languages"),
    databases: filteredCourses.filter((c) => c.category === "databases"),
    ai_tools: filteredCourses.filter((c) => c.category === "ai_tools"),
  };

  const getIconFor = (category: string) => {
    switch (category) {
      case "fundamentals": return <Binary className="w-5 h-5 text-blue-600" />;
      case "dsa":
      case "data_structures": return <Network className="w-5 h-5 text-indigo-600" />;
      case "advanced": return <Sparkles className="w-5 h-5 text-indigo-600" />;
      case "programming_languages": return <Code className="w-5 h-5 text-green-600" />;
      case "databases": return <Database className="w-5 h-5 text-orange-600" />;
      case "ai_tools": return <Sparkles className="w-5 h-5 text-purple-600" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout hideHeader={true} hideFooter={true} contentClassName="h-full p-0 overflow-hidden">
        <div className="flex h-full w-full bg-gray-50 animate-pulse">
          {/* Left Column Skeleton */}
          <div className="flex-1 px-10 pt-10 pb-20 overflow-hidden">
            <div className="max-w-[1600px] mx-auto">
              {/* Header Skeleton */}
              <div className="mb-10">
                <div className="h-9 w-48 bg-gray-100 rounded-lg mb-2"></div>
                <div className="h-5 w-64 bg-gray-50 rounded-lg"></div>
              </div>

              {/* Sections Skeleton */}
              {[1, 2].map(i => (
                <div key={i} className="mb-16">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-5 h-5 bg-gray-100 rounded"></div>
                    <div className="h-6 w-32 bg-gray-100 rounded-lg"></div>
                  </div>
                  <div className="flex gap-6 overflow-hidden">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="w-[340px] h-[110px] bg-gray-50 rounded-lg border border-gray-100 flex-shrink-0"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="w-[362px] h-full pt-[12px] pb-[12px] pr-[12px] bg-gray-50 flex flex-col gap-4">
            <div className="flex-1 bg-gray-50/50 rounded-lg border border-gray-100 p-6 space-y-8">
              <div className="h-32 bg-white rounded-lg border border-gray-50 shadow-sm"></div>
              <div className="h-16 bg-white rounded-lg border border-gray-50 shadow-sm"></div>
              <div className="h-48 bg-white rounded-lg border border-gray-50 shadow-sm"></div>
              <div className="h-40 bg-white rounded-lg border border-gray-50 shadow-sm"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      hideHeader={true}
      hideFooter={true}
      contentClassName="h-full p-0 overflow-hidden"
    >
      <style>{`
        .thin-scrollbar::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 20px;
        }
        .thin-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.08);
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="flex h-full w-full overflow-hidden bg-gray-50">

        {/* Left Column: Content (Header + Courses) - Independent Scroller */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden px-10 pt-[18px] pb-20 thin-scrollbar">
          <div className="max-w-[1600px] mx-auto min-h-full">

            {/* Header (Non-sticky, scrolls with content) */}
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Learn</h1>
                <p className="text-gray-500 font-medium mt-1">Your progress and courses at a glance</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Level badge removed */}
              </div>
            </div>

            {/* Sub-header Search removed */}

            {/* Continue Learning Hero (Course-Specific) */}
            {continueProgress && continueProgress.course_id && (
              <div className="mb-12 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row items-center gap-6 p-6">
                  {/* Course-Specific Icon & Dynamic Color */}
                  {(() => {
                    const currentCourse = courses.find(c => String(c.id) === String(continueProgress.course_id));
                    const config = getCourseIconConfig(continueProgress.course_name || "", currentCourse?.category);
                    const style = getHeroPastelStyle(config.bg);
                    const IconComponent = config.Icon;

                    return (
                      <div className={`w-16 h-16 rounded-lg ${style.bg} flex items-center justify-center shrink-0 border border-transparent group-hover:border-white transition-colors`}>
                        <IconComponent className={`w-8 h-8 ${style.text}`} />
                      </div>
                    );
                  })()}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded">Resume Learning</span>
                      <span className="text-[10px] font-medium text-gray-400">•</span>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">{continueProgress.course_name}</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 truncate tracking-tight">{continueProgress.subtopic_name || "Next Lesson"}</h2>

                    {/* Progress Bar */}
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${continueProgress.percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-900">{continueProgress.percent}%</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="relative group/btn">
                    <button
                      onClick={() => handleStartLearning(continueProgress.course_id)}
                      className="relative w-full md:w-auto bg-orange-600 text-white px-10 py-3 rounded-lg font-bold text-sm transition-all duration-300 shadow-md shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-200/50 hover:bg-orange-700 hover:scale-[1.02] active:scale-95 overflow-hidden whitespace-nowrap"
                    >
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" />
                      
                      <span className="relative z-10 flex items-center gap-2">
                        Resume
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                    </button>
                    
                    {/* Subtle pulse ring around button on hover */}
                    <div className="absolute -inset-1 bg-orange-400/20 rounded-xl blur-md opacity-0 group-hover/btn:opacity-100 transition-opacity animate-pulse -z-10" />
                  </div>
                </div>
              </div>
            )}

            {/* Courses Area */}
            <div className="space-y-16">
              {normalizedQuery && filteredCourses.length === 0 ? (
                <div className="py-20 text-center text-gray-500 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <div className="flex flex-col items-center gap-3">
                    <Search className="w-8 h-8 text-gray-300" />
                    <p className="font-bold">No courses match "{searchQuery}"</p>
                    <button onClick={() => setSearchQuery("")} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline">Clear search</button>
                  </div>
                </div>
              ) : (
                Object.entries(groupedFiltered).map(([key, list]) =>
                  list.length > 0 ? (
                    <div key={key}>
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

        {/* Right Column: Stats Sidebar - Independent Scroller */}
        <div className="w-[362px] h-full shrink-0 flex flex-col pt-[12px] pb-[12px] pr-[12px] bg-gray-50 z-30">
          <StatsSidebar
            stats={stats}
            courses={courses}
            progressMap={progressMap}
            leaderboardData={leaderboardData}
            activeDates={activeDates}
            solvedToday={dailyStats.solvedToday}
            timeSpentToday={dailyStats.timeSpentToday}
          />
        </div>

      </div>
    </DashboardLayout>
  );
};

export default LearnDashboard;