import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { Paper } from "@/data/papers";

const SECTIONS = [
  ["What it is about", "about"],
  ["The problem", "problem"],
  ["What they did", "approach"],
  ["Key results", "results"],
  ["Why it matters for developers", "why"],
  ["Limitations", "limits"],
] as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const formatAuthors = (authors: string[]) =>
  authors.length <= 3
    ? authors.join(", ")
    : `${authors.slice(0, 3).join(", ")} and ${authors.length - 3} others`;

interface Props {
  paper: Paper;
  followed: boolean;
  onToggleFollow: (topic: Paper["topic"]) => void;
}

export default function PaperCard({ paper, followed, onToggleFollow }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(0);
  const [level, setLevel] = useState<"simple" | "standard" | "deep">("standard");

  // Simulates streaming. TODO: replace with the real "Summarise with AI" call
  // and deduct 1 AI credit from the user's balance here.
  useEffect(() => {
    if (!open) return;
    setVisible(0);
    const id = setInterval(() => {
      setVisible((v) => {
        if (v >= SECTIONS.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, 350);
    return () => clearInterval(id);
  }, [open, level]);

  const meta = "text-[13px] text-muted-foreground";
  const link = "h-auto rounded-none p-0 font-normal text-muted-foreground hover:text-foreground hover:underline underline-offset-4";

  return (
    <article className="border-b border-border px-6 py-6 last:border-b-0 sm:px-8">
      <div className={meta}>
        {paper.topic} · {paper.source} · {formatDate(paper.date)}
      </div>
      <h2 className="mt-1.5 text-lg font-medium leading-snug text-foreground">{paper.title}</h2>
      <div className="mt-1 text-sm text-muted-foreground">{formatAuthors(paper.authors)}</div>
      <p className="mt-2.5 text-[15px] leading-relaxed text-foreground/80">{paper.description}</p>

      {open && (
        <section
          aria-label="AI summary"
          className="mt-5 rounded-lg bg-primary/5 px-5 pb-5 pt-1 sm:px-6"
        >
          {SECTIONS.slice(0, visible).map(([label, key]) => (
            <div key={key}>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {label}
              </h3>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/85">
                {level === "simple"
                  ? paper.summary[key].replace(/retrieval/gi, "finding relevant information").replace(/latency/gi, "waiting time").replace(/distilled/gi, "trained from a larger model").replace(/regulariser/gi, "training constraint")
                  : paper.summary[key]}
              </p>
            </div>
          ))}
          {visible < SECTIONS.length && (
            <p className="mt-4 text-sm text-muted-foreground">Writing summary…</p>
          )}
          {level === "deep" && visible >= SECTIONS.length && (
            <div className="mt-4 border-t border-border pt-4 text-sm leading-relaxed">
              <h3 className="font-medium">Developer context</h3>
              <p className="mt-2">{paper.description}</p>
              <p className="mt-2 text-muted-foreground">Before adopting this approach, validate the reported results against your own workload and review the limitations in the original paper.</p>
            </div>
          )}
          {visible >= SECTIONS.length && (
            <>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Button variant="link"
                  className={link}
                  aria-pressed={level === "simple"}
                  onClick={() => setLevel("simple")}
                >
                  Explain simpler
                </Button>
                <Button variant="link"
                  className={link}
                  aria-pressed={level === "deep"}
                  onClick={() => setLevel("deep")}
                >
                  Go deeper
                </Button>
                <Link to="/mock-interview/$slug" params={{ slug: "genai-llm" }} search={{ report: false }} className={link}>
                  Practice LLM interview
                </Link>
                <Button variant="link" className={link} onClick={() => setOpen(false)}>
                  Collapse
                </Button>
              </div>
              <p className="mt-4 text-[13px] text-muted-foreground">
                Sample summary, not live AI. Verify against the original paper. No credits used.
              </p>
            </>
          )}
        </section>
      )}

      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
        <Button variant="link"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="h-auto rounded-none p-0 font-medium text-primary hover:underline underline-offset-4"
        >
          {open ? "Hide summary" : "Summarise with AI"}
          {!open && <span className="ml-1.5 text-xs font-normal text-muted-foreground">1 credit when connected</span>}
        </Button>
        <a href={paper.url} target="_blank" rel="noopener noreferrer" className={link}>
          Read Original Paper
        </a>
        <Button variant="link" onClick={() => onToggleFollow(paper.topic)} className={link}>
          {followed ? `Following ${paper.topic}` : `Follow ${paper.topic}`}
        </Button>
      </div>
    </article>
  );
}
