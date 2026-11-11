import {
  PerformanceStats,
  ActivityItem,
  MockInterviewPerformance,
  Achievement,
} from "../types";
import {
  generateContributionYearFromEvents,
  calculateStreaksAndTotals,
} from "@/lib/heatmapHelpers";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import { fetchUserInterviewSubmissions } from "@/services/mockInterviewService";
import { loadStudentStats } from "@/lib/studentStats";

export const performanceApi = {
  async getPerformance(): Promise<PerformanceStats> {
    // Fetch all real backend data in parallel
    const [statsRes, submissionsRes, enrollmentsRes, interviewsRes] = await Promise.allSettled([
      loadStudentStats(true),
      restApiAuthUtil.get<any[]>("/lab/submissions/"),
      restApiAuthUtil.get<any[]>("/lab/enrollments/"),
      fetchUserInterviewSubmissions("ylabs", true),
    ]);

    const statsData = statsRes.status === "fulfilled" ? statsRes.value : { day_streak: 0, total_yp: 0, rank: 1, activity_dates: [] };
    const rawSubmissions = submissionsRes.status === "fulfilled" && Array.isArray(submissionsRes.value) ? submissionsRes.value : [];
    const rawEnrollments = enrollmentsRes.status === "fulfilled" ? (Array.isArray(enrollmentsRes.value) ? enrollmentsRes.value : (enrollmentsRes.value as any)?.results || []) : [];
    const rawInterviews = interviewsRes.status === "fulfilled" && Array.isArray(interviewsRes.value) ? interviewsRes.value : [];

    // Real closed tickets
    const closedSubmissions = rawSubmissions.filter(
      (s: any) => s.ticket_status === "done" || s.ticket_status === "in_review"
    );
    const ticketsClosed = closedSubmissions.length;

    // Real labs completed / enrolled
    const completedEnrollments = rawEnrollments.filter(
      (e: any) => e.status === "completed" || e.progress === 100 || e.is_completed === true
    );
    const labsCompleted = completedEnrollments.length;

    // Real sprints shipped (unique completed sprints)
    const sprintSet = new Set<string>();
    closedSubmissions.forEach((s: any) => {
      const sprintId = s.lab_sprint_ticket?.sprint || s.sprint_id || s.sprint;
      if (sprintId) sprintSet.add(String(sprintId));
    });
    const sprintsShipped = sprintSet.size;

    // Real mock interviews count
    const completedInterviews = rawInterviews.filter(
      (i: any) => i.status === "completed" || i.submitted_at || i.completed_at || typeof i.marks === "number"
    );
    const mockInterviewsCount = rawInterviews.length;

    // Collect real event dates for the 53-week contribution heatmap
    const allEventDates: string[] = [];
    if (statsData.activity_dates && Array.isArray(statsData.activity_dates)) {
      allEventDates.push(...statsData.activity_dates);
    }
    rawSubmissions.forEach((s: any) => {
      if (s.updated_at) allEventDates.push(s.updated_at);
      else if (s.created_at) allEventDates.push(s.created_at);
    });
    rawInterviews.forEach((i: any) => {
      if (i.submitted_at) allEventDates.push(i.submitted_at);
      else if (i.created_at) allEventDates.push(i.created_at);
    });

    const contributions = generateContributionYearFromEvents(allEventDates);
    const computedStats = calculateStreaksAndTotals(contributions);

    const finalStats = {
      total: computedStats.total,
      activeDays: computedStats.activeDays,
      currentStreak: Math.max(computedStats.currentStreak, statsData.day_streak || 0),
      longestStreak: Math.max(computedStats.longestStreak, statsData.day_streak || 0),
    };

    // Real Mock Interview Performance
    let latestScore = 0;
    let trendPoints: number[] = [];
    const dimensions: { name: string; score: number; percentage: number }[] = [];

    if (rawInterviews.length > 0) {
      const sortedByDate = [...rawInterviews].sort((a, b) => {
        const tA = new Date(a.submitted_at || a.created_at || 0).getTime();
        const tB = new Date(b.submitted_at || b.created_at || 0).getTime();
        return tA - tB;
      });

      sortedByDate.forEach((i: any) => {
        const mark = typeof i.marks === "number" ? i.marks : i.report?.score || i.report?.overall_score;
        if (typeof mark === "number") {
          trendPoints.push(mark <= 10 ? mark : Number((mark / 10).toFixed(1)));
        }
      });
      if (trendPoints.length > 0) {
        trendPoints = trendPoints.slice(-8);
        latestScore = trendPoints[trendPoints.length - 1];
      }

      const latestInterview = sortedByDate[sortedByDate.length - 1];
      const rep = latestInterview?.report || latestInterview?.report_summary || {};
      if (rep.dimensions && Array.isArray(rep.dimensions)) {
        rep.dimensions.forEach((d: any) => {
          const sc = Math.round(d.score || d.percentage || 0);
          dimensions.push({ name: d.name || d.title || "Competency", score: sc, percentage: sc });
        });
      } else if (rep.competencies && typeof rep.competencies === "object") {
        Object.entries(rep.competencies).forEach(([name, val]: [string, any]) => {
          const sc = typeof val === "number" ? Math.round(val) : Math.round(val?.score || 0);
          dimensions.push({ name, score: sc, percentage: sc });
        });
      }
    }

    const mockInterview: MockInterviewPerformance = {
      latestScore,
      maxScore: 10,
      trendPoints,
      dimensions,
    };

    // Real Achievements derived from actual user stats
    const achievements: Achievement[] = [
      {
        id: "ach-1",
        title: "First lab",
        description: "Complete your first simulation lab",
        icon: "1st",
        earned: labsCompleted >= 1,
        progress: labsCompleted >= 1 ? undefined : {
          current: labsCompleted,
          max: 1,
          unit: "labs",
        },
      },
      {
        id: "ach-2",
        title: "7-day streak",
        description: "Contribute 7 days in a row",
        icon: "7d",
        earned: finalStats.longestStreak >= 7,
        progress: finalStats.longestStreak >= 7 ? undefined : {
          current: Math.min(finalStats.longestStreak, 7),
          max: 7,
          unit: "days",
        },
      },
      {
        id: "ach-3",
        title: "Sprint finisher",
        description: "Ship 5 sprints",
        icon: "5x",
        earned: sprintsShipped >= 5,
        progress: sprintsShipped >= 5 ? undefined : {
          current: Math.min(sprintsShipped, 5),
          max: 5,
          unit: "sprints",
        },
      },
      {
        id: "ach-4",
        title: "Bug squasher",
        description: "Close 100 tickets",
        icon: "100",
        earned: ticketsClosed >= 100,
        progress: ticketsClosed >= 100 ? undefined : {
          current: Math.min(ticketsClosed, 100),
          max: 100,
          unit: "tickets",
        },
      },
      {
        id: "ach-5",
        title: "Interview ready",
        description: "Score 8+ in 3 mock interviews",
        icon: "8+",
        earned: completedInterviews.filter((i: any) => {
          const mark = typeof i.marks === "number" ? i.marks : i.report?.score || i.report?.overall_score || 0;
          return mark >= 8 || mark >= 80;
        }).length >= 3,
        progress: {
          current: Math.min(
            completedInterviews.filter((i: any) => {
              const mark = typeof i.marks === "number" ? i.marks : i.report?.score || i.report?.overall_score || 0;
              return mark >= 8 || mark >= 80;
            }).length,
            3
          ),
          max: 3,
          unit: "interviews",
        },
      },
      {
        id: "ach-6",
        title: "30-day streak",
        description: "Contribute 30 days in a row",
        icon: "30d",
        earned: finalStats.longestStreak >= 30,
        progress: finalStats.longestStreak >= 30 ? undefined : {
          current: Math.min(finalStats.longestStreak, 30),
          max: 30,
          unit: "days",
        },
      },
    ];

    // Real Recent Activity from ticket submissions, interviews, and labs
    const recentActivity: ActivityItem[] = [];

    rawSubmissions.forEach((s: any) => {
      const ticketTitle =
        s.lab_sprint_ticket_title ||
        s.ticket_title ||
        s.lab_sprint_ticket?.title ||
        `Ticket #${s.lab_sprint_ticket_id || s.id}`;
      const isClosed = s.ticket_status === "done";
      recentActivity.push({
        id: `ticket-${s.id}`,
        type: "Tickets",
        title: ticketTitle,
        subtitle: `Submission #${s.id || "1"}`,
        result: isClosed ? "Closed" : "In Review",
        resultVariant: isClosed ? "success" : "primary",
        timestamp: s.updated_at || s.created_at || new Date().toISOString(),
      });
    });

    rawInterviews.forEach((i: any) => {
      const score = typeof i.marks === "number" ? i.marks : i.report?.score || i.report?.overall_score || 0;
      const formattedScore = score <= 10 ? score : (score / 10).toFixed(1);
      recentActivity.push({
        id: `interview-${i.id}`,
        type: "Interviews",
        title: i.mock_interview_title || "Technical AI Mock Interview",
        subtitle: `${i.experience_level || "Standard"} • ${i.selected_duration || 30} min session`,
        result: score > 0 ? `${formattedScore} / 10` : (i.status === "completed" ? "Completed" : "In Progress"),
        resultVariant: score >= 70 || score >= 7 ? "success" : "primary",
        timestamp: i.submitted_at || i.created_at || new Date().toISOString(),
      });
    });

    rawEnrollments.forEach((e: any) => {
      const labName = e.lab_details?.title || e.lab_name || "Engineering Lab";
      recentActivity.push({
        id: `lab-${e.id}`,
        type: "Labs",
        title: labName,
        subtitle: e.status === "completed" ? "Lab Completed" : "Enrolled Lab",
        result: e.status === "completed" ? "Passed" : "In Progress",
        resultVariant: e.status === "completed" ? "success" : "primary",
        timestamp: e.updated_at || e.created_at || new Date().toISOString(),
      });
    });

    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      labsCompleted,
      sprintsShipped,
      ticketsClosed,
      mockInterviews: mockInterviewsCount,
      contributions,
      stats: finalStats,
      mockInterview,
      achievements,
      recentActivity: recentActivity.slice(0, 25),
    };
  },
};
