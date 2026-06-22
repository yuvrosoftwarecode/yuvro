import { createFileRoute, Link, Outlet, useMatch, useParams } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { DiffBadge, StatusBadge } from "@/components/Badges";
import { labs, tickets, leaderboard } from "@/lib/dummy";
import { Search, Filter, LayoutGrid, List, Calendar, Zap, TrendingUp, TrendingDown, Award, Lock, Sparkles, ArrowLeft, CheckCircle2, Play, Clock, Target, Flag } from "lucide-react";
import { useMemo, useState } from "react";
import type { Ticket } from "@/lib/dummy";

export const Route = createFileRoute("/lab/$slug")({ component: LabDashboard });

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
    { id: "S1", name: "Sprint 1 · Foundations", goal: "Master language fundamentals & control flow", range: "Apr 1 – Apr 7", tags: ["Fundamentals"] },
    { id: "S2", name: "Sprint 2 · OOP Core", goal: "Classes, inheritance and interfaces", range: "Apr 8 – Apr 14", tags: ["OOP"] },
    { id: "S3", name: "Sprint 3 · Generics & Errors", goal: "Type-safe APIs and resilient error handling", range: "Apr 15 – Apr 21", tags: ["Generics", "Errors", "I/O"] },
    { id: "S4", name: "Sprint 4 · Collections", goal: "Lists, maps and idiomatic data access", range: "Apr 22 – Apr 28", tags: ["Collections"] },
    { id: "S5", name: "Sprint 5 · Advanced Java", goal: "Streams, concurrency, testing & patterns", range: "Apr 29 – May 12", tags: ["Streams", "FP", "Threads", "DB", "Testing", "Patterns"] },
  ];
  const pythonGroups = [
    { id: "PS1", name: "Sprint 1 · Python Foundations", goal: "Types, collections, control flow & functions", range: "Apr 1 – Apr 10", tags: ["Py Fundamentals"] },
    { id: "PS2", name: "Sprint 2 · Data & APIs", goal: "Files, JSON, requests and pandas basics", range: "Apr 11 – Apr 24", tags: ["Py Data"] },
    { id: "PS3", name: "Sprint 3 · Django Todo App", goal: "Build a full Django todo app with HTML templates", range: "May 13 – May 26", tags: ["Django Todo"] },
  ];
  const uiGroups = [
    { id: "US1", name: "Sprint 1 · HTML & CSS", goal: "Semantic markup, box model and specificity", range: "Apr 1 – Apr 10", tags: ["HTML/CSS"] },
    { id: "US2", name: "Sprint 2 · Layout", goal: "Flexbox, Grid and responsive breakpoints", range: "Apr 11 – Apr 20", tags: ["Layout"] },
    { id: "US3", name: "Sprint 3 · React Essentials", goal: "Components, state, effects and custom hooks", range: "Apr 21 – May 4", tags: ["React"] },
    { id: "US4", name: "Sprint 4 · Accessibility", goal: "Build inclusive UI: keyboard, focus, contrast", range: "May 5 – May 12", tags: ["Accessibility"] },
  ];
  const sqlGroups = [
    { id: "QS1", name: "Sprint 1 · Querying", goal: "SELECT, filtering, aggregates and CTEs", range: "Apr 1 – Apr 10", tags: ["Querying"] },
    { id: "QS2", name: "Sprint 2 · Joins", goal: "Combine tables with INNER, LEFT and multi-joins", range: "Apr 11 – Apr 18", tags: ["Joins"] },
    { id: "QS3", name: "Sprint 3 · Window Functions", goal: "Ranking, LAG/LEAD and running totals", range: "Apr 19 – Apr 28", tags: ["Windows"] },
    { id: "QS4", name: "Sprint 4 · Performance & Modeling", goal: "EXPLAIN, indexes and normalization", range: "Apr 29 – May 8", tags: ["Tuning"] },
  ];
  const mongoGroups = [
    { id: "MS1", name: "Sprint 1 · CRUD basics", goal: "Insert, find, update and delete documents", range: "Apr 1 – Apr 8", tags: ["Mongo CRUD"] },
    { id: "MS2", name: "Sprint 2 · Query Operators", goal: "Comparison, logical, array and nested queries", range: "Apr 9 – Apr 16", tags: ["Mongo Query"] },
    { id: "MS3", name: "Sprint 3 · Aggregation Pipelines", goal: "$match, $group, $lookup and projections", range: "Apr 17 – Apr 26", tags: ["Aggregation"] },
    { id: "MS4", name: "Sprint 4 · Indexes & Performance", goal: "Design indexes and read explain plans", range: "Apr 27 – May 4", tags: ["Mongo Indexes"] },
  ];
  const progGroups = [
    { id: "PG1", name: "Sprint 1 · Intro", goal: "Hello world, comments and reading input", range: "Apr 1 – Apr 4", tags: ["Prog Intro"] },
    { id: "PG2", name: "Sprint 2 · Variables & Operators", goal: "Types, arithmetic, boolean and comparisons", range: "Apr 5 – Apr 9", tags: ["Prog Variables"] },
    { id: "PG3", name: "Sprint 3 · Control Flow", goal: "if/else, nested and switch/match", range: "Apr 10 – Apr 14", tags: ["Prog Control Flow"] },
    { id: "PG4", name: "Sprint 4 · Loops", goal: "for/while, break/continue, nested patterns", range: "Apr 15 – Apr 19", tags: ["Prog Loops"] },
    { id: "PG5", name: "Sprint 5 · Functions", goal: "Define, call, defaults, kwargs and recursion", range: "Apr 20 – Apr 25", tags: ["Prog Functions"] },
    { id: "PG6", name: "Sprint 6 · Strings", goal: "Slicing, methods and palindrome check", range: "Apr 26 – Apr 29", tags: ["Prog Strings"] },
    { id: "PG7", name: "Sprint 7 · File I/O", goal: "Read/write files and word count", range: "Apr 30 – May 3", tags: ["Prog File I/O"] },
    { id: "PG8", name: "Sprint 8 · Error Handling", goal: "try/except and custom exceptions", range: "May 4 – May 7", tags: ["Prog Errors"] },
    { id: "PG9", name: "Sprint 9 · OOP Basics", goal: "Classes, inheritance and dunder methods", range: "May 8 – May 13", tags: ["Prog OOP"] },
  ];
  const dsGroups = [
    { id: "DS1", name: "Sprint 1 · Arrays", goal: "Traversal, two-pointer and sliding window", range: "Apr 1 – Apr 5", tags: ["DS Arrays"] },
    { id: "DS2", name: "Sprint 2 · Linked Lists", goal: "Singly linked lists, reverse and cycle detection", range: "Apr 6 – Apr 11", tags: ["DS Linked Lists"] },
    { id: "DS3", name: "Sprint 3 · Stacks", goal: "Stack ops, parentheses and min stack", range: "Apr 12 – Apr 16", tags: ["DS Stacks"] },
    { id: "DS4", name: "Sprint 4 · Queues", goal: "Two-stack queue, circular queue and deque", range: "Apr 17 – Apr 22", tags: ["DS Queues"] },
    { id: "DS5", name: "Sprint 5 · Hashing", goal: "Hash maps, two-sum and group anagrams", range: "Apr 23 – Apr 27", tags: ["DS Hashing"] },
    { id: "DS6", name: "Sprint 6 · Trees", goal: "Traversals, BST and LCA", range: "Apr 28 – May 3", tags: ["DS Trees"] },
    { id: "DS7", name: "Sprint 7 · Heaps", goal: "Heapify and top-K problems", range: "May 4 – May 7", tags: ["DS Heaps"] },
    { id: "DS8", name: "Sprint 8 · Graphs", goal: "BFS, DFS and Dijkstra", range: "May 8 – May 14", tags: ["DS Graphs"] },
    { id: "DS9", name: "Sprint 9 · Sorting", goal: "Bubble, merge and quick sort", range: "May 15 – May 19", tags: ["DS Sorting"] },
    { id: "DS10", name: "Sprint 10 · Searching", goal: "Binary search and rotated array search", range: "May 20 – May 23", tags: ["DS Searching"] },
  ];
  const groups =
    slug === "python" ? pythonGroups :
    slug === "ui" ? uiGroups :
    slug === "sql" ? sqlGroups :
    slug === "mongo" ? mongoGroups :
    slug === "programming" ? progGroups :
    slug === "datastructures" ? dsGroups :
    javaGroups;
  return groups.map((g) => {
    const ts = allTickets.filter((t) => g.tags.includes(t.tag));
    const completed = ts.filter((t) => t.status === "Completed").length;
    const inProgress = ts.some((t) => t.status === "In Progress");
    const status: SprintStatus = completed === ts.length && ts.length ? "Completed" : inProgress || completed > 0 ? "Active" : "Upcoming";
    return { id: g.id, name: g.name, goal: g.goal, range: g.range, ticketIds: ts.map((t) => t.id), status };
  });
}

