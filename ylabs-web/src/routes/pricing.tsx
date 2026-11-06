import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { StandardHeader } from "@/components/StandardHeader";
import { useAuth } from "@/lib/auth";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { loadRazorpayScript } from "@/lib/razorpay";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Yuvro Labs" },
      {
        name: "description",
        content:
          "Simple pricing for Yuvro Labs, the developer-hiring platform. Coding assessments, simulation labs and AI mock interviews with a shared submission pool. Start free for 14 days.",
      },
      { property: "og:title", content: "Pricing — Yuvro Labs" },
      {
        property: "og:description",
        content:
          "Startup, Growth and Enterprise plans. Shared submission pool, repository setups and the Work Trail add-on. Start free for 14 days.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

/* ============================================================
   Pricing constants
   ============================================================ */

const BRAND = "#F7931E";

const TRIAL = {
  days: 14,
  submissions: 10,
  repos: 1,
};

type FeatureItem = {
  text: string;
  subItems?: string[];
};

const STARTUP = {
  id: "startup",
  name: "Startup",
  monthly: 99,
  yearlyTotal: 990,
  monthlyEquiv: 83,
  submissionsMonthly: 20,
  submissionsYearly: 240,
  features: [
    { text: "20 submissions per month" },
    {
      text: "Company can use these across:",
      subItems: ["Simulation Labs", "AI Mock Interviews", "Coding Assessments"],
    },
    { text: "2 codebase repository setups" },
    { text: "1 recruiter login" },
    { text: "Candidate reports" },
    { text: "AI follow-up questions" },
  ] as FeatureItem[],
};

const GROWTH = {
  id: "growth",
  name: "Growth",
  monthly: 449,
  yearlyTotal: 4490,
  monthlyEquiv: 374,
  submissionsMonthly: 100,
  submissionsYearly: 1200,
  features: [
    { text: "100 submissions per month" },
    {
      text: "Company can use these across:",
      subItems: ["Simulation Labs", "AI Mock Interviews", "Coding Assessments"],
    },
    { text: "5 codebase repository setups" },
    { text: "3 recruiter logins" },
    { text: "Advanced candidate reports" },
    { text: "Custom assessments" },
    { text: "Priority support" },
  ] as FeatureItem[],
};

const ENTERPRISE = {
  name: "Enterprise",
  features: [
    { text: "Everything in Growth" },
    { text: "Custom submission volumes" },
    { text: "Custom repository setups and recruiter access" },
    { text: "API, MCP and ATS integrations" },
    { text: "2,500+ library questions" },
    { text: "Dedicated account manager and support" },
  ] as FeatureItem[],
};

const WORK_TRAIL = {
  pricePerAssignment: 30,
  min: 1,
  max: 100,
  quickPicks: [1, 5, 10, 25],
  priceList: [
    { qty: 1, total: 30 },
    { qty: 5, total: 150 },
    { qty: 10, total: 300 },
    { qty: 25, total: 750 },
  ],
  description:
    "Work Trail assignments are real, mentored work tasks candidates complete on your behalf. Add them to either plan and pay per assignment.",
};

const EXTRA_SUBMISSION_PRICE = 5;

const FAQS = [
  {
    q: "What counts as a submission?",
    a: "Every completed candidate attempt is a submission — a coding assessment, a simulation lab task, or an AI mock interview. One candidate finishing one evaluation is one submission, no matter how long it takes them.",
  },
  {
    q: "What is a repository setup?",
    a: "A repository setup connects one of your codebases to Yuvro so candidates can be evaluated against your real code. It is configured once and can be reused across assessments. Repository setups never use submissions.",
  },
  {
    q: "When do submissions reset?",
    a: "Your submission pool resets at the start of every billing month — including on yearly plans, where you still get your monthly allotment each month rather than all at once.",
  },
  {
    q: "What if I need more submissions?",
    a: `Extra submissions are ${EXTRA_SUBMISSION_PRICE === 5 ? "$5" : `$${EXTRA_SUBMISSION_PRICE}`} each, added as you need them. Or contact us and we will size a plan for your hiring volume.`,
  },
  {
    q: "How do yearly plans save money?",
    a: "Yearly billing gives you two months free — you pay for ten months and get twelve. Startup is $990 per year and Growth is $4,490 per year.",
  },
  {
    q: "Is Work Trail included in my plan?",
    a: "Work Trail is an optional add-on on Startup and Growth plans. It is billed per assignment at $30 each, and you choose how many assignments you add. Enterprise plans can include custom Work Trail volumes.",
  },
];

export function selectPlan(planId: string, billing: "monthly" | "yearly") {
  try {
    localStorage.setItem("yuvro-selected-plan", JSON.stringify({ planId, billing }));
  } catch {
    /* ignore */
  }
}

type Billing = "monthly" | "yearly";

export function PricingContent({ onSubscribe }: { onSubscribe?: () => void }) {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="ylp font-sans text-[#14192b] dark:text-[#f1f4fc] antialiased">
      <style>{YLP_CSS}</style>
      <div className="mx-auto w-full max-w-[1120px] px-6 py-6">
        <Hero billing={billing} setBilling={setBilling} />
        <TrialStrip onSubscribe={onSubscribe} />
        <Plans billing={billing} onSubscribe={onSubscribe} />
        <HowSubmissionsWork />
        <Faq />
        <ClosingBanner onSubscribe={onSubscribe} />
      </div>
    </div>
  );
}

