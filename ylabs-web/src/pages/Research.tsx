import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Route } from "@/routes/research";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import PaperCard from "@/components/research/PaperCard";
import { TOPICS, getPapers, type Paper, type Source, type Topic } from "@/data/papers";

type View = "latest" | "following" | "topics";
type Period = "today" | "week" | "month";
type Sort = "newest" | "cited";

const STORAGE_KEY = "yuvro-research-followed";

function useFollowedTopics() {
  const [followed, setFollowed] = useState<Topic[]>(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(stored) ? TOPICS.map(t => t.name).filter(t => stored.includes(t)) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(followed));
    } catch {
      /* ignore */
    }
  }, [followed]);
  const toggle = (t: Topic) =>
    setFollowed((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]));
  return { followed, toggle };
}

const dayDiff = (iso: string) => {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(iso);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
};

const groupLabel = (iso: string) => {
  const d = dayDiff(iso);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return "This week";
  return "Earlier";
};

// Active filter style: bold + orange underline (same as the header's active tab).
const filterBtn = (active: boolean) =>
  `h-auto rounded-none p-0 font-normal mr-5 ${
    active
      ? "font-medium text-foreground underline decoration-2 decoration-brand-orange underline-offset-8"
      : "text-muted-foreground hover:text-foreground"
  }`;

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline py-1.5 text-sm">
      <span className="w-16 shrink-0 text-muted-foreground/80">{label}</span>
      <div className="flex flex-wrap">{children}</div>
    </div>
  );
}

