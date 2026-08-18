import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, GitCommit, Minus, Plus } from "lucide-react";
import { plans, enterprise, topUps, usageExplainers, faqs, freeTrial, rolloverNote, topUpNote } from "@/lib/pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Yuvro Labs Engineering Evaluation Plans" },
      { name: "description", content: "Simple pricing for technical hiring teams. Coding assessments, Engineering Simulations and AI technical interviews from $50/month. Start with a free 15-day trial." },
      { property: "og:title", content: "Pricing — Yuvro Labs Engineering Evaluation Plans" },
      { property: "og:description", content: "Starter, Growth and Scale plans for engineering hiring. Usage top-ups available. No long-term contracts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

const AMBER = "#F5A623";
const INK = "#0A0A0A";
const MUTED = "#6B6B6B";
const BORDER = "#E8E6E1";

export function selectPlan(planId: string, billing: "monthly" | "yearly") {
  try {
    localStorage.setItem("yuvro-selected-plan", JSON.stringify({ planId, billing }));
  } catch { /* ignore */ }
}

function Pricing() {
  const [yearly, setYearly] = useState(true);
  const [selected, setSelected] = useState<string | null>("growth");
  return (
    <div className="min-h-screen text-[#0A0A0A] antialiased selection:bg-[#0A0A0A] selection:text-white" style={{ background: "#FAFAF8" }}>
      <PricingNav />
      <Header yearly={yearly} setYearly={setYearly} />
      <FreeTrialCard />
      <PlanCards yearly={yearly} selected={selected} setSelected={setSelected} />
      <EnterpriseCard />
      <TopUps />
      <UsageWorks />
      <Faq />
      <FinalCTA />
      <Footer />
    </div>
  );
}


function PricingNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-neutral-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="grid h-8 w-8 place-items-center rounded-lg text-white font-mono text-sm" style={{ background: INK }}>Y</div>
          <span className="text-base">Yuvro Labs</span>
        </Link>
        <nav className="ml-10 hidden md:flex items-center gap-7 text-sm text-[#6B6B6B]">
          <Link to="/" hash="labs" className="hover:text-[#0A0A0A] transition">Labs</Link>
          <Link to="/" hash="process" className="hover:text-[#0A0A0A] transition">How it works</Link>
          <Link to="/pricing" className="text-[#0A0A0A] transition">Pricing</Link>
          <Link to="/recruiter-login" className="hover:text-[#0A0A0A] transition">Recruiter Login</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/auth" search={{ tab: "signin" }} className="text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition">Sign In</Link>
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition hover:brightness-95" style={{ background: AMBER }}>
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Header({ yearly, setYearly }: { yearly: boolean; setYearly: (v: boolean) => void }) {
  return (
    <section className="border-b" style={{ borderColor: BORDER }}>
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center lg:pt-20">
        <h1 className="text-[40px] lg:text-[58px] font-bold leading-[1.05] tracking-[-0.025em]">
          Simple pricing. Built for growing teams.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-[#6B6B6B]">
          Evaluate engineers with coding assessments, real-world engineering simulations, and AI technical interviews — without expensive enterprise contracts.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="inline-flex items-center rounded-lg border bg-white p-1" style={{ borderColor: BORDER }}>
            {(["Monthly", "Yearly"] as const).map((label) => {
              const active = (label === "Yearly") === yearly;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setYearly(label === "Yearly")}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${active ? "text-white" : "text-[#6B6B6B] hover:text-[#0A0A0A]"}`}
                  style={active ? { background: INK } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-[13px] text-[#6B6B6B]">Cancel anytime. No long-term commitment.</p>
        </div>
      </div>
    </section>
  );
}

function FreeTrialCard() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-12">
      <div className="rounded-xl border bg-white p-7 lg:p-8" style={{ borderColor: BORDER }}>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr_1fr] lg:items-start">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Free Trial</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[40px] font-bold leading-none tracking-[-0.03em]">{freeTrial.price}</span>
              <span className="text-[14px] text-[#6B6B6B]">/ {freeTrial.duration}</span>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[#6B6B6B]">
              The natural entry point. Try the full evaluation workflow before choosing a plan.
            </p>
            <Link
              to="/auth"
              search={{ tab: "signup" }}
              onClick={() => selectPlan("trial", "monthly")}
              className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-md border bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-[#F5F3EE]"
              style={{ borderColor: BORDER }}
            >
              {freeTrial.cta} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" style={{ borderColor: BORDER }}>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Includes</div>
            <ul className="mt-4 space-y-2.5 text-[14px]">
              {freeTrial.includes.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#1A8F5C" }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" style={{ borderColor: BORDER }}>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Access includes</div>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 text-[14px]">
              {freeTrial.access.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#1A8F5C" }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCards({ yearly, selected, setSelected }: { yearly: boolean; selected: string | null; setSelected: (id: string) => void }) {
  const billing: "monthly" | "yearly" = yearly ? "yearly" : "monthly";
  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const price = yearly ? p.yearly : p.monthly;
          const isSelected = selected === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`relative flex cursor-pointer flex-col rounded-xl bg-white p-7 transition hover:-translate-y-0.5 ${isSelected || p.popular ? "border-2" : "border"}`}
              style={{ borderColor: isSelected ? INK : p.popular ? INK : BORDER }}
            >
              {p.popular && (
                <span className="absolute -top-3 left-7 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-white" style={{ background: AMBER }}>
                  Most Popular
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">{p.name}</div>
                {isSelected && (
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Selected</span>
                )}
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[48px] font-bold leading-none tracking-[-0.03em]">${price.toLocaleString()}</span>
                <span className="text-[14px] text-[#6B6B6B]">{yearly ? "/ year" : "/ month"}</span>
              </div>
              <div className="mt-1.5 text-[12px] text-[#6B6B6B]">
                {yearly ? `billed yearly · $${p.monthly}/month equivalent` : "billed monthly"}
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-[#6B6B6B]">{p.tagline}</p>

              <Link
                to="/auth"
                search={{ tab: "signup" }}
                onClick={() => { setSelected(p.id); selectPlan(p.id, billing); }}
                className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium transition ${p.popular ? "text-white hover:brightness-95" : "border text-[#0A0A0A] hover:bg-[#F5F3EE]"}`}
                style={p.popular ? { background: INK } : { borderColor: BORDER, background: "#fff" }}
              >
                {p.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <ul className="mt-7 space-y-2.5 border-t pt-6 text-[14px]" style={{ borderColor: BORDER }}>
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#1A8F5C" }} />
                    <span className="text-[#0A0A0A]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-8 rounded-lg border bg-white px-5 py-4 text-[13px] leading-relaxed text-[#6B6B6B]" style={{ borderColor: BORDER }}>
        <p>{rolloverNote}</p>
        <p className="mt-1.5">{topUpNote}</p>
      </div>
    </section>
  );
}


function EnterpriseCard() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="rounded-xl border bg-white p-8 lg:p-10" style={{ borderColor: BORDER }}>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Enterprise</div>
            <h2 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.02em]">{enterprise.heading}</h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#6B6B6B]">{enterprise.body}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="text-[28px] font-bold tracking-[-0.02em]">{enterprise.price}</span>
              <a href="mailto:sales@yuvrolabs.com" className="inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-95" style={{ background: INK }}>
                {enterprise.cta} <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2 text-[14px]">
            {enterprise.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#1A8F5C" }} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function TopUps() {
  return (
    <section className="border-y bg-white" style={{ borderColor: BORDER }}>
      <div className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-[30px] font-bold tracking-[-0.02em]">Need more credits?</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#6B6B6B]">
          Your subscription includes monthly usage. If your hiring increases in a particular month, simply add more capacity without changing your plan.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {topUps.map((t) => (
            <div key={t.id} className="rounded-xl border p-7 transition hover:-translate-y-0.5" style={{ borderColor: BORDER, background: "#FAFAF8" }}>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">{t.title}</div>
              <ul className="mt-5 divide-y" style={{ borderColor: BORDER }}>
                {t.options.map((o) => (
                  <li key={o.label} className="flex items-center justify-between py-3 text-[15px]">
                    <span className="text-[#0A0A0A]">{o.label}</span>
                    <span className="font-semibold">{o.price}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-[#F5F3EE]" style={{ borderColor: BORDER }}>
                {t.cta} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[13px] text-[#6B6B6B]">Top-up credits remain available beyond your monthly subscription cycle.</p>
      </div>
    </section>
  );
}

function UsageWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-[30px] font-bold tracking-[-0.02em]">How usage works</h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {usageExplainers.map((u) => (
          <div key={u.title} className="border-t pt-6" style={{ borderColor: BORDER }}>
            <h3 className="text-[17px] font-semibold">{u.title}</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[#6B6B6B]">{u.body}</p>
            {u.footnote && (
              <p className="mt-3 font-mono text-[12px] leading-relaxed" style={{ color: MUTED }}>
                <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full align-middle" style={{ background: AMBER }} />
                {u.footnote}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-y bg-white" style={{ borderColor: BORDER }}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-[30px] font-bold tracking-[-0.02em]">Frequently asked questions</h2>
        <div className="mt-8 border-t" style={{ borderColor: BORDER }}>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b" style={{ borderColor: BORDER }}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-4 text-left text-[15px] font-medium transition hover:text-[#0A0A0A]"
                >
                  <span>{f.q}</span>
                  {isOpen ? <Minus className="h-4 w-4 shrink-0 text-[#6B6B6B]" /> : <Plus className="h-4 w-4 shrink-0 text-[#6B6B6B]" />}
                </button>
                {isOpen && <p className="pb-5 pr-10 text-[14px] leading-relaxed text-[#6B6B6B]">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl rounded-2xl px-8 py-16 text-center lg:px-16" style={{ background: INK }}>
        <h2 className="text-[34px] lg:text-[42px] font-bold leading-tight tracking-[-0.025em] text-white">
          Start evaluating engineers differently.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-white/70">
          Coding assessments tell you whether candidates can solve a problem. Yuvro Labs helps you evaluate how they debug, review, reason, and work through real engineering problems.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth" search={{ tab: "signup" }} className="inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95" style={{ background: AMBER }}>
            Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <a href="mailto:sales@yuvrolabs.com" className="inline-flex items-center gap-1.5 rounded-md border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
            Talk to Sales
          </a>
        </div>
        <p className="mt-5 font-mono text-[12px] text-white/50">15-day free trial · Cancel anytime</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white" style={{ borderColor: BORDER }}>
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
