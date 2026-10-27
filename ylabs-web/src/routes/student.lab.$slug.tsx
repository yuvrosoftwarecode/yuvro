import { createFileRoute, Link, Outlet, useMatch, useParams, useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { DiffBadge, StatusBadge } from "@/components/Badges";
import { labs, tickets, leaderboard } from "@/lib/dummy";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Zap,
  TrendingUp,
  TrendingDown,
  Award,
  Lock,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Play,
  Clock,
  Target,
  Flag,
  PieChart,
  ArrowRight,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import type { Ticket, Status } from "@/lib/dummy";
import { getLab, type AdminLab } from "@/lib/adminLabs";
import { loadSprints, type LabSprint } from "@/lib/labSprints";
import {
  getLabTier,
  isSprintLocked,
  unlockLab,
  TIER_META,
  isLabUnlocked,
  freeSprintCount,
  syncUnlocks,
} from "@/lib/labAccess";
import { LabIcon } from "@/components/LabIcon";
import { ShieldCheck, Star, Loader2 } from "lucide-react";
import { restApiAuthUtil, yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { toast } from "sonner";

import { loadRazorpayScript } from "@/lib/razorpay";
import { StartLabModal } from "@/components/student/StartLabModal";
import { loadStudentStats, type StudentStats } from "@/lib/studentStats";

export const Route = createFileRoute("/student/lab/$slug")({
  component: LabDashboard,
});

const isDsaLab = (name?: string, slug?: string) => {
  if (!name && !slug) return false;
  const s = `${name || ""} ${slug || ""}`.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
  return (
    s.includes("dsa") ||
    s.includes("data structure") ||
    s.includes("datastructure") ||
    s.includes("ds lab") ||
    s.includes("ds scenario")
  );
};

type SprintStatus = "Completed" | "Active" | "Upcoming";
interface Sprint {
  id: string;
  name: string;
  goal: string;
  range: string;
  ticketIds: string[];
  status: SprintStatus;
}

function buildSprints(slug: string, allTickets: Ticket[]): Sprint[] {
  const javaGroups = [
    {
      id: "S1",
      name: "Sprint 1 · Foundations",
      goal: "Master language fundamentals & control flow",
      range: "Apr 1 – Apr 7",
      tags: ["Fundamentals"],
    },
    {
      id: "S2",
      name: "Sprint 2 · OOP Core",
      goal: "Classes, inheritance and interfaces",
      range: "Apr 8 – Apr 14",
      tags: ["OOP"],
    },
    {
      id: "S3",
      name: "Sprint 3 · Generics & Errors",
      goal: "Type-safe APIs and resilient error handling",
      range: "Apr 15 – Apr 21",
      tags: ["Generics", "Errors", "I/O"],
    },
    {
      id: "S4",
      name: "Sprint 4 · Collections",
      goal: "Lists, maps and idiomatic data access",
      range: "Apr 22 – Apr 28",
      tags: ["Collections"],
    },
    {
      id: "S5",
      name: "Sprint 5 · Advanced Java",
      goal: "Streams, concurrency, testing & patterns",
      range: "Apr 29 – May 12",
      tags: ["Streams", "FP", "Threads", "DB", "Testing", "Patterns"],
    },
  ];
  const pythonGroups = [
    {
      id: "PS1",
      name: "Sprint 1 · Python Foundations",
      goal: "Types, collections, control flow & functions",
      range: "Apr 1 – Apr 10",
      tags: ["Py Fundamentals"],
    },
    {
      id: "PS2",
      name: "Sprint 2 · Data & APIs",
      goal: "Files, JSON, requests and pandas basics",
      range: "Apr 11 – Apr 24",
      tags: ["Py Data"],
    },
    {
      id: "PS3",
      name: "Sprint 3 · Django Todo App",
      goal: "Build a full Django todo app with HTML templates",
      range: "May 13 – May 26",
      tags: ["Django Todo"],
    },
  ];
  const uiGroups = [
    {
      id: "US1",
      name: "Sprint 1 · HTML & CSS",
      goal: "Semantic markup, box model and specificity",
      range: "Apr 1 – Apr 10",
      tags: ["HTML/CSS"],
    },
    {
      id: "US2",
      name: "Sprint 2 · Layout",
      goal: "Flexbox, Grid and responsive breakpoints",
      range: "Apr 11 – Apr 20",
      tags: ["Layout"],
    },
    {
      id: "US3",
      name: "Sprint 3 · React Essentials",
      goal: "Components, state, effects and custom hooks",
      range: "Apr 21 – May 4",
      tags: ["React"],
    },
    {
      id: "US4",
      name: "Sprint 4 · Accessibility",
      goal: "Build inclusive UI: keyboard, focus, contrast",
      range: "May 5 – May 12",
      tags: ["Accessibility"],
    },
  ];
  const sqlGroups = [
    {
      id: "QS1",
      name: "Sprint 1 · Querying",
      goal: "SELECT, filtering, aggregates and CTEs",
      range: "Apr 1 – Apr 10",
      tags: ["Querying"],
    },
    {
      id: "QS2",
      name: "Sprint 2 · Joins",
      goal: "Combine tables with INNER, LEFT and multi-joins",
      range: "Apr 11 – Apr 18",
      tags: ["Joins"],
    },
    {
      id: "QS3",
      name: "Sprint 3 · Window Functions",
      goal: "Ranking, LAG/LEAD and running totals",
      range: "Apr 19 – Apr 28",
      tags: ["Windows"],
    },
    {
      id: "QS4",
      name: "Sprint 4 · Performance & Modeling",
      goal: "EXPLAIN, indexes and normalization",
      range: "Apr 29 – May 8",
      tags: ["Tuning"],
    },
  ];
  const mongoGroups = [
    {
      id: "MS1",
      name: "Sprint 1 · CRUD basics",
      goal: "Insert, find, update and delete documents",
      range: "Apr 1 – Apr 8",
      tags: ["Mongo CRUD"],
    },
    {
      id: "MS2",
      name: "Sprint 2 · Query Operators",
      goal: "Comparison, logical, array and nested queries",
      range: "Apr 9 – Apr 16",
      tags: ["Mongo Query"],
    },
    {
      id: "MS3",
      name: "Sprint 3 · Aggregation Pipelines",
      goal: "$match, $group, $lookup and projections",
      range: "Apr 17 – Apr 26",
      tags: ["Aggregation"],
    },
    {
      id: "MS4",
      name: "Sprint 4 · Indexes & Performance",
      goal: "Design indexes and read explain plans",
      range: "Apr 27 – May 4",
      tags: ["Mongo Indexes"],
    },
  ];
  const progGroups = [
    {
      id: "PG1",
      name: "Sprint 1 · Intro",
      goal: "Hello world, comments and reading input",
      range: "Apr 1 – Apr 4",
      tags: ["Prog Intro"],
    },
    {
      id: "PG2",
      name: "Sprint 2 · Variables & Operators",
      goal: "Types, arithmetic, boolean and comparisons",
      range: "Apr 5 – Apr 9",
      tags: ["Prog Variables"],
    },
    {
      id: "PG3",
      name: "Sprint 3 · Control Flow",
      goal: "if/else, nested and switch/match",
      range: "Apr 10 – Apr 14",
      tags: ["Prog Control Flow"],
    },
    {
      id: "PG4",
      name: "Sprint 4 · Loops",
      goal: "for/while, break/continue, nested patterns",
      range: "Apr 15 – Apr 19",
      tags: ["Prog Loops"],
    },
    {
      id: "PG5",
      name: "Sprint 5 · Functions",
      goal: "Define, call, defaults, kwargs and recursion",
      range: "Apr 20 – Apr 25",
      tags: ["Prog Functions"],
    },
    {
      id: "PG6",
      name: "Sprint 6 · Strings",
      goal: "Slicing, methods and palindrome check",
      range: "Apr 26 – Apr 29",
      tags: ["Prog Strings"],
    },
    {
      id: "PG7",
      name: "Sprint 7 · File I/O",
      goal: "Read/write files and word count",
      range: "Apr 30 – May 3",
      tags: ["Prog File I/O"],
    },
    {
      id: "PG8",
      name: "Sprint 8 · Error Handling",
      goal: "try/except and custom exceptions",
      range: "May 4 – May 7",
      tags: ["Prog Errors"],
    },
    {
      id: "PG9",
      name: "Sprint 9 · OOP Basics",
      goal: "Classes, inheritance and dunder methods",
      range: "May 8 – May 13",
      tags: ["Prog OOP"],
    },
  ];
  const dsGroups = [
    {
      id: "DS1",
      name: "Sprint 1 · Arrays",
      goal: "Traversal, two-pointer and sliding window",
      range: "Apr 1 – Apr 5",
      tags: ["DS Arrays"],
    },
    {
      id: "DS2",
      name: "Sprint 2 · Linked Lists",
      goal: "Singly linked lists, reverse and cycle detection",
      range: "Apr 6 – Apr 11",
      tags: ["DS Linked Lists"],
    },
    {
      id: "DS3",
      name: "Sprint 3 · Stacks",
      goal: "Stack ops, parentheses and min stack",
      range: "Apr 12 – Apr 16",
      tags: ["DS Stacks"],
    },
    {
      id: "DS4",
      name: "Sprint 4 · Queues",
      goal: "Two-stack queue, circular queue and deque",
      range: "Apr 17 – Apr 22",
      tags: ["DS Queues"],
    },
    {
      id: "DS5",
      name: "Sprint 5 · Hashing",
      goal: "Hash maps, two-sum and group anagrams",
      range: "Apr 23 – Apr 27",
      tags: ["DS Hashing"],
    },
    {
      id: "DS6",
      name: "Sprint 6 · Trees",
      goal: "Traversals, BST and LCA",
      range: "Apr 28 – May 3",
      tags: ["DS Trees"],
    },
    {
      id: "DS7",
      name: "Sprint 7 · Heaps",
      goal: "Heapify and top-K problems",
      range: "May 4 – May 7",
      tags: ["DS Heaps"],
    },
    {
      id: "DS8",
      name: "Sprint 8 · Graphs",
      goal: "BFS, DFS and Dijkstra",
      range: "May 8 – May 14",
      tags: ["DS Graphs"],
    },
    {
      id: "DS9",
      name: "Sprint 9 · Sorting",
      goal: "Bubble, merge and quick sort",
      range: "May 15 – May 19",
      tags: ["DS Sorting"],
    },
    {
      id: "DS10",
      name: "Sprint 10 · Searching",
      goal: "Binary search and rotated array search",
      range: "May 20 – May 23",
      tags: ["DS Searching"],
    },
  ];
  const groups =
    slug === "python"
      ? pythonGroups
      : slug === "ui"
        ? uiGroups
        : slug === "sql"
          ? sqlGroups
          : slug === "mongo"
            ? mongoGroups
            : slug === "programming"
              ? progGroups
              : slug === "datastructures"
                ? dsGroups
                : javaGroups;
  return groups.map((g) => {
    const ts = allTickets.filter((t) => g.tags.includes(t.tag));
    const completed = ts.filter((t) => t.status === "done").length;
    const inProgress = ts.some((t) => t.status === "in_progress" || t.status === "in_review");
    const status: SprintStatus =
      completed === ts.length && ts.length
        ? "Completed"
        : inProgress || completed > 0
          ? "Active"
          : "Upcoming";
    return {
      id: g.id,
      name: g.name,
      goal: g.goal,
      range: g.range,
      ticketIds: ts.map((t) => t.id),
      status,
    };
  });
}

const normalizeDiff = (diff?: string) => {
  if (diff === "HARD") return "Advanced";
  if (diff === "MEDIUM") return "Intermediate";
  if (diff === "EASY") return "Beginner";
  return diff || "Beginner";
};

function LabDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { slug } = useParams({ from: "/student/lab/$slug" });
  const ticketMatch = useMatch({ from: "/student/lab/$slug/ticket/$ticketId", shouldThrow: false });
  const reportMatch = useMatch({ from: "/student/lab/$slug/report", shouldThrow: false });

  const [realLab, setRealLab] = useState<AdminLab | null>(null);
  const [realSprints, setRealSprints] = useState<LabSprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getLab(slug)
      .then((lab) => {
        if (!active) return;
        if (lab) {
          setRealLab(lab);
          loadSprints(lab.id).then((s) => {
            if (active) {
              setRealSprints(s);
              setIsLoading(false);
            }
          });
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const [statusOverrides, setStatusOverrides] = useState<Record<string, { status: Status, earnedXp: number }>>({});
  const [submissionIds, setSubmissionIds] = useState<Record<string, string>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [unlockBump, setUnlockBump] = useState(0);
  const [isPaying, setIsPaying] = useState(false);

  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);

  useEffect(() => {
    loadStudentStats().then(setStudentStats).catch(console.error);
  }, []);

  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollRepoName, setEnrollRepoName] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

  const [selectedDiffs, setSelectedDiffs] = useState<string[]>(["Beginner", "Intermediate", "Advanced"]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["backlog", "in_progress", "in_review", "done"]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    if (realLab) {
      import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
        api
          .get<any[]>("/lab/enrollments/")
          .then((data) => {
            if (!active) return;
            const list = Array.isArray(data) ? data : (data as any)?.results || [];
            const apiEnrolled = list.some((e: any) => {
              if (!e) return false;
              const labId = String(typeof e.lab === "object" ? e.lab?.id : e.lab);
              const labIdAlt = String(e.lab_id ?? e.lab_details?.id ?? "");
              const targetId = String(realLab.id);
              return labId === targetId || labIdAlt === targetId;
            });

            let localEnrolled = false;
            try {
              const userMockKey = user?.id ? `mock_enrollments_${user.id}` : "mock_enrollments";
              const saved = localStorage.getItem(userMockKey);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.map(String).includes(String(realLab.id))) {
                  localEnrolled = true;
                }
              }
            } catch {}

            setIsEnrolled(apiEnrolled || localEnrolled);
          })
          .catch(() => {
            if (!active) return;
            let localEnrolled = false;
            try {
              const userMockKey = user?.id ? `mock_enrollments_${user.id}` : "mock_enrollments";
              const saved = localStorage.getItem(userMockKey);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.map(String).includes(String(realLab.id))) {
                  localEnrolled = true;
                }
              }
            } catch {}
            setIsEnrolled(localEnrolled);
          });
      });
    }
    return () => {
      active = false;
    };
  }, [realLab, user?.id]);

  useEffect(() => {
    let active = true;
    syncUnlocks().then(() => {
      if (active) setUnlockBump((x) => x + 1);
    });
    import("@/utils/RestApiAuthUtil").then(({ default: api }) => {
      api
        .get<any[]>("/lab/submissions/")
        .then((subs) => {
          if (!active) return;
          const overrides: Record<string, { status: Status, earnedXp: number }> = {};
          const subIds: Record<string, string> = {};
          subs.forEach((s) => {
            subIds[s.lab_sprint_ticket] = s.id;
            if (["backlog", "in_progress", "in_review", "done"].includes(s.ticket_status)) {
              let testPct = 0;
              if (s.solution_output) {
                try {
                  const p = typeof s.solution_output === "string" ? JSON.parse(s.solution_output) : s.solution_output;
                  testPct = p?.percentage ?? p?.total_score ?? 0;
                } catch (e) {}
              }
              const isEvaluated = s.ticket_status === "done" || s.ticket_status === "in_review";
              overrides[s.lab_sprint_ticket] = {
                status: s.ticket_status as Status,
                earnedXp: isEvaluated ? (s.yuvro_points ?? 0) : (testPct / 100),
                fromApi: true,
              };
            }
          });
          try {
            const localKanbanStr = localStorage.getItem(`kanban_${slug}`);
            if (localKanbanStr) {
              const localKanban = JSON.parse(localKanbanStr);
              for (const [tId, status] of Object.entries(localKanban)) {
                if (!overrides[tId]) {
                  overrides[tId] = { status: status as Status, earnedXp: 0, fromApi: false };
                }
              }
            }
          } catch (e) {}
          setStatusOverrides(overrides);
          setSubmissionIds(subIds);
        })
        .catch(console.error);
    });
    return () => {
      active = false;
    };

  }, [slug]);
  const lab = useMemo(() => {
    if (realLab) {
      const isLinux = realLab.title.toLowerCase().includes("linux");
      const iconStr = realLab.icon?.toLowerCase() || "";
      const icon =
        realLab.icon && iconStr !== "linux" && iconStr !== "linux lab"
          ? realLab.icon
          : isLinux
            ? "🐧"
            : "💻";
      const completedCount = realSprints
        .flatMap((s) => s.tasks)
        .filter((t) => statusOverrides[t.id]?.fromApi && (statusOverrides[t.id]?.status ?? "backlog") === "done").length;
      const total = realSprints.reduce((acc, s) => acc + s.tasks.length, 0);
      return {
        slug: realLab.id,
        name: realLab.title,
        icon,
        color: "prog",
        difficulty:
          realLab.difficulty === "HARD"
            ? "Advanced"
            : realLab.difficulty === "MEDIUM"
              ? "Intermediate"
              : "Beginner",
        completed: completedCount,
        total,
        hoursLeft: 10,
        description: realLab.description,
        skills: (realLab.skills?.length ? realLab.skills : (labs.find((l) => l.slug === slug)?.skills?.map(s => s.name) || [])).map((s, i) => ({ 
          name: s, 
          pct: total > 0 ? Math.min(100, Math.round((completedCount / total) * 100) + (i * 5)) : 0 
        })),
      } as any;
    }
    return labs.find((l) => l.slug === slug) ?? labs[0];
  }, [realLab, realSprints, slug, statusOverrides]);

  const activeDummySprints = useMemo(() => buildSprints(slug, tickets), [slug]);

  const sprints = useMemo(() => {
    if (realLab) {
      return realSprints.map((s, idx) => ({
        id: s.id,
        name: s.name,
        goal: s.description,
        range: `Sprint ${idx + 1}`,
        ticketIds: s.tasks.map((t) => t.id),
        status: (idx === 0 ? "Active" : "Upcoming") as SprintStatus,
      }));
    }
    return activeDummySprints;
  }, [realLab, realSprints, activeDummySprints]);

  const allTickets = useMemo(() => {
    let baseData = tickets;
    if (realLab) {
      baseData = realSprints
        .flatMap((s) => s.tasks)
        .map((t) => ({
          id: t.id,
          title: t.title,
          difficulty: t.difficulty,
          estMin: t.estMin,
          xp: t.xp,
          tag: t.language || "Linux",
          status: "backlog" as Status,
          description: t.description,
        }));
    }
    return baseData.map((t) => {
      const override = statusOverrides[t.id];
      // Only count YP if this status came from the API (real submission), not from drag-and-drop
      const xpFractionOrValue = override?.fromApi ? (override?.earnedXp ?? 0) : 0;
      // If fromApi: fraction<=1 is test%, >1 is actual yuvro_points
      const calculatedEarnedXp = xpFractionOrValue > 1 ? xpFractionOrValue : Math.round(xpFractionOrValue * (t.xp || 0));
      return {
        ...t,
        status: override?.status ?? t.status,
        earnedXp: calculatedEarnedXp,
        fromApi: override?.fromApi ?? false,
      };
    });
  }, [realLab, realSprints, statusOverrides]);

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [activeSprint, setActiveSprint] = useState<string | null>(null);

  const sprint = sprints.find((s) => s.id === activeSprint) ?? null;
  const sprintTickets = (
    sprint ? allTickets.filter((t) => sprint.ticketIds.includes(t.id)) : allTickets
  ).filter((t) => 
    selectedDiffs.includes(normalizeDiff(t.difficulty)) && 
    selectedStatuses.includes(t.status) &&
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cols: { key: Status; label: string }[] = [
    { key: "backlog", label: "Backlog" },
    { key: "in_progress", label: "In Progress" },
    // { key: "in_review", label: "In Review" },
    { key: "done", label: "Done" },
  ];
  const pct = lab.total > 0 ? Math.round((lab.completed / lab.total) * 100) : 0;

  const tier = (realLab?.payment_tier ?? getLabTier(slug, lab.name)) as
    "free" | "freemium" | "premium";
  const meta = {
    ...TIER_META[tier],
    price: realLab?.payment_amount
      ? `\u20b9${Number(realLab.payment_amount).toLocaleString("en-IN")}`
      : TIER_META[tier].price,
  };
  const unlocked = useMemo(() => isLabUnlocked(slug), [slug, unlockBump]);
  const sprintLocked = (idx: number, sprint?: { is_locked?: boolean }) => {
    if (realLab && sprint && typeof sprint.is_locked === "boolean") {
      return !unlocked && sprint.is_locked;
    }
    return isSprintLocked(slug, idx, lab.name);
  };

  const isUpcoming = realLab ? realLab.status === "upcoming" : !isDsaLab(lab.name, slug);
  const isDsa = !isUpcoming;

  const handleStartLabPrompt = () => {
    if (isUpcoming) {
      toast.info("This lab is upcoming and not open for enrollment.");
      return;
    }
    setEnrollRepoName(`yuvro_${lab.name?.toLowerCase().replace(/\s+/g, "_") || "lab"}`);
    setEnrollModalOpen(true);
  };

  useEffect(() => {
    if (!isDsa && activeSprint) {
      setActiveSprint(null);
    }
  }, [isDsa, activeSprint]);

  const openSprint = (sprintId: string, index: number, sprint?: { is_locked?: boolean }) => {
    if (isUpcoming) {
      toast.info("This lab is upcoming and cannot be opened yet.");
      return;
    }
    if (realLab && isEnrolled === false) {
      handleStartLabPrompt();
      return;
    }
    if (sprintLocked(index, sprint)) {
      setPayOpen(true);
      return;
    }
    setActiveSprint(sprintId);
  };
  const handleUnlock = async () => {
    setIsPaying(true);
    try {
      const amount = realLab?.payment_amount || 499;

      const orderRes = await yhubApiAuthUtil.post<{
        id: string;
        gateway_order_or_intent_id: string;
      }>("/payment/", {
        payment_gateway: "RAZORPAY",
        amount: amount,
        item_type: "lab",
        item_id: realLab?.id || slug,
        item_name: realLab?.title || slug,
        product: "ylabs",
      });

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        setIsPaying(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount,
        currency: "INR",
        name: "Yuvro Labs",
        description: "Lab Unlock Payment",
        order_id: orderRes.gateway_order_or_intent_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await yhubApiAuthUtil.post<{ status: string; message: string }>(
              "/payment/verify/",
              {
                gateway_order_id: response.razorpay_order_id,
                gateway_payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
            );

            if (verifyRes.status === "SUCCESS") {
              try {
                await restApiAuthUtil.post(`/lab/labs/${realLab?.id || slug}/verify_payment/`);
              } catch (err: any) {
                console.warn("Backend verify_payment failed, likely a dummy lab:", err);
              }
              unlockLab(slug);
              setPayOpen(false);
              setUnlockBump((x) => x + 1);
              toast.success("Lab unlocked successfully!");
            } else {
              await yhubApiAuthUtil.post("/payment/fail/", {
                gateway_order_id: orderRes.gateway_order_or_intent_id,
                reason: "Payment signature verification failed",
              });
              throw new Error(verifyRes.message || "Payment signature verification failed");
            }
          } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Payment verification failed");
          } finally {
            setIsPaying(false);
          }
        },
        prefill: {
          name: "Student",
          email: "student@example.com",
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: async function () {
            setIsPaying(false);
            toast.info("Payment cancelled");
            try {
              await yhubApiAuthUtil.post("/payment/fail/", {
                gateway_order_id: orderRes.gateway_order_or_intent_id,
                reason: "User closed the payment modal",
              });
            } catch (e) {}
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on("payment.failed", async function (response: any) {
        try {
          await yhubApiAuthUtil.post("/payment/fail/", {
            gateway_order_id: response.error.metadata.order_id,
            gateway_payment_id: response.error.metadata.payment_id,
            reason: response.error.description,
          });
        } catch (e) {}
        toast.error(response.error.description || "Payment failed");
        setIsPaying(false);
      });

      try {
        await yhubApiAuthUtil.post("/payment/mark_pending/", {
          gateway_order_id: orderRes.gateway_order_or_intent_id,
        });
      } catch (e) {}

      rzp.open();
    } catch (error: any) {
      console.error(error);
      setIsPaying(false);
      toast.error("Failed to initiate payment.");
    }
  };

  const handleTicketClick = (e: React.MouseEvent) => {
    if (!isDsa) {
      e.preventDefault();
      toast.info("This lab is upcoming. Sprint tickets are for preview only.");
      return;
    }
    if (realLab && isEnrolled === false) {
      e.preventDefault();
      handleStartLabPrompt();
    }
  };

  const confirmEnroll = async (submittedRepoName?: string) => {
    const repoNameToUse = submittedRepoName || enrollRepoName;
    if (!realLab || !repoNameToUse.trim()) return;
    setEnrollLoading(true);
    try {
      const { default: api } = await import("@/utils/RestApiAuthUtil");
      await api.post("/lab/enrollments/", { lab: realLab.id, lab_id: parseInt(realLab.id) || realLab.id, github_repo_name: repoNameToUse });
      setIsEnrolled(true);
      setEnrollModalOpen(false);
      const userMockKey = user?.id ? `mock_enrollments_${user.id}` : "mock_enrollments";
      try {
        const saved = localStorage.getItem(userMockKey);
        const set = new Set(saved ? JSON.parse(saved) : []);
        set.add(String(realLab.id));
        localStorage.setItem(userMockKey, JSON.stringify([...set]));
      } catch {}
      toast.success("Repository created and lab started successfully!");
    } catch (e: any) {
      console.error("Failed to enroll in lab", e);
      let errMsg = e instanceof Error ? e.message : typeof e === "string" ? e : "Failed to create repository. Please try again.";

      try {
         if (errMsg.startsWith('["') && errMsg.endsWith('"]')) {
             const parsed = JSON.parse(errMsg);
             if (Array.isArray(parsed) && parsed.length > 0) errMsg = parsed[0];
         }
         const jsonStart = errMsg.indexOf("{");
         if (jsonStart !== -1) {
             const parsed = JSON.parse(errMsg.substring(jsonStart));
             if (parsed.errors?.[0]?.message) errMsg = parsed.errors[0].message;
             else if (parsed.message) errMsg = parsed.message;
         }
      } catch {}

      toast.error(errMsg);
    } finally {
      setEnrollLoading(false);
    }
  };

  if (ticketMatch || reportMatch) {
    if (!isLoading && realLab && realLab.status === "upcoming") {
      navigate({ to: "/student/dashboard" });
      return null;
    }
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isUpcoming) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-3xl">
            <LabIcon name={lab.name} icon={lab.icon} size="h-10 w-10" />
          </div>
          <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-3">
            Upcoming Lab
          </span>
          <h1 className="text-3xl font-bold tracking-tight">{lab.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {lab.description || "This lab is currently in development and will be available soon."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <DiffBadge value={lab.difficulty} />
            <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground capitalize">
              {tier}
            </span>
          </div>
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Content is being prepared</p>
            <p className="mt-1 text-xs">
              Sprints, tickets, and interactive sandboxes for this lab cannot be opened yet.
            </p>
          </div>
          <div className="mt-8">
            <Link
              to="/student/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1500px] px-4 py-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/student/dashboard" className="hover:text-foreground">
            Practical Labs
          </Link>
          <span>/</span>
          <span className="text-foreground">{lab.name}</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">
          {/* LEFT */}
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <LabIcon name={lab.name} icon={lab.icon} size="h-10 w-10" />
                <div>
                  <div className="font-semibold">{lab.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <DiffBadge value={lab.difficulty} />
                    {!isDsa && (
                      <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, background: `var(--${lab.color})` }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {lab.completed}/{lab.total} tickets · {lab.hoursLeft}h remaining
                </div>
              </div>
              <div className="mt-4 border-t pt-3 text-xs">
                <div className="mb-1 text-muted-foreground">Prerequisites</div>
                <ul className="space-y-1">
                  <li>• Basic programming concepts</li>
                  <li>• Familiarity with terminal</li>
                </ul>
              </div>
            </div>

            {lab.skills && lab.skills.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-3 text-sm font-medium">Skills</div>
                <div className="space-y-3">
                  {lab.skills.map((s: { name: string; pct: number }) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-xs">
                        <span>{s.name}</span>
                        <span className="text-muted-foreground">{s.pct}%</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </div>
              <div className="space-y-2 text-xs">
                {["Beginner", "Intermediate", "Advanced"].map((d) => (
                  <label key={d} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedDiffs.includes(d)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDiffs([...selectedDiffs, d]);
                        else setSelectedDiffs(selectedDiffs.filter((x) => x !== d));
                      }}
                      className="accent-[var(--primary)]"
                    />{" "}
                    {d}
                  </label>
                ))}
                <div className="border-t pt-2 mt-2">
                  {[
                    { label: "Backlog", val: "backlog" },
                    { label: "In Progress", val: "in_progress" },
                    { label: "In Review", val: "in_review" },
                    { label: "Done", val: "done" },
                  ].map((d) => (
                    <label key={d.val} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(d.val)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStatuses([...selectedStatuses, d.val]);
                          else setSelectedStatuses(selectedStatuses.filter((x) => x !== d.val));
                        }}
                        className="accent-[var(--primary)]"
                      />{" "}
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <section>
            {!sprint ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Sprints</h2>
                    <p className="text-xs text-muted-foreground">
                      {!isDsa ? (
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">
                          Upcoming Lab · Sprints are shown for preview only and are not clickable.
                        </span>
                      ) : tier === "free" ? (
                        "All sprints are unlocked."
                      ) : tier === "freemium" && !unlocked ? (
                        `Sprint 1 is free. Unlock the full track for ${sprints.length - freeSprintCount(tier)} more sprints.`
                      ) : tier === "premium" && !unlocked ? (
                        "All sprints are locked. Unlock the premium track to begin."
                      ) : (
                        "Full track unlocked. Enjoy every sprint."
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {sprints.length} sprints · {allTickets.length} tickets
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {sprints.map((s, idx) => {
                    const realSprint = realSprints[idx];
                    const locked = sprintLocked(idx, realSprint);
                    const items = allTickets.filter((t) => 
                      s.ticketIds.includes(t.id) &&
                      selectedDiffs.includes(normalizeDiff(t.difficulty)) &&
                      selectedStatuses.includes(t.status) &&
                      t.title.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    const done = items.filter((t) => (t as any).fromApi && t.status === "done").length;
                    const pctS = items.length ? Math.round((done / items.length) * 100) : 0;
                    const xp = items.reduce((a, t) => a + t.xp, 0);
                    const earnedXpSprint = items.reduce((a: number, t: any) => a + (t.fromApi ? (t.earnedXp || 0) : 0), 0);
                    const mins = items.reduce((a, t) => a + t.estMin, 0);
                    const tone = locked
                      ? "muted-foreground"
                      : s.status === "Completed"
                        ? "success"
                        : s.status === "Active"
                          ? "info"
                          : "muted-foreground";
                    const Icon = locked
                      ? Lock
                      : s.status === "Completed"
                        ? CheckCircle2
                        : s.status === "Active"
                          ? Play
                          : Flag;
                    return (
                      <button
                        key={s.id}
                        disabled={!isDsa}
                        onClick={() => openSprint(s.id, idx, realSprint)}
                        className={`text-left relative overflow-hidden rounded-xl border bg-card p-4 transition ${
                          !isDsa
                            ? "opacity-80 cursor-not-allowed"
                            : "hover:border-primary/60 hover:shadow-md cursor-pointer"
                        }`}
                      >
                        {!isDsa ? (
                          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                            Upcoming
                          </span>
                        ) : locked ? (
                          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                            Locked
                          </span>
                        ) : !locked && tier === "freemium" ? (
                          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                            Free preview
                          </span>
                        ) : null}
                        <div
                          className={`flex flex-col h-full ${locked ? "opacity-70 grayscale" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 pr-16">
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>{s.range}</span>
                              </div>
                              <div className="mt-1 font-semibold leading-snug">{s.name}</div>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {s.goal}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>
                                {done}/{items.length} tickets
                              </span>
                              <span>{pctS}%</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${pctS}%` }} />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {items.length} tickets
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round(mins / 60)}h
                            </span>
                            <span className="inline-flex items-center gap-1 text-primary">
                              <Zap className="h-3 w-3" />
                              {earnedXpSprint} / {xp} YP
                            </span>
                          </div>
                          {locked && (
                            <div className="mt-3 text-[11px] text-warning inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Unlock the {meta.short.toLowerCase()}{" "}
                              track to access this sprint
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveSprint(null)}
                    className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1.5 text-xs hover:bg-accent"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Sprints
                  </button>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">{sprint.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {sprint.range} · {sprint.goal}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-56 rounded-md border bg-input/40 pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex rounded-md border bg-card p-0.5 text-xs">
                      <button
                        onClick={() => setView("kanban")}
                        className={`flex items-center gap-1 rounded px-2 py-1 ${view === "kanban" ? "bg-accent" : ""}`}
                      >
                        <LayoutGrid className="h-3 w-3" />
                        Kanban
                      </button>
                      <button
                        onClick={() => setView("list")}
                        className={`flex items-center gap-1 rounded px-2 py-1 ${view === "list" ? "bg-accent" : ""}`}
                      >
                        <List className="h-3 w-3" />
                        List
                      </button>
                      <button className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Timeline
                      </button>
                    </div>
                  </div>
                </div>

                {view === "kanban" ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {cols.map((c) => {
                      const items = sprintTickets.filter((t) => t.status === c.key);
                      return (
                        <div key={c.key} className="flex flex-col rounded-xl border bg-card/50 p-3 max-h-[calc(100vh-11rem)]"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const tId = e.dataTransfer.getData("text/plain");
                            if (tId) {
                              const oldStatus =
                                statusOverrides[tId]?.status ||
                                sprintTickets.find((t) => t.id === tId)?.status ||
                                "backlog";
                              if (oldStatus === c.key) return;
                              setStatusOverrides((prev) => ({ ...prev, [tId]: { status: c.key as Status, earnedXp: prev[tId]?.earnedXp ?? 0, fromApi: prev[tId]?.fromApi ?? false } }));
                              try {
                                const localKanbanStr = localStorage.getItem(`kanban_${slug}`) || "{}";
                                const localKanban = JSON.parse(localKanbanStr);
                                localKanban[tId] = c.key;
                                localStorage.setItem(`kanban_${slug}`, JSON.stringify(localKanban));
                              } catch (err) {}
                            }
                          }}
                        >
                          <div className="mb-3 flex items-center justify-between px-1 shrink-0">
                            <div className="text-sm font-medium">{c.label}</div>
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px]">
                              {items.length}
                            </span>
                          </div>
                          <div className="space-y-2 overflow-y-auto min-h-0 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {items.length === 0 && <div className="px-1 py-4 text-[11px] text-muted-foreground">No tickets</div>}
                            {items.map((t) => (
                              <div
                                key={t.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                              >
                                <Link
                                  onClick={handleTicketClick}
                                  to="/student/lab/$slug/ticket/$ticketId"
                                  params={{ slug: lab.slug, ticketId: t.id }}
                                  className="block rounded-lg border bg-card p-3 hover:border-primary/50 transition cursor-grab active:cursor-grabbing"
                                >
                                  <div className="text-sm font-medium leading-snug">{t.title}</div>
                                  <div className="mt-1.5 flex items-center justify-between">
                                    <DiffBadge value={t.difficulty} />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>
                                      ⏱ {t.estMin}m · {t.tag}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-primary">
                                      <Zap className="h-3 w-3" />
                                      {t.xp}
                                    </span>
                                  </div>
                                  {t.status === "in_progress" && t.progress != null && (
                                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full bg-info"
                                        style={{ width: `${t.progress}%` }}
                                      />
                                    </div>
                                  )}
                                  {t.status === "done" && (
                                    <div className="mt-2 flex items-center justify-between text-[11px]">
                                      <span className="text-success">✓ Score {t.score}</span>
                                      <Award className="h-3.5 w-3.5 text-warning" />
                                    </div>
                                  )}
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-accent/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left p-3">Title</th>
                          <th>Difficulty</th>
                          <th>Status</th>
                          <th>YP</th>
                          <th>Time</th>
                          <th>Score</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sprintTickets.map((t) => (
                          <tr key={t.id} className="border-t hover:bg-accent/30">
                            <td className="p-3">{t.title}</td>
                            <td className="text-center">
                              <DiffBadge value={t.difficulty} />
                            </td>
                            <td className="text-center">
                              <StatusBadge value={t.status} />
                            </td>
                            <td className="text-center text-primary">{t.xp}</td>
                            <td className="text-center text-muted-foreground">{t.estMin}m</td>
                            <td className="text-center">{t.score ?? "—"}</td>
                            <td className="text-right p-3">
                              <Link
                                onClick={handleTicketClick}
                                to="/student/lab/$slug/ticket/$ticketId"
                                params={{ slug: lab.slug, ticketId: t.id }}
                                className="text-primary text-xs"
                              >
                                Open →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          {/* RIGHT */}
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-medium">Progress summary</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Mini label="Completion" value={`${pct}%`} />
                <Mini label="Streak" value={`${studentStats?.day_streak ?? 0}d`} />
                <Mini label="Earned YP" value={`${allTickets.filter((t: any) => t.fromApi && t.status === "done").reduce((acc: number, t: any) => acc + (t.earnedXp || 0), 0)} / ${allTickets.reduce((acc: number, t: any) => acc + (t.xp || 0), 0)} YP`} />
                <Mini 
                  label="Avg time" 
                  value={`${allTickets.filter(t => t.status === "done").length > 0 ? Math.round(allTickets.filter(t => t.status === "done").reduce((acc, t) => acc + (t.estMin || 0), 0) / allTickets.filter(t => t.status === "done").length) : 0}m`} 
                />
              </div>
            </div>

            {/* <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">Lab leaderboard</div>
                <span className="text-xs text-muted-foreground">#15 / 1,250</span>
              </div>
              <ul className="space-y-1.5 text-sm">
                {leaderboard.slice(0, 5).map((u) => (
                  <li key={u.rank} className="flex items-center gap-2">
                    <span className="w-5 text-xs text-muted-foreground">#{u.rank}</span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px]">
                      {u.avatar}
                    </span>
                    <span className="flex-1 truncate">{u.name}</span>
                    <span className="text-xs text-primary">{u.xp.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <Link to="/student/leaderboard" className="mt-3 block text-xs text-primary">
                View full leaderboard →
              </Link>
            </div> */}

            {/* <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI suggestions
              </div>
              <div className="space-y-3 text-xs">
                <Suggestion
                  color="destructive"
                  icon={<TrendingDown className="h-3 w-3" />}
                  title="Focus: Exception Handling"
                  body="You: 35% · Lab Avg: 60%. Try JAVA-110, JAVA-115. Est. boost +15% in 4h."
                />
                <Suggestion
                  color="warning"
                  icon={<Lock className="h-3 w-3" />}
                  title="Next: Collections"
                  body="Needs OOP ≥ 70%. Unlock in 2 more tickets."
                />
                <Suggestion
                  color="success"
                  icon={<TrendingUp className="h-3 w-3" />}
                  title="Master: Java Syntax"
                  body="Ready for advanced challenges."
                />
              </div>
            </div> */}

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 text-sm font-medium">Milestones</div>
              <div className="flex gap-2">
                {[5, 10, 15, 20, 25].map((n) => {
                  const unlocked = lab.completed >= n;
                  return (
                    <div
                      key={n}
                      className={`flex-1 grid place-items-center rounded-md border p-2 text-[10px] ${unlocked ? "bg-warning/10 border-warning/40 text-warning" : "text-muted-foreground"}`}
                    >
                      <Award className="h-4 w-4" />
                      {n}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 mt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <PieChart className="h-4 w-4 text-primary" />
                Lab Report
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Detailed visualizations of your performance across all sprints and tickets.
              </p>
              <Link
                to="/student/lab/$slug/report"
                params={{ slug: lab.slug }}
                className="flex items-center justify-center gap-2 w-full rounded-md border bg-accent/40 px-3 py-2 text-xs font-medium hover:bg-accent hover:text-foreground transition-colors"
              >
                View Full Report <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {tier !== "free" && (
              <div className="mt-4 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full bg-${meta.tone}/15 text-${meta.tone}`}
                  >
                    {tier === "freemium" ? (
                      <Star className="h-5 w-5" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-base font-semibold">Unlock {meta.label}</div>
                    <div className="text-xs text-muted-foreground">{lab.name}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{meta.blurb}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" /> All {sprints.length} sprints
                    unlocked
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Every ticket, hint and
                    solution
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Lifetime access for this lab
                  </li>
                </ul>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{meta.price}</span>
                  <span className="text-xs text-muted-foreground">one-time</span>
                </div>
                {unlocked ? (
                  <div className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-success/40 bg-success/10 py-2 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" /> Unlocked
                  </div>
                ) : (
                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => setPayOpen(true)}
                      className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90"
                    >
                      Unlock now
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>

      {payOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setPayOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold">Unlock {meta.label}</div>
                <div className="text-xs text-muted-foreground">{lab.name}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{meta.blurb}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> All {sprints.length} sprints
                unlocked
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Every ticket, hint and solution
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Lifetime access for this lab
              </li>
            </ul>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{meta.price}</span>
              <span className="text-xs text-muted-foreground">one-time</span>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setPayOpen(false)}
                className="flex-1 rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                Not now
              </button>
              <button
                onClick={handleUnlock}
                disabled={isPaying}
                className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Unlock now"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Lab Modal */}
      <StartLabModal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        labName={lab.name}
        defaultRepoName={enrollRepoName}
        onConfirm={confirmEnroll}
        isLoading={enrollLoading}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-accent/40 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
function Suggestion({
  color,
  icon,
  title,
  body,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className={`rounded-md border p-2`}
      style={{
        borderColor: `color-mix(in oklab, var(--${color}) 40%, transparent)`,
        background: `color-mix(in oklab, var(--${color}) 10%, transparent)`,
      }}
    >
      <div className="flex items-center gap-1.5 font-medium" style={{ color: `var(--${color})` }}>
        {icon}
        {title}
      </div>
      <div className="mt-1 text-muted-foreground">{body}</div>
    </div>
  );
}
