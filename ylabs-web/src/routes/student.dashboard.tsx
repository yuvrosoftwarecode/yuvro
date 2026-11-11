import React, { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import LearnerHero from "@/components/LearnerHero";
import UpcomingLabsCarousel, { type Lab as UpcomingLabItem } from "@/components/UpcomingLabsCarousel";
import { ProgressRing } from "@/components/ProgressRing";
import { useAuth } from "@/lib/auth";
import { loadLabs } from "@/lib/adminLabs";
import { invalidateStudentStats } from "@/lib/studentStats";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import {
  ArrowRight,
  Check,
  Plus,
  Star,
  Lock,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/student/dashboard")({
  component: Hub,
});

export interface CatalogLab {
  id: string;
  name: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  icon: string;
  color: string;
  total: number;
  completed: number;
  payment_tier?: string;
  hoursLeft?: number;
  status?: "active" | "inactive" | "draft" | "upcoming";
  sprints?: number;
}

const isUpcomingLab = (lab: { status?: string; id?: string; name?: string }) => {
  if (lab.status === "upcoming") return true;
  if (lab.status === "active") return false;
  const id = (lab.id || "").toLowerCase();
  const n = (lab.name || "").toLowerCase();
  return (
    id === "aiml" ||
    id === "devops" ||
    id === "aws" ||
    id === "cybersecurity" ||
    id === "react" ||
    id === "llm" ||
    n.includes("ai/ml") ||
    n.includes("devops") ||
    n.includes("cybersecurity")
  );
};