export default function Research() {
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setView = (v: View) => { setLimit(6); void navigate({ search: { view: v } }); };

  const { followed, toggle } = useFollowedTopics();

  const [topic, setTopic] = useState<Topic | "All">("All");
  const [source, setSource] = useState<Source | "All">("All");
  const [period, setPeriod] = useState<Period>("month");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(6);

  const all = getPapers();
  useEffect(() => setLimit(6), [view, topic, source, period, sort, query]);

  const papers = useMemo(() => {
    const maxDays = period === "today" ? 0 : period === "week" ? 6 : 30;
    let list = all.filter((p) => dayDiff(p.date) <= maxDays);
    if (view === "following") list = list.filter((p) => followed.includes(p.topic));
    if (topic !== "All") list = list.filter((p) => p.topic === topic);
    if (source !== "All") list = list.filter((p) => p.source === source);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.authors.join(" ").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) =>
      sort === "cited" ? b.citations - a.citations : +new Date(b.date) - +new Date(a.date)
    );
  }, [all, view, followed, topic, source, period, sort, query]);

  const groups = useMemo(() => {
    if (sort === "cited") return [["Most cited", papers.slice(0, limit)]] as const;
    const order = ["Today", "Yesterday", "This week", "Earlier"];
    const map = new Map<string, Paper[]>();
    papers.slice(0, limit).forEach((p) => {
      const g = groupLabel(p.date);
      map.set(g, [...(map.get(g) || []), p]);
    });
    return order.filter((o) => map.has(o)).map((o) => [o, map.get(o) ?? []] as const);
  }, [papers, limit, sort]);

  const newThisWeek = (t: Topic) =>
    all.filter((p) => p.topic === t && dayDiff(p.date) < 7).length;

  const subTab = (v: View, label: string) => (
    <Button variant="link"
      key={v}
      onClick={() => setView(v)}
      aria-current={view === v ? "page" : undefined}
      className={`h-auto rounded-none px-0 hover:no-underline -mb-px pb-3 pt-2 text-[15px] ${
        view === v
          ? "border-b-2 border-brand-orange font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6">
        <h1 className="mt-9 text-2xl font-semibold tracking-normal text-foreground">AI Research</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          Explore RAG, agents, LLMs and AI coding. Sample papers from arXiv, OpenAlex and Semantic Scholar.
        </p>

        <nav aria-label="Research sections" className="mb-5 mt-7 flex gap-8 border-b border-border">
          {subTab("latest", "Latest")}
          {subTab("following", "Following")}
          {subTab("topics", "Topics")}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_230px]">
          {/* MAIN COLUMN */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {view === "topics" ? (
              <>
                <p className="border-b border-border px-5 sm:px-8 py-6 text-[15px] text-foreground/80">
                  Choose the topics you want to follow. New papers in these topics appear in your
                  Following feed.
                </p>
                {TOPICS.map((t) => {
                  const isF = followed.includes(t.name);
                  return (
                    <div
                      key={t.name}
                      className="flex items-center justify-between gap-6 border-b border-border px-5 sm:px-8 py-5 last:border-b-0"
                    >
                      <div>
                        <Button variant="link"
                          onClick={() => {
                            setTopic(t.name);
                            setView("latest");
                          }}
                          className="h-auto rounded-none p-0 text-base font-medium text-foreground hover:underline underline-offset-4"
                        >
                          {t.name}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          {t.description} · {t.count} papers this month
                        </p>
                      </div>
                      <Button variant="link"
                        onClick={() => toggle(t.name)}
                        className={`h-auto rounded-none p-0 font-normal text-sm ${
                          isF
                            ? "text-muted-foreground hover:text-foreground"
                            : "font-semibold text-primary hover:underline underline-offset-4"
                        }`}
                      >
                        {isF ? "Following" : "Follow"}
                      </Button>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="border-b border-border px-5 sm:px-8 py-5">
                  <FilterRow label="Topic">
                    {(["All", ...TOPICS.map((t) => t.name)] as (Topic | "All")[]).map((t) => (
                      <Button variant="link" key={t} onClick={() => setTopic(t)} aria-pressed={topic === t} className={filterBtn(topic === t)}>
                        {t}
                      </Button>
                    ))}
                  </FilterRow>
                  <FilterRow label="Sort">
                    <Button variant="link" onClick={() => setSort("newest")} aria-pressed={sort === "newest"} className={filterBtn(sort === "newest")}>
                      Newest
                    </Button>
                    <Button variant="link" onClick={() => setSort("cited")} aria-pressed={sort === "cited"} className={filterBtn(sort === "cited")}>
                      Most cited
                    </Button>
                  </FilterRow>
                  <FilterRow label="Period">
                    {(
                      [
                        ["today", "Today"],
                        ["week", "This week"],
                        ["month", "This month"],
                      ] as [Period, string][]
                    ).map(([k, l]) => (
                      <Button variant="link" key={k} onClick={() => setPeriod(k)} aria-pressed={period === k} className={filterBtn(period === k)}>
                        {l}
                      </Button>
                    ))}
                  </FilterRow>
                  <FilterRow label="Source">
                    {(["All", "arXiv", "OpenAlex", "Semantic Scholar"] as (Source | "All")[]).map((s) => (
                      <Button variant="link" key={s} onClick={() => setSource(s)} aria-pressed={source === s} className={filterBtn(source === s)}>
                        {s}
                      </Button>
                    ))}
                  </FilterRow>
                  <div className="mt-3 flex items-baseline text-sm">
                    <label htmlFor="research-search" className="w-16 shrink-0 text-muted-foreground/80">
                      Search
                    </label>
                    <input
                      id="research-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Title, author or keyword"
                      className="w-full max-w-xs border-0 border-b border-border bg-transparent pb-1 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-foreground"
                    />
                  </div>
                </div>

                {view === "following" && followed.length === 0 ? (
                  <p className="px-5 sm:px-8 py-10 text-[15px] text-muted-foreground">
                    You are not following any topics yet.{" "}
                    <Button variant="link"
                      onClick={() => setView("topics")}
                      className="h-auto rounded-none p-0 font-medium text-primary hover:underline underline-offset-4"
                    >
                      Choose topics to follow
                    </Button>
                    .
                  </p>
                ) : groups.length === 0 ? (
                  <p className="px-5 sm:px-8 py-10 text-[15px] text-muted-foreground">
                    No papers match these filters. Try a longer period or clear the topic.
                  </p>
                ) : (
                  groups.map(([label, list]) => (
                    <section key={label}>
                      <h2 className="px-5 sm:px-8 pt-7 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                        {label}
                      </h2>
                      {list.map((p) => (
                        <PaperCard
                          key={p.id}
                          paper={p}
                          followed={followed.includes(p.topic)}
                          onToggleFollow={toggle}
                        />
                      ))}
                    </section>
                  ))
                )}

                {papers.length > limit && (
                  <div className="px-5 sm:px-8 py-5">
                    <Button variant="link"
                      onClick={() => setLimit((l) => l + 6)}
                      className="h-auto rounded-none p-0 text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <aside className="text-foreground">
            <h2 className="mb-2.5 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Your topics
            </h2>
            {followed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No topics followed yet.</p>
            ) : (
              followed.map((t) => (
                <Button variant="link"
                  key={t}
                  onClick={() => {
                    setTopic(t);
                    setView("latest");
                  }}
                  className="h-auto rounded-none px-0 font-normal flex w-full items-baseline justify-between border-b border-border py-2 text-left text-[15px] hover:underline underline-offset-4"
                >
                  {t}
                  <span className="text-[13px] text-muted-foreground">{newThisWeek(t)} new</span>
                </Button>
              ))
            )}
            <Button variant="link"
              onClick={() => setView("topics")}
              className="mt-3 h-auto rounded-none p-0 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Edit topics
            </Button>

            <h2 className="mb-2.5 mt-10 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Practice what you read
            </h2>
            <p className="mb-1.5 text-[13px] text-muted-foreground">Related labs on Yuvro</p>
            <Link to="/mock-interview/$slug" params={{ slug: "genai-llm" }} search={{ report: false }} className="block border-b border-border py-2 text-[15px] hover:underline underline-offset-4">
              LLM mock interview
            </Link>
            <Link to="/student/lab/$slug" params={{ slug: "systemdesign" }} className="block border-b border-border py-2 text-[15px] hover:underline underline-offset-4">
              System Design Lab
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
