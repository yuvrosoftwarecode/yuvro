import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Play,
  GitBranch,
  GitPullRequest,
  GitCommit,
  Bug,
  Database,
  Terminal,
  FileCode2,
  Download,
  ChevronRight,
  Circle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (token) {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            const role = user.roles?.ylabs || user.roles?.ycode || user.role;
            const r = role?.toLowerCase();
            if (r === "admin") {
              throw redirect({ to: "/admin" });
            } else if (r === "recruiter") {
              throw redirect({ to: "/recruiter/dashboard" });
            } else {
              throw redirect({ to: "/student/dashboard" });
            }
          } catch (e) {
            // ignore parsing error
          }
        }
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Yuvro Labs — Verify Engineering Capability Before You Hire" },
      {
        name: "description",
        content:
          "Yuvro Labs is an Engineering Capability Verification Platform. Evaluate real engineering ability through Engineering Simulation Labs, Knowledge Assessments and Vitarka AI Interviews.",
      },
      {
        property: "og:title",
        content: "Yuvro Labs — Verify Engineering Capability Before You Hire",
      },
      {
        property: "og:description",
        content:
          "Stop hiring developers. Start verifying engineers. Evidence-based hiring for modern engineering teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

/* Brand palette (inlined so we don't touch global tokens)
   bg #FAFAF8 · ink #0A0A0A · muted #6B6B6B · border #E8E6E1
   amber #F5A623 (rare signal) · amber-deep #E8871A · success #1A8F5C */

function Landing() {
  const { user, isAuthenticated } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (token && isAuthenticated && user) {
        const role = user.roles?.ylabs || user.roles?.ycode || user.role;
        const r = role?.toLowerCase();
        nav({
          to:
            r === "admin"
              ? "/admin"
              : r === "recruiter"
                ? "/recruiter/dashboard"
                : "/student/dashboard",
        });
      }
    }
  }, [user, isAuthenticated, nav]);

  return (
    <div
      className="min-h-screen text-[#0A0A0A] antialiased selection:bg-[#0A0A0A] selection:text-white"
      style={{ background: "#FAFAF8" }}
    >
      <LandingStyles />
      <LandingNav />
      <Hero />
      <VersusSection />
      <ReportSplit />
      <EvaluationFlow />
      <SimulationLabs />
      <CapabilityMetrics />
      <ReportPreview />
      <ProcessStrip />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ---------- Global page-scoped styles (animations only) ---------- */
function LandingStyles() {
  return (
    <style>{`
      @keyframes yvr-reveal { from { opacity:0; transform: translateY(16px) } to { opacity:1; transform: translateY(0) } }
      .yvr-reveal { opacity: 0; }
      .yvr-reveal.is-in { animation: yvr-reveal 600ms cubic-bezier(0.16,1,0.3,1) forwards; }
      @keyframes yvr-pulse-dot { 0%,100% { transform: scale(1); opacity:1 } 50% { transform: scale(1.4); opacity:.45 } }
      .yvr-pulse { animation: yvr-pulse-dot 2s cubic-bezier(0.16,1,0.3,1) infinite; }
      @keyframes yvr-caret { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
      .yvr-caret { animation: yvr-caret 1s steps(1,end) infinite; }
      @keyframes yvr-line { to { stroke-dashoffset: 0 } }
      .yvr-line { stroke-dasharray: 1200; stroke-dashoffset: 1200; }
      .yvr-line.is-in { animation: yvr-line 1400ms cubic-bezier(0.16,1,0.3,1) forwards; }
      .yvr-row { transition: background 200ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms cubic-bezier(0.16,1,0.3,1); box-shadow: inset 2px 0 0 transparent; }
      .yvr-row:hover { background: #F5F3EE; box-shadow: inset 2px 0 0 #F5A623; }
    `}</style>
  );
}

/* ---------- Reveal + stagger helpers ---------- */
function useInView<T extends Element>(opts: IntersectionObserverInit = { threshold: 0.15 }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, opts);
    io.observe(el); return () => io.disconnect();
  }, []);
  return { ref, inView };
}
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return <div ref={ref} className={`yvr-reveal ${inView ? "is-in" : ""} ${className}`} style={{ animationDelay: `${delay}ms` }}>{children}</div>;
}
function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(ease(p) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref}>{n}</span>;
}

