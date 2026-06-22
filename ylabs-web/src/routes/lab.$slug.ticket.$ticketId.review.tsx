import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { tickets, labs } from "@/lib/dummy";
import {
  CheckCircle2, XCircle, Zap, Award, Clock, TrendingUp, Sparkles, ArrowRight,
  Code2, MessageSquare, Share2, BookOpen, Trophy, Flame, ChevronDown, ChevronRight,
  Gauge, Target, Users, Rocket, Flag,
} from "lucide-react";

export const Route = createFileRoute("/lab/$slug/ticket/$ticketId/review")({ component: Review });

function Review() {
  const { slug, ticketId } = useParams({ from: "/lab/$slug/ticket/$ticketId/review" });
  const lab = labs.find((l) => l.slug === slug) ?? labs[0];
  const ticket = tickets.find((t) => t.id === ticketId) ?? tickets[0];
  const next = tickets.find((t) => t.status === "Not Started");

  const score = 92;
  const grade = "A";
  const baseXp = ticket.xp;
  const bonusXp = 25;
  const totalXp = baseXp + bonusXp;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Confetti />
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-4 py-8 space-y-6 relative">
        {/* Header */}
        <div className="rounded-2xl border bg-gradient-to-br from-success/10 via-card to-background p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-success/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-6">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-success/20 border border-success/40">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{ticket.id} · {lab.name} · ✅ Completed</div>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-0.5">{ticket.title}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />Solved in 24m</span>
                <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4 text-primary" />+{totalXp} XP</span>
                <span className="inline-flex items-center gap-1"><Award className="h-4 w-4 text-warning" />Speed badge unlocked</span>
                <span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-warning" />Streak +1</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-6">
              <div className="text-center">
                <div className="text-6xl sm:text-7xl font-semibold leading-none bg-gradient-to-br from-success to-primary bg-clip-text text-transparent">{grade}</div>
                <div className="text-xs text-muted-foreground mt-1">Performance grade</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-semibold text-success">{score}</div>
                <div className="text-xs text-muted-foreground">/ 100 score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance summary */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold">🎉 Excellent work!</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={CheckCircle2} label="Tests passed" value="4/4" sub="100%" tone="success" pct={100} />
            <Stat icon={Gauge} label="Code quality" value="8/10" sub="A− grade" tone="info" pct={80} />
            <Stat icon={Clock} label="Time efficiency" value="95%" sub="24m of 45m" tone="success" pct={95} />
            <Stat icon={Zap} label="XP earned" value={`+${totalXp}`} sub={`${baseXp} base · +${bonusXp} speed bonus`} tone="primary" pct={100} />
          </div>
          <AnimatedBar label={`Total XP awarded: ${totalXp}`} pct={100} />
        </div>

        {/* Detailed test results */}
        <Card title="Detailed Test Results (4/4 Passed)" icon={CheckCircle2}>
          <div className="space-y-2">
            {DETAILED_TESTS.map((t) => (
              <details key={t.name} className="rounded-md border bg-editor-bg/60 group">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium">{t.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{t.time}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 pb-3 text-xs font-mono space-y-1 border-t">
                  <div className="pt-2"><span className="text-muted-foreground">Input:</span> {t.input}</div>
                  <div><span className="text-muted-foreground">Expected:</span> <span className="text-success">{t.expected}</span></div>
                  <div><span className="text-muted-foreground">Your output:</span> <span className="text-success">✓ Correct</span></div>
                </div>
              </details>
            ))}
          </div>
        </Card>

        {/* AI code review */}
        <Card title="Reviewer's Comments" icon={Sparkles}>
          <div className="grid gap-4 md:grid-cols-3">
            <Block title="What you did well" tone="success">
              <ul className="space-y-1">
                <li>✓ Clean code structure</li>
                <li>✓ Proper variable naming</li>
                <li>✓ Correct type casting</li>
                <li>✓ All edge cases handled</li>
              </ul>
            </Block>
            <Block title="Areas to improve" tone="warning">
              <ul className="space-y-1">
                <li>→ Add JavaDoc comments</li>
                <li>→ Extract repeated code into helper method</li>
                <li>→ Format output with printf</li>
              </ul>
            </Block>
            <Block title="Best practices" tone="info">
              <ul className="space-y-1">
                <li>💡 Use StringBuilder for concatenation</li>
                <li>💡 Cast as <code>(int) doubleValue</code></li>
                <li>💡 Prefer <code>final</code> for constants</li>
              </ul>
            </Block>
          </div>
        </Card>

        {/* Your code vs reference */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Your solution" icon={Code2}>
            <pre className="rounded-md bg-editor-bg border p-3 text-xs font-mono overflow-auto max-h-72 scrollbar-thin text-muted-foreground"><code>{`public class Main {
  public static void main(String[] args) {
    int integerValue = 42;
    double pi = 3.14;
    String greeting = "Hello Java";
    System.out.println("Integer: " + integerValue);
    System.out.println("Double: " + pi);
    System.out.println("String: " + greeting);
    System.out.println("Length: " + greeting.length());
  }
}`}</code></pre>
          </Card>
          <Card title="Reference solution" icon={Sparkles}>
            <pre className="rounded-md bg-editor-bg border p-3 text-xs font-mono overflow-auto max-h-72 scrollbar-thin text-muted-foreground"><code>{`public class Main {
  public static void main(String[] args) {
    int a = 42; double b = 3.14; boolean c = true;
    String s = "Hello Java";
    System.out.printf("Integer: %d%nDouble: %.2f%n", a, b);
    System.out.println("Boolean: " + c);
    System.out.printf("Length: %d%nChar[0]: %s%n",
      s.length(), s.charAt(0));
    int narrowed = (int) b;
    double widened = a;
    System.out.println(narrowed + " " + widened);
  }
}`}</code></pre>
          </Card>
        </div>

        {/* Alternative approaches */}
        <Card title="Alternative approaches" icon={BookOpen} collapsible>
          <div className="space-y-3">
            {ALTS.map((a) => (
              <div key={a.title} className="rounded-md border bg-editor-bg/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{a.title}</span>
                  <span className="text-[10px] uppercase tracking-wide rounded bg-accent px-1.5 py-0.5 text-muted-foreground">{a.tag}</span>
                  {a.community && <span className="ml-auto text-[11px] text-warning inline-flex items-center gap-1"><Trophy className="h-3 w-3" />Community favorite</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <span>Perf <span className="text-foreground font-mono">{a.perf}</span></span>
                  <span>Readability <span className="text-foreground font-mono">{a.read}</span></span>
                  <span>LOC <span className="text-foreground font-mono">{a.loc}</span></span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Learning insights */}
        <Card title="Your performance in context" icon={TrendingUp}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Insight icon={Target} label="Skill level change" main="75% → 85%" detail="Java Syntax +10%" tone="success" />
            <Insight icon={Users} label="vs Lab average" main="175 XP" detail="Lab avg 160 · Ahead ✓" tone="info" />
            <Insight icon={Clock} label="Time efficiency" main="47% faster" detail="You 24m · Benchmark 45m" tone="warning" />
            <Insight icon={Sparkles} label="Accuracy" main="First try ✓" detail="No retries needed" tone="primary" />
          </div>
          <div className="mt-4 rounded-md border bg-editor-bg/60 p-3">
            <div className="text-xs text-muted-foreground mb-2">Skill growth</div>
            <SkillBar label="Java Syntax" from={75} to={85} />
            <SkillBar label="Type Casting" from={60} to={80} />
            <SkillBar label="String Ops" from={70} to={78} />
          </div>
        </Card>

        {/* Recommended next */}
        <Card title="Recommended next steps" icon={Rocket}>
          <div className="grid gap-3 md:grid-cols-3">
            <NextCard
              tag="Ready for advanced"
              id={next?.id ?? "JAVA-150"}
              title={next?.title ?? "Advanced OOP Concepts"}
              cta="Start next challenge"
              tone="primary"
              to="/lab/$slug/ticket/$ticketId"
              params={{ slug: lab.slug, ticketId: next?.id ?? tickets[0].id }}
              highlight
            />
            <NextCard
              tag="Master related skills"
              id="JAVA-102"
              title="Control Flow & Loops"
              cta="View details"
              tone="info"
              to="/lab/$slug"
              params={{ slug: lab.slug }}
            />
            <NextCard
              tag="Speed challenge"
              id="CHL-005"
              title="Complete 5 beginner tickets in 2h"
              cta="Join challenge +100 XP"
              tone="warning"
              to="/leaderboard"
            />
          </div>
        </Card>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
          <Link to="/lab/$slug/ticket/$ticketId" params={{ slug, ticketId }} className="rounded-md border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1"><Code2 className="h-4 w-4" />View your solution</Link>
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1"><Trophy className="h-4 w-4 text-warning" />View best solution</button>
          <Link to="/forum" className="rounded-md border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" />Discuss on forum</Link>
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1"><Share2 className="h-4 w-4" />Share achievement</button>
          <button onClick={() => alert("Issue reported · #4821")} className="rounded-md border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1"><Flag className="h-4 w-4" />Report</button>
          <button onClick={() => { const f = prompt("Share your feedback on this ticket:"); if (f) alert("Thanks for the feedback!"); }} className="rounded-md border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" />Feedback</button>
          <Link to="/lab/$slug" params={{ slug: lab.slug }} className="rounded-md border px-3 py-2 text-sm hover:bg-accent ml-auto">← Lab dashboard</Link>
          {next && (
            <Link to="/lab/$slug/ticket/$ticketId" params={{ slug: lab.slug, ticketId: next.id }}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
              Next ticket <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- Data ---------- */

const DETAILED_TESTS = [
  { name: "Test 1 · Variable Declaration", input: "—", expected: "All 8 primitive types declared", time: "< 0.001s" },
  { name: "Test 2 · Type Casting", input: "int x = 100;", expected: '"Implicit: 100.0\\nExplicit: 100"', time: "0.002s" },
  { name: "Test 3 · String Operations", input: '"Hello Java"', expected: "Length 10, charAt(0)='H'", time: "0.001s" },
  { name: "Test 4 · Output Format", input: "—", expected: 'Matches "Result: 42"', time: "0.003s" },
];

const ALTS = [
  { title: "Using printf for formatted output", tag: "Idiomatic", desc: "Cleaner formatting with type specifiers — slightly slower but most readable.", perf: "92%", read: "98%", loc: "14", community: true },
  { title: "StringBuilder concatenation", tag: "Performance", desc: "Best for large loops — avoids creating intermediate String objects.", perf: "99%", read: "85%", loc: "18", community: false },
  { title: "Records (Java 16+)", tag: "Modern", desc: "Wrap primitives in a record for type-safe grouping and immutability.", perf: "94%", read: "92%", loc: "12", community: false },
];

/* ---------- Components ---------- */

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
      {Array.from({ length: 36 }).map((_, i) => {
        const colors = ["var(--success)", "var(--primary)", "var(--warning)", "var(--info)", "var(--ui)"];
        const left = (i * 2.8) % 100;
        const delay = (i % 12) * 0.12;
        const size = 6 + (i % 4) * 2;
        return (
          <span key={i} className="absolute top-0 rounded-sm" style={{
            left: `${left}%`,
            width: size, height: size,
            background: colors[i % colors.length],
            animation: `confettiFall 2.6s cubic-bezier(.2,.7,.4,1) ${delay}s forwards`,
            transform: "translateY(-20px) rotate(0deg)",
            opacity: 0.9,
          }} />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(540deg); opacity: 0; }
        }
        @keyframes growBar {
          from { width: 0%; } to { width: var(--w); }
        }
      `}</style>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone, pct }: { icon: typeof Zap; label: string; value: string; sub: string; tone: "success" | "info" | "primary" | "warning"; pct: number }) {
  const color = { success: "text-success", info: "text-info", primary: "text-primary", warning: "text-warning" }[tone];
  const bar = { success: "bg-success", info: "bg-info", primary: "bg-primary", warning: "bg-warning" }[tone];
  return (
    <div className="rounded-xl border bg-editor-bg/40 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={`h-4 w-4 ${color}`} />{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
      <div className="mt-2 h-1.5 rounded-full bg-accent overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%`, animation: "growBar 1.2s ease-out" } as React.CSSProperties} />
      </div>
    </div>
  );
}

function AnimatedBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{label}</span><span>{pct}%</span></div>
      <div className="h-2.5 rounded-full bg-accent overflow-hidden">
        <div className="h-full bg-gradient-to-r from-success via-primary to-warning" style={{ ["--w" as never]: `${pct}%`, width: "0%", animation: "growBar 1.4s ease-out forwards" } as React.CSSProperties} />
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children, collapsible }: { title: string; icon: typeof Zap; children: React.ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border bg-card p-5">
      <button onClick={() => collapsible && setOpen((o) => !o)} className={`flex w-full items-center gap-2 ${collapsible ? "cursor-pointer" : "cursor-default"}`}>
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
        {collapsible && (open ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />)}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function Block({ title, tone, children }: { title: string; tone: "success" | "warning" | "info"; children: React.ReactNode }) {
  const cls = {
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    info: "border-info/30 bg-info/5",
  }[tone];
  const text = { success: "text-success", warning: "text-warning", info: "text-info" }[tone];
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className={`text-sm font-semibold ${text}`}>{title}</div>
      <div className="mt-2 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

function Insight({ icon: Icon, label, main, detail, tone }: { icon: typeof Zap; label: string; main: string; detail: string; tone: "success" | "info" | "warning" | "primary" }) {
  const color = { success: "text-success", info: "text-info", warning: "text-warning", primary: "text-primary" }[tone];
  return (
    <div className="rounded-md border bg-editor-bg/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className={`h-3.5 w-3.5 ${color}`} />{label}</div>
      <div className={`mt-1 text-lg font-semibold ${color}`}>{main}</div>
      <div className="text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function SkillBar({ label, from, to }: { label: string; from: number; to: number }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between text-[11px] text-muted-foreground"><span>{label}</span><span>{from}% → <span className="text-success">{to}%</span></span></div>
      <div className="mt-1 h-1.5 rounded-full bg-accent overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 bg-muted-foreground/40" style={{ width: `${from}%` }} />
        <div className="absolute inset-y-0 left-0 bg-success" style={{ ["--w" as never]: `${to}%`, width: "0%", animation: "growBar 1.6s ease-out forwards" } as React.CSSProperties} />
      </div>
    </div>
  );
}

function NextCard({ tag, id, title, cta, tone, to, params, highlight }: {
  tag: string; id: string; title: string; cta: string; tone: "primary" | "info" | "warning";
  to: "/lab/$slug/ticket/$ticketId" | "/lab/$slug" | "/leaderboard";
  params?: Record<string, string>; highlight?: boolean;
}) {
  const color = { primary: "border-primary/40 bg-primary/5", info: "border-info/30 bg-info/5", warning: "border-warning/30 bg-warning/5" }[tone];
  return (
    <div className={`rounded-lg border p-4 ${color} ${highlight ? "ring-2 ring-primary/40" : ""} relative overflow-hidden`}>
      {highlight && <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-primary font-semibold">Recommended</div>}
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{tag}</div>
      <div className="mt-1 font-mono text-xs text-muted-foreground">{id}</div>
      <div className="text-sm font-semibold">{title}</div>
      <Link to={to as string} params={params as never} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        {cta} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