export function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="ylp min-h-screen bg-[#f8f9fb] dark:bg-[#0d1120] font-sans text-[#14192b] dark:text-[#f1f4fc] antialiased">
      <style>{YLP_CSS}</style>
      <StandardHeader />
      <div className="mx-auto w-full max-w-[1120px] px-6 py-12">
        <Hero billing={billing} setBilling={setBilling} />
        <TrialStrip />
        <Plans billing={billing} />
        <HowSubmissionsWork />
        <Faq />
        <ClosingBanner />
        <Footer />
      </div>
    </div>
  );
}

function Hero({
  billing,
  setBilling,
}: {
  billing: Billing;
  setBilling: (b: Billing) => void;
}) {
  return (
    <section className="pt-8 pb-12 text-center sm:pt-12">
      <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-[#14192b] dark:text-white sm:text-4xl lg:text-[44px] leading-tight">
        Simple pricing. Built for startups and growing teams.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-[16px] text-[#646d84] dark:text-[#a1abc4]">
        Choose a plan that fits your hiring needs.
      </p>
      <BillingToggle billing={billing} setBilling={setBilling} />
    </section>
  );
}

function BillingToggle({
  billing,
  setBilling,
}: {
  billing: Billing;
  setBilling: (b: Billing) => void;
}) {
  return (
    <div className="mt-8 flex justify-center">
      <div className="inline-flex items-center rounded-full border border-[#646d84]/20 bg-neutral-100 dark:bg-card p-1">
        <ToggleOption
          active={billing === "monthly"}
          onClick={() => setBilling("monthly")}
          label="Monthly"
        />
        <ToggleOption
          active={billing === "yearly"}
          onClick={() => setBilling("yearly")}
          label="Yearly"
          hint="Save 2 months"
        />
      </div>
    </div>
  );
}

function ToggleOption({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
        active
          ? "bg-white dark:bg-neutral-800 text-[#14192b] dark:text-white shadow-sm"
          : "text-[#646d84] hover:text-[#14192b] dark:text-[#a1abc4] dark:hover:text-white"
      }`}
    >
      {label}
      {hint ? (
        <span
          className="rounded-full px-2 py-0.5 text-[11px] leading-none font-bold"
          style={{ color: BRAND, backgroundColor: "rgba(247, 147, 30, 0.12)" }}
        >
          {hint}
        </span>
      ) : null}
    </button>
  );
}

function StartFreeButton({
  className = "",
  onSubscribe,
}: {
  className?: string;
  onSubscribe?: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTrial = async () => {
    if (!isAuthenticated) {
      selectPlan("trial", "monthly");
      navigate({ to: "/auth", search: { tab: "signup" } });
      return;
    }

    setIsLoading(true);
    try {
      await yhubApiAuthUtil.post("/payment/start_trial/", {});
      toast.success("Free trial activated successfully!");
      if (onSubscribe) {
        onSubscribe();
      } else {
        navigate({ to: "/recruiter/evaluations" });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start trial");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <button
        type="button"
        onClick={handleStartTrial}
        disabled={isLoading}
        className={`ylp-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50 ${className}`}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoading ? "Starting..." : "Start free"}
      </button>
    );
  }

  return (
    <Link
      to="/auth"
      search={{ tab: "signup" }}
      className={`ylp-btn-primary inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 ${className}`}
    >
      Start free
    </Link>
  );
}

function TrialStrip({ onSubscribe }: { onSubscribe?: () => void }) {
  return (
    <section
      className="mb-14 flex flex-col items-center justify-between gap-4 rounded-2xl border px-6 py-5 sm:flex-row shadow-sm"
      style={{
        borderColor: "rgba(247, 147, 30, 0.35)",
        backgroundColor: "rgba(247, 147, 30, 0.07)",
      }}
    >
      <div className="text-center sm:text-left">
        <p className="text-[15px] font-bold text-[#14192b] dark:text-white">Start free. No credit card needed.</p>
        <p className="mt-1 text-sm text-[#646d84] dark:text-[#a1abc4]">
          {TRIAL.days} days, {TRIAL.submissions} submissions to use anywhere, and {TRIAL.repos}{" "}
          codebase repository setup.
        </p>
      </div>
      <StartFreeButton className="shrink-0" onSubscribe={onSubscribe} />
    </section>
  );
}

function Plans({
  billing,
  onSubscribe,
}: {
  billing: Billing;
  onSubscribe?: () => void;
}) {
  const [workTrailQty, setWorkTrailQty] = useState(0);

  const workTrailTotal =
    workTrailQty > 0 ? workTrailQty * WORK_TRAIL.pricePerAssignment : 0;

  const setWorkTrail = (qty: number) =>
    setWorkTrailQty(Math.min(WORK_TRAIL.max, Math.max(0, qty)));

  const workTrailLine =
    workTrailQty > 0
      ? `+ Work Trail: ${workTrailQty} assignment${workTrailQty === 1 ? "" : "s"} · $${workTrailTotal.toLocaleString("en-US")}`
      : null;

  return (
    <section id="plans">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PlanCard
          order="order-2 lg:order-1"
          plan={STARTUP}
          billing={billing}
          workTrailLine={workTrailLine}
          onSubscribe={onSubscribe}
        />
        <PlanCard
          order="order-1 lg:order-2"
          plan={GROWTH}
          featured
          billing={billing}
          workTrailLine={workTrailLine}
          onSubscribe={onSubscribe}
        />
        <PlanCard order="order-3 lg:order-3" plan={ENTERPRISE} billing={billing} />
      </div>
      <WorkTrailControls
        qty={workTrailQty}
        setQty={setWorkTrail}
        total={workTrailTotal}
      />
    </section>
  );
}

function PlanCard({
  plan,
  featured = false,
  billing,
  workTrailLine = null,
  order,
  onSubscribe,
}: {
  plan: typeof STARTUP | typeof GROWTH | typeof ENTERPRISE;
  featured?: boolean;
  billing: Billing;
  workTrailLine?: string | null;
  order: string;
  onSubscribe?: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isPaying, setIsPaying] = useState(false);

  const isEnterprise = !("monthly" in plan);
  const yearly = billing === "yearly";
  const planAny = plan as typeof STARTUP;

  const handleBuyPlan = async () => {
    if (!isAuthenticated) {
      selectPlan(planAny.id, billing);
      navigate({ to: "/auth", search: { tab: "signup" } });
      return;
    }

    const price = yearly ? planAny.yearlyTotal : planAny.monthly;
    setIsPaying(true);
    try {
      const orderRes = await yhubApiAuthUtil.post<{
        id: string;
        gateway_order_or_intent_id: string;
        key_id?: string;
      }>("/payment/", {
        payment_gateway: "RAZORPAY",
        amount: price,
        currency: "USD",
        item_type: "plan",
        item_id: planAny.id,
        item_name: `${planAny.name} (${billing})`,
        product: "ylabs",
      });

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        setIsPaying(false);
        return;
      }

      const rzpKey = orderRes.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;

      const options = {
        key: rzpKey,
        amount: price,
        currency: "USD",
        name: "Yuvro Labs",
        description: `${planAny.name} Plan Subscription`,
        order_id: orderRes.gateway_order_or_intent_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await yhubApiAuthUtil.post<{ status: string; message: string }>(
              "/payment/verify/",
              {
                gateway_order_id: response.razorpay_order_id,
                gateway_payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
            );

            if (verifyRes.status === "SUCCESS") {
              toast.success("Subscription activated successfully!");
              if (onSubscribe) {
                onSubscribe();
              } else {
                navigate({ to: "/recruiter/evaluations" });
              }
            } else {
              await yhubApiAuthUtil.post("/payment/fail/", {
                gateway_order_id: orderRes.gateway_order_or_intent_id,
                reason: "Payment signature verification failed",
              });
              throw new Error(verifyRes.message || "Payment verification failed");
            }
          } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Payment verification failed");
          } finally {
            setIsPaying(false);
          }
        },
        prefill: {
          name: user?.first_name || "",
          email: user?.email || "",
        },
        theme: {
          color: BRAND,
        },
        modal: {
          ondismiss: async function () {
            setIsPaying(false);
            toast.info("Payment cancelled");
            try {
              await yhubApiAuthUtil.post("/payment/fail/", {
                gateway_order_id: orderRes.gateway_order_or_intent_id,
                reason: "User closed the payment modal",
              });
            } catch (e) {}
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on("payment.failed", async function (response: any) {
        try {
          await yhubApiAuthUtil.post("/payment/fail/", {
            gateway_order_id: response.error?.metadata?.order_id,
            gateway_payment_id: response.error?.metadata?.payment_id,
            reason: response.error?.description,
          });
        } catch (e) {}
        toast.error(response.error?.description || "Payment failed");
        setIsPaying(false);
      });

      rzp.open();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to initiate payment.");
      setIsPaying(false);
    }
  };

  return (
    <div
      className={`${order} flex flex-col rounded-2xl border bg-white dark:bg-card p-7 shadow-sm transition-all hover:shadow-md ${
        featured ? "border-2 relative ring-1 ring-[#F7931E]/20" : "border-[#646d84]/15"
      }`}
      style={featured ? { borderColor: BRAND } : undefined}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">{plan.name}</h2>
        {featured ? (
          <span
            className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f7931e]/10"
            style={{ color: BRAND }}
          >
            Most popular
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        {isEnterprise ? (
          <>
            <div className="text-3xl font-bold tracking-tight text-[#14192b] dark:text-white">Custom</div>
            <p className="mt-1 text-sm text-[#646d84] dark:text-[#a1abc4]">Tailored to your hiring volume</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight text-[#14192b] dark:text-white">
                ${yearly ? planAny.monthlyEquiv.toLocaleString("en-US") : planAny.monthly.toLocaleString("en-US")}
              </span>
              <span className="text-sm font-semibold text-[#646d84] dark:text-[#a1abc4]">/mo</span>
            </div>
            <p className="mt-1 text-sm text-[#646d84] dark:text-[#a1abc4]">
              {yearly
                ? `$${planAny.yearlyTotal.toLocaleString("en-US")} billed annually`
                : "Billed monthly"}
            </p>
          </>
        )}
        {workTrailLine ? (
          <p className="mt-2 text-[13px] font-semibold" style={{ color: BRAND }}>
            {workTrailLine}
          </p>
        ) : null}
      </div>

      <ul className="mt-6 flex flex-col gap-3.5 border-t border-[#646d84]/15 pt-6 text-sm text-[#14192b] dark:text-[#f1f4fc]">
        {plan.features.map((item, idx) => (
          <li key={idx} className="flex flex-col gap-1.5 leading-snug">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[#f7931e] font-bold">✓</span>
              <span>{item.text}</span>
            </div>
            {item.subItems && (
              <ul className="ml-7 list-disc space-y-1 pl-1 text-[13px] text-[#646d84] dark:text-[#a1abc4] marker:text-[#646d84]">
                {item.subItems.map((sub) => (
                  <li key={sub} className="leading-snug">
                    {sub}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex-1" />
      {isEnterprise ? (
        <Link
          to="/book-demo"
          className="ylp-btn-outline inline-flex items-center justify-center rounded-full border border-[#646d84]/25 px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Contact us
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleBuyPlan}
          disabled={isPaying}
          className="ylp-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {isPaying && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPaying ? "Processing..." : isAuthenticated ? "Upgrade plan" : "Start free"}
        </button>
      )}
    </div>
  );
}

function WorkTrailControls({
  qty,
  setQty,
  total,
}: {
  qty: number;
  setQty: (n: number) => void;
  total: number;
}) {
  const added = qty > 0;

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 rounded-2xl border border-[#646d84]/15 bg-white dark:bg-card p-7 lg:grid-cols-[1fr_auto] shadow-sm">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">Work Trail</h2>
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#f7931e]/10"
            style={{ color: BRAND }}
          >
            Optional add-on · ${WORK_TRAIL.pricePerAssignment} per assignment
          </span>
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#646d84] dark:text-[#a1abc4]">
          {WORK_TRAIL.description}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold select-none">
            <input
              type="checkbox"
              checked={added}
              onChange={(e) => setQty(e.target.checked ? 5 : 0)}
              className="ylp-checkbox h-4 w-4 rounded"
            />
            Add Work Trail assignments
          </label>
        </div>

        {added ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#646d84] dark:text-[#a1abc4]">Quick picks:</span>
            {WORK_TRAIL.quickPicks.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setQty(count)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  qty === count
                    ? "bg-[#14192b] text-white dark:bg-white dark:text-black"
                    : "border border-[#646d84]/20 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {count} {count === 1 ? "assignment" : "assignments"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-between border-t border-[#646d84]/15 pt-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#646d84] dark:text-[#a1abc4]">
            Price list
          </span>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {WORK_TRAIL.priceList.map((row) => (
              <li key={row.qty} className="flex items-center justify-between gap-8">
                <span className="text-[#646d84] dark:text-[#a1abc4]">
                  {row.qty} assignment{row.qty === 1 ? "" : "s"}
                </span>
                <span className="font-bold">${row.total.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function HowSubmissionsWork() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold tracking-tight text-[#14192b] dark:text-white">How submissions work</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[#646d84]/15 bg-white dark:bg-card p-7 shadow-sm">
          <h3 className="text-[16px] font-bold text-[#14192b] dark:text-white">One shared pool</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#646d84] dark:text-[#a1abc4]">
            Coding assessments, simulation labs and AI mock interviews all draw from the same
            submission pool. Use them in any mix that suits your hiring round — the pool resets
            every billing month, including on yearly plans.
          </p>
        </div>
        <div className="rounded-2xl border border-[#646d84]/15 bg-white dark:bg-card p-7 shadow-sm">
          <h3 className="text-[16px] font-bold text-[#14192b] dark:text-white">Repository setups are separate</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#646d84] dark:text-[#a1abc4]">
            Connecting a codebase for evaluation never uses a submission. Repository setups are
            configured once per codebase and stay available for reuse across assessments.
          </p>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold tracking-tight text-[#14192b] dark:text-white">Frequently asked questions</h2>
      <div className="mt-6 flex flex-col divide-y divide-[#646d84]/15">
        {FAQS.map((item, i) => (
          <details
            key={item.q}
            className="group py-4 cursor-pointer"
            open={i === 0}
          >
            <summary className="list-none text-[16px] font-semibold text-[#14192b] dark:text-white marker:hidden flex items-center justify-between">
              <span>{item.q}</span>
              <span className="ml-4 text-xs font-bold text-[#646d84] group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#646d84] dark:text-[#a1abc4]">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function ClosingBanner({ onSubscribe }: { onSubscribe?: () => void }) {
  return (
    <section
      className="mt-16 flex flex-col items-center justify-between gap-4 rounded-2xl border px-8 py-6 sm:flex-row shadow-sm"
      style={{
        borderColor: "rgba(247, 147, 30, 0.35)",
        backgroundColor: "rgba(247, 147, 30, 0.07)",
      }}
    >
      <p className="text-[16px] font-bold text-[#14192b] dark:text-white">Try Yuvro free for {TRIAL.days} days</p>
      <StartFreeButton className="shrink-0" onSubscribe={onSubscribe} />
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-[#646d84]/15 py-8">
      <div className="flex flex-col items-center justify-between gap-4 text-sm text-[#646d84] dark:text-[#a1abc4] sm:flex-row">
        <span>© {new Date().getFullYear()} Yuvro Labs. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <Link to="/" className="hover:text-[#14192b] dark:hover:text-white transition-colors">
            Home
          </Link>
          <Link to="/book-demo" className="hover:text-[#14192b] dark:hover:text-white transition-colors">
            Book a demo
          </Link>
          <a href="mailto:contact@yuvrolabs.com" className="hover:text-[#14192b] dark:hover:text-white transition-colors">
            contact@yuvrolabs.com
          </a>
        </div>
      </div>
    </footer>
  );
}

const YLP_CSS = `
.ylp-btn-primary { background-color: ${BRAND}; }
.ylp-btn-outline:hover { background-color: rgba(0, 0, 0, 0.04); }
.ylp details summary::-webkit-details-marker { display: none; }
.ylp-checkbox { accent-color: ${BRAND}; }
`;

export default PricingPage;