/* ---------- Section divider glyph (logo-inspired branch) ---------- */
function SectionGlyph() {
  return (
    <svg width="44" height="14" viewBox="0 0 44 14" fill="none" className="mb-4 text-[#0A0A0A]">
      <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1" />
      <circle cx="20" cy="7" r="2" fill="#F5A623" />
      <line x1="22" y1="7" x2="34" y2="7" stroke="currentColor" strokeWidth="1" />
      <line x1="34" y1="7" x2="40" y2="2" stroke="currentColor" strokeWidth="1" />
      <line x1="34" y1="7" x2="40" y2="12" stroke="currentColor" strokeWidth="1" />
      <circle cx="40" cy="2" r="1.2" fill="currentColor" />
      <circle cx="40" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

/* ================================================================
   HEADER — LOCKED. Do not modify.
   ================================================================ */
function LandingNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-neutral-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <img src="/logo.png" alt="Yuvro" className="h-full w-full object-contain" />
          </div>
          <span className="text-base">Yuvro Labs</span>
        </Link>
        <nav className="ml-10 hidden md:flex items-center gap-7 text-sm text-[#6B6B6B]">
          <a href="#labs" className="hover:text-[#0A0A0A] transition">Labs</a>
          <a href="#process" className="hover:text-[#0A0A0A] transition">How it works</a>
          <a href="#report" className="hover:text-[#0A0A0A] transition">Report</a>
          <Link to="/pricing" className="hover:text-[#0A0A0A] transition">Pricing</Link>
          <Link to="/recruiter-login" className="hover:text-[#0A0A0A] transition">Recruiter Login</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/auth" search={{ tab: "signin" }} className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition">Sign In</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-95" style={{ background: "#F5A623" }}>
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </div>
    </header>
  );
}

/* ================================================================
   1 — HERO
   ================================================================ */
function Hero() {
  const logos = ["Acme", "Northwind", "Globex", "Initech", "Umbrella", "Hooli"];
  return (
    <section className="relative overflow-hidden border-b border-[#E8E6E1]">
      <div className="mx-auto max-w-5xl px-6 pt-12 pb-20 lg:pt-16 lg:pb-24 text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E6E1] bg-white px-3 py-1 font-mono text-[11px] font-medium tracking-[0.08em] uppercase text-[#6B6B6B]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#F5A623" }} />
            Engineering Capability Verification Platform
          </div>
          <h1 className="mt-6 text-[52px] lg:text-[76px] leading-[1.02] tracking-[-0.025em] font-bold">
            Hire engineers with<br />
            <span className="inline-block">
              verified capability.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-[#6B6B6B]">
            Yuvro Labs replaces resumes and guesswork with evidence. Evaluate how candidates think, debug, collaborate and execute through Engineering Simulation Labs, Knowledge Assessments and Vitarka AI Interviews.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-[14px] font-medium text-white transition hover:brightness-95" style={{ background: "#F5A623" }}>
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#process" className="inline-flex items-center gap-2 rounded-md border border-[#E8E6E1] bg-white px-5 py-3 text-[14px] font-medium text-[#0A0A0A] hover:border-[#0A0A0A] transition">
              <Play className="h-3.5 w-3.5" /> Book a Demo
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}



/* ================================================================
   2 — Traditional vs Yuvro Labs
   ================================================================ */
