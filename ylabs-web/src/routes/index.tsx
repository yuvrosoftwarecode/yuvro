import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Sparkles, Code2, Users, Brain, ShieldCheck, BarChart3, Trophy,
  GitBranch, Bug, Database, Server, Cpu, Layers, Zap, CheckCircle2, Play, Bot,
  Star, Activity, Award, Briefcase, Rocket, Quote
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <LandingNav />
      <Hero />
      <Trust />
      <HowItWorks />
      <FeatureLabs />
      <Collaboration />
      <AIMentor />
      <Reputation />
      <Recruiter />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary via-ui to-primary text-primary-foreground font-mono text-sm shadow-lg shadow-primary/30">Y</div>
          <span className="text-base">Yuvro Labs</span>
        </Link>
        <nav className="ml-10 hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Labs</a>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="#mentor" className="hover:text-foreground transition">AI Mentor</a>
          <a href="#recruiter" className="hover:text-foreground transition">For Recruiters</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/auth" search={{ tab: "signin" }} className="text-sm text-muted-foreground hover:text-foreground transition">Sign In</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-ui px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 transition">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/50">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-ui/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0.2_260/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0.2_260/0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> AI-powered engineering simulation
          </span>
          <h1 className="mt-5 text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            Build Real Engineering Experience.<br />
            <span className="bg-gradient-to-r from-primary via-ui to-primary bg-clip-text text-transparent">Not Just Coding Skills.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            Solve real engineering tickets, work in simulated software teams, collaborate with developers, debug production issues, and prove your practical skills through AI-powered labs.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-ui px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition">
              Start Building <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-5 py-3 text-sm hover:bg-accent transition">
              Explore Labs
            </a>
            <a href="#how" className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm text-muted-foreground hover:text-foreground transition">
              <Play className="h-4 w-4" /> Watch Demo
            </a>
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { v: "120K+", l: "Tickets Solved" },
              { v: "15K+", l: "Active Engineers" },
              { v: "500+", l: "Practical Labs" },
              { v: "95%", l: "Skill Improvement" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-border/50 bg-card/30 backdrop-blur p-3">
                <div className="text-2xl font-semibold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <WorkspaceMockup />
      </div>
    </section>
  );
}

function WorkspaceMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-tr from-primary/30 via-ui/20 to-transparent rounded-3xl blur-2xl" />
      <div className="relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-card/60">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
          <div className="ml-3 text-xs text-muted-foreground font-mono">yuvro-labs / sprint-12 / TICKET-247</div>
        </div>
        <div className="grid grid-cols-12 gap-0 h-[420px]">
          <div className="col-span-3 border-r border-border/60 p-3 bg-card/40">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Sprint Board</div>
            {[
              { t: "Fix auth flow", s: "done", c: "success" },
              { t: "Payment webhook", s: "doing", c: "primary" },
              { t: "Refactor cache", s: "todo", c: "muted-foreground" },
              { t: "DB indexes", s: "review", c: "ui" },
            ].map((tk) => (
              <div key={tk.t} className="mb-2 rounded-md border border-border/50 bg-card p-2 text-xs">
                <div className="font-medium truncate">{tk.t}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] capitalize" style={{ color: `var(--${tk.c})` }}>{tk.s}</span>
                  <div className="h-4 w-4 rounded-full bg-primary/30" />
                </div>
              </div>
            ))}
          </div>
          <div className="col-span-6 border-r border-border/60 bg-[oklch(0.13_0.02_260)] p-4 font-mono text-[11px] leading-relaxed">
            <div className="text-muted-foreground">// src/api/webhook.ts</div>
            <div><span className="text-ui">export async function</span> <span className="text-primary">handlePayment</span>(req: <span className="text-ui">Request</span>) {'{'}</div>
            <div className="pl-4"><span className="text-ui">const</span> sig = req.headers.get(<span className="text-success">'x-signature'</span>);</div>
            <div className="pl-4"><span className="text-ui">if</span> (!verify(sig, body)) {'{'}</div>
            <div className="pl-8"><span className="text-ui">throw new</span> <span className="text-warning">AuthError</span>();</div>
            <div className="pl-4">{'}'}</div>
            <div className="pl-4 bg-success/10 border-l-2 border-success">+ <span className="text-ui">await</span> db.transaction(<span className="text-ui">async</span> (tx) =&gt; {'{'} </div>
            <div className="pl-8 bg-success/10">+   <span className="text-ui">await</span> processOrder(tx, body);</div>
            <div className="pl-4 bg-success/10">+ {'}'});</div>
            <div>{'}'}</div>
            <div className="mt-4 rounded-md border border-success/40 bg-success/10 p-2 text-success">✓ All 24 tests passing · Coverage 94%</div>
          </div>
          <div className="col-span-3 p-3 bg-card/40">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Bot className="h-3 w-3" /> AI Mentor</div>
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-2.5 text-[11px] leading-relaxed">
              Wrap your DB calls in a transaction so partial failures rollback. Nice catch on signature verification!
            </div>
            <div className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Team</div>
            <div className="space-y-1.5">
              {["MR", "SK", "AJ"].map((u, i) => (
                <div key={u} className="flex items-center gap-2 text-[11px]">
                  <div className="h-5 w-5 rounded-full grid place-items-center bg-primary/20 text-primary text-[9px] font-semibold">{u}</div>
                  <span className="text-muted-foreground">{["reviewing", "online", "coding"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 rounded-xl border border-border bg-card/90 backdrop-blur p-3 shadow-xl animate-pulse">
        <div className="text-[10px] text-muted-foreground">XP earned</div>
        <div className="text-lg font-semibold text-primary">+250 XP</div>
      </div>
      <div className="absolute -top-4 -left-4 rounded-xl border border-border bg-card/90 backdrop-blur p-3 shadow-xl">
        <div className="flex items-center gap-2 text-xs">
          <Activity className="h-3.5 w-3.5 text-success" /> <span className="text-success">Build passed</span>
        </div>
      </div>
    </div>
  );
}

function Trust() {
  const items = [
    { icon: Code2, t: "Real Engineering Experience", d: "Production-grade tickets from real engineering teams." },
    { icon: Users, t: "Team Collaboration", d: "Pair, review and ship in simulated software squads." },
    { icon: Brain, t: "AI Mentor Guidance", d: "Senior-engineer-style reviews on every PR." },
    { icon: Server, t: "Production Simulations", d: "Incident rooms, on-call, and live debugging." },
    { icon: ShieldCheck, t: "Skill Verification", d: "Proof-of-work badges recruiters can trust." },
    { icon: BarChart3, t: "Recruiter Analytics", d: "Show what you can actually build, not just memorize." },
  ];
  return (
    <section className="border-b border-border/50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Everything Recruiters Want To See.</h2>
          <p className="mt-3 text-muted-foreground">Hard evidence of practical engineering skill — not certificates.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ icon: Icon, t, d }) => (
            <div key={t} className="group relative rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6 hover:border-primary/40 transition">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-ui/20 text-primary"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { t: "Choose Practical Lab", d: "Pick a stack: backend, frontend, SQL, DevOps, security, or system design." },
    { t: "Solve Real Engineering Tickets", d: "Work production-style tickets in a full in-browser IDE." },
    { t: "Collaborate With Teams", d: "Pair, review and merge with engineers across the world." },
    { t: "Receive AI Reviews", d: "Get senior-engineer-quality feedback on every PR." },
    { t: "Build Engineering Reputation", d: "Earn reliability, collaboration and leadership scores." },
    { t: "Showcase Practical Skills", d: "Share a recruiter-ready portfolio of real engineering work." },
  ];
  return (
    <section id="how" className="border-b border-border/50 py-20 bg-gradient-to-b from-transparent via-card/20 to-transparent">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-medium text-primary uppercase tracking-wider">How it works</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">From learner to shipped engineer in 6 steps.</h2>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

          <div className="space-y-12 md:space-y-14">
            {steps.map((s, i) => {
              const left = i % 2 === 0;
              const num = String(i + 1).padStart(2, "0");
              return (
                <div key={i} className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6">
                  <div className={`${left ? "text-right pr-2 md:pr-6" : ""}`}>
                    {left && (
                      <>
                        <div className="text-[10px] font-medium text-primary uppercase tracking-[0.2em]">Step {num}</div>
                        <h3 className="mt-1.5 text-base md:text-lg font-semibold tracking-tight text-foreground">{s.t}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                      </>
                    )}
                  </div>

                  <div className="relative grid place-items-center">
                    <div className="absolute h-9 w-9 rounded-full bg-primary/20 blur-md" />
                    <div className="relative h-7 w-7 rounded-full border border-primary/60 bg-background grid place-items-center text-[11px] font-mono text-primary shadow-[0_0_12px_rgba(99,102,241,0.35)]">
                      {i + 1}
                    </div>
                  </div>

                  <div className={`${!left ? "text-left pl-2 md:pl-6" : ""}`}>
                    {!left && (
                      <>
                        <div className="text-[10px] font-medium text-primary uppercase tracking-[0.2em]">Step {num}</div>
                        <h3 className="mt-1.5 text-base md:text-lg font-semibold tracking-tight text-foreground">{s.t}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureLabs() {
  const labs = [
    { name: "Java Backend Labs", icon: Server, color: "primary", diff: "Mid → Senior", skills: ["Spring", "JPA", "Kafka"], xp: 2400, ind: "FinTech, E-commerce" },
    { name: "Frontend Engineering Labs", icon: Code2, color: "ui", diff: "Junior → Mid", skills: ["React", "TS", "Perf"], xp: 1800, ind: "SaaS, Consumer" },
    { name: "SQL & Database Labs", icon: Database, color: "warning", diff: "All levels", skills: ["Query plans", "Indexing"], xp: 1500, ind: "Data, Analytics" },
    { name: "DevOps Labs", icon: GitBranch, color: "success", diff: "Mid → Senior", skills: ["K8s", "CI/CD", "IaC"], xp: 2200, ind: "Platform, Cloud" },
    { name: "Security Labs", icon: ShieldCheck, color: "destructive", diff: "Senior", skills: ["OWASP", "Crypto"], xp: 2800, ind: "Security, FinTech" },
    { name: "System Design Labs", icon: Cpu, color: "info", diff: "Senior", skills: ["Scale", "Tradeoffs"], xp: 3000, ind: "Big Tech" },
  ];
  return (
    <section id="features" className="border-b border-border/50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Practical labs across the full stack.</h2>
          <p className="mt-3 text-muted-foreground">Each lab is a curated set of real engineering challenges.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {labs.map((l) => (
            <div key={l.name} className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6 hover:border-primary/50 transition">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(--${l.color})` }} />
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, var(--${l.color}) 18%, transparent)`, color: `var(--${l.color})` }}>
                  <l.icon className="h-5 w-5" />
                </div>
                <span className="text-xs text-muted-foreground">{l.diff}</span>
              </div>
              <h3 className="mt-4 font-semibold">{l.name}</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {l.skills.map((s) => (<span key={s} className="rounded-md border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1 text-primary"><Zap className="h-3.5 w-3.5" />{l.xp} XP</span>
                <span className="text-xs text-muted-foreground">{l.ind}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Collaboration() {
  const items = [
    { icon: Layers, t: "Sprint Boards", d: "Jira-style sprints with real ticket lifecycles." },
    { icon: GitBranch, t: "Team Tickets", d: "Cross-functional tickets across roles & dependencies." },
    { icon: Code2, t: "Pull Requests", d: "Real diff reviews, inline comments, merge checks." },
    { icon: CheckCircle2, t: "QA Validation", d: "Tests run against your code on every commit." },
    { icon: Bug, t: "Incident Rooms", d: "Live war-rooms when production breaks." },
    { icon: Bot, t: "AI Teammates", d: "Pair with AI engineers when humans aren't online." },
  ];
  return (
    <section className="border-b border-border/50 py-20 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Work Like Real Software Engineers.</h2>
          <p className="mt-3 text-muted-foreground">Every artifact you produce here mirrors a real engineering workflow.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ icon: I, t, d }) => (
            <div key={t} className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6 hover:border-ui/40 transition">
              <I className="h-6 w-6 text-ui" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AIMentor() {
  return (
    <section id="mentor" className="border-b border-border/50 py-20">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs font-medium text-primary uppercase tracking-wider">AI Mentor</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">Your AI Senior Engineer.</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">Always-on, context-aware, and reviews your code like a real principal engineer would.</p>
          <ul className="mt-6 space-y-2.5">
            {["Debugging help", "Architecture guidance", "Code reviews", "Performance optimization", "Security analysis"].map((x) => (
              <li key={x} className="flex items-center gap-2.5 text-sm"><CheckCircle2 className="h-4 w-4 text-success" />{x}</li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 via-ui/10 to-transparent rounded-3xl blur-2xl" />
          <div className="relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-ui text-primary-foreground"><Bot className="h-4 w-4" /></div>
              <div>
                <div className="text-sm font-medium">Yuvro AI Mentor</div>
                <div className="text-[10px] text-success">● online · senior tier</div>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg bg-muted/30 p-3 max-w-[85%]">My API endpoint times out on large payloads. Any ideas?</div>
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 max-w-[90%] ml-auto">
                Likely synchronous DB I/O. Three things to check:
                <ol className="mt-1.5 list-decimal pl-4 text-xs space-y-0.5">
                  <li>Add an index on <code className="text-primary">orders.user_id</code></li>
                  <li>Stream the response instead of buffering</li>
                  <li>Use a connection pool size matching CPU cores</li>
                </ol>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 max-w-[85%]">Can you draft the index migration?</div>
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 max-w-[90%] ml-auto font-mono text-xs">CREATE INDEX CONCURRENTLY idx_orders_user_id<br/>ON orders(user_id);</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Reputation() {
  const scores = [
    { l: "Reliability", v: 94, c: "success" },
    { l: "Collaboration", v: 88, c: "primary" },
    { l: "Leadership", v: 76, c: "ui" },
    { l: "Support", v: 82, c: "info" },
    { l: "Practical Skill", v: 91, c: "warning" },
  ];
  return (
    <section className="border-b border-border/50 py-20 bg-gradient-to-b from-transparent via-card/20 to-transparent">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-br from-ui/20 to-primary/20 rounded-3xl blur-2xl" />
          <div className="relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center gap-4 pb-4 border-b border-border/60">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-ui text-primary-foreground text-xl font-semibold shadow-lg">AR</div>
              <div>
                <div className="font-semibold">Aarav Reddy</div>
                <div className="text-xs text-muted-foreground">Senior Full-Stack · Lv 24</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-semibold text-primary">86</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Engineering Score</div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {scores.map((s) => (
                <div key={s.l}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{s.l}</span>
                    <span style={{ color: `var(--${s.c})` }} className="font-medium">{s.v}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.v}%`, background: `var(--${s.c})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <span className="text-xs font-medium text-ui uppercase tracking-wider">Engineering Reputation</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">Build Your Engineering Identity.</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">Every ticket, review, and collaboration shapes your verifiable engineering profile — the resume of the future.</p>
        </div>
      </div>
    </section>
  );
}

function Recruiter() {
  const items = [
    { i: Activity, t: "Sprint history" },
    { i: CheckCircle2, t: "Ticket completion" },
    { i: Star, t: "Review quality" },
    { i: Users, t: "Team collaboration" },
    { i: BarChart3, t: "Engineering analytics" },
  ];
  return (
    <section id="recruiter" className="border-b border-border/50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Show What You Can Actually Build.</h2>
          <p className="mt-3 text-muted-foreground">Recruiters see your engineering work the way teammates would.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-5 gap-4">
          {items.map(({ i: I, t }) => (
            <div key={t} className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6 text-center hover:border-primary/40 transition">
              <I className="h-6 w-6 text-primary mx-auto" />
              <div className="mt-3 text-sm font-medium">{t}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { who: "Priya · CS Student", role: "Student", quote: "Got my first internship after 3 months on Yuvro. The recruiter literally walked through my sprint board in the interview.", c: "primary" },
    { who: "Marcus · Job Seeker", role: "Job Seeker", quote: "Real tickets, real PRs, real reviews. My GitHub finally looks like a senior engineer's.", c: "ui" },
    { who: "Sana · Dev @ Stripe", role: "Developer", quote: "I use Yuvro to stay sharp on system design. The incident simulations are brutal — in the best way.", c: "success" },
  ];
  return (
    <section className="border-b border-border/50 py-20 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Engineers who proved it on Yuvro.</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {t.map((x) => (
            <div key={x.who} className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-6">
              <Quote className="h-6 w-6" style={{ color: `var(--${x.c})` }} />
              <p className="mt-3 text-sm leading-relaxed">{x.quote}</p>
              <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                <div className="text-sm font-medium">{x.who}</div>
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{x.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-b border-border/50 py-24 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-primary/20 blur-3xl" />
      </div>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Rocket className="h-10 w-10 text-primary mx-auto" />
        <h2 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">Start Building Real Engineering Experience Today.</h2>
        <p className="mt-4 text-lg text-muted-foreground">Join 15,000+ engineers proving their skill through real work.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-ui px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/40 hover:shadow-primary/60 transition">
            Create Account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/auth" search={{ tab: "signin" }} className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 px-6 py-3 text-sm hover:bg-accent transition">
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono text-xs">Y</div>
          <span>© 2026 Yuvro Labs — Build real engineering experience.</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </footer>
  );
}
