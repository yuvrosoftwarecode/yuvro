import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import PaperCard from "@/components/research/PaperCard";
import {
  researchService,
  type ResearchPaperItem,
  type ResearchTopicItem,
} from "@/services/researchService";
import { useAuth } from "@/lib/auth";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type View = "latest" | "following" | "topics";
type Period = "today" | "week" | "month";
type Sort = "newest" | "cited" | "upvoted";

const STORAGE_KEY = "yuvro-research-followed";

const dayDiff = (iso: string) => {
  if (!iso) return 999;
  try {
    const a = new Date();
    a.setHours(0, 0, 0, 0);
    const b = new Date(iso);
    b.setHours(0, 0, 0, 0);
    return Math.round((a.getTime() - b.getTime()) / 86400000);
  } catch {
    return 999;
  }
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

export default function Research({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const searchParams = useSearch({ strict: false }) as Record<string, any>;
  const view: View =
    searchParams?.view === "following" || searchParams?.view === "topics"
      ? searchParams.view
      : "latest";
  const navigate = useNavigate();
  const setView = (v: View) => {
    setLimit(6);
    void navigate({ search: (prev: any) => ({ ...prev, view: v }) as any });
  };

  const [topics, setTopics] = useState<ResearchTopicItem[]>([]);
  const [followed, setFollowed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [topic, setTopic] = useState<string | "All">("All");
  const [source, setSource] = useState<string | "All">("All");
  const [period, setPeriod] = useState<Period>("month");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [limit, setLimit] = useState(6);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const [papers, setPapers] = useState<ResearchPaperItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load Topics
  const loadTopics = async () => {
    try {
      const data = await researchService.getTopics();
      if (Array.isArray(data) && data.length > 0) {
        setTopics(data);
        if (user) {
          const serverFollowed = data.filter((t) => t.is_followed).map((t) => t.name);
          if (serverFollowed.length > 0) {
            setFollowed(serverFollowed);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load topics:", err);
    }
  };

  // Load Papers when filters change
  const loadPapers = async () => {
    setLoading(true);
    setLimit(6);
    try {
      const res = await researchService.getPapers({
        view,
        topic,
        source,
        period,
        sort,
        search: debouncedQuery,
        limit: 6,
        followed_topics: followed,
      });
      setPapers(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to load research papers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async (e: React.MouseEvent) => {
    e.preventDefault();
    const nextLimit = limit + 6;
    setLimit(nextLimit);
    setLoadingMore(true);
    try {
      const res = await researchService.getPapers({
        view,
        topic,
        source,
        period,
        sort,
        search: debouncedQuery,
        limit: nextLimit,
        followed_topics: followed,
      });
      setPapers(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to load more papers:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, [user]);

  const followedFilterKey = view === "following" ? followed.join(",") : "";

  useEffect(() => {
    loadPapers();
  }, [view, topic, source, period, sort, debouncedQuery, followedFilterKey]);

  const toggleFollow = async (topicName: string) => {
    const isCurrentlyFollowed = followed.includes(topicName);
    const updated = isCurrentlyFollowed
      ? followed.filter((x) => x !== topicName)
      : [...followed, topicName];

    setFollowed(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    if (user) {
      try {
        await researchService.toggleFollowTopic(topicName);
      } catch (err) {
        console.warn("Failed to sync topic follow to server:", err);
      }
    }
  };

  const handleSyncLivePapers = async () => {
    setSyncing(true);
    try {
      const res = await researchService.syncPapers();
      const count = res.new_papers_ingested ?? 0;
      toast.success(
        count > 0
          ? `Synced ${count} new research papers to database`
          : "Research papers are up to date"
      );
      await loadPapers();
      await loadTopics();
    } catch (err: any) {
      toast.error(err?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const groups = useMemo(() => {
    if (sort === "cited") return [["Most cited", papers]] as const;
    if (sort === "upvoted") return [["Trending & Most Upvoted", papers]] as const;
    const order = ["Today", "Yesterday", "This week", "Earlier"];
    const map = new Map<string, ResearchPaperItem[]>();
    papers.forEach((p) => {
      const g = groupLabel(p.date || p.published_date);
      map.set(g, [...(map.get(g) || []), p]);
    });
    return order.filter((o) => map.has(o)).map((o) => [o, map.get(o) ?? []] as const);
  }, [papers, sort]);

  const newThisWeek = (topicName: string) => {
    const t = topics.find((item) => item.name.toLowerCase() === topicName.toLowerCase());
    return t?.new_this_week ?? 0;
  };

  const subTab = (v: View, label: string) => (
    <Button
      variant="link"
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
    <div className={embedded ? "w-full" : "min-h-screen bg-background"}>
      {!embedded && <TopNav />}
      <main className={embedded ? "w-full" : "mx-auto max-w-[1200px] px-4 pb-16 sm:px-6"}>
        {!embedded && (
          <div className="mt-9">
            <h1 className="text-2xl font-semibold tracking-normal text-foreground">AI Research</h1>
            <p className="mt-1.5 text-base text-muted-foreground">
              Explore RAG, agents, LLMs, and AI coding. Trending papers from Hugging Face, arXiv, and open-source GitHub code.
            </p>
          </div>
        )}

        {embedded && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Explore RAG, agents, LLMs, and AI coding. Trending papers from Hugging Face, arXiv, and open-source GitHub code.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncLivePapers}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing Trending Papers..." : "Sync Trending Papers"}
            </Button>
          </div>
        )}

        <nav aria-label="Research sections" className={`mb-5 ${embedded ? "mt-2" : "mt-7"} flex gap-8 border-b border-border`}>
          {subTab("latest", "Latest")}
          {subTab("following", "Following")}
          {subTab("topics", "Topics")}
        </nav>

        <div className={embedded ? "w-full" : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_230px]"}>
          {/* MAIN COLUMN */}
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {view === "topics" ? (
              <>
                <p className="border-b border-border px-5 sm:px-8 py-6 text-[15px] text-foreground/80">
                  Choose the topics you want to follow. New papers in these topics appear in your
                  Following feed.
                </p>
                {topics.map((t) => {
                  const isF = followed.includes(t.name);
                  return (
                    <div
                      key={t.name}
                      className="flex items-center justify-between gap-6 border-b border-border px-5 sm:px-8 py-5 last:border-b-0"
                    >
                      <div>
                        <Button
                          variant="link"
                          onClick={() => {
                            setTopic(t.name);
                            setView("latest");
                          }}
                          className="h-auto rounded-none p-0 text-base font-medium text-foreground hover:underline underline-offset-4"
                        >
                          {t.display_name || t.name}
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          {t.description} · {t.papers_count} papers
                        </p>
                      </div>
                      <Button
                        variant="link"
                        onClick={() => toggleFollow(t.name)}
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
                    {(["All", ...topics.map((t) => t.name)]).map((t) => (
                      <Button
                        variant="link"
                        key={t}
                        onClick={() => setTopic(t)}
                        aria-pressed={topic === t}
                        className={filterBtn(topic === t)}
                      >
                        {t}
                      </Button>
                    ))}
                  </FilterRow>
                  <FilterRow label="Sort">
                    <Button
                      variant="link"
                      onClick={() => setSort("newest")}
                      aria-pressed={sort === "newest"}
                      className={filterBtn(sort === "newest")}
                    >
                      Newest
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
                      <Button
                        variant="link"
                        key={k}
                        onClick={() => setPeriod(k)}
                        aria-pressed={period === k}
                        className={filterBtn(period === k)}
                      >
                        {l}
                      </Button>
                    ))}
                  </FilterRow>
                  <FilterRow label="Source">
                    {["All", "Hugging Face", "arXiv", "OpenAlex"].map((s) => (
                      <Button
                        variant="link"
                        key={s}
                        onClick={() => setSource(s)}
                        aria-pressed={source === s}
                        className={filterBtn(source === s)}
                      >
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

                {loading ? (
                  <div className="px-5 sm:px-8 py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading papers from database...</span>
                  </div>
                ) : view === "following" && followed.length === 0 ? (
                  <p className="px-5 sm:px-8 py-10 text-[15px] text-muted-foreground">
                    You are not following any topics yet.{" "}
                    <Button
                      variant="link"
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
                        {label} ({list.length})
                      </h2>
                      {list.map((p) => (
                        <PaperCard
                          key={p.id}
                          paper={p}
                          followed={followed.includes(p.topic)}
                          onToggleFollow={toggleFollow}
                        />
                      ))}
                    </section>
                  ))
                )}

                {totalCount > limit && (
                  <div className="px-5 sm:px-8 py-5 border-t border-border">
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="h-auto rounded-none p-0 text-sm font-medium text-primary hover:underline underline-offset-4 flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Loading more papers...</span>
                        </>
                      ) : (
                        <span>Load more ({papers.length} of {totalCount} shown)</span>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT COLUMN (Student view only) */}
          {!embedded && (
            <aside className="text-foreground">
              <h2 className="mb-2.5 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Your topics
              </h2>
              {followed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topics followed yet.</p>
              ) : (
                followed.map((t) => (
                  <Button
                    variant="link"
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
              <Button
                variant="link"
                onClick={() => setView("topics")}
                className="mt-3 h-auto rounded-none p-0 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                Edit topics
              </Button>

              <h2 className="mb-2.5 mt-10 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Practice what you read
              </h2>
              <p className="mb-1.5 text-[13px] text-muted-foreground">Related labs on Yuvro</p>
              <Link
                to="/mock-interview/$slug"
                params={{ slug: "genai-llm" }}
                search={{ report: false }}
                className="block border-b border-border py-2 text-[15px] hover:underline underline-offset-4"
              >
                LLM mock interview
              </Link>
              <Link
                to="/student/lab/$slug"
                params={{ slug: "systemdesign" }}
                className="block border-b border-border py-2 text-[15px] hover:underline underline-offset-4"
              >
                System Design Lab
              </Link>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