function VersusSection() {
  const traditional = ["Resume", "MCQ", "Interview", "Guesswork", "Hire"];
  const yuvro = ["Engineering Labs", "Knowledge Assessment", "Vitarka AI", "Engineering Capability Index", "Evidence Based Hiring"];
  return (
    <section className="border-t border-[#E8E6E1]">
      <div className="mx-auto max-w-7xl px-6 py-[120px]">
        <Reveal>
          <SectionGlyph />
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B]">The Shift</div>
          <h2 className="mt-3 max-w-2xl text-[44px] leading-[1.05] tracking-[-0.02em] font-bold">
            Recruiters don't hire resumes.<br />
            <span className="text-[#6B6B6B]">They hire engineering capability.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-10 lg:gap-16">
          <Reveal>
            <FlowColumn eyebrow="Traditional Hiring" tone="muted" steps={traditional} trailingIcon={<X className="h-3.5 w-3.5" />} trailingLabel="Guesswork based" />
          </Reveal>
          <Reveal delay={120}>
            <FlowColumn eyebrow="Yuvro Labs" tone="brand" steps={yuvro} trailingIcon={<Check className="h-3.5 w-3.5" />} trailingLabel="Evidence based" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FlowColumn({ eyebrow, tone, steps, trailingIcon, trailingLabel }: { eyebrow: string; tone: "muted" | "brand"; steps: string[]; trailingIcon: React.ReactNode; trailingLabel: string }) {
  const brand = tone === "brand";
  return (
    <div className={`relative rounded-[12px] p-8 border ${brand ? "bg-white border-[#0A0A0A]" : "bg-transparent border-dashed border-[#E8E6E1]"}`} style={brand ? {} : { opacity: 0.85 }}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B]">{eyebrow}</div>
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${brand ? "text-[#0A0A0A]" : "bg-transparent text-[#6B6B6B] border border-[#E8E6E1]"}`} style={brand ? { background: "#F5A623", color: "#0A0A0A" } : {}}>
          {trailingIcon}
          {trailingLabel}
        </div>
      </div>
      <div className="mt-6 space-y-0">
        {steps.map((s, i) => (
          <Reveal key={s} delay={i * 60}>
            <div className="flex items-center gap-4 py-3">
              <span className={`grid h-8 w-8 place-items-center rounded-full font-mono text-[11px] ${brand ? "bg-[#0A0A0A] text-white" : "border border-[#E8E6E1] bg-transparent text-[#6B6B6B]"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={`text-[16px] tracking-tight ${brand ? "text-[#0A0A0A] font-medium" : "text-[#6B6B6B] line-through decoration-[#E8E6E1]"}`} style={brand ? {} : { opacity: 0.75 }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="ml-4 h-4 border-l border-dashed border-[#E8E6E1]" />}
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   3 — Report split
   ================================================================ */
function ReportSplit() {
  const items = [
    { t: "Engineering Labs", d: "Evaluate practical engineering capability through debugging, feature development, optimization and production-style tasks." },
    { t: "Knowledge Assessment", d: "Measure conceptual understanding across programming languages, databases, frameworks and engineering fundamentals." },
    { t: "Vitarka AI Interview", d: "Understand communication, reasoning, architecture decisions and technical depth through adaptive AI conversations." },
    { t: "Engineering Capability Index", d: "One unified engineering score backed by practical evidence." },
    { t: "Recruiter Report", d: "Everything available in one downloadable, shareable report." },
  ];
  return (
    <section id="report" className="border-t border-[#E8E6E1]">
      <div className="mx-auto max-w-7xl px-6 py-[120px] grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-16">
        <Reveal><MiniReportPreview /></Reveal>
        <Reveal delay={120}>
          <SectionGlyph />
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B]">The Recruiter Report</div>
          <h2 className="mt-3 text-[44px] leading-[1.05] tracking-[-0.02em] font-bold">
            Everything recruiters<br />actually need.
          </h2>
          <p className="mt-5 text-[16px] text-[#6B6B6B] max-w-lg leading-relaxed">
            One report. Four layers of evidence. Zero guesswork. Every claim traceable back to a real engineering artifact.
          </p>
          <div className="mt-10 divide-y divide-[#E8E6E1] border-y border-[#E8E6E1]">
            {items.map((it, i) => (
              <div key={it.t} className="grid grid-cols-[auto_1fr] gap-6 py-6">
                <div className="font-mono text-[12px] text-[#6B6B6B] pt-1">0{i + 1}</div>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-tight">{it.t}</h3>
                  <p className="mt-1.5 text-[14px] text-[#6B6B6B] leading-relaxed">{it.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MiniReportPreview() {
  return (
    <div className="relative">
      <div className="rounded-[4px] border border-[#E8E6E1] bg-white overflow-hidden">
        <div className="border-b border-[#E8E6E1] px-6 py-5 flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">Candidate Report · CR-2847</div>
            <div className="mt-1 text-[18px] font-semibold tracking-tight">Priya Nair — Senior Backend Engineer</div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#E8E6E1] px-2 py-1 font-mono text-[11px] text-[#6B6B6B]">
            <Download className="h-3 w-3" /> PDF
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#E8E6E1] border-b border-[#E8E6E1]">
          {[
            { k: "Labs", v: 92 },
            { k: "Assessment", v: 84 },
            { k: "Vitarka", v: 76 },
          ].map(x => (
            <div key={x.k} className="px-6 py-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">{x.k}</div>
              <div className="mt-1 text-[28px] font-semibold tracking-tight font-mono"><CountUp to={x.v} /></div>
              <div className="mt-2 h-[3px] rounded-full bg-[#E8E6E1] overflow-hidden">
                <div className="h-full bg-[#0A0A0A]" style={{ width: `${x.v}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">Engineering Capability Index</div>
            <div className="font-mono text-[11px] text-[#6B6B6B]">weighted composite</div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[56px] leading-none font-semibold tracking-tight"><CountUp to={84} /></span>
            <span className="font-mono text-[12px] text-[#6B6B6B]">/ 100 · STRONG FIT</span>
          </div>
          <div className="mt-4 h-[6px] rounded-full bg-[#E8E6E1] overflow-hidden">
            <div className="h-full" style={{ width: "84%", background: "#F5A623" }} />
          </div>
        </div>
        <div className="border-t border-[#E8E6E1] px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">Strengths</div>
            <ul className="mt-2 space-y-1.5 text-[12px] text-[#0A0A0A]">
              {["Systems debugging under time pressure", "API design & idempotency reasoning", "Clear technical communication"].map(s => (
                <li key={s} className="flex items-start gap-2"><span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: "#1A8F5C" }} /><span>{s}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">Gaps</div>
            <ul className="mt-2 space-y-1.5 text-[12px] text-[#0A0A0A]">
              {["Distributed cache invalidation depth", "Cost/perf trade-off articulation"].map(s => (
                <li key={s} className="flex items-start gap-2"><span className="mt-1.5 h-2 w-2 rounded-full shrink-0 border" style={{ borderColor: "#F5A623" }} /><span>{s}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   4 — Inside Every Evaluation (dark flow)
   ================================================================ */
function EvaluationFlow() {
  const nodes = ["Invite Candidate", "Engineering Labs", "Knowledge Assessment", "Vitarka AI Interview", "AI Evaluation", "Engineering Capability Report", "Recruiter Decision"];
  const { ref, inView } = useInView<SVGSVGElement>();
  return (
    <section className="border-t border-[#E8E6E1] text-white" style={{ background: "#0A0A0A" }}>
      <div className="mx-auto max-w-7xl px-6 py-[120px]">
        <Reveal>
          <div className="mb-4">
            <svg width="44" height="14" viewBox="0 0 44 14" fill="none" className="text-white/70">
              <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1" />
              <circle cx="20" cy="7" r="2" fill="#F5A623" />
              <line x1="22" y1="7" x2="34" y2="7" stroke="currentColor" strokeWidth="1" />
              <line x1="34" y1="7" x2="40" y2="2" stroke="currentColor" strokeWidth="1" />
              <line x1="34" y1="7" x2="40" y2="12" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-neutral-400">Inside Every Evaluation</div>
          <h2 className="mt-3 max-w-2xl text-[44px] leading-[1.05] tracking-[-0.02em] font-bold text-white">
            A single connected flow.<br />
            <span className="text-neutral-500">Every step produces evidence.</span>
          </h2>
        </Reveal>

        <div className="mt-16 relative">
          {/* Animated connecting line */}
          <svg ref={ref} className={`absolute left-0 right-0 top-6 h-px hidden md:block yvr-line ${inView ? "is-in" : ""}`} viewBox="0 0 1200 1" preserveAspectRatio="none" style={{ width: "100%" }}>
            <line x1="0" y1="0.5" x2="1200" y2="0.5" stroke="#3f3f3f" strokeWidth="1" />
          </svg>
          <div className="grid md:grid-cols-7 gap-6 md:gap-0">
            {nodes.map((n, i) => (
              <Reveal key={n} delay={i * 60}>
                <div className="relative flex md:flex-col items-center md:items-start gap-4 md:gap-3">
                  <div className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border ${i === 3 ? "border-[#F5A623] bg-[#0A0A0A]" : "border-neutral-700 bg-[#0A0A0A]"}`}>
                    {i === 3 ? <span className="h-2 w-2 rounded-full" style={{ background: "#F5A623" }} /> : <span className="font-mono text-[11px] text-neutral-400">{String(i + 1).padStart(2, "0")}</span>}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium tracking-tight text-white leading-tight max-w-[130px]">{n}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500">STAGE</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   5 — Engineering Simulation Labs (repo-style)
   ================================================================ */
function SimulationLabs() {
  const tasks = [
    { id: "PAY-142", t: "Broken Payment API", diff: "Hard", time: "45m", domain: "FinTech", skills: ["Debugging", "Idempotency", "Webhooks"] },
    { id: "API-089", t: "REST API Development", diff: "Mid", time: "60m", domain: "SaaS", skills: ["Design", "REST", "Validation"] },
    { id: "SQL-217", t: "SQL Query Optimization", diff: "Mid", time: "30m", domain: "Data", skills: ["Indexing", "Query plans"] },
    { id: "BOOT-058", t: "Spring Boot Debugging", diff: "Hard", time: "50m", domain: "Enterprise", skills: ["JVM", "Spring", "Traces"] },
    { id: "RCT-311", t: "React Performance Issue", diff: "Mid", time: "40m", domain: "Consumer", skills: ["Rendering", "Memoization"] },
    { id: "MS-402", t: "Microservice Failure", diff: "Hard", time: "55m", domain: "Platform", skills: ["Retries", "Circuit breakers"] },
    { id: "AUTH-076", t: "Authentication Flow", diff: "Mid", time: "35m", domain: "Security", skills: ["JWT", "OAuth", "Sessions"] },
    { id: "CACHE-129", t: "Redis Cache Issue", diff: "Easy", time: "30m", domain: "Backend", skills: ["Caching", "TTL"] },
    { id: "MQ-215", t: "Message Queue Processing", diff: "Hard", time: "50m", domain: "Distributed", skills: ["Kafka", "Ordering", "DLQ"] },
  ];
  return (
    <section id="labs" className="border-t border-[#E8E6E1]">
      <div className="mx-auto max-w-7xl px-6 py-[120px]">
        <Reveal>
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="max-w-2xl">
              <SectionGlyph />
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B]">Engineering Simulation Labs</div>
              <h2 className="mt-3 text-[44px] leading-[1.05] tracking-[-0.02em] font-bold">
                Real engineering tickets.<br />
                <span className="text-[#6B6B6B]">Not toy problems.</span>
              </h2>
            </div>
            <div className="font-mono text-[12px] text-[#6B6B6B] flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5" /> yuvro-labs/simulation-catalog · main
            </div>
          </div>
        </Reveal>

        <div className="mt-12 rounded-[4px] border border-[#E8E6E1] overflow-hidden bg-white">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-6 border-b border-[#E8E6E1] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]" style={{ background: "#FAFAF8" }}>
            <div className="w-20">ID</div>
            <div>Task</div>
            <div>Domain</div>
            <div>Difficulty</div>
            <div>Est. Time</div>
          </div>
          {tasks.map((task, i) => (
            <Reveal key={task.id} delay={i * 40}>
              <div className={`yvr-row grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-6 px-5 py-4 ${i < tasks.length - 1 ? "border-b border-[#E8E6E1]" : ""}`}>
                <div className="font-mono text-[11px] text-[#6B6B6B] w-20">{task.id}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <FileCode2 className="h-3.5 w-3.5 text-[#6B6B6B]" />
                    <span className="text-[15px] font-medium tracking-tight">{task.t}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {task.skills.map(s => (
                      <span key={s} className="rounded-sm border border-[#E8E6E1] px-1.5 py-0.5 font-mono text-[10px] text-[#6B6B6B]">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-[12px] text-[#6B6B6B]">{task.domain}</div>
                <div>
                  {task.diff === "Hard" && (
                    <span className="inline-flex items-center rounded-full bg-[#0A0A0A] text-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]">Hard</span>
                  )}
                  {task.diff === "Mid" && (
                    <span className="inline-flex items-center rounded-full border border-[#0A0A0A] text-[#0A0A0A] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]">Mid</span>
                  )}
                  {task.diff === "Easy" && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#6B6B6B]">Easy</span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-[#6B6B6B] w-12 text-right">{task.time}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   6 — Capability metrics
   ================================================================ */
function CapabilityMetrics() {
  const metrics = [
    { t: "Debugging", v: 92 }, { t: "Problem Solving", v: 88 }, { t: "Architecture", v: 74 },
    { t: "API Development", v: 90 }, { t: "Database Design", v: 71 }, { t: "Performance Optimization", v: 82 },
    { t: "System Thinking", v: 78 }, { t: "Communication", v: 85 }, { t: "Collaboration", v: 80 },
    { t: "Code Quality", v: 87 }, { t: "Learning Ability", v: 76 }, { t: "Engineering Ownership", v: 89 },
  ];
  return (
    <section className="border-t border-[#E8E6E1]">
      <div className="mx-auto max-w-7xl px-6 py-[120px]">
        <Reveal>
          <SectionGlyph />
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B]">What we measure</div>
          <h2 className="mt-3 max-w-2xl text-[44px] leading-[1.05] tracking-[-0.02em] font-bold">
            Twelve engineering dimensions.<br />
            <span className="text-[#6B6B6B]">Measured as evidence, not opinion.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-2 gap-x-16 gap-y-3">
          {metrics.map((m, i) => (
            <Reveal key={m.t} delay={i * 40}>
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3 border-b border-[#E8E6E1]">
                <div className="font-mono text-[11px] text-[#6B6B6B] w-6">{String(i + 1).padStart(2, "0")}</div>
                <div className="text-[14px] tracking-tight font-medium">{m.t}</div>
                <div className="w-40 h-[3px] rounded-full bg-[#E8E6E1] overflow-hidden">
                  <div className="h-full bg-[#0A0A0A]" style={{ width: `${m.v}%` }} />
                </div>
                <div className="w-8 text-right font-mono text-[11px] text-[#0A0A0A]">{m.v}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   7 — Full report preview
   ================================================================ */
function ReportPreview() {
  return (
    <section className="border-t border-[#E8E6E1]">
      <div className="mx-auto max-w-6xl px-6 py-[120px]">
        <Reveal>
          <div className="max-w-2xl mb-14">
            <SectionGlyph />
            <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B]">Candidate Evaluation Report</div>
            <h2 className="mt-3 text-[44px] leading-[1.05] tracking-[-0.02em] font-bold">
              One report.<br />
              <span className="text-[#6B6B6B]">Every piece of evidence.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="rounded-[4px] border border-[#E8E6E1] bg-white overflow-hidden">
            <div className="border-b border-[#E8E6E1] px-8 py-6 flex items-start justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">Report · CR-2847 · Confidential</div>
                <div className="mt-2 text-[22px] font-semibold tracking-tight">Priya Nair</div>
                <div className="text-[13px] text-[#6B6B6B]">Senior Backend Engineer · Evaluated for FinTech Platform Team</div>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#0A0A0A] text-white px-3 py-1.5 text-[12px] hover:bg-black transition">
                <Download className="h-3.5 w-3.5" /> Download PDF
              </button>
            </div>

            <div className="grid md:grid-cols-4 divide-x divide-[#E8E6E1] border-b border-[#E8E6E1]">
              {[
                { k: "Engineering Labs", v: 92, sub: "8 of 9 tasks" },
                { k: "Assessment", v: 84, sub: "42 of 50" },
                { k: "Vitarka AI", v: 76, sub: "4 dimensions" },
                { k: "ECI", v: 84, sub: "STRONG FIT" },
              ].map(x => (
                <div key={x.k} className="p-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">{x.k}</div>
                  <div className="mt-2 text-[36px] font-semibold tracking-tight font-mono"><CountUp to={x.v} /></div>
                  <div className="font-mono text-[11px] text-[#6B6B6B]">{x.sub}</div>
                </div>
              ))}
            </div>

            <div className="border-b border-[#E8E6E1] px-8 py-6 flex items-center justify-between gap-6">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">AI Recommendation</div>
                <div className="mt-1 text-[17px] font-medium tracking-tight">Shortlist for onsite. Strong debugging, thoughtful trade-offs, clean communication.</div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[#E8E6E1] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#1A8F5C" }} />
                Strong Fit · 84 ECI
              </span>
            </div>

            <div className="grid md:grid-cols-3 divide-x divide-[#E8E6E1]">
              <div className="p-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Strengths</div>
                <ul className="space-y-3 text-[13px]">
                  {["Debugged race condition in under 12 minutes", "Correctly identified missing idempotency key", "Explained JWT rotation trade-offs clearly", "Optimized N+1 query, cut latency by 340ms"].map(s => (
                    <li key={s} className="flex gap-2 items-start"><span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: "#1A8F5C" }} /><span className="text-[#0A0A0A]">{s}</span></li>
                  ))}
                </ul>
              </div>
              <div className="p-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Gaps</div>
                <ul className="space-y-3 text-[13px]">
                  {["Distributed cache invalidation depth", "Cost/performance trade-off articulation", "Limited exposure to event sourcing"].map(s => (
                    <li key={s} className="flex gap-2 items-start"><span className="mt-1.5 h-2 w-2 rounded-full shrink-0 border" style={{ borderColor: "#F5A623" }} /><span className="text-[#0A0A0A]">{s}</span></li>
                  ))}
                </ul>
              </div>
              <div className="p-8" style={{ background: "#FAFAF8" }}>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B] mb-3">Recruiter Notes</div>
                <div className="rounded-[4px] border border-[#E8E6E1] bg-white p-3 text-[12px] text-[#0A0A0A] leading-relaxed">
                  Rare candidate — actually reasons about failure modes. Recommend routing to platform team round with distributed systems focus. Pair with senior on cache design in first sprint.
                </div>
                <div className="mt-3 font-mono text-[10px] text-[#6B6B6B]">— M. Rao · Head of Engineering</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================
   8 — Process
   ================================================================ */
function ProcessStrip() {
  const steps = ["Invite", "Evaluate", "Review", "Hire"];
  return (
    <section id="process" className="border-t border-[#E8E6E1]">
      <div className="mx-auto max-w-5xl px-6 py-[120px]">
        <Reveal>
          <div className="text-center max-w-xl mx-auto">
            <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[#6B6B6B]">Evaluation Process</div>
            <h2 className="mt-3 text-[40px] leading-[1.05] tracking-[-0.02em] font-bold">
              Four steps. Zero guesswork.
            </h2>
          </div>
        </Reveal>
        <div className="mt-14 flex items-center justify-between gap-6">
          {steps.map((s, i) => (
            <Reveal key={s} delay={i * 80}>
              <div className="flex items-center gap-6 flex-1">
                <div className="flex-1 text-center">
                  <div className="font-mono text-[11px] text-[#6B6B6B]">0{i + 1}</div>
                  <div className="mt-2 text-[20px] tracking-tight font-medium">{s}</div>
                </div>
                {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-[#E8E6E1] shrink-0" />}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   9 — Final CTA
   ================================================================ */
function FinalCTA() {
  return (
    <section className="border-t border-[#E8E6E1] text-white" style={{ background: "#0A0A0A" }}>
      <div className="mx-auto max-w-6xl px-6 py-[120px] grid lg:grid-cols-[1.2fr_1fr] gap-12 items-end">
        <Reveal>
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-neutral-400">The bottom line</div>
          <h2 className="mt-4 text-[56px] lg:text-[72px] leading-[1.05] tracking-[-0.02em] font-bold">
            Hire Engineers.<br />
            <span className="text-neutral-500">Not Interview Performers.</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-[16px] text-neutral-300 leading-relaxed max-w-md">
            Verify engineering capability before making hiring decisions. Bring evidence into every hiring conversation.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-[14px] font-medium text-[#0A0A0A] hover:bg-neutral-100 transition">
              Book Demo <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-5 py-3 text-[14px] font-medium text-white hover:border-white transition">
              Get Started
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="border-t border-[#E8E6E1] bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 font-mono text-[12px] text-[#6B6B6B]">
        <div className="flex items-center gap-2">
          <GitCommit className="h-3.5 w-3.5" />
          <span>© {new Date().getFullYear()} Yuvro Labs · Engineering Capability Verification</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-[#0A0A0A]">Privacy</a>
          <a href="#" className="hover:text-[#0A0A0A]">Terms</a>
          <a href="#" className="hover:text-[#0A0A0A]">Security</a>
          <a href="#" className="hover:text-[#0A0A0A]">Contact</a>
        </div>
      </div>
    </footer>
  );
}