function LabDashboard() {
  const { slug } = useParams({ from: "/lab/$slug" });
  const ticketMatch = useMatch({ from: "/lab/$slug/ticket/$ticketId", shouldThrow: false });
  const lab = labs.find((l) => l.slug === slug) ?? labs[0];
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [activeSprint, setActiveSprint] = useState<string | null>(null);
  const sprints = useMemo(() => buildSprints(slug, tickets), [slug]);
  const sprint = sprints.find((s) => s.id === activeSprint) ?? null;
  const sprintTickets = sprint ? tickets.filter((t) => sprint.ticketIds.includes(t.id)) : tickets;
  const cols: { key: "Not Started" | "In Progress" | "Completed"; }[] = [{ key: "Not Started" }, { key: "In Progress" }, { key: "Completed" }];
  const pct = Math.round((lab.completed / lab.total) * 100);

  if (ticketMatch) return <Outlet />;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1500px] px-4 py-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">Practical Labs</Link>
          <span>/</span><span className="text-foreground">{lab.name}</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">
          {/* LEFT */}
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{lab.icon}</div>
                <div>
                  <div className="font-semibold">{lab.name}</div>
                  <DiffBadge value={lab.difficulty} />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{pct}%</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%`, background: `var(--${lab.color})` }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{lab.completed}/{lab.total} tickets · {lab.hoursLeft}h remaining</div>
              </div>
              <div className="mt-4 border-t pt-3 text-xs">
                <div className="mb-1 text-muted-foreground">Prerequisites</div>
                <ul className="space-y-1">
                  <li>• Basic programming concepts</li>
                  <li>• Familiarity with terminal</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 text-sm font-medium">Skills</div>
              <div className="space-y-3">
                {lab.skills.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs"><span>{s.name}</span><span className="text-muted-foreground">{s.pct}%</span></div>
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Filter className="h-3.5 w-3.5" />Filters</div>
              <div className="space-y-2 text-xs">
                {["Beginner", "Intermediate", "Advanced"].map((d) => (
                  <label key={d} className="flex items-center gap-2"><input type="checkbox" defaultChecked className="accent-[var(--primary)]" /> {d}</label>
                ))}
                <div className="border-t pt-2 mt-2">
                  {["Not Started", "In Progress", "Completed"].map((d) => (
                    <label key={d} className="flex items-center gap-2"><input type="checkbox" defaultChecked className="accent-[var(--primary)]" /> {d}</label>
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
                    <p className="text-xs text-muted-foreground">Pick a sprint to view its ticket board</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{sprints.length} sprints · {tickets.length} tickets</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {sprints.map((s) => {
                    const items = tickets.filter((t) => s.ticketIds.includes(t.id));
                    const done = items.filter((t) => t.status === "Completed").length;
                    const pctS = items.length ? Math.round((done / items.length) * 100) : 0;
                    const xp = items.reduce((a, t) => a + t.xp, 0);
                    const mins = items.reduce((a, t) => a + t.estMin, 0);
                    const tone = s.status === "Completed" ? "success" : s.status === "Active" ? "info" : "muted-foreground";
                    const Icon = s.status === "Completed" ? CheckCircle2 : s.status === "Active" ? Play : Flag;
                    return (
                      <button key={s.id} onClick={() => setActiveSprint(s.id)}
                        className="text-left rounded-xl border bg-card p-4 hover:border-primary/60 hover:shadow-md transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="font-mono">{s.id}</span>
                              <span>·</span>
                              <span>{s.range}</span>
                            </div>
                            <div className="mt-1 font-semibold leading-snug">{s.name}</div>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.goal}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium"
                            style={{ color: `var(--${tone})`, borderColor: `color-mix(in oklab, var(--${tone}) 40%, transparent)`, background: `color-mix(in oklab, var(--${tone}) 12%, transparent)` }}>
                            <Icon className="h-3 w-3" />{s.status}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="flex justify-between text-[11px] text-muted-foreground"><span>{done}/{items.length} tickets</span><span>{pctS}%</span></div>
                          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pctS}%` }} />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" />{items.length} tickets</span>
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{Math.round(mins/60)}h</span>
                          <span className="inline-flex items-center gap-1 text-primary"><Zap className="h-3 w-3" />{xp} XP</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => setActiveSprint(null)} className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1.5 text-xs hover:bg-accent">
                    <ArrowLeft className="h-3 w-3" />Sprints
                  </button>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">{sprint.name}</div>
                    <div className="text-[11px] text-muted-foreground">{sprint.range} · {sprint.goal}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input placeholder="Search tickets..." className="w-56 rounded-md border bg-input/40 pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div className="flex rounded-md border bg-card p-0.5 text-xs">
                      <button onClick={() => setView("kanban")} className={`flex items-center gap-1 rounded px-2 py-1 ${view === "kanban" ? "bg-accent" : ""}`}><LayoutGrid className="h-3 w-3" />Kanban</button>
                      <button onClick={() => setView("list")} className={`flex items-center gap-1 rounded px-2 py-1 ${view === "list" ? "bg-accent" : ""}`}><List className="h-3 w-3" />List</button>
                      <button className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground"><Calendar className="h-3 w-3" />Timeline</button>
                    </div>
                  </div>
                </div>

                {view === "kanban" ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {cols.map((c) => {
                      const items = sprintTickets.filter((t) => t.status === c.key);
                      return (
                        <div key={c.key} className="rounded-xl border bg-card/50 p-3">
                          <div className="mb-3 flex items-center justify-between px-1">
                            <div className="text-sm font-medium">{c.key}</div>
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px]">{items.length}</span>
                          </div>
                          <div className="space-y-2">
                            {items.length === 0 && <div className="px-1 py-4 text-[11px] text-muted-foreground">No tickets</div>}
                            {items.map((t) => (
                              <Link key={t.id} to="/lab/$slug/ticket/$ticketId" params={{ slug: lab.slug, ticketId: t.id }}
                                className="block rounded-lg border bg-card p-3 hover:border-primary/50 transition">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span className="font-mono">{t.id}</span>
                                  <DiffBadge value={t.difficulty} />
                                </div>
                                <div className="mt-1.5 text-sm font-medium leading-snug">{t.title}</div>
                                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>⏱ {t.estMin}m · {t.tag}</span>
                                  <span className="inline-flex items-center gap-1 text-primary"><Zap className="h-3 w-3" />{t.xp}</span>
                                </div>
                                {t.status === "In Progress" && t.progress != null && (
                                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full bg-info" style={{ width: `${t.progress}%` }} />
                                  </div>
                                )}
                                {t.status === "Completed" && (
                                  <div className="mt-2 flex items-center justify-between text-[11px]">
                                    <span className="text-success">✓ Score {t.score}</span>
                                    <Award className="h-3.5 w-3.5 text-warning" />
                                  </div>
                                )}
                              </Link>
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
                        <tr><th className="text-left p-3">ID</th><th className="text-left">Title</th><th>Difficulty</th><th>Status</th><th>XP</th><th>Time</th><th>Score</th><th></th></tr>
                      </thead>
                      <tbody>
                        {sprintTickets.map((t) => (
                          <tr key={t.id} className="border-t hover:bg-accent/30">
                            <td className="p-3 font-mono text-xs">{t.id}</td>
                            <td>{t.title}</td>
                            <td className="text-center"><DiffBadge value={t.difficulty} /></td>
                            <td className="text-center"><StatusBadge value={t.status} /></td>
                            <td className="text-center text-primary">{t.xp}</td>
                            <td className="text-center text-muted-foreground">{t.estMin}m</td>
                            <td className="text-center">{t.score ?? "—"}</td>
                            <td className="text-right p-3">
                              <Link to="/lab/$slug/ticket/$ticketId" params={{ slug: lab.slug, ticketId: t.id }} className="text-primary text-xs">Open →</Link>
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
                <Mini label="Streak" value="7d" />
                <Mini label="This week" value="+450 XP" />
                <Mini label="Avg time" value="38m" />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between"><div className="text-sm font-medium">Lab leaderboard</div><span className="text-xs text-muted-foreground">#15 / 1,250</span></div>
              <ul className="space-y-1.5 text-sm">
                {leaderboard.slice(0,5).map((u) => (
                  <li key={u.rank} className="flex items-center gap-2">
                    <span className="w-5 text-xs text-muted-foreground">#{u.rank}</span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px]">{u.avatar}</span>
                    <span className="flex-1 truncate">{u.name}</span>
                    <span className="text-xs text-primary">{u.xp.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <Link to="/leaderboard" className="mt-3 block text-xs text-primary">View full leaderboard →</Link>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Sparkles className="h-3.5 w-3.5 text-primary" />AI suggestions</div>
              <div className="space-y-3 text-xs">
                <Suggestion color="destructive" icon={<TrendingDown className="h-3 w-3" />} title="Focus: Exception Handling" body="You: 35% · Lab Avg: 60%. Try JAVA-110, JAVA-115. Est. boost +15% in 4h." />
                <Suggestion color="warning" icon={<Lock className="h-3 w-3" />} title="Next: Collections" body="Needs OOP ≥ 70%. Unlock in 2 more tickets." />
                <Suggestion color="success" icon={<TrendingUp className="h-3 w-3" />} title="Master: Java Syntax" body="Ready for advanced challenges." />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-2 text-sm font-medium">Milestones</div>
              <div className="flex gap-2">
                {[5,10,15,20,25].map((n) => {
                  const unlocked = lab.completed >= n;
                  return (
                    <div key={n} className={`flex-1 grid place-items-center rounded-md border p-2 text-[10px] ${unlocked ? "bg-warning/10 border-warning/40 text-warning" : "text-muted-foreground"}`}>
                      <Award className="h-4 w-4" />{n}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-accent/40 p-2"><div className="text-muted-foreground">{label}</div><div className="text-sm font-semibold">{value}</div></div>;
}
function Suggestion({ color, icon, title, body }: { color: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className={`rounded-md border p-2`} style={{ borderColor: `color-mix(in oklab, var(--${color}) 40%, transparent)`, background: `color-mix(in oklab, var(--${color}) 10%, transparent)` }}>
      <div className="flex items-center gap-1.5 font-medium" style={{ color: `var(--${color})` }}>{icon}{title}</div>
      <div className="mt-1 text-muted-foreground">{body}</div>
    </div>
  );
}