function Hub() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Persist the student's name across logouts so it never flickers to "Student"
  const lastDisplayNameRef = useRef<string>("");
  const currentName = user?.first_name || user?.username || (user as any)?.name?.split(" ")[0];
  if (currentName) {
    lastDisplayNameRef.current = currentName;
  }
  const displayName = currentName || lastDisplayNameRef.current || "Student";

  const [labsLoading, setLabsLoading] = useState(true);
  const [allCatalogLabs, setAllCatalogLabs] = useState<CatalogLab[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollLoading, setEnrollLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    invalidateStudentStats();
    loadLabs()
      .catch((err) => {
        console.error(err);
        return [];
      })
      .then(async (data: any) => {
        const enrSet = new Set<string>();
        let statsMap: Record<string, any> = {};

        try {
          const statsRes: any = await restApiAuthUtil.get("/lab/tickets/my-stats/");
          statsMap = statsRes || {};
        } catch (e) {}

        try {
          const enrollRes: any = await restApiAuthUtil.get("/lab/enrollments/");
          const enrollmentsList = Array.isArray(enrollRes) ? enrollRes : enrollRes.results || [];
          enrollmentsList.forEach((e: any) => {
            if (e) {
              if (e.lab !== undefined && e.lab !== null) enrSet.add(String(typeof e.lab === "object" ? e.lab.id : e.lab));
              if (e.lab_id !== undefined && e.lab_id !== null) enrSet.add(String(e.lab_id));
              if (e.lab_details?.id) enrSet.add(String(e.lab_details.id));
            }
          });
        } catch (e) {
          console.warn("Failed to fetch enrollments from API, falling back to mock");
        }

        try {
          const userMockKey = user?.id ? `mock_enrollments_${user.id}` : "mock_enrollments";
          const saved = localStorage.getItem(userMockKey);
          if (saved) {
            JSON.parse(saved).forEach((id: string) => enrSet.add(String(id)));
          }
        } catch {}
        setEnrolledIds(enrSet);

        const validData = (data || []).filter((dbLab: any) => {
          if ((dbLab.title || dbLab.name || "").trim().toLowerCase() === "mongo lab") return false;
          const status = dbLab.status || (dbLab.is_active === false ? "inactive" : "active");
          return status === "active" || status === "upcoming";
        });

        const mapped = await Promise.all(
          validData.map(async (dbLab: any) => {
            const sid = String(dbLab.id);
            let total_tickets = dbLab.total_tickets ?? 0;
            let resolved_tickets = dbLab.resolved_tickets ?? 0;

            try {
              const saved = localStorage.getItem(`ylabs-ticket-status-${sid}`);
              if (saved) {
                resolved_tickets = Object.values(JSON.parse(saved)).filter((v) => v === "Completed").length;
              }
            } catch {}

            if (statsMap[sid]) {
              total_tickets = statsMap[sid].total_tickets || total_tickets;
              resolved_tickets = statsMap[sid].resolved_tickets || resolved_tickets;
            }

            let color = "ui";
            if (dbLab.title?.toLowerCase().includes("java") || dbLab.name?.toLowerCase().includes("java")) color = "java";
            if (dbLab.title?.toLowerCase().includes("python") || dbLab.name?.toLowerCase().includes("python")) color = "python";
            if (dbLab.title?.toLowerCase().includes("sql") || dbLab.title?.toLowerCase().includes("postgres") || dbLab.name?.toLowerCase().includes("sql") || dbLab.name?.toLowerCase().includes("postgres")) color = "sql";
            if (dbLab.title?.toLowerCase().includes("mongo") || dbLab.name?.toLowerCase().includes("mongo")) color = "mongo";

            const iconStr = dbLab.icon?.toLowerCase() || "";
            let icon = dbLab.icon && iconStr !== "linux" && iconStr !== "linux lab" ? dbLab.icon : "💻";
            if (dbLab.title?.toLowerCase().includes("linux") || dbLab.name?.toLowerCase().includes("linux")) icon = "🐧";
            if (dbLab.title?.toLowerCase().includes("java") || dbLab.name?.toLowerCase().includes("java")) icon = "☕";
            if (dbLab.title?.toLowerCase().includes("python") || dbLab.name?.toLowerCase().includes("python")) icon = "🐍";
            if (dbLab.title?.toLowerCase().includes("sql") || dbLab.title?.toLowerCase().includes("postgres") || dbLab.name?.toLowerCase().includes("sql") || dbLab.name?.toLowerCase().includes("postgres")) icon = "🐘";
            if (dbLab.title?.toLowerCase().includes("mongo") || dbLab.name?.toLowerCase().includes("mongo")) icon = "🍃";
            if (dbLab.title?.toLowerCase().includes("cloud") || dbLab.name?.toLowerCase().includes("cloud")) icon = "☁️";

            let mappedDifficulty: "Beginner" | "Intermediate" | "Advanced" = "Intermediate";
            if (dbLab.difficulty === "EASY") mappedDifficulty = "Beginner";
            else if (dbLab.difficulty === "MEDIUM") mappedDifficulty = "Intermediate";
            else if (dbLab.difficulty === "HARD") mappedDifficulty = "Advanced";

            const status = dbLab.status || (dbLab.is_active === false ? "inactive" : "active");

            return {
              id: sid,
              name: dbLab.title || dbLab.name,
              description: dbLab.description || "Learn and master concepts hands-on.",
              difficulty: mappedDifficulty,
              icon,
              color,
              total: total_tickets || 20,
              completed: resolved_tickets,
              payment_tier: dbLab.payment_tier || "free",
              hoursLeft: 24,
              status,
              sprints: 10,
            };
          })
        );

        // Integrate catalog dummy labs (AI/ML, System Design, DevOps, AWS, Cybersecurity, React) with real labs
        const realNames = new Set(mapped.map((l) => l.name.toLowerCase()));
        const requestedDummyLabs: CatalogLab[] = [
          {
            id: "aiml",
            name: "AI/ML Lab",
            description: "Artificial Intelligence & Machine Learning: neural networks, LLMs, prompt engineering and model fine-tuning.",
            difficulty: "Advanced",
            icon: "🤖",
            color: "python",
            total: 24,
            completed: 0,
            payment_tier: "free",
            hoursLeft: 36,
            status: "upcoming",
            sprints: 6,
          },
          {
            id: "systemdesign",
            name: "System Design Lab",
            description: "Design scalable systems: load balancing, caching, sharding, queues and event-driven architectures.",
            difficulty: "Advanced",
            icon: "🏛️",
            color: "sysd",
            total: 16,
            completed: 0,
            payment_tier: "free",
            hoursLeft: 32,
            status: "active",
            sprints: 6,
          },
          {
            id: "devops",
            name: "DevOps Lab",
            description: "Master CI/CD pipelines, Docker containerization, Kubernetes orchestration, Infrastructure as Code and monitoring.",
            difficulty: "Intermediate",
            icon: "♾️",
            color: "prog",
            total: 18,
            completed: 0,
            payment_tier: "free",
            hoursLeft: 24,
            status: "upcoming",
            sprints: 5,
          },
          {
            id: "aws",
            name: "AWS Lab",
            description: "Amazon Web Services cloud architecture: EC2, S3, Lambda, IAM, VPC, and CloudFormation infrastructure setup.",
            difficulty: "Intermediate",
            icon: "☁️",
            color: "prog",
            total: 20,
            completed: 0,
            payment_tier: "free",
            hoursLeft: 28,
            status: "upcoming",
            sprints: 5,
          },
          {
            id: "cybersecurity",
            name: "Cybersecurity Lab",
            description: "Hands-on offensive & defensive security: OWASP Top 10, AuthN/AuthZ, cryptography, network scanning and cloud hardening.",
            difficulty: "Advanced",
            icon: "🛡️",
            color: "sec",
            total: 18,
            completed: 0,
            payment_tier: "free",
            hoursLeft: 30,
            status: "upcoming",
            sprints: 5,
          },
          {
            id: "react",
            name: "React Lab",
            description: "Build modern, scalable user interfaces using React: components, JSX, custom hooks, state management, and Router.",
            difficulty: "Intermediate",
            icon: "⚛️",
            color: "ui",
            total: 22,
            completed: 0,
            payment_tier: "free",
            hoursLeft: 24,
            status: "upcoming",
            sprints: 4,
          },
        ];

        const mappedDummy: CatalogLab[] = requestedDummyLabs.filter(
          (dl) => !realNames.has(dl.name.toLowerCase())
        );

        const hasDsaScenario = [...mapped, ...mappedDummy].some(
          (l) =>
            (l.name.toLowerCase().includes("dsa") || l.name.toLowerCase().includes("data structure")) &&
            l.name.toLowerCase().includes("scenario")
        );
        if (!hasDsaScenario) {
          mappedDummy.push({
            id: "dsa_scenario_lab",
            name: "Data Structures Lab Scenario",
            description: "Real-world problem solving scenarios using advanced data structures.",
            difficulty: "Advanced",
            icon: "🧩",
            color: "ds",
            total: 20,
            completed: 0,
            payment_tier: "free",
            hoursLeft: 24,
            status: "active",
            sprints: 10,
          });
        }

        const priorityOrder = ["aiml", "systemdesign"];
        const sortedCatalog = [...mapped, ...mappedDummy].sort((a, b) => {
          const idxA = priorityOrder.indexOf(a.id);
          const idxB = priorityOrder.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });

        setAllCatalogLabs(sortedCatalog);
      })
      .catch(console.error)
      .finally(() => setLabsLoading(false));
  }, [user]);

  const enrolledLabs = useMemo(
    () => allCatalogLabs.filter((l) => enrolledIds.has(l.id)),
    [allCatalogLabs, enrolledIds]
  );

  // All open labs: any active lab where students can enroll
  const openLabs = useMemo(() => {
    const isExcluded = (name: string) => {
      const n = (name || "").toLowerCase();
      return n.includes("mongo") || n.includes("mysql") || n.includes("taskflow");
    };

    const filtered = allCatalogLabs.filter((l) => !isExcluded(l.name) && !isUpcomingLab(l));

    let dsaLab = filtered.find(
      (l) =>
        (l.name.toLowerCase().includes("dsa") || l.name.toLowerCase().includes("data structure")) &&
        !l.name.toLowerCase().includes("scenario")
    );
    if (!dsaLab) {
      dsaLab = {
        id: "dsa_lab",
        name: "Data Structures Lab",
        description: "Core data structures: arrays, linked lists, trees, graphs, heaps and hashing.",
        difficulty: "Intermediate",
        icon: "🧩",
        color: "ds",
        total: 30,
        completed: 0,
        payment_tier: "free",
        hoursLeft: 24,
        status: "active",
        sprints: 10,
      };
    }

    let dsaScenarioLab = filtered.find(
      (l) =>
        (l.name.toLowerCase().includes("dsa") || l.name.toLowerCase().includes("data structure")) &&
        l.name.toLowerCase().includes("scenario")
    );
    if (!dsaScenarioLab) {
      dsaScenarioLab = {
        id: "dsa_scenario_lab",
        name: "Data Structures Lab Scenario",
        description: "Real-world problem solving scenarios using advanced data structures.",
        difficulty: "Advanced",
        icon: "🧩",
        color: "ds",
        total: 20,
        completed: 0,
        payment_tier: "free",
        hoursLeft: 24,
        status: "active",
        sprints: 10,
      };
    }

    const list: CatalogLab[] = [];
    const addedIds = new Set<string>();

    [dsaLab, dsaScenarioLab].forEach((item) => {
      if (item && !addedIds.has(item.id)) {
        list.push(item);
        addedIds.add(item.id);
      }
    });

    filtered.forEach((lab) => {
      if (!addedIds.has(lab.id)) {
        list.push(lab);
        addedIds.add(lab.id);
      }
    });

    return list;
  }, [allCatalogLabs]);

  // Available featured labs: All open labs that the student has not yet enrolled in
  const availableFeaturedLabs = useMemo(
    () => openLabs.filter((lab) => !enrolledIds.has(lab.id)),
    [openLabs, enrolledIds]
  );

  // Real upcoming labs mapped for the UpcomingLabsCarousel
  const upcomingLabsList: UpcomingLabItem[] = useMemo(() => {
    const defaultUpcoming: UpcomingLabItem[] = [
      {
        name: "AI/ML Labs",
        tagline: "Train, break and fix real neural models and LLMs.",
        sprints: 6,
        tickets: 48,
        color: "#6741d9",
      },
      {
        name: "System Design Labs",
        tagline: "Scale, latency, caching, and event-driven architectures.",
        sprints: 6,
        tickets: 40,
        color: "#3b6fd4",
      },
      {
        name: "DevOps Labs",
        tagline: "Pipelines, Docker containers, Kubernetes and rollouts.",
        sprints: 5,
        tickets: 36,
        color: "#d9480f",
      },
      {
        name: "AWS Cloud Labs",
        tagline: "EC2, S3, Lambda, IAM, VPC, and CloudFormation setups.",
        sprints: 5,
        tickets: 30,
        color: "#f7931e",
      },
      {
        name: "Cybersecurity Labs",
        tagline: "Hands-on offensive & defensive security and cloud hardening.",
        sprints: 5,
        tickets: 32,
        color: "#c2255c",
      },
      {
        name: "React UI Labs",
        tagline: "Build modern, scalable user interfaces with React & TypeScript.",
        sprints: 4,
        tickets: 28,
        color: "#0891b2",
      },
    ];

    const list: UpcomingLabItem[] = [...defaultUpcoming];

    // Also include any real backend labs that are upcoming
    allCatalogLabs.forEach((l) => {
      if (
        (l.status === "upcoming" || isUpcomingLab(l)) &&
        !list.some(
          (u) =>
            u.name.toLowerCase().includes(l.name.toLowerCase()) ||
            l.name.toLowerCase().includes(u.name.toLowerCase().replace(/ labs?$/, ""))
        )
      ) {
        list.push({
          name: l.name,
          tagline: l.description,
          sprints: l.sprints || 5,
          tickets: l.total || 30,
          color: l.color ? `var(--${l.color})` : "#3b6fd4",
        });
      }
    });

    return list;
  }, [allCatalogLabs]);

  const toggle = (id: string) => {
    setEnrollLoading((prev) => ({ ...prev, [id]: true }));
    const isEnrolled = enrolledIds.has(id);
    const userMockKey = user?.id ? `mock_enrollments_${user.id}` : "mock_enrollments";

    if (isEnrolled) {
      setEnrolledIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        try {
          localStorage.setItem(userMockKey, JSON.stringify([...next]));
        } catch {}
        return next;
      });
      setEnrollLoading((prev) => ({ ...prev, [id]: false }));
    } else {
      restApiAuthUtil
        .post("/lab/enrollments/", { lab_id: parseInt(id) || id, lab: id })
        .then(() => {
          setEnrolledIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            try {
              localStorage.setItem(userMockKey, JSON.stringify([...next]));
            } catch {}
            return next;
          });
        })
        .catch((err) => {
          console.error("Enrollment API failed, using mock enrollments", err);
          setEnrolledIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            try {
              localStorage.setItem(userMockKey, JSON.stringify([...next]));
            } catch {}
            return next;
          });
        })
        .finally(() => setEnrollLoading((prev) => ({ ...prev, [id]: false })));
    }
  };

  const recentLab = useMemo(() => {
    if (enrolledLabs.length === 0) return null;
    try {
      const stored = localStorage.getItem("ylabs-recent-lab");
      if (stored) {
        const parsed = JSON.parse(stored);
        const match = enrolledLabs.find((l) => l.id === parsed.id);
        if (match) return match;
      }
    } catch {}
    return enrolledLabs[0];
  }, [enrolledLabs]);

  const isFirstLogin = useMemo(() => {
    if (typeof window === "undefined" || !user?.id) return false;
    return localStorage.getItem(`is_first_login_${user.id}`) === "true";
  }, [user?.id]);

  const handleGlobalClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      e.stopPropagation();
      navigate({ to: "/auth", search: { tab: "signin" } });
    }
  };

  const handleContinue = () => {
    if (recentLab) {
      navigate({ to: "/student/lab/$slug", params: { slug: recentLab.id } });
    } else if (enrolledLabs.length > 0) {
      navigate({ to: "/student/lab/$slug", params: { slug: enrolledLabs[0].id } });
    } else if (availableFeaturedLabs.length > 0) {
      navigate({ to: "/student/lab/$slug", params: { slug: availableFeaturedLabs[0].id } });
    } else {
      const target = document.getElementById("featured-labs");
      target?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen" onClickCapture={handleGlobalClick}>
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Hero Section with Welcome Badge, Quotes, SVG Scenes, and Continue Lab CTA */}
        <LearnerHero
          userName={displayName}
          isFirstLogin={isFirstLogin}
          continueLabel={recentLab ? `Continue ${recentLab.name}` : "Explore Labs"}
          onContinue={handleContinue}
        />

        <div className="mt-8 space-y-10">
          {/* My labs — horizontal scroll */}
          {user && (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold">My labs</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {labsLoading ? (
                      <span className="inline-block h-3 w-32 bg-muted/70 rounded animate-pulse" />
                    ) : (
                      `${enrolledLabs.length} enrolled · ${enrolledLabs.reduce((a, l) => a + l.completed, 0)} tickets solved`
                    )}
                  </p>
                </div>
              </div>
              {labsLoading ? (
                <HScroll>
                  {[1, 2, 3, 4].map((i) => (
                    <LabCardSkeleton key={i} width="w-[300px]" />
                  ))}
                </HScroll>
              ) : enrolledLabs.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    You haven't enrolled in any lab yet. Pick one from the featured labs below to get started.
                  </p>
                </div>
              ) : (
                <HScroll>
                  {enrolledLabs.map((lab) => (
                    <div key={lab.id} className="w-[300px] shrink-0 flex flex-col">
                      <EnrolledCard lab={lab} />
                    </div>
                  ))}
                </HScroll>
              )}
            </section>
          )}

          {/* Featured labs — horizontal scroll with open labs not yet enrolled */}
          {(labsLoading || availableFeaturedLabs.length > 0) && (
            <section id="featured-labs">
              <div className="mb-4 flex items-end justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" /> Featured labs
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All open simulation labs available for enrollment.
                  </p>
                </div>
                {!labsLoading && (
                  <span className="text-xs text-muted-foreground">
                    {availableFeaturedLabs.length} labs
                  </span>
                )}
              </div>
              {labsLoading ? (
                <HScroll>
                  {[1, 2, 3, 4].map((i) => (
                    <LabCardSkeleton key={i} width="w-[320px]" />
                  ))}
                </HScroll>
              ) : (
                <HScroll>
                  {availableFeaturedLabs.map((lab) => (
                    <div key={lab.id} className="w-[320px] shrink-0 flex flex-col">
                      <FeaturedCard
                        lab={lab}
                        isEnrolled={false}
                        isLoading={Boolean(enrollLoading[lab.id])}
                        onToggle={() => toggle(lab.id)}
                      />
                    </div>
                  ))}
                </HScroll>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Real Upcoming labs carousel — full page width */}
      <section className="mt-10 pb-10">
        <UpcomingLabsCarousel
          labs={upcomingLabsList}
          onNotify={(lab, on) => {
            try {
              const key = "ylabs_upcoming_notifications";
              const current = JSON.parse(localStorage.getItem(key) || "{}");
              current[lab.name] = on;
              localStorage.setItem(key, JSON.stringify(current));
            } catch {}
          }}
        />
      </section>
    </div>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto scrollbar-thin">
      <div className="flex gap-4 pb-2 items-stretch">{children}</div>
    </div>
  );
}

function LabCardSkeleton({ width = "w-[300px]" }: { width?: string }) {
  return (
    <div className={`${width} shrink-0 flex flex-col justify-between h-[185px] overflow-hidden rounded-xl border border-border/70 bg-card p-5 animate-pulse`}>
      <div>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 pr-3">
            <div className="h-2.5 w-14 bg-muted/80 rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-3 w-full bg-muted/60 rounded" />
            <div className="h-3 w-4/5 bg-muted/60 rounded" />
          </div>
          <div className="h-10 w-10 rounded-full bg-muted/70 shrink-0" />
        </div>
      </div>
      <div className="mt-auto pt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="h-2.5 w-24 bg-muted/60 rounded" />
          <div className="h-2.5 w-10 bg-muted/60 rounded" />
        </div>
        <div className="h-7 w-full bg-muted/80 rounded-md" />
      </div>
    </div>
  );
}

function FeaturedCard({
  lab,
  isEnrolled,
  isLoading,
  onToggle,
}: {
  lab: CatalogLab;
  isEnrolled: boolean;
  isLoading: boolean;
  onToggle: () => void;
}) {
  const tier = (lab.payment_tier || "free").toLowerCase();
  const tierLabel = tier === "premium" ? "Premium" : tier === "freemium" ? "Freemium" : "Free";

  return (
    <div className="group relative flex flex-col justify-between h-full w-full overflow-hidden rounded-xl border bg-card p-5 hover:border-primary/50 transition">
      <div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
          {tier === "premium" && <Lock className="h-3 w-3" />}
          {tierLabel}
        </span>
        <div className="mt-2 min-w-0">
          <h3 className="font-semibold truncate text-sm" title={lab.name}>{lab.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 h-10 leading-5">
            {lab.description}
          </p>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-end text-xs mb-3">
          <span className="text-muted-foreground">{lab.total} tickets</span>
        </div>
        <div className="flex gap-2">
          <Link
            to="/student/lab/$slug"
            params={{ slug: lab.id }}
            className="inline-flex items-center justify-center rounded-md border px-4 py-1.5 text-xs font-medium hover:bg-accent/50 transition"
          >
            View
          </Link>
          <button
            onClick={onToggle}
            disabled={isLoading}
            className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              isEnrolled
                ? "border border-success/40 bg-success/10 text-success"
                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isEnrolled ? (
              <>
                <Check className="h-3.5 w-3.5" /> Enrolled
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Enroll
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnrolledCard({ lab }: { lab: CatalogLab }) {
  const pct = lab.total > 0 ? Math.round((lab.completed / lab.total) * 100) : 0;
  const tier = (lab.payment_tier || "free").toLowerCase();
  const tierLabel = tier === "premium" ? "Premium" : tier === "freemium" ? "Freemium" : "Free";

  return (
    <div className="group relative flex flex-col justify-between h-full w-full overflow-hidden rounded-xl border bg-card p-5 hover:border-primary/50 hover:ring-glow transition">
      <div>
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
              {tier === "premium" && <Lock className="h-3 w-3" />}
              {tierLabel}
            </span>
            <h3 className="mt-1 font-semibold truncate text-sm" title={lab.name}>{lab.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 h-10 leading-5">
              {lab.description}
            </p>
          </div>
          <ProgressRing value={pct} color="#f7931e" />
        </div>
      </div>
      <div className="mt-auto pt-3">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-muted-foreground">
            {lab.sprints ?? 10} sprints · {lab.total} tickets
          </span>
          <span className="text-muted-foreground">
            {lab.completed}/{lab.total}
          </span>
        </div>
        <Link
          to="/student/lab/$slug"
          params={{ slug: lab.id }}
          className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition"
        >
          {lab.completed > 0 ? "Continue" : "Start"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
