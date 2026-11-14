import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { researchService, type ResearchPaperItem, type PaperSummaryData } from "@/services/researchService";
import { Loader2, Sparkles, Code2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { creditEvents } from "@/context/creditEvents";

const SECTIONS = [
  ["What it is about", "about"],
  ["The problem", "problem"],
  ["What they did", "approach"],
  ["Key results", "results"],
  ["Why it matters for developers", "why"],
  ["Limitations", "limits"],
] as const;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

const formatAuthors = (authors: string[]) => {
  if (!authors || authors.length === 0) return "Anonymous / Research Team";
  return authors.length <= 3
    ? authors.join(", ")
    : `${authors.slice(0, 3).join(", ")} and ${authors.length - 3} others`;
};

interface Props {
  paper: ResearchPaperItem;
  followed: boolean;
  onToggleFollow: (topic: string) => void;
}

export default function PaperCard({ paper, followed, onToggleFollow }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PaperSummaryData | null>(paper.summary || null);
  const [isCached, setIsCached] = useState<boolean>(Boolean(paper.has_summary || paper.summary));
  const [isUnlocked, setIsUnlocked] = useState<boolean>(Boolean(paper.is_unlocked || paper.summary));
  const [visible, setVisible] = useState(0);
  const [level, setLevel] = useState<"simple" | "standard" | "deep">("standard");

  useEffect(() => {
    if (paper.is_unlocked || paper.summary) {
      setIsUnlocked(true);
    }
    if (paper.summary) {
      setSummary(paper.summary);
      setIsCached(true);
    }
  }, [paper.is_unlocked, paper.summary]);

  const handleToggleSummary = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    if (!summary) {
      setLoading(true);
      try {
        const resp = await researchService.summarizePaper(paper.id);
        setSummary(resp.summary);
        setIsCached(resp.cached);
        setIsUnlocked(true);
        setOpen(true);
        if (resp.credits_deducted && resp.credits_deducted > 0) {
          creditEvents.emitRefresh();
          toast.success("AI summary unlocked (1 credit deducted)");
        } else {
          toast.success("AI summary unlocked");
        }
      } catch (err: any) {
        if (
          err?.status === 402 ||
          err?.response?.status === 402 ||
          err?.message?.toLowerCase().includes("credit")
        ) {
          creditEvents.emitInsufficient({
            available: err?.data?.available ?? err?.available,
            required: 1,
            message: err?.message || "1 AI credit is required to summarize this research paper.",
          });
        } else if (err?.status === 401 || err?.response?.status === 401) {
          toast.error("Please sign in to summarize research papers with AI");
        } else {
          toast.error(err?.message || "Failed to generate summary");
        }
      } finally {
        setLoading(false);
      }
    } else {
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!open || !summary) return;
    if (visible >= SECTIONS.length) return;
    const intervalTime = isCached ? 150 : 300;
    const id = setInterval(() => {
      setVisible((v) => {
        if (v >= SECTIONS.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, intervalTime);
    return () => clearInterval(id);
  }, [open, summary, isCached]);

  const meta = "text-[13px] text-muted-foreground";
  const link = "h-auto rounded-none p-0 font-normal text-muted-foreground hover:text-foreground hover:underline underline-offset-4";

  return (
    <article className="border-b border-border px-6 py-6 last:border-b-0 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={meta}>
          <span className="font-medium text-foreground">{paper.topic}</span> · {paper.source} · {formatDate(paper.date || paper.published_date)}
        </div>
        {paper.github_url && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Code2 className="h-3 w-3" />
            <span>Code</span>
          </span>
        )}
      </div>

      <h2 className="mt-1.5 text-lg font-medium leading-snug text-foreground">{paper.title}</h2>
      <div className="mt-1 text-sm text-muted-foreground">{formatAuthors(paper.authors)}</div>
      <p className="mt-2.5 text-[15px] leading-relaxed text-foreground/80">{paper.description || paper.abstract}</p>

      {open && summary && (
        <section
          aria-label="AI summary"
          className="mt-5 rounded-lg bg-primary/5 px-5 pb-5 pt-1 sm:px-6 border border-primary/10"
        >
          <div className="flex items-center justify-between pt-3 pb-1 border-b border-border/50 text-xs">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Research Summary</span>
            </div>
          </div>

          {SECTIONS.slice(0, visible).map(([label, key]) => {
            const rawText = summary[key as keyof PaperSummaryData] as string || "";
            const simpleText = rawText
              .replace(/retrieval/gi, "finding relevant information")
              .replace(/latency/gi, "waiting time")
              .replace(/distilled/gi, "trained from a larger model")
              .replace(/regulariser/gi, "training constraint");

            return (
              <div key={key}>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  {label}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">
                  {level === "simple" ? simpleText : rawText}
                </p>
              </div>
            );
          })}

          {visible < SECTIONS.length && (
            <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{isCached ? "Loading summary..." : "Generating AI summary…"}</span>
            </p>
          )}

          {level === "deep" && visible >= SECTIONS.length && (
            <div className="mt-4 border-t border-border pt-4 text-sm leading-relaxed">
              <h3 className="font-medium text-foreground">Developer context</h3>
              <p className="mt-2 text-foreground/85">
                {summary.developer_context || "Before adopting this approach, validate the reported results against your own workload and review the limitations in the original paper."}
              </p>
            </div>
          )}

          {visible >= SECTIONS.length && (
            <>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm border-t border-border/50 pt-3">
                <Button
                  variant="link"
                  className={link}
                  aria-pressed={level === "simple"}
                  onClick={() => setLevel("simple")}
                >
                  Explain simpler
                </Button>
                <Button
                  variant="link"
                  className={link}
                  aria-pressed={level === "deep"}
                  onClick={() => setLevel("deep")}
                >
                  Go deeper
                </Button>
                <Link
                  to="/mock-interview/$slug"
                  params={{ slug: "genai-llm" }}
                  search={{ report: false }}
                  className={link}
                >
                  Practice LLM interview
                </Link>
                <Button variant="link" className={link} onClick={() => setOpen(false)}>
                  Collapse
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
        <Button
          variant="link"
          onClick={handleToggleSummary}
          disabled={loading}
          aria-expanded={open}
          className="h-auto rounded-none p-0 font-medium text-primary hover:underline underline-offset-4 flex items-center gap-1.5"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {open ? "Hide summary" : "Summarise with AI"}
          {!open && !isUnlocked && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">1 credit</span>
          )}
          {!open && isUnlocked && (
            <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              Unlocked
            </span>
          )}
        </Button>
        {paper.github_url && (
          <a
            href={paper.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>GitHub Code</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        )}
        <a
          href={paper.url || paper.paper_url}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          Read Original Paper
        </a>
        <Button
          variant="link"
          onClick={() => onToggleFollow(paper.topic)}
          className={link}
        >
          {followed ? `Following ${paper.topic}` : `Follow ${paper.topic}`}
        </Button>
      </div>
    </article>
  );
}

