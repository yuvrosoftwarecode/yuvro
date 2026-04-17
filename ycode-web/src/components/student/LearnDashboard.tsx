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
import LoadingSpinner from "@/components/LoadingSpinner";

import { Binary, Code, Database, Sparkles, FileText, Search, Bell, BarChart3, Play, Network, ArrowRight } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import DashboardHero from './Learn/DashboardHero';

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
    "bg-saffron-500": { bg: "bg-saffron-50", text: "text-saffron-600" },
    "bg-saffron-600": { bg: "bg-saffron-50", text: "text-saffron-700" },
    "bg-yellow-400": { bg: "bg-yellow-50", text: "text-yellow-600" },
  };
  return map[bgClass] || { bg: "bg-gray-50", text: "text-gray-400" };
};

const LearnDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      if (c.description && c.description.toLowerCase().includes(normalizedQuery)) return true;
      if (Array.isArray(c.topics)) {
        if (c.topics.some((t) => (t.name || '').toLowerCase().includes(normalizedQuery))) return true;
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
      case "data_structures": return <Network className="w-5 h-5 text-saffron-600" />;
      case "advanced": return <Sparkles className="w-5 h-5 text-saffron-600" />;
      case "programming_languages": return <Code className="w-5 h-5 text-green-600" />;
      case "databases": return <Database className="w-5 h-5 text-orange-600" />;
      case "ai_tools": return <Sparkles className="w-5 h-5 text-purple-600" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout hideHeader={true} hideFooter={true} contentClassName="h-full p-0 overflow-hidden">
        <div className="flex items-center justify-center h-full w-full bg-background">
          <LoadingSpinner size="lg" className="text-saffron-600" />
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
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="flex h-full w-full overflow-hidden bg-background">

        {/* Left Column: Content (Header + Courses) - Independent Scroller */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden px-10 pt-[18px] pb-20 thin-scrollbar">
          <div className="max-w-[1600px] mx-auto min-h-full">

            {/* Hero Section */}
            <DashboardHero 
              firstName={user?.first_name || user?.username || ''}
              streak={(stats as any).streak || 0}
              lessonsDone={stats.lessons_completed || 0}
              hoursSpent={stats.time_spent || '0h'}
              avgProgress={stats.avg_progress || 0}
              certificates={(stats as any).certificates || 0}
            />

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
                      <span className="text-xs font-bold text-saffron-end tracking-wide bg-saffron/10 px-2 py-0.5 rounded">Resume learning</span>
                      <span className="text-xs font-medium text-gray-400">•</span>
                      <span className="text-xs font-medium text-gray-400 tracking-wide">{continueProgress.course_name}</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 truncate tracking-tight">{continueProgress.subtopic_name || "Next Lesson"}</h2>

                    {/* Progress Bar */}
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-saffron-start to-saffron-end rounded-full transition-all duration-500"
                          style={{ width: `${continueProgress.percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-900">{continueProgress.percent}%</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="relative group/btn flex items-center">
                    <button
                      onClick={() => handleStartLearning(continueProgress.course_id)}
                      className="bg-gradient-to-r from-saffron-start to-saffron-end hover:opacity-90 text-white rounded-xl shadow-lg shadow-saffron/20 px-6 py-2.5 font-bold text-sm transition-all duration-300 flex items-center justify-center whitespace-nowrap"
                    >
                      <Play className="w-4 h-4 mr-1.5 fill-current" /> Continue
                    </button>
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
                    <button onClick={() => setSearchQuery("")} className="text-sm font-bold text-saffron-600 hover:text-saffron-800 underline">Clear search</button>
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
        <div className="w-[362px] h-full shrink-0 flex flex-col pt-[12px] pb-[12px] pr-[12px] bg-background z-30">
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